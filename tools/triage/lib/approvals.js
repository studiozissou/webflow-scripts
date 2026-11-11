// Turns Slack thread replies into approved and skipped build items and goal-fit decisions, fail-closed: only the digest thread, only after the digest ts, only the configured user, only go/skip/ok changes on B items and link/keep/drop on goal-fit Q items, never a reply ts twice (processedTs comes back de-duplicated); a reply with any unknown token is rejected whole and reported, never guessed. link/keep/drop count as commands only when an item number (or legacy Q label) follows the verb; otherwise the reply is chatter and ignored. Each Q item is decided once; drop only proposes Status Cancelled and is approved by a later ok changes. goalFitState ({ [label]: { verb, taskId, ts, status: done|pending|approved } }) carries both across runs.

export const COMMAND = /^(go|skip|link|keep|drop|ok\s+changes)\b(.*)$/is;
const OK_CHANGES_TAIL = /^\s*[.!]?$/;
export const GOAL_FIT_KIND = 'goal-fit';
const GOAL_FIT_VERBS = new Set(['link', 'keep', 'drop']);
const Q_LABEL_FIRST = /^\s*Q?\d+\b/i;

// { verb, rest } when the text is an approval command, null when it is chatter (also used by the chat router).
export function commandOf(text) {
  const match = COMMAND.exec(String(text ?? '').trim());
  if (!match) return null;
  const verb = match[1].toLowerCase().replace(/\s+/g, ' ');
  if (GOAL_FIT_VERBS.has(verb) && !Q_LABEL_FIRST.test(match[2])) return null;
  return { verb, rest: match[2] };
}

export function compareTs(a, b) {
  const [as, af = ''] = String(a).split('.');
  const [bs, bf = ''] = String(b).split('.');
  const secs = BigInt(as) - BigInt(bs);
  if (secs !== 0n) return secs > 0n ? 1 : -1;
  const fa = af.padEnd(6, '0');
  const fb = bf.padEnd(6, '0');
  return fa === fb ? 0 : fa > fb ? 1 : -1;
}

const isTs = (v) => typeof v === 'string' && /^\d+(\.\d+)?$/.test(v);

function resolve(token, builds) {
  const exact = builds.find((item) => item.label === token);
  if (exact) return exact;
  if (/^\d+$/.test(token)) return builds.find((item) => item.label === `B${token}`) ?? null;
  return null;
}

// Build targets for go/skip, or the problems that reject the reply.
function buildTargets(ts, tokens, items, builds) {
  const targets = [];
  const problems = [];
  for (const token of tokens) {
    const item = resolve(token, builds);
    if (item) targets.push(item);
    else if (token === 'ALL') problems.push({ ts, token, reason: 'all must be the only item' });
    else if (items.some((i) => i.label === token)) problems.push({ ts, token, reason: 'not a build item' });
    else problems.push({ ts, token, reason: 'no such item' });
  }
  return { targets, problems };
}

function goalFitProblem(verb, token, item, state) {
  if (token === 'ALL') return 'all is not allowed here';
  if (!item) return 'no such item';
  if (item.kind !== GOAL_FIT_KIND) return 'not a goal-fit item';
  if (state[item.label]) return 'already decided';
  if (verb === 'link' && !item.goalId) return 'no goal proposed';
  return null;
}

// Goal-fit targets for link/keep/drop (exact Q labels only, each once), or the problems.
function goalFitTargets(ts, verb, tokens, items, state) {
  const targets = new Map();
  const problems = [];
  for (const token of tokens) {
    const item = items.find((i) => i.label === token);
    const reason = goalFitProblem(verb, token, item, state);
    if (reason) problems.push({ ts, token, reason });
    else targets.set(item.label, item);
  }
  return { targets: [...targets.values()], problems };
}

