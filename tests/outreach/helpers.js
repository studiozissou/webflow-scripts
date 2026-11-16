// Shared fixture loaders, a fake fetchPage, a silent logger and a recording fake Notion client for the outreach tests.
import { readFileSync } from 'node:fs';

export const NOW = new Date('2026-11-12T07:00:00Z');

export const daysAgo = (n, from = NOW) => new Date(from.getTime() - n * 86_400_000).toISOString();

export const html = (name) => readFileSync(new URL(`./fixtures/html/${name}.html`, import.meta.url), 'utf8');

export const json = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

export const firstItems = (name) => json(name).tasks[0].result[0].items;

export const silentLog = { log() {}, warn() {}, error() {}, info() {}, debug() {} };

export function fakeFetchPage(pages) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const entry = pages[url];
    if (!entry) throw new Error(`Fetch failed for ${url}: fake network has no route`);
    if (entry instanceof Error) throw entry;
    return {
      html: entry.html ?? '',
      headers: entry.headers ?? {},
      statusCode: entry.statusCode ?? 200,
      redirectChain: entry.redirectChain ?? [],
      finalUrl: entry.finalUrl ?? url,
    };
  };
  fn.calls = calls;
  return fn;
}

export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

export function fakeNotion({ pages = [], children = {} } = {}) {
  const calls = [];
  const record = (name, result) => async (args) => {
    calls.push({ name, args });
    return typeof result === 'function' ? result(args) : result;
  };
  const client = {
    calls,
    databases: {
      query: record('databases.query', () => ({ results: pages, has_more: false, next_cursor: null })),
    },
    pages: {
      create: record('pages.create', () => ({ id: 'page-new-0001' })),
      update: record('pages.update', (args) => ({ id: args.page_id })),
    },
    blocks: {
      delete: record('blocks.delete', (args) => ({ id: args.block_id, archived: true })),
      children: {
        list: record('blocks.children.list', (args) => {
          const batches = children[args.block_id] ?? [[]];
          const index = args.start_cursor ? Number(args.start_cursor) : 0;
          const next = index + 1 < batches.length ? String(index + 1) : null;
          return { results: batches[index], has_more: next !== null, next_cursor: next };
        }),
        append: record('blocks.children.append', () => ({ results: [] })),
      },
    },
  };
  client.callsTo = (name) => calls.filter((c) => c.name === name);
  return client;
}
