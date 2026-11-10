// Thin Notion REST client for the Tasks Tracker and the Goals DB: token from NOTION_TOKEN or the Keychain (resolveToken, notionClientFromEnv), paginated open-task and goal queries, pure task and goal page mappers, Priority/Status/comment writes, and linkGoal, which only ever appends to a task's Goal relation.
import { execFileSync } from 'node:child_process';

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

// Exact Notion property names per the triage skill's notion_schema; the title is also found by type if renamed.
const PROPS = {
  name: 'Task name',
  status: 'Status',
  priority: 'Priority',
  due: 'Due date',
  doer: 'Doer',
  tags: 'Tags',
  blockedReason: 'Blocked Reason',
  hours: 'Hours Estimate',
  clients: 'Clients',
  goal: 'Goal',
};

// Exact Notion property names in the Goals DB; the title is also found by type if renamed.
const GOAL_PROPS = {
  name: 'Goal',
  status: 'Status',
  horizon: 'Horizon',
  clients: 'Clients',
  tasks: 'Tasks',
  measure: 'Measure',
  targetDate: 'Target date',
  why: 'Why',
  lastReviewed: 'Last reviewed',
  progress: 'Progress',
};

const KEYCHAIN_ARGS = ['find-generic-password', '-s', 'mcp', '-a', 'notion-triage', '-w'];

