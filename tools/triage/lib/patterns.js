// Automation spotting for triage P6, pure: spot() counts recurring work in the last 30 days from Done tasks (name tokens and Tags, with Source sender when given), session titles and learnings lines, keeps every token, tag or sender shared by at least 3 items (tokens with the same items merge into one key), drops a group whose items a larger chosen group already covers, and returns at most 3 A items for the Monday COULD AUTOMATE block, each with a one-line STE proposal (template for one sender, skill for session or learnings work, scheduled routine otherwise).
import { sanitize } from './sessions.js';
import { DAY_MS, toMs } from './workdays.js';

export const THRESHOLD = 3;
export const WINDOW_DAYS = 30;
export const MAX_PROPOSALS = 3;
const MIN_WORD = 4;
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'onto', 'this', 'that', 'then', 'than', 'have', 'need', 'make', 'some',
  'about', 'after', 'before', 'over', 'under', 'page', 'task', 'tasks', 'work', 'done', 'todo', 'next', 'check', 'monthly',
  'weekly', 'daily', 'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
]);

export function tokens(text) {
  const words = String(text ?? '').toLowerCase().replace(/[^a-z\s-]+/g, ' ').split(/[\s-]+/);
  return [...new Set(words.filter((w) => w.length >= MIN_WORD && !STOPWORDS.has(w)))];
}

function within(at, nowMs) {
  const ms = toMs(at);
  return Number.isFinite(ms) && ms <= nowMs && nowMs - ms <= WINDOW_DAYS * DAY_MS;
}

function itemsOf({ tasks = [], sessions = [], learnings = [] }, nowMs) {
  const items = [];
  for (const t of tasks) {
    if (t?.status !== 'Done' || !within(t.doneAt ?? t.lastEdited, nowMs)) continue;
    items.push({ source: 'task', words: tokens(t.name), tags: (t.tags ?? []).map(String), sender: t.sender ? String(t.sender).toLowerCase() : null });
  }
  for (const s of sessions) if (within(s?.lastActivity, nowMs)) items.push({ source: 'session', words: tokens(s.title), tags: [], sender: null });
  for (const l of learnings) if (within(l?.date, nowMs)) items.push({ source: 'learning', words: tokens(l.text), tags: [], sender: null });
  return items;
}

function groupsOf(items) {
  const byKey = new Map();
  const add = (key, i) => {
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key).add(i);
  };
  items.forEach((item, i) => {
    for (const w of item.words) add(`word:${w}`, i);
    for (const tag of item.tags) add(`tag:${tag}`, i);
    if (item.sender) add(`sender:${item.sender}`, i);
  });
  const bySet = new Map();
  for (const [key, set] of byKey) {
    if (set.size < THRESHOLD) continue;
    const id = [...set].sort((a, b) => a - b).join(',');
    if (!bySet.has(id)) bySet.set(id, { members: set, keys: [] });
    bySet.get(id).keys.push(key);
  }
  return [...bySet.values()];
}

function proposalOf(group, items) {
  const members = [...group.members].map((i) => items[i]);
  if (group.keys.some((k) => k.startsWith('sender:'))) return 'a reply template';
  if (members.every((m) => m.source !== 'task')) return 'a skill';
  return 'a scheduled routine';
}

const labelOf = (keys) => keys.map((k) => k.slice(k.indexOf(':') + 1)).join(' ');
const slugOf = (label) => `auto-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`.slice(0, 60).replace(/-+$/, '');

export function spot(input = {}, { now = new Date(), max = MAX_PROPOSALS } = {}) {
  const items = itemsOf(input, toMs(now));
  const groups = groupsOf(items).sort((a, b) => b.members.size - a.members.size || labelOf(a.keys).localeCompare(labelOf(b.keys)));
  const covered = new Set();
  const out = [];
  for (const g of groups) {
    if (out.length >= max) break;
    if ([...g.members].every((i) => covered.has(i))) continue;
    for (const i of g.members) covered.add(i);
    const key = sanitize(labelOf(g.keys), { max: 60 });
    const proposal = proposalOf(g, items);
    const n = `A${out.length + 1}`;
    const slug = slugOf(key);
    out.push({
      n,
      kind: 'automation',
      pageId: slug,
      slug,
      key,
      count: g.members.size,
      proposal,
      line: `${n}. "${key}" came up ${g.members.size} times in ${WINDOW_DAYS} days. Make ${proposal} for it. Reply go ${n} to plan it.`,
    });
  }
  return out;
}
