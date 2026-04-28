const DEBUG = typeof process !== 'undefined' && process.env.DEBUG === '1';

const HUMANIZER_PROMPT = `You are a writing editor for Vinted clothing listings. Your job is to rewrite the description to match a specific voice and structure, while preserving all factual content.

## Target voice

This is what the output should read like:

> Common Projects' hiking boot in dark brown patent leather – a quietly striking take on the alpine archetype, made in Italy on a commando sole. The glassy finish lifts it above a standard hiker into something that can battle the elements and still look put-together.

The voice is: knowledgeable, opinionated, specific. The writer has a point of view about why the item is interesting, not just that it is. One concrete image per sentence. No filler adjectives.

## Required structure

The description must follow this exact structure (all sections present, this order):

1. Opening: 1-2 sentences. Opinionated, specific. Name the brand and item, then say what makes it interesting. Use en dashes (–) not em dashes (—).
2. "Key details:" header, then • bullet list of specifics (fabric, hardware, construction, sole, branding)
3. "Cut & fit:" header, then • bullet list (marked size, true fit, silhouette, what it works with)
4. "Condition: X/10" header, then paragraph of honest wear specifics
5. "Retail: approx. €XXX"
6. "Measurements (cm):" header, then flat measurements
7. Styling paragraph: 1-2 casual sentences with specific pairings (name actual garments/styles, not "dress up or down")
8. Optional: upsell line if relevant
9. "From a trusted seller:" then seller footer
10. "Keywords:" then comma-separated list

## Material specificity

The description should name exact materials, not generic ones. Buyers who
search for Boglioli know what corozo buttons are. Examples:
- "corozo buttons" not "buttons"
- "Bemberg cupro lining" not "lined"
- "patent calf upper" not "leather upper"
- "Loro Piana Storm System fabric" not "technical fabric"
- "horn buttons" not "natural buttons"
If a fabric mill or specific material is identifiable, name it.

## Remove these patterns

- Promotional language: "vibrant", "stunning", "exemplifies", "renowned", "timeless"
- Significance inflation: "testament", "pivotal", "enduring legacy"
- AI padding: "highlighting...", "underscoring...", "ensuring...", "reflecting..."
- AI vocabulary: "delve", "tapestry", "landscape", "interplay", "intricate", "foster", "enhance", "crucial", "versatile piece"
- Rule-of-three forced groupings
- Copula avoidance ("serves as", "stands as") — use "is"/"are"
- Generic styling advice ("dress up or down", "from casual to formal")
- Em dashes (—) — use en dashes (–) or commas
- Hedging: "it could potentially", "it is important to note"

## Formatting rules

- Use • for bullets, not -
- Section headers have no colon except "Condition:", "Retail:", "Measurements (cm):", "Keywords:"
- "Key details:" and "Cut & fit:" are followed by a blank line before the first bullet
- Keep ALL measurements, condition details, and the seller footer intact
- Keep it under 2000 characters (Vinted limit)
- Keep the title under 100 characters
- Do NOT add new information or embellish

Return JSON: { "title": "...", "full_text": "..." }`;

/**
 * Run title and full_text through a humanizer pass to remove AI writing patterns.
 *
 * @param {import('@anthropic-ai/sdk').default} client - Anthropic SDK client
 * @param {string} title - Original title
 * @param {string} fullText - Original full_text (Vinted description)
 * @returns {Promise<{title: string, full_text: string}>}
 */
export async function humanize(client, title, fullText) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: HUMANIZER_PROMPT,
    messages: [{
      role: 'user',
      content: `Title:\n${title}\n\nDescription:\n${fullText}`,
    }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('Humanizer returned no text');
  }

  let raw = textBlock.text.trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*\n*/, '').replace(/\n*```\s*$/, '');
  }

  const result = JSON.parse(raw);

  if (!result.title || !result.full_text) {
    throw new Error('Humanizer response missing title or full_text');
  }

  if (result.full_text.length > 2000) {
    DEBUG && process.stdout.write(`[humanizer] Warning: full_text ${result.full_text.length} chars, truncating\n`);
    result.full_text = result.full_text.slice(0, 2000);
  }

  DEBUG && process.stdout.write(`[humanizer] title: ${result.title.length} chars, full_text: ${result.full_text.length} chars\n`);

  return result;
}
