// Pure edits to Studio Zissou content markdown (meta, alt, FAQ, internal links, revert), each returning { text, before, after } and refusing by throwing.
const DEBUG = false;

const BRAND = 'Studio Zissou';
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;
const FAQ_MAX = 6;
const KEY_VALUE = /^[a-z][A-Za-z0-9-]*:(\s|$)/;

function refuse(reason) {
  throw new Error(`refused: ${reason}`);
}

function checkText(value, label) {
  const v = String(value ?? '');
  if (!v.trim()) refuse(`${label} is empty`);
  if (/[[\]]/.test(v)) refuse(`${label} contains [ or ], which marks an unconfirmed fact`);
  if (/[\r\n]/.test(v)) refuse(`${label} contains a newline`);
  return v;
}

function frontMatter(md) {
  const lines = md.split('\n');
  if (lines[0] !== '---') refuse('file has no front matter');
  const close = lines.findIndex((l, i) => i > 0 && l === '---');
  if (close === -1) refuse('front matter is not closed');
  return { lines, close };
}

function getField(md, key) {
  const { lines, close } = frontMatter(md);
  const at = lines.slice(1, close).findIndex((l) => l.startsWith(`${key}:`));
  if (at === -1) return { lines, close, index: -1, value: '' };
  return { lines, close, index: at + 1, value: lines[at + 1].slice(key.length + 1).trim() };
}

function putField(md, key, value) {
  const { lines, close, index, value: before } = getField(md, key);
  if (index === -1) lines.splice(close, 0, `${key}: ${value}`);
  else lines[index] = `${key}: ${value}`;
  return { text: lines.join('\n'), before, after: value };
}

function dropField(md, key) {
  const { lines, index, value: before } = getField(md, key);
  if (index !== -1) lines.splice(index, 1);
  return { text: lines.join('\n'), before, after: '' };
}

function section(lines, name) {
  const start = lines.findIndex((l) => l.trim() === `## ${name}`);
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end === -1) end = lines.length;
  return { start, end };
}

function firstParagraph(lines, range) {
  for (let i = range.start + 1; i < range.end; i += 1) {
    if (!isProse(lines[i])) continue;
    let j = i;
    while (j < range.end && isProse(lines[j])) j += 1;
    return { from: i, to: j };
  }
  return null;
}

function isProse(line) {
  const t = line.trim();
  return t !== '' && !t.startsWith('#') && !/^[-*]\s/.test(t) && !/^\d+\.\s/.test(t) && !KEY_VALUE.test(t);
}

function faqItems(lines, range) {
  const items = [];
  for (let i = range.start + 1; i < range.end; i += 1) {
    if (lines[i].startsWith('### ')) items.push({ index: i, question: lines[i].slice(4).trim() });
  }
  return items;
}

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function setMeta(md, field, value) {
  if (!['title', 'description'].includes(field)) refuse(`field must be title or description, not "${field}"`);
  const v = checkText(value, field);
  if (field === 'title') {
    if (v.length < TITLE_MIN || v.length > TITLE_MAX) refuse(`title is ${v.length} chars, needs ${TITLE_MIN} to ${TITLE_MAX}`);
    if (!v.endsWith(BRAND)) refuse(`title must end with "${BRAND}"`);
  } else if (v.length < DESC_MIN || v.length > DESC_MAX) {
    refuse(`description is ${v.length} chars, needs ${DESC_MIN} to ${DESC_MAX}`);
  }
  DEBUG && console.log('setMeta', field, v);
  return putField(md, field, v);
}

export function setAlt(md, field, value) {
  if (!/^[a-z][A-Za-z0-9]*Alt$/.test(field || '')) refuse(`field "${field}" is not an Alt field`);
  return putField(md, field, checkText(value, field));
}

