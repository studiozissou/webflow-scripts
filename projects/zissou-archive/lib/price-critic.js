// Buyer-critic loop that pushes a listing price to the top of what an informed buyer would accept, just under overpriced.

const DEBUG = typeof process !== 'undefined' && process.env.DEBUG === '1';

export const VERDICTS = ['bargain', 'fair', 'top_of_fair', 'overpriced'];

export const CRITIC_PROMPT = `You are a buyer, not the seller. You are browsing Vinted for second-hand menswear and you know this brand tier well: what it cost new, what it typically sells for second-hand, and how condition, size and season change that. You compare every listing against the others you could buy instead, and you are happy to pay well for something good but you hate feeling ripped off.

You will see the photos and the listing exactly as it appears on Vinted, plus the asking price.

Judge the asking price from your own point of view as that buyer:
- "bargain": you would buy immediately and feel you got a steal
- "fair": you would buy at this price without haggling
- "top_of_fair": you would still buy, perhaps after a small offer, but any higher and you would walk away or wait for a drop
- "overpriced": you would not buy at this price; you would scroll past, wait for a drop, or offer well below

Then give "ceiling": the highest price in euros at which you would still buy without feeling ripped off. Be honest and specific to this item, its condition and what the photos actually show. Do not anchor on the asking price.

List "objections": short, concrete things that make you hesitate at this price (visible wear, missing measurements, unclear sizing, weak photos, cheaper alternatives you know of). Empty array if none.

Return only JSON:
{ "verdict": "bargain" | "fair" | "top_of_fair" | "overpriced", "ceiling": number, "reasoning": "1-2 sentences in the buyer's voice", "objections": ["..."] }`;

export function buildCriticMessage(photos, listing, price) {
  const imageBlocks = photos.map((photo) => ({
    type: 'image',
    source: { type: 'url', url: photo.url },
  }));

  const retail = listing.originalRetail != null
    ? `€${listing.originalRetail}${listing.retailEstimated ? ' (estimated)' : ''}`
    : 'unknown';

  const text = [
    `Asking price: €${price}`,
    `Condition: ${listing.conditionRating ?? '?'}/10 (${listing.vintedCondition ?? 'not set'})`,
    `Original retail: ${retail}`,
    '',
    `Title: ${listing.title}`,
    '',
    'Description:',
    listing.fullText,
    '',
    'Return JSON only.',
  ].join('\n');

  return { role: 'user', content: [...imageBlocks, { type: 'text', text }] };
}

export function parseCritique(response) {
  const textBlock = response?.content?.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('Critic returned no text');
  }

  let raw = textBlock.text.trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*\n*/, '').replace(/\n*```\s*$/, '');
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse critic JSON: ${err.message}`);
  }

  if (!VERDICTS.includes(data.verdict)) {
    throw new Error(`Critic returned unknown verdict "${data.verdict}"`);
  }
  if (typeof data.ceiling !== 'number' || !Number.isFinite(data.ceiling) || data.ceiling <= 0) {
    throw new Error('Critic returned no usable ceiling');
  }

  return {
    verdict: data.verdict,
    ceiling: data.ceiling,
    reasoning: typeof data.reasoning === 'string' ? data.reasoning : '',
    objections: Array.isArray(data.objections) ? data.objections.map(String) : [],
  };
}

export function cleanPrice(n) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n < 30) return Math.max(1, Math.floor(n));
  if (n <= 150) return Math.floor(n / 5) * 5;
  return Math.floor(n / 10) * 10;
}

export function nextProbe(state, price, critique) {
  const lo = critique.verdict === 'overpriced' ? state.lo : Math.max(state.lo ?? 0, price);
  const hi = critique.verdict === 'overpriced' ? Math.min(state.hi ?? Infinity, price) : state.hi;
  const minCeiling = Math.min(state.minCeiling ?? Infinity, critique.ceiling);

  const floor = lo ?? 0;
  const roof = hi ?? Infinity;
  let probe;

  if (critique.ceiling > floor && critique.ceiling < roof) {
    probe = critique.ceiling;
  } else if (Number.isFinite(roof)) {
    probe = (floor + roof) / 2;
  } else {
    probe = floor * 1.25;
  }

  return { lo, hi, minCeiling, probe };
}

export function summariseRounds(rounds) {
  const lines = rounds.map((r, i) => {
    const objection = r.objections[0] ? ` – ${r.objections[0]}` : '';
    return `${i + 1}. €${r.price}: ${r.verdict}, ceiling €${r.ceiling}${objection}`;
  });
  return `Buyer critique:\n${lines.join('\n')}`;
}

export async function critiquePrice(client, { photos, listing, startPrice }, { model, maxRounds = 4, step = 5 } = {}) {
  let state = { lo: null, hi: null, minCeiling: null };
  let price = cleanPrice(startPrice) || startPrice;
  const rounds = [];
  const tried = new Set();

  for (let i = 0; i < maxRounds; i++) {
    tried.add(price);

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: CRITIC_PROMPT,
      messages: [buildCriticMessage(photos, listing, price)],
    });
    const critique = parseCritique(response);
    rounds.push({ price, ...critique });

    DEBUG && process.stdout.write(`[price-critic] €${price}: ${critique.verdict}, ceiling €${critique.ceiling}\n`);

    state = nextProbe(state, price, critique);

    if (critique.verdict === 'top_of_fair') break;
    if (state.lo != null && state.hi != null && state.hi - state.lo <= step) break;

    const next = cleanPrice(state.probe);
    if (!next || tried.has(next) || (state.lo != null && next <= state.lo) || (state.hi != null && next >= state.hi)) break;
    price = next;
  }

  const final = state.lo != null
    ? cleanPrice(state.lo)
    : cleanPrice(Math.min(state.minCeiling, state.hi - step));
  return { price: final, startPrice, rounds };
}

export async function applyPriceCritique(client, data, photos, opts) {
  const startPrice = data.price.amount;
  let result;

  try {
    result = await critiquePrice(client, {
      photos,
      startPrice,
      listing: {
        title: data.title,
        fullText: data.full_text,
        conditionRating: data.parsed_fields?.condition_rating,
        vintedCondition: data.vinted_condition,
        originalRetail: data.price.original_retail,
        retailEstimated: data.price.original_retail_estimated,
      },
    }, opts);
  } catch (err) {
    process.stderr.write(`[price-critic] Keeping €${startPrice} for "${data.title}": ${err.message}\n`);
    return data;
  }

  if (!result.price) return data;

  data.price.amount = result.price;

  if (typeof data.price.floor_price === 'number' && startPrice > 0) {
    const scaled = cleanPrice(data.price.floor_price * (result.price / startPrice));
    data.price.floor_price = Math.min(scaled || data.price.floor_price, result.price);
  }

  const summary = `${summariseRounds(result.rounds)}\nStart €${startPrice} → final €${result.price}`;
  const audit = data.price.price_audit ? `${data.price.price_audit}\n\n${summary}` : summary;
  data.price.price_audit = audit.length > 2000 ? `${audit.slice(0, 1999)}…` : audit;

  return data;
}
