// Test-only: turns prompt markdown into the Notion blocks a paste into Notion would create (consecutive text lines become one paragraph with a soft line break), and reshapes them into the flat and n8n-simplified forms.

const PAGE_ID = "399c706b-69c0-80ea-b095-f89476b4fa21";
const SEGMENT_LIMIT = 2000;

const blockId = (n) => `b1000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function segment(content, annotations = {}) {
  return {
    type: "text",
    text: { content, link: null },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default",
      ...annotations,
    },
    plain_text: content,
    href: null,
  };
}

export function parseInline(line) {
  const out = [];
  let bold = false;
  let italic = false;
  let code = false;
  let buf = "";
  const flush = () => {
    for (let i = 0; i < buf.length; i += SEGMENT_LIMIT) {
      out.push(segment(buf.slice(i, i + SEGMENT_LIMIT), { bold, italic, code }));
    }
    buf = "";
  };
  for (let i = 0; i < line.length; ) {
    if (line[i] === "`") {
      flush();
      code = !code;
      i += 1;
    } else if (!code && line.startsWith("**", i)) {
      flush();
      bold = !bold;
      i += 2;
    } else if (!code && line[i] === "*") {
      flush();
      italic = !italic;
      i += 1;
    } else {
      buf += line[i];
      i += 1;
    }
  }
  flush();
  if (bold || italic || code) throw new Error(`unbalanced inline markers in: ${line.slice(0, 80)}`);
  return out;
}

function classify(content) {
  let m;
  if ((m = content.match(/^(#{1,3}) (.*)$/))) return { type: `heading_${m[1].length}`, text: m[2] };
  if (content === "---") return { type: "divider" };
  if ((m = content.match(/^- (.*)$/))) return { type: "bulleted_list_item", text: m[1] };
  if ((m = content.match(/^\d+\. (.*)$/))) return { type: "numbered_list_item", text: m[1] };
  return { type: "paragraph", text: content };
}

export function promptToNotionBlocks(markdown, { statusCallout = false } = {}) {
  let n = 0;
  const make = (type, text, parentId) => {
    const id = blockId(++n);
    const parent = parentId
      ? { type: "block_id", block_id: parentId }
      : { type: "page_id", page_id: PAGE_ID };
    const body = type === "divider" ? {} : { rich_text: parseInline(text), color: "default" };
    if (type === "callout") Object.assign(body, { icon: { type: "emoji", emoji: "⚪" }, color: "gray_background" });
    return { object: "block", id, parent, type, has_children: false, archived: false, in_trash: false, [type]: body };
  };

  const roots = [];
  if (statusCallout) roots.push(make("callout", "Not published yet.", null));

  const lastAtDepth = [];
  const rawText = new Map();
  let previous = null;
  for (const line of markdown.split("\n")) {
    if (line.trim() === "") {
      previous = null;
      continue;
    }
    const indent = line.match(/^ */)[0].length;
    if (indent % 4 !== 0) throw new Error(`indent is not a multiple of 4: ${line.slice(0, 80)}`);
    const depth = indent / 4;
    const { type, text } = classify(line.slice(indent));
    if (type === "paragraph" && previous && previous.type === "paragraph" && previous.depth === depth) {
      const joined = `${rawText.get(previous.block)}\n${text}`;
      rawText.set(previous.block, joined);
      previous.block.paragraph.rich_text = parseInline(joined);
      continue;
    }
    if (depth === 0) {
      const block = make(type, text, null);
      roots.push(block);
      lastAtDepth.length = 0;
      lastAtDepth[0] = block;
      rawText.set(block, text);
      previous = { block, type, depth };
    } else {
      const parent = lastAtDepth[depth - 1];
      if (!parent) throw new Error(`nested line has no parent: ${line.slice(0, 80)}`);
      const block = make(type, text, parent.id);
      parent.children = parent.children ?? [];
      parent.children.push(block);
      parent.has_children = true;
      lastAtDepth.length = depth;
      lastAtDepth[depth] = block;
      rawText.set(block, text);
      previous = { block, type, depth };
    }
  }
  return roots;
}

export function flattenBlocks(blocks) {
  const out = [];
  const walk = (list) => {
    for (const b of list) {
      const { children, ...rest } = b;
      out.push(rest);
      if (children) walk(children);
    }
  };
  walk(blocks);
  return out;
}

export function simplifyBlocks(flat) {
  return flat.map((b) => {
    const { parent, [b.type]: body, archived: _a, in_trash: _t, ...rest } = b;
    return {
      ...rest,
      parent_id: parent.type === "block_id" ? parent.block_id : parent.page_id,
      created_time: "2026-09-23T12:00:00.000Z",
      last_edited_time: "2026-09-23T12:00:00.000Z",
      ...body,
    };
  });
}
