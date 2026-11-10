// Turns Slack thread replies into approved and skipped build items, fail-closed: only the digest thread, only after the digest ts, only the configured user, only go/skip/ok changes, never a reply ts twice, unknown indices reported and never guessed.

const COMMAND = /^(go|skip|ok changes)\b(.*)$/is;

export function compareTs(a, b) {
  const [as, af = ''] = String(a).split('.');
  const [bs, bf = ''] = String(b).split('.');
  const secs = BigInt(as) - BigInt(bs);
  if (secs !== 0n) return secs > 0n ? 1 : -1;
  const fa = af.padEnd(6, '0');
  const fb = bf.padEnd(6, '0');
  return fa === fb ? 0 : fa > fb ? 1 : -1;
}

const isTs = (v) => typeof v === 'string' && /^\d+(\.\d+)?$/.test(v);

function resolve(token, builds) {
  const exact = builds.find((item) => item.label === token);
  if (exact) return exact;
  if (/^\d+$/.test(token)) return builds.find((item) => item.label === `B${token}`) ?? null;
  return null;
}

export function parseReplies(digestState, replies = [], { userId } = {}) {
  if (!userId) throw new Error('parseReplies needs a userId');
  if (!digestState || !isTs(digestState.ts)) throw new Error('digest state needs a ts');
  const items = (digestState.items ?? []).map((item) => ({ ...item, label: String(item.n).toUpperCase() }));
  const builds = items.filter((item) => item.kind === 'build');
  const seen = new Set(digestState.processedTs ?? []);
  const decisions = new Map();
  const unknown = [];
  const processed = [];
  let applyProposals = false;

  const accepted = replies
    .filter(
      (r) =>
        r &&
        isTs(r.ts) &&
        r.thread_ts === digestState.ts &&
        r.user === userId &&
        compareTs(r.ts, digestState.ts) > 0 &&
        !seen.has(r.ts),
    )
    .sort((a, b) => compareTs(a.ts, b.ts));

  for (const reply of accepted) {
    const match = COMMAND.exec(String(reply.text ?? '').trim());
    if (!match) continue;
    processed.push(reply.ts);
    seen.add(reply.ts);
    const verb = match[1].toLowerCase().replace(/\s+/g, ' ');
    if (verb === 'ok changes') {
      applyProposals = true;
      continue;
    }
    const tokens = match[2].split(/[\s,]+/).filter(Boolean).map((t) => t.toUpperCase());
    if (tokens.length === 0) {
      unknown.push({ ts: reply.ts, token: '', reason: 'no items given' });
      continue;
    }
    const targets = [];
    for (const token of tokens) {
      if (token === 'ALL') {
        targets.push(...builds);
        continue;
      }
      const item = resolve(token, builds);
      if (item) targets.push(item);
      else if (items.some((i) => i.label === token)) unknown.push({ ts: reply.ts, token, reason: 'not a build item' });
      else unknown.push({ ts: reply.ts, token, reason: 'no such item' });
    }
    for (const item of targets) {
      decisions.delete(item.label);
      decisions.set(item.label, { verb, item });
    }
  }

  const pick = (verb) =>
    builds
      .filter((item) => decisions.get(item.label)?.verb === verb)
      .map((item) => ({ n: item.label, pageId: item.pageId }));

  return {
    approved: pick('go'),
    skipped: pick('skip'),
    applyProposals,
    unknown,
    processedTs: [...(digestState.processedTs ?? []), ...processed],
  };
}
