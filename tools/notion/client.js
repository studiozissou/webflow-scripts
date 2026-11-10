// Thin Notion REST client for the Tasks Tracker: open-task query with pagination, a pure page mapper, and Priority/Status/comment writes.

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
};

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

export function mapTaskPage(page) {
  const properties = page?.properties ?? {};
  const titleProp = properties[PROPS.name] ?? Object.values(properties).find((p) => p?.type === 'title');
  const { [PROPS.due]: due, [PROPS.tags]: tags, [PROPS.hours]: hours, [PROPS.clients]: clients } = properties;
  return {
    id: page?.id ?? null,
    name: plain(titleProp?.title).trim(),
    status: optionName(properties[PROPS.status]),
    priority: optionName(properties[PROPS.priority]),
    due: due?.date?.start ?? null,
    doer: optionName(properties[PROPS.doer]),
    tags: Array.isArray(tags?.multi_select) ? tags.multi_select.map((t) => t.name).filter(Boolean) : [],
    blockedReason: textValue(properties[PROPS.blockedReason]),
    hours: typeof hours?.number === 'number' ? hours.number : null,
    clients: Array.isArray(clients?.relation) ? clients.relation.map((r) => r.id).filter(Boolean) : [],
    url: page?.url ?? null,
  };
}

export async function queryOpenTasks(client, databaseId, { excludeStatuses = ['Done', 'Cancelled'] } = {}) {
  const filter = {
    and: excludeStatuses.map((name) => ({ property: PROPS.status, status: { does_not_equal: name } })),
  };
  const tasks = [];
  let cursor;
  do {
    const response = await client.databases.query({
      database_id: databaseId,
      filter,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const page of response.results ?? []) {
      if (page.archived || page.in_trash) continue;
      tasks.push(mapTaskPage(page));
    }
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return tasks;
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
