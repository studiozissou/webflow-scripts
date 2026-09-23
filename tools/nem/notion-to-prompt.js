// Serialises the Notion runtime page's blocks (raw API nested, raw flat, or n8n-simplified) into the report prompt, line for line as Notion's own markdown export writes it, and throws on any block it cannot represent faithfully.

const SKIPPED_TYPES = ["callout", "table_of_contents"];
const LIST_TYPES = ["bulleted_list_item", "numbered_list_item"];
const LINE_PREFIX = { heading_1: "# ", heading_2: "## ", heading_3: "### ", bulleted_list_item: "- ", paragraph: "" };
const RENDERED_TYPES = [...Object.keys(LINE_PREFIX), "numbered_list_item", "divider"];
const INDENT = "    ";

function richTextOf(block) {
  const own = block[block.type];
  if (own && Array.isArray(own.rich_text)) return own.rich_text;
  if (own && Array.isArray(own.text)) return own.text;
  if (Array.isArray(block.rich_text)) return block.rich_text;
  return null;
}

function parentIdOf(block) {
  const parent = block.parent;
  if (parent && typeof parent === "object" && parent.type === "block_id" && parent.block_id) return String(parent.block_id);
  return typeof block.parent_id === "string" ? block.parent_id : null;
}

function nestedOf(block) {
  return Array.isArray(block.children) ? block.children : [];
}

function idOf(block) {
  return block.id === undefined ? null : String(block.id);
}

function collect(blocks, containerId, out) {
  for (const block of blocks) {
    if (!block || typeof block !== "object" || typeof block.type !== "string") continue;
    out.push({ block, parentId: containerId ?? parentIdOf(block) });
    collect(nestedOf(block), idOf(block), out);
  }
  return out;
}

function indexNodes(entries) {
  const byId = new Map();
  const nodes = [];
  for (const { block, parentId } of entries) {
    if (block.archived === true || block.in_trash === true) continue;
    const id = idOf(block);
    if (id !== null && byId.has(id)) continue;
    const node = { block, parentId, children: [] };
    if (id !== null) byId.set(id, node);
    nodes.push(node);
  }
  return { byId, nodes };
}

function countNodes(list) {
  return list.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

function buildTree(blocks) {
  const { byId, nodes } = indexNodes(collect(Array.isArray(blocks) ? blocks : [], null, []));
  const roots = [];
  for (const node of nodes) {
    const parent = node.parentId !== null ? byId.get(node.parentId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  if (countNodes(roots) !== nodes.length) throw new Error("The page's block tree is inconsistent (a block is its own ancestor)");
  return roots;
}

function segmentText(segment) {
  if (!segment || typeof segment !== "object") return "";
  if (segment.type === "text" && segment.text && typeof segment.text.content === "string") return segment.text.content;
  return typeof segment.plain_text === "string" ? segment.plain_text : "";
}

function annotation(segment, name) {
  return Boolean(segment.annotations && segment.annotations[name]);
}

function wrap(text, mark) {
  const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return core === "" ? text : lead + mark + core + mark + trail;
}

function renderRun(run) {
  const spans = [];
  for (const piece of run.pieces) {
    const last = spans[spans.length - 1];
    if (last && last.code === piece.code && last.strike === piece.strike) last.text += piece.text;
    else spans.push({ ...piece });
  }
  const body = spans
    .map((s) => {
      const text = s.code ? "`" + s.text + "`" : s.text;
      return s.strike ? wrap(text, "~~") : text;
    })
    .join("");
  const mark = run.bold && run.italic ? "***" : run.bold ? "**" : run.italic ? "*" : "";
  return mark ? wrap(body, mark) : body;
}

function renderRichText(segments) {
  const runs = [];
  for (const segment of segments) {
    const text = segmentText(segment);
    if (text === "") continue;
    const piece = {
      text,
      bold: annotation(segment, "bold"),
      italic: annotation(segment, "italic"),
      code: annotation(segment, "code"),
      strike: annotation(segment, "strikethrough"),
    };
    const last = runs[runs.length - 1];
    if (last && last.bold === piece.bold && last.italic === piece.italic) last.pieces.push(piece);
    else runs.push({ bold: piece.bold, italic: piece.italic, pieces: [piece] });
  }
  return runs.map(renderRun).join("");
}

function innerTypeOf(block) {
  if (block.type !== "unsupported") return block.type;
  const inner = (block.unsupported && block.unsupported.block_type) || block.block_type;
  return typeof inner === "string" && inner !== "" ? inner : block.type;
}

function isSkipped(block) {
  if (SKIPPED_TYPES.includes(block.type) || innerTypeOf(block) === "button") return true;
  if (block.type !== "paragraph") return false;
  const rich = richTextOf(block);
  return rich !== null && renderRichText(rich).trim() === "";
}

function describeBlock(block) {
  return `Block ${block.id ?? "(no id)"} (${block.type})`;
}

function renderBlock(node, depth, number) {
  const { block } = node;
  const { type } = block;
  const indent = INDENT.repeat(depth);
  const isList = LIST_TYPES.includes(type);

  if (!RENDERED_TYPES.includes(type)) {
    throw new Error(`Unsupported block type: ${innerTypeOf(block)}`);
  }
  if (block.has_children === true && node.children.length === 0) {
    throw new Error(`${describeBlock(block)} has nested blocks that were not fetched`);
  }
  if (!isList && node.children.length > 0) {
    throw new Error(`Nested content under a ${type} block is not supported (${describeBlock(block)})`);
  }
  if (type === "divider") return [indent + "---"];

  const rich = richTextOf(block);
  if (rich === null) throw new Error(`${describeBlock(block)} carries no rich_text`);
  const prefix = type === "numbered_list_item" ? `${number}. ` : LINE_PREFIX[type];
  const lines = (prefix + renderRichText(rich)).split("\n").map((line) => (line === "" ? "" : indent + line));
  if (isList) lines.push(...renderSiblings(node.children, depth + 1));
  return lines;
}

function renderSiblings(nodes, depth) {
  const lines = [];
  let previous = null;
  let number = 0;
  for (const node of nodes) {
    if (isSkipped(node.block)) continue;
    const { type } = node.block;
    number = type === "numbered_list_item" ? number + 1 : 0;
    if (previous !== null && !(LIST_TYPES.includes(previous) && LIST_TYPES.includes(type))) lines.push("");
    lines.push(...renderBlock(node, depth, number));
    previous = type;
  }
  return lines;
}

function notionToPrompt(blocks) {
  const text = renderSiblings(buildTree(blocks), 0).join("\n");
  return text.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").replace(/\n+$/, "") + "\n";
}

function normalisePrompt(text) {
  const lines = String(text ?? "").split("\n").map((line) => line.replace(/\s+$/, ""));
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "") + "\n";
}

export { notionToPrompt, normalisePrompt };
