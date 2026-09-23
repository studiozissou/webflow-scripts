// Refuses to publish a serialised report prompt that lost a required section, changed length by more than 30% against the live version, carries a new [NO VARIANT YET gap, stopped asking for JSON, or is empty.

const REQUIRED_HEADING_PREFIXES = [
  "# Introduction",
  "## 1.1 ",
  "## 1.2 ",
  "## 1.3 ",
  "## 1.4 ",
  "## 1.5 ",
  "## 1.6 ",
  "# Layer 2",
  "## 2.1 ",
  "## 2.2 ",
  "## 2.3 ",
];
const REQUIRED_MECHANISM_HEADINGS = [
  "### Fear (NL: Angst)",
  "### Self-rejection (NL: Zelfafwijzing)",
  "### False hope (NL: Valse hoop)",
  "### False power (NL: Valse macht)",
  "### Emotional numbing (NL: Emotionele verdoving)",
];
const GAP_MARKER = "[NO VARIANT YET";
const KNOWN_GAP_HEADING = "### Emotional numbing (NL: Emotionele verdoving)";
const KNOWN_GAP_LINE = "Male, age 50+ years: [NO VARIANT YET";
const MAX_LENGTH_CHANGE = 0.3;

function findUnexpectedGap(lines) {
  let knownGapsLeft = 1;
  let heading = "";
  for (const line of lines) {
    if (line.startsWith("#")) heading = line.trimEnd();
    for (let at = line.indexOf(GAP_MARKER); at !== -1; at = line.indexOf(GAP_MARKER, at + GAP_MARKER.length)) {
      const known = knownGapsLeft > 0
        && heading === KNOWN_GAP_HEADING
        && line.startsWith(KNOWN_GAP_LINE)
        && at === KNOWN_GAP_LINE.length - GAP_MARKER.length;
      if (!known) return line;
      knownGapsLeft -= 1;
    }
  }
  return null;
}

function validatePrompt(text, { activeChars } = {}) {
  const source = typeof text === "string" ? text : "";
  const lines = source.split("\n");
  const headings = lines.filter((line) => line.startsWith("#")).length;
  const reasons = [];
  const verdict = () => ({ ok: reasons.length === 0, reasons, chars: source.length, headings });

  if (source.trim() === "") {
    reasons.push("The page is empty - there is no prompt to publish.");
    return verdict();
  }

  const trimmed = lines.map((line) => line.trimEnd());
  const missing = [
    ...REQUIRED_HEADING_PREFIXES.filter((prefix) => !trimmed.some((line) => line.startsWith(prefix))),
    ...REQUIRED_MECHANISM_HEADINGS.filter((heading) => !trimmed.includes(heading)),
  ].map((heading) => heading.trim());
  if (missing.length > 0) {
    reasons.push(`Missing required headings: ${missing.join(", ")}`);
  }

  if (Number.isFinite(activeChars) && activeChars > 0) {
    const change = Math.abs(source.length - activeChars) / activeChars;
    if (change > MAX_LENGTH_CHANGE) {
      reasons.push(
        `Length changed by ${(change * 100).toFixed(1)}% (${source.length} characters now, ${activeChars} in the live version) - more than 30% in one publish looks like a partial paste`,
      );
    }
  }

  const gap = findUnexpectedGap(lines);
  if (gap !== null) {
    reasons.push(
      `Unexpected "${GAP_MARKER}" marker - only the known gap under Emotional numbing (Male, age 50+) may carry one: "${gap.trim().slice(0, 80)}"`,
    );
  }

  if (!/json/i.test(source)) {
    reasons.push("The prompt no longer asks for JSON - Parse Report would reject every report");
  }

  return verdict();
}

export { validatePrompt };
