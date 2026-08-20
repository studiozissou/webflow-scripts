#!/usr/bin/env node
/**
 * Webflow's page custom-code field has a hard size ceiling (writes past it
 * fail with HTTP 406), and the footer sits right on it. The repo file keeps
 * the full comments — they are the record of why this code is shaped the way
 * it is — and this strips them for the copy that goes into Webflow.
 *
 * Line-based on purpose: every comment here lives on its own line, so URLs
 * containing "//" and the postMessage JSON strings are never touched.
 *
 *   node build-footer.cjs            # print the stripped footer
 *   node build-footer.cjs --stats    # just the sizes
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "footer-code.html");

function strip(source) {
  const out = [];
  // null, or the terminator the currently open comment is waiting for.
  // Tracking which kind is open matters: an HTML comment must not be closed
  // by a JS block terminator, which silently swallowed real code when this
  // did not distinguish between them.
  let awaiting = null;

  for (const line of source.split("\n")) {
    const trimmed = line.trim();

    if (awaiting) {
      if (trimmed.endsWith(awaiting)) awaiting = null;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.endsWith("*/")) awaiting = "*/";
      continue;
    }
    if (trimmed.startsWith("<!--")) {
      if (!trimmed.endsWith("-->")) awaiting = "-->";
      continue;
    }
    if (trimmed.startsWith("//")) continue;

    out.push(line);
  }

  if (awaiting) throw new Error("unterminated comment: expected " + awaiting);

  // Collapse the blank lines the removals leave behind
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

const source = fs.readFileSync(SRC, "utf8");
const stripped = strip(source);

if (process.argv.includes("--stats")) {
  console.log("source:  " + source.length);
  console.log("stripped:" + stripped.length);
  console.log("saved:   " + (source.length - stripped.length));
} else {
  process.stdout.write(stripped);
}
