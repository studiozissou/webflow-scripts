/* Validator for the report JSON contract.
 *
 * Alex's restructure has Claude return report *content* as JSON — no headings, no markdown,
 * no pagination targets — with all formatting moving into the PDF template. This module is
 * the only place that output is trusted or rejected.
 *
 * It is a gate on the live report path: anything rejected here means a user receives
 * nothing, and Alex gets an email. So it is strict about the shape and deliberately
 * tolerant about presentation — surrounding whitespace and code fences are unwrapped
 * rather than failed, because binning an otherwise complete report over a ``` would be a
 * self-inflicted outage.
 *
 * There is no repair pass. Re-asking the model to fix its own JSON doubles latency and cost
 * on the path already misbehaving, and nobody knows the failure rate yet. The failure log
 * exists to answer that first.
 *
 * This file is pasted verbatim into the `Parse Report` Code node in the /verify workflow,
 * so it stays dependency-free and the unit tests here cover the code that actually runs.
 */

export const REPORT_KEYS = ["opening", "reaction", "origin", "cost", "closing"];

export const FAILURE_REASONS = {
  NOT_JSON: "not-json",
  MISSING_KEY: "missing-key",
  EMPTY_VALUE: "empty-value",
  TRUNCATED: "truncated",
};

const RAW_LIMIT = 2000;

/* Anthropic returns content as an array of blocks. Long or streamed answers can arrive
 * split across several text blocks, so join them — taking only the first would lop the end
 * off the JSON and report it as unparseable. */
export function extractText(response) {
  const blocks = response?.content;
  if (!Array.isArray(blocks)) return null;
  const text = blocks
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");
  return text.length > 0 ? text : null;
}

/* Strip a ```json … ``` wrapper if the model added one despite being asked for bare JSON. */
function unwrap(text) {
  const trimmed = text.trim();
  const fenced = /^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?```$/.exec(trimmed);
  return (fenced ? fenced[1] : trimmed).trim();
}

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const fail = (reason, detail, raw) => ({
  valid: false,
  reason,
  detail,
  raw: String(raw ?? "").slice(0, RAW_LIMIT),
});

export function parseReport(response) {
  const text = extractText(response);

  /* Checked before parsing. Truncated JSON fails to parse anyway, but "unexpected end of
   * input" tells nobody what to change, whereas "truncated" points straight at max_tokens.
   * It wins even when the JSON happens to be complete — landing on the limit means the
   * content was cut short even if the shape survived. */
  if (response?.stop_reason === "max_tokens") {
    return fail(
      FAILURE_REASONS.TRUNCATED,
      "Anthropic stopped at max_tokens — the report was cut short. Raise max_tokens or shorten the prompt.",
      text,
    );
  }

  if (text === null) {
    return fail(FAILURE_REASONS.NOT_JSON, "No text block in the model response.", "");
  }

  let parsed;
  try {
    parsed = JSON.parse(unwrap(text));
  } catch (error) {
    return fail(FAILURE_REASONS.NOT_JSON, `Response is not valid JSON: ${error.message}`, text);
  }

  /* typeof null === "object", and arrays pass a naive object check — both have to be
   * excluded explicitly. */
  if (!isPlainObject(parsed)) {
    return fail(
      FAILURE_REASONS.NOT_JSON,
      `Parsed to ${Array.isArray(parsed) ? "an array" : typeof parsed}, expected an object.`,
      text,
    );
  }

  const missing = REPORT_KEYS.filter((key) => !(key in parsed));
  if (missing.length > 0) {
    return fail(FAILURE_REASONS.MISSING_KEY, `Missing: ${missing.join(", ")}.`, text);
  }

  const empty = REPORT_KEYS.filter(
    (key) => typeof parsed[key] !== "string" || parsed[key].trim().length === 0,
  );
  if (empty.length > 0) {
    return fail(
      FAILURE_REASONS.EMPTY_VALUE,
      `Empty or non-string: ${empty.join(", ")}.`,
      text,
    );
  }

  /* Extra keys are dropped rather than rejected — a complete report should not be binned
   * because the model volunteered a sixth field. */
  const report = Object.fromEntries(REPORT_KEYS.map((key) => [key, parsed[key]]));
  return { valid: true, report };
}