// Saved entries count only while their label and task still match a goal-fit item of this digest.
function savedGoalFitState(digestState, goalFits) {
  const state = {};
  for (const [label, entry] of Object.entries(digestState.goalFitState ?? {})) {
    const item = goalFits.find((i) => i.label === label.toUpperCase());
    if (item && entry?.taskId === item.taskId) state[item.label] = { ...entry };
  }
  return state;
}

const goalFitEntry = (verb, item) =>
  verb === 'link' ? { label: item.label, taskId: item.taskId, goalId: item.goalId } : { label: item.label, taskId: item.taskId };

export function parseReplies(digestState, replies = [], { userId } = {}) {
  if (!userId) throw new Error('parseReplies needs a userId');
  if (!digestState || !isTs(digestState.ts)) throw new Error('digest state needs a ts');
  const items = (digestState.items ?? []).map((item) => ({ ...item, label: String(item.n ?? item.label).toUpperCase() }));
  const builds = items.filter((item) => item.kind === 'build');
  const goalFits = items.filter((item) => item.kind === GOAL_FIT_KIND);
  const seen = new Set(digestState.processedTs ?? []);
  const decisions = new Map();
  const unknown = [];
  const processed = [];
  let applyProposals = false;
  const goalFitState = savedGoalFitState(digestState, goalFits);
  const goalFit = { link: [], keep: [], drop: [] };
  const approvedDrops = [];

  const accepted = replies
    .filter(
      (r) =>
        r &&
        isTs(r.ts) &&
        r.thread_ts === digestState.ts &&
        r.user === userId &&
        compareTs(r.ts, digestState.ts) > 0 &&
        !seen.has(r.ts),
    )
    .sort((a, b) => compareTs(a.ts, b.ts));

  for (const reply of accepted) {
    const command = commandOf(reply.text);
    if (!command) continue;
    const { verb, rest } = command;
    processed.push(reply.ts);
    seen.add(reply.ts);
    if (verb === 'ok changes') {
      if (!OK_CHANGES_TAIL.test(rest)) {
        unknown.push({ ts: reply.ts, token: rest.trim(), reason: 'ok changes takes no arguments' });
        continue;
      }
      applyProposals = true;
      for (const [label, entry] of Object.entries(goalFitState)) {
        if (entry.verb !== 'drop' || entry.status !== 'pending' || !isTs(entry.ts) || compareTs(reply.ts, entry.ts) <= 0) continue;
        entry.status = 'approved';
        approvedDrops.push({ label, taskId: entry.taskId });
      }
      continue;
    }
    const tokens = rest.split(/[\s,]+/).filter(Boolean).map((t) => t.toUpperCase());
    if (tokens.length === 0) {
      unknown.push({ ts: reply.ts, token: '', reason: 'no items given' });
      continue;
    }
    if (GOAL_FIT_VERBS.has(verb)) {
      const { targets, problems } = goalFitTargets(reply.ts, verb, tokens, items, goalFitState);
      if (problems.length > 0) {
        unknown.push(...problems);
        continue;
      }
      for (const item of targets) {
        goalFitState[item.label] = { verb, taskId: item.taskId, ts: reply.ts, status: verb === 'drop' ? 'pending' : 'done' };
        goalFit[verb].push(goalFitEntry(verb, item));
      }
      continue;
    }
    if (tokens.length === 1 && tokens[0] === 'ALL') {
      for (const item of builds) decisions.set(item.label, { verb, item });
      continue;
    }
    const { targets, problems } = buildTargets(reply.ts, tokens, items, builds);
    if (problems.length > 0) {
      unknown.push(...problems);
      continue;
    }
    for (const item of targets) decisions.set(item.label, { verb, item });
  }

  const pick = (verb) =>
    builds
      .filter((item) => decisions.get(item.label)?.verb === verb)
      .map((item) => ({ n: item.label, pageId: item.pageId }));

  return {
    approved: pick('go'),
    skipped: pick('skip'),
    applyProposals,
    unknown,
    processedTs: [...new Set([...(digestState.processedTs ?? []), ...processed])],
    goalFit,
    approvedDrops,
    goalFitState,
  };
}
