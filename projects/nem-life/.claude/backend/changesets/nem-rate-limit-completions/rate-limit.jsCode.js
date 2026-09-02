// In-memory IP rate limit: max MAX_PER_HOUR submissions per IP per rolling hour.
// Uses n8n workflow static data (persists across executions of this workflow).
// Completion pings are logging, not submissions: neither counted nor blocked.
const input = $json;
if (input.event === 'completion') return [{ json: { ...input, rateLimited: false } }];
const ip = input.ip || 'unknown';
const store = $getWorkflowStaticData('global');
store.hits = store.hits || {};
const now = Date.now();
const windowMs = 60 * 60 * 1000;
const MAX_PER_HOUR = 50;
const recent = (store.hits[ip] || []).filter(t => now - t < windowMs);
const rateLimited = recent.length >= MAX_PER_HOUR;
if (!rateLimited) {
  recent.push(now);
}
store.hits[ip] = recent;
return [{ json: { ...input, rateLimited } }];
