// Picks the Slack DMs and threads the doer may draft a reply to: kind dm or thread only, at least one human message, and the last human message (by ts) not from Will's user id; with no user id it picks nothing.
import { compareTs } from './approvals.js';

const DRAFTABLE = new Set(['dm', 'thread']);
const isTs = (v) => typeof v === 'string' && /^\d+(\.\d+)?$/.test(v);

function lastHuman(messages) {
  const human = (Array.isArray(messages) ? messages : []).filter((m) => m && !m.bot && typeof m.user === 'string' && isTs(m.ts));
  return human.sort((a, b) => compareTs(a.ts, b.ts)).at(-1) ?? null;
}

export function draftTargets(threads = [], userId) {
  if (typeof userId !== 'string' || !userId) return [];
  return (Array.isArray(threads) ? threads : []).filter((t) => {
    if (!DRAFTABLE.has(t?.kind)) return false;
    const last = lastHuman(t.messages);
    return last !== null && last.user !== userId;
  });
}
