/**
 * The serialiser turns Alex's Notion runtime page into the system prompt /verify sends.
 * Anything it gets wrong reaches every report, so each rule is pinned on a small fixture,
 * and the whole live prompt must survive a round trip through Notion's block shape.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { notionToPrompt, normalisePrompt } from "../../tools/nem/notion-to-prompt.js";
import {
  segment,
  promptToNotionBlocks,
  flattenBlocks,
  simplifyBlocks,
} from "./helpers/prompt-to-notion-blocks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, "..", "..", "projects", "nem-life", ".claude", "backend");

let seq = 0;
const block = (type, rich = [], children) => {
  const id = `blk-${++seq}`;
  const kids = children ?? [];
  for (const c of kids) c.parent = { type: "block_id", block_id: id };
  return {
    object: "block",
    id,
    type,
    has_children: kids.length > 0,
    parent: { type: "page_id", page_id: "page-1" },
    [type]: type === "divider" ? {} : { rich_text: rich, color: "default" },
    ...(children ? { children: kids } : {}),
  };
};
const t = (s, a) => [segment(s, a)];
const p = (s) => block("paragraph", t(s));
const h = (level, s) => block(`heading_${level}`, t(s));
const li = (s, children) => block("bulleted_list_item", t(s), children);
const num = (s, children) => block("numbered_list_item", t(s), children);
const divider = () => block("divider");
const render = (rich) => notionToPrompt([block("paragraph", rich)]);

describe("block rules", () => {
  test("headings get #, ## and ### and a blank line after", () => {
    assert.equal(
      notionToPrompt([h(1, "One"), h(2, "Two"), h(3, "Three"), p("Body")]),
      "# One\n\n## Two\n\n### Three\n\nBody\n",
    );
  });

  test("paragraphs are separated by one blank line", () => {
    assert.equal(notionToPrompt([p("a"), p("b")]), "a\n\nb\n");
  });

  test("a soft line break (Shift+Enter) keeps two lines with no blank between — False hope › Core relies on it", () => {
    assert.equal(notionToPrompt([p("first line\nsecond line"), p("next")]), "first line\nsecond line\n\nnext\n");
  });

  test("an empty paragraph emits nothing, not a second blank line", () => {
    assert.equal(notionToPrompt([p("a"), block("paragraph", []), p("b")]), "a\n\nb\n");
    assert.equal(notionToPrompt([p("a"), p("   "), p("b")]), "a\n\nb\n");
  });

  test("a run of bullets has no blank lines inside it and one after it", () => {
    assert.equal(notionToPrompt([p("Intro"), li("x"), li("y"), p("After")]), "Intro\n\n- x\n- y\n\nAfter\n");
  });

  test("nested items indent 4 spaces per level, with a paragraph child set off by blank lines", () => {
    const blocks = [
      li("Gender:", [li("Female"), li("Male")]),
      li("Age category:", [li("18-30"), li("60+"), p("You derive the buckets yourself:"), li("18 to 50"), li("50+")]),
      li("Relationship status:", [li("Single", [li("deeper")])]),
      p("After"),
    ];
    assert.equal(
      notionToPrompt(blocks),
      [
        "- Gender:",
        "    - Female",
        "    - Male",
        "- Age category:",
        "    - 18-30",
        "    - 60+",
        "",
        "    You derive the buckets yourself:",
        "",
        "    - 18 to 50",
        "    - 50+",
        "- Relationship status:",
        "    - Single",
        "        - deeper",
        "",
        "After",
        "",
      ].join("\n"),
    );
  });

  test("numbered items count from 1 and restart after any other block", () => {
    assert.equal(
      notionToPrompt([num("a"), num("b"), num("c"), p("break"), num("d"), num("e")]),
      "1. a\n2. b\n3. c\n\nbreak\n\n1. d\n2. e\n",
    );
  });

  test("a bullet between numbered items restarts the count", () => {
    assert.equal(notionToPrompt([num("a"), li("b"), num("c")]), "1. a\n- b\n1. c\n");
  });

  test("a divider is --- on its own line between blank lines", () => {
    assert.equal(notionToPrompt([p("above"), divider(), h(1, "Below")]), "above\n\n---\n\n# Below\n");
  });

  test("callouts and tables of contents are skipped entirely", () => {
    const callout = block("callout", t("v3 live since …"));
    const toc = block("table_of_contents");
    assert.equal(notionToPrompt([callout, toc, h(1, "Introduction"), p("x")]), "# Introduction\n\nx\n");
  });

  for (const type of ["quote", "toggle", "code", "image", "table", "child_page", "to_do"]) {
    test(`an unsupported ${type} block throws, naming the type`, () => {
      assert.throws(() => notionToPrompt([p("a"), block(type, t("x"))]), new RegExp(`Unsupported block type: ${type}`));
    });
  }

  test("an unsupported block nested inside a list item still throws", () => {
    assert.throws(() => notionToPrompt([li("a", [block("quote", t("x"))])]), /Unsupported block type: quote/);
  });

  test("a block whose children were not fetched throws rather than dropping them", () => {
    const orphaned = li("has kids");
    orphaned.has_children = true;
    assert.throws(() => notionToPrompt([orphaned]), /not fetched/);
  });

  test("nested content under a paragraph throws rather than being flattened", () => {
    assert.throws(() => notionToPrompt([block("paragraph", t("a"), [p("b")])]), /Nested content/);
  });

  test("a text block without rich_text throws rather than going blank", () => {
    const bare = { object: "block", id: "x", type: "heading_1", has_children: false, heading_1: {} };
    assert.throws(() => notionToPrompt([bare]), /rich_text/);
  });

  test("the output ends in exactly one newline and never holds two blank lines in a row", () => {
    const out = notionToPrompt([p("a\n\n\n\nb"), p("c")]);
    assert.equal(out, "a\n\nb\n\nc\n");
    assert.equal(notionToPrompt([p("a")]).endsWith("a\n"), true);
  });
});

describe("rich text", () => {
  test("bold, italic, code and their combinations", () => {
    assert.equal(render(t("x", { bold: true })), "**x**\n");
    assert.equal(render(t("x", { italic: true })), "*x*\n");
    assert.equal(render(t("x", { code: true })), "`x`\n");
    assert.equal(render(t("x", { bold: true, code: true })), "**`x`**\n");
    assert.equal(render(t("x", { italic: true, code: true })), "*`x`*\n");
    assert.equal(render(t("x", { bold: true, italic: true })), "***x***\n");
    assert.equal(render(t("x", { strikethrough: true })), "~~x~~\n");
  });

  test("underline, colour and links render as plain text", () => {
    const linked = segment("site", { underline: true, color: "red" });
    linked.text.link = { url: "https://example.com" };
    linked.href = "https://example.com";
    assert.equal(render([linked]), "site\n");
  });

  test("mentions and equations use plain_text", () => {
    const mention = { type: "mention", mention: { type: "date" }, annotations: segment("").annotations, plain_text: "23 Sep 2026", href: null };
    assert.equal(render([segment("On "), mention]), "On 23 Sep 2026\n");
  });

  test("a bold code label followed by plain text", () => {
    const rich = [segment("opening", { bold: true, code: true }), segment(" - 80 to 110 words, one paragraph.")];
    assert.equal(render(rich), "**`opening`** - 80 to 110 words, one paragraph.\n");
  });

  test("one italic sentence split around a code span is wrapped once", () => {
    const rich = [
      segment("source material for ", { italic: true }),
      segment("opening", { italic: true, code: true }),
      segment(" (1.2: a moment), ", { italic: true }),
      segment("reaction", { italic: true, code: true }),
      segment(" and ", { italic: true }),
      segment("cost", { italic: true, code: true }),
      segment(".", { italic: true }),
    ];
    assert.equal(render(rich), "*source material for `opening` (1.2: a moment), `reaction` and `cost`.*\n");
  });

  test("text Notion split at 2000 characters is joined back under one marker", () => {
    const long = "a".repeat(2000);
    const rich = [segment(long, { italic: true }), segment("bcd", { italic: true })];
    assert.equal(render(rich), `*${long}bcd*\n`);
    const code = [segment(long, { code: true }), segment("z", { code: true })];
    assert.equal(render(code), `\`${long}z\`\n`);
  });

  test("an italic numbered item keeps its marker inside the number", () => {
    assert.equal(notionToPrompt([block("numbered_list_item", t("core,", { italic: true }))]), "1. *core,*\n");
  });

  test("double spaces inside a line survive", () => {
    assert.equal(render([segment("Male:  De gedachte")]), "Male:  De gedachte\n");
  });

  test("whitespace at the edge of a formatted run sits outside the marker", () => {
    assert.equal(render([segment("a "), segment("b ", { bold: true }), segment("c")]), "a **b** c\n");
  });
});

describe("input shapes", () => {
  const nested = () => [
    h(1, "Intro"),
    li("Age category:", [li("18-30"), p("Derive:"), li("50+")]),
    num("one"),
    num("two", [li("deep")]),
    divider(),
    block("paragraph", [segment("a "), segment("b", { italic: true, code: true })]),
  ];
  const expected = "# Intro\n\n- Age category:\n    - 18-30\n\n    Derive:\n\n    - 50+\n1. one\n2. two\n    - deep\n\n---\n\na *`b`*\n";

  test("raw nested", () => {
    assert.equal(notionToPrompt(nested()), expected);
  });

  test("raw flat, children right after their parent", () => {
    assert.equal(notionToPrompt(flattenBlocks(nested())), expected);
  });

  test("raw flat, every child after every top-level block (fetch order)", () => {
    const flat = flattenBlocks(nested());
    const top = flat.filter((b) => b.parent.type === "page_id");
    const rest = flat.filter((b) => b.parent.type !== "page_id");
    assert.equal(notionToPrompt([...top, ...rest]), expected);
  });

  test("raw flat, children listed before their parents", () => {
    const flat = flattenBlocks(nested());
    const kids = flat.filter((b) => b.parent.type !== "page_id");
    const top = flat.filter((b) => b.parent.type === "page_id");
    assert.equal(notionToPrompt([...kids, ...top]), expected);
  });

  test("n8n Notion node simplified output", () => {
    const simple = simplifyBlocks(flattenBlocks(nested()));
    assert.ok(simple.every((b) => typeof b.parent_id === "string" && !("parent" in b)));
    assert.ok(simple.filter((b) => b.type !== "divider").every((b) => Array.isArray(b.rich_text)));
    assert.equal(notionToPrompt(simple), expected);
  });

  test("simplified output in fetch order", () => {
    const simple = simplifyBlocks(flattenBlocks(nested()));
    const top = simple.filter((b) => b.parent_id === "page-1");
    const rest = simple.filter((b) => b.parent_id !== "page-1");
    assert.equal(notionToPrompt([...rest, ...top]), expected);
  });

  test("empty items n8n emits for an empty result are ignored", () => {
    assert.equal(notionToPrompt([{}, ...nested()]), expected);
  });
});

describe("normalisePrompt", () => {
  test("collapses three or more newlines to one blank line", () => {
    assert.equal(normalisePrompt("a\n\n\nb\n\n\n\n\nc\n"), "a\n\nb\n\nc\n");
  });

  test("strips trailing whitespace at line ends and keeps inner double spaces", () => {
    assert.equal(normalisePrompt("a  \nMale:  De \t\n"), "a\nMale:  De\n");
  });

  test("ends in exactly one newline", () => {
    assert.equal(normalisePrompt("a"), "a\n");
    assert.equal(normalisePrompt("a\n\n\n"), "a\n");
  });

  test("is idempotent", () => {
    const once = normalisePrompt("x\n\n\n  y  \n\n");
    assert.equal(normalisePrompt(once), once);
  });
});

describe("round trip — the live prompt survives Notion's block shape", () => {
  const snapshot = JSON.parse(readFileSync(path.join(BACKEND, "nem-verify.workflow.json"), "utf8"));
  const setNodeText = snapshot.nodes.find((n) => n.name === "Report Prompt")?.parameters.assignments.assignments[0].value;
  const changesetText = readFileSync(
    path.join(BACKEND, "changesets", "nem-provisional-runtime-prompt", "system-prompt.txt"),
    "utf8",
  );
  const fixture = JSON.parse(readFileSync(path.join(BACKEND, "fixtures", "notion-runtime-prompt.blocks.json"), "utf8"));

  const sources = [["the Report Prompt Set node", setNodeText], ["system-prompt.txt", changesetText]];
  for (const [label, text] of sources) {
    test(`${label}, pasted into Notion, serialises back to itself`, () => {
      assert.ok(text, `${label} is missing`);
      assert.equal(normalisePrompt(notionToPrompt(promptToNotionBlocks(text))), normalisePrompt(text));
    });

    test(`${label} round-trips in the n8n simplified shape too`, () => {
      const simple = simplifyBlocks(flattenBlocks(promptToNotionBlocks(text, { statusCallout: true })));
      assert.equal(normalisePrompt(notionToPrompt(simple)), normalisePrompt(text));
    });
  }

  test("the Notion-side text differs from the Set node only by its eight double blank lines", () => {
    const raw = notionToPrompt(promptToNotionBlocks(setNodeText));
    assert.equal(raw, normalisePrompt(raw));
    assert.equal((setNodeText.match(/\n\n\n/g) ?? []).length, 8);
    assert.equal(setNodeText.length - raw.length, 8);
  });

  test("the committed page fixture serialises to the prompt", () => {
    assert.equal(normalisePrompt(notionToPrompt(fixture)), normalisePrompt(setNodeText));
  });

  test("the fixture really exercises the tricky shapes", () => {
    const flat = flattenBlocks(fixture);
    const types = new Set(flat.map((b) => b.type));
    for (const ty of ["callout", "heading_1", "heading_2", "heading_3", "paragraph", "bulleted_list_item", "numbered_list_item", "divider"]) {
      assert.ok(types.has(ty), `fixture has no ${ty}`);
    }
    assert.ok(flat.some((b) => b.parent.type === "block_id" && b.type === "paragraph"), "no paragraph nested in a list");
    const rich = flat.flatMap((b) => b[b.type]?.rich_text ?? []);
    assert.ok(rich.some((s) => s.annotations.italic && s.annotations.code), "no italic code span");
    assert.ok(rich.some((s) => s.annotations.bold && s.annotations.code), "no bold code span");
  });
});