export function addFaq(md, question, answer) {
  const q = checkText(question, 'question');
  const a = checkText(answer, 'answer');
  const lines = md.split('\n');
  const range = section(lines, 'faq');
  if (!range) refuse('no "## faq" section; a new FAQ needs 3 items, so it is a REVIEW change');
  const items = faqItems(lines, range);
  if (items.some((item) => same(item.question, q))) refuse(`duplicate question "${q}"`);
  if (items.length >= FAQ_MAX) refuse(`faq already has ${items.length} items, the limit is ${FAQ_MAX}`);
  let at = range.end;
  while (at - 1 > range.start && lines[at - 1].trim() === '') at -= 1;
  lines.splice(at, 0, '', `### ${q}`, a);
  return { text: lines.join('\n'), before: '', after: `${q}\n${a}` };
}

export function addLink(md, { section: name, anchor, href } = {}, { lint } = {}) {
  if (typeof lint !== 'function') refuse('addLink needs a lint function');
  const text = checkText(anchor, 'anchor');
  if (!/^\/(?!\/)[^\s()[\]#]*$/.test(href || '')) refuse(`href "${href}" must be an internal path starting with "/"`);
  const lines = md.split('\n');
  const range = section(lines, name);
  if (!range) refuse(`no "## ${name}" section`);
  const para = firstParagraph(lines, range);
  if (!para) refuse(`"## ${name}" has no paragraph`);
  const before = lines.slice(para.from, para.to).join('\n');
  const links = [...before.matchAll(/\[[^\]]*\]\([^)]*\)/g)].map((m) => [m.index, m.index + m[0].length]);
  const lower = before.toLowerCase();
  let at = lower.indexOf(text.toLowerCase());
  while (at !== -1 && links.some(([s, e]) => at < e && at + text.length > s)) at = lower.indexOf(text.toLowerCase(), at + 1);
  if (at === -1) refuse(`anchor "${text}" is not plain text in the first paragraph of "## ${name}"`);
  const after = `${before.slice(0, at)}[${before.slice(at, at + text.length)}](${href})${before.slice(at + text.length)}`;
  lines.splice(para.from, para.to - para.from, ...after.split('\n'));
  const next = lines.join('\n');
  const code = lint(next);
  if (code !== 0) refuse(`link-lint exited ${code}`);
  return { text: next, before, after };
}

function revertField(md, key, change) {
  const { value } = getField(md, key);
  if (value !== change.after) refuse(`${key} no longer matches the logged after value`);
  return change.before === '' ? dropField(md, key) : putField(md, key, change.before);
}

function revertFaq(md, change) {
  const question = String(change.after || '').split('\n')[0];
  const lines = md.split('\n');
  const range = section(lines, 'faq');
  const item = range && faqItems(lines, range).find((i) => same(i.question, question));
  if (!item) refuse(`faq "${question}" no longer exists`);
  let end = item.index + 1;
  while (end < range.end && !lines[end].startsWith('### ')) end += 1;
  const removed = lines.slice(item.index, end).join('\n');
  lines.splice(item.index, end - item.index);
  if (lines[lines.length - 1] !== '') lines.push('');
  return { text: lines.join('\n'), before: removed, after: '' };
}

export function revert(md, change) {
  DEBUG && console.log('revert', change.type);
  switch (change.type) {
    case 'meta-title':
      return revertField(md, 'title', change);
    case 'meta-description':
      return revertField(md, 'description', change);
    case 'alt': {
      const { lines, close } = frontMatter(md);
      const key = change.field || lines.slice(1, close).map((l) => l.split(':')[0]).find((k) => /Alt$/.test(k) && getField(md, k).value === change.after);
      if (!key) refuse('no alt field holds the logged after value');
      return revertField(md, key, change);
    }
    case 'faq':
      return revertFaq(md, change);
    case 'internal-link': {
      if (!change.after || !md.includes(change.after)) refuse('the linked paragraph no longer matches the logged after value');
      return { text: md.replace(change.after, () => change.before), before: change.after, after: change.before };
    }
    default:
      return refuse(`revert does not handle type "${change.type}"`);
  }
}