export function resolveToken({ env = process.env, exec = execFileSync } = {}) {
  if (env.NOTION_TOKEN) return env.NOTION_TOKEN;
  let raw;
  try {
    raw = exec('security', KEYCHAIN_ARGS, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    throw new Error('Notion token not found: set NOTION_TOKEN or add Keychain item -s mcp -a notion-triage');
  }
  const token = String(raw ?? '').trim();
  if (!token) throw new Error('Notion token from Keychain item mcp/notion-triage is empty');
  return token;
}

// The one way to get an authenticated client (tools/notion/cli.js and triage learnings comments).
export async function notionClientFromEnv(options) {
  return createNotionClient({ token: resolveToken(options) });
}

export async function createNotionClient({ token } = {}) {
  if (!token) throw new Error('createNotionClient: token is required');
  const { Client } = await import('@notionhq/client');
  return new Client({ auth: token });
}

function plain(richText) {
  return Array.isArray(richText) ? richText.map((t) => t?.plain_text ?? t?.text?.content ?? '').join('') : '';
}

function optionName(prop) {
  return prop?.[prop.type]?.name ?? null;
}

function textValue(prop) {
  if (!prop) return null;
  const text = plain(prop[prop.type] ?? prop.rich_text).trim();
  return text || null;
}

function titleOf(properties, name) {
  const prop = properties[name] ?? Object.values(properties).find((p) => p?.type === 'title');
  return plain(prop?.title).trim();
}

const relationIds = (prop) => (Array.isArray(prop?.relation) ? prop.relation.map((r) => r.id).filter(Boolean) : []);
const dateStart = (prop) => prop?.date?.start ?? null;

// A rollup's number (Progress is a percent as 0..1), else the property's own number, else null.
function numberValue(prop) {
  const value = prop?.type === 'rollup' ? prop.rollup?.number : prop?.number;
  return typeof value === 'number' ? value : null;
}

export function mapTaskPage(page) {
  const properties = page?.properties ?? {};
  const { [PROPS.due]: due, [PROPS.tags]: tags, [PROPS.hours]: hours, [PROPS.clients]: clients } = properties;
  return {
    id: page?.id ?? null,
    name: titleOf(properties, PROPS.name),
    status: optionName(properties[PROPS.status]),
    priority: optionName(properties[PROPS.priority]),
    due: dateStart(due),
    doer: optionName(properties[PROPS.doer]),
    tags: Array.isArray(tags?.multi_select) ? tags.multi_select.map((t) => t.name).filter(Boolean) : [],
    blockedReason: textValue(properties[PROPS.blockedReason]),
    hours: typeof hours?.number === 'number' ? hours.number : null,
    clients: relationIds(clients),
    goalIds: relationIds(properties[PROPS.goal]),
    createdTime: page?.created_time ?? null,
    url: page?.url ?? null,
  };
}

export function mapGoalPage(page) {
  const properties = page?.properties ?? {};
  const prop = (key) => properties[GOAL_PROPS[key]];
  return {
    id: page?.id ?? null,
    url: page?.url ?? null,
    name: titleOf(properties, GOAL_PROPS.name),
    status: optionName(prop('status')),
    horizon: optionName(prop('horizon')),
    clientIds: relationIds(prop('clients')),
    taskIds: relationIds(prop('tasks')),
    measure: textValue(prop('measure')),
    targetDate: dateStart(prop('targetDate')),
    why: textValue(prop('why')),
    lastReviewed: dateStart(prop('lastReviewed')),
    progress: numberValue(prop('progress')),
  };
}

function statusFilter(excludeStatuses) {
  if (excludeStatuses.length === 0) return undefined;
  return { and: excludeStatuses.map((name) => ({ property: PROPS.status, status: { does_not_equal: name } })) };
}

async function queryAll(client, databaseId, filter, map) {
  const rows = [];
  let cursor;
  do {
    const response = await client.databases.query({
      database_id: databaseId,
      ...(filter ? { filter } : {}),
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const page of response.results ?? []) {
      if (page.archived || page.in_trash) continue;
      rows.push(map(page));
    }
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return rows;
}

export async function queryOpenTasks(client, databaseId, { excludeStatuses = ['Done', 'Cancelled'] } = {}) {
  return queryAll(client, databaseId, statusFilter(excludeStatuses), mapTaskPage);
}

export async function queryGoals(client, databaseId, { excludeStatuses = [] } = {}) {
  return queryAll(client, databaseId, statusFilter(excludeStatuses), mapGoalPage);
}

export async function updatePriority(client, pageId, value) {
  if (!PRIORITIES.includes(value)) throw new Error(`Priority must be one of ${PRIORITIES.join(', ')}`);
  return client.pages.update({ page_id: pageId, properties: { [PROPS.priority]: { select: { name: value } } } });
}

export async function updateStatus(client, pageId, value) {
  if (!value) throw new Error('Status value is required');
  return client.pages.update({ page_id: pageId, properties: { [PROPS.status]: { status: { name: value } } } });
}

export async function addComment(client, pageId, text) {
  if (!text) throw new Error('Comment text is required');
  return client.comments.create({
    parent: { page_id: pageId },
    rich_text: [{ type: 'text', text: { content: text } }],
  });
}

// The page object lists at most 25 relation ids; a longer relation is read in full through the
// property endpoint, so the write-back never drops a link.
async function relationOf(client, pageId, prop) {
  if (!prop.has_more) return relationIds(prop);
  const ids = [];
  let cursor;
  do {
    const res = await client.pages.properties.retrieve({ page_id: pageId, property_id: prop.id, ...(cursor ? { start_cursor: cursor } : {}) });
    for (const item of res.results ?? []) if (item?.relation?.id) ids.push(item.relation.id);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return ids;
}

// A Notion id without dashes, lower case, so dashed and bare forms compare equal.
export const bareId = (id) => String(id ?? '').replace(/-/g, '').toLowerCase();

// Appends goalId to the task's Goal relation (no-op when present). Writes only that property.
export async function linkGoal(client, taskPageId, goalId) {
  if (!goalId) throw new Error('goalId is required');
  const task = await client.pages.retrieve({ page_id: taskPageId });
  const prop = task?.properties?.[PROPS.goal];
  if (prop?.type !== 'relation') throw new Error(`task ${taskPageId} has no ${PROPS.goal} relation`);
  const current = await relationOf(client, taskPageId, prop);
  if (current.some((id) => bareId(id) === bareId(goalId))) return { linked: false, goalIds: current };
  const goalIds = [...current, goalId];
  await client.pages.update({ page_id: taskPageId, properties: { [PROPS.goal]: { relation: goalIds.map((id) => ({ id })) } } });
  return { linked: true, goalIds };
}
