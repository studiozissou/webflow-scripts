// Maps outreach prospect rows to the Notion Prospects database and upserts them by domain, never overwriting rows Will has moved past New.
import { normaliseDomain } from './text.js';

const LIMIT = 2000;

const chunks = (value) => {
  const s = String(value ?? '');
  const out = [];
  for (let i = 0; i < s.length; i += LIMIT) out.push(s.slice(i, i + LIMIT));
  return out;
};

const pieces = (value) => chunks(value).map((content) => ({ type: 'text', text: { content } }));
const richText = (value) => ({ rich_text: pieces(value) });
const title = (value) => ({ title: pieces(value) });
const select = (value) => ({ select: value ? { name: String(value) } : null });

const issuesText = (issues = []) =>
  issues.slice(0, 3).map((i) => `${i.text} [${i.evidence?.check ?? i.id}]`).join('\n');

const ranksText = (ranks = []) => ranks.map((r) => `${r.query}: ${r.position}`).join('\n');

const factsText = (facts = [], draftKind) => {
  const lines = facts.map((f) => `${f.fact} (${f.source})`);
  if (draftKind === 'generic') lines.unshift('draft: generic');
  return lines.join('\n');
};

export function toProperties(row) {
  const props = {
    Name: title(row.name),
    Domain: { url: normaliseDomain(row.domain) || null },
    Source: select(row.source),
    Verdict: select(row.verdict),
    Issues: richText(issuesText(row.issues)),
    'Facts used': richText(factsText(row.factsUsed, row.draftKind)),
    'GBP score': richText(row.gbpScore),
    'Map-pack ranks': richText(ranksText(row.ranks)),
    Language: select(row.language),
    Contact: richText(row.contact),
    'Email subject': richText(row.emailSubject),
    Draft: select(row.draftStatus ?? 'none'),
    'Last scanned': { date: row.lastScanned ? { start: row.lastScanned } : null },
    Run: richText(row.run),
  };
  if (row.keepDraft) {
    delete props['Email subject'];
    delete props.Draft;
  }
  return props;
}

const readStatus = (prop) => prop?.select?.name ?? prop?.status?.name ?? null;

export async function queryByDomain(client, databaseId, domain) {
  const res = await client.databases.query({
    database_id: databaseId,
    filter: { property: 'Domain', url: { equals: normaliseDomain(domain) ?? '' } },
    page_size: 1,
  });
  const page = res.results?.[0];
  return page ? { id: page.id, status: readStatus(page.properties?.Status) } : null;
}

const paragraphs = (text) =>
  String(text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => ({ object: 'block', type: 'paragraph', paragraph: richText(p) }));

export async function replaceBody(client, pageId, text) {
  const ids = [];
  let cursor;
  do {
    const res = await client.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    ids.push(...(res.results ?? []).map((b) => b.id));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  for (const id of ids) await client.blocks.delete({ block_id: id });
  const children = paragraphs(text);
  for (let i = 0; i < children.length; i += 100) {
    await client.blocks.children.append({ block_id: pageId, children: children.slice(i, i + 100) });
  }
}

export async function upsertProspect(client, databaseId, row, { touchOnly = false } = {}) {
  const existing = await queryByDomain(client, databaseId, row.domain);
  if (!existing && touchOnly) return { action: 'missing' };
  if (!existing) {
    const page = await client.pages.create({
      parent: { database_id: databaseId },
      properties: { ...toProperties(row), Status: { status: { name: 'New' } } },
      children: row.draft ? paragraphs(row.draft) : [],
    });
    return { action: 'created', pageId: page.id };
  }
  const isNew = !existing.status || existing.status === 'New';
  if (!isNew || touchOnly) {
    await client.pages.update({ page_id: existing.id, properties: { Run: richText(row.run) } });
    return { action: isNew ? 'touched' : 'protected', pageId: existing.id };
  }
  await client.pages.update({ page_id: existing.id, properties: toProperties(row) });
  if (row.draft && !row.keepDraft) await replaceBody(client, existing.id, row.draft);
  return { action: 'updated', pageId: existing.id };
}
