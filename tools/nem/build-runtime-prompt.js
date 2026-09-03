// Builds the provisional NEM runtime prompt by stripping the editorial matter from Alex's captured working document, per his own rule for the runtime page.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CAPTURE_PATH = "projects/nem-life/.claude/research/nem-system-prompt-2026-08-31.md";
export const OUTPUT_PATH =
  "projects/nem-life/.claude/backend/changesets/nem-provisional-runtime-prompt/system-prompt.txt";

const START = "# Introduction\n";
const DROP = [/^Frequentie \(redactioneel, niet voor het rapport\):/, /^\*Function of this block:.*\*$/];

export function buildRuntimePrompt(markdown) {
  const at = markdown.indexOf(START);
  if (at < 0) throw new Error("capture has no '# Introduction' heading");
  const lines = markdown.slice(at).split("\n").filter((l) => !DROP.some((re) => re.test(l)));
  return lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trimEnd() + "\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const out = path.join(root, OUTPUT_PATH);
  mkdirSync(path.dirname(out), { recursive: true });
  const prompt = buildRuntimePrompt(readFileSync(path.join(root, CAPTURE_PATH), "utf8"));
  writeFileSync(out, prompt);
  process.stdout.write(`wrote ${OUTPUT_PATH} (${prompt.length} chars)\n`);
}
