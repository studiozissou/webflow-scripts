// Turns Slack thread replies into approved and skipped build (B), plan (P) and automation (A) items, goal-fit decisions and the advisor verdict, fail-closed: only the digest thread, only after the digest ts, only the configured user, labels are the digest's running numbers (1..N, from digest.js numberParts) or, in older digests, B/P/A/Q prefixes with a bare number meaning B; each line of a reply is one command ("go 3 5", "link 12", or a list line "12. link"), and a reply with one bad line is rejected whole; only go/skip on build, plan and automation items (go all means every build item only), ok changes (which also applies the G goal-link proposals), ok advisors (only when the digest carries an advisor verdict) and link/keep/drop on goal-fit Q items; S session and V advisor lines are display only, never a reply ts twice (processedTs comes back de-duplicated); a reply with any unknown token is rejected whole and reported, never guessed. link/keep/drop count as commands only when a Q label follows the verb; otherwise the reply is chatter and ignored. Each Q item is decided once; drop only proposes Status Cancelled and is approved by a later ok changes. goalFitState ({ [label]: { verb, taskId, ts, status: done|pending|approved } }) carries both across runs.

const COMMAND = /^(go|skip|link|keep|drop|ok\s+changes|ok\s+advisors)\b(.*)$/is;
const OK_CHANGES_TAIL = /^\s*[.!]?$/;
export const GOAL_FIT_KIND = 'goal-fit';
export const PLAN_KIND = 'plan';
export const AUTOMATION_KIND = 'automation';
export const GOAL_LINK_KIND = 'goal-link';
export const ADVISOR_VERDICT_KIND = 'advisor-verdict';
const GO_KINDS = new Set(['build', PLAN_KIND, AUTOMATION_KIND]);
const GOAL_FIT_VERBS = new Set(['link', 'keep', 'drop']);
const Q_LABEL_FIRST = /^\s*Q\d+\b/i;
const FIRST_TOKEN = /^\s*(\d+)\b/;
const LIST_LINE = /^\s*(\d{1,3})\s*[.):-]?\s+(go|skip|link|keep|drop)\s*[.!]?\s*$/i;

// One command per line: "go 3 5", "link 12" or a list line "12. link"; null when no line is a command
// (chatter), and { problem } when command lines are mixed with a line that is not one.
function commandsOf(text, goalFitLabels = new Set()) {
  const lines = String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  const parsed = lines.map((line) => {
    const list = LIST_LINE.exec(line);
    if (list) return { verb: list[2].toLowerCase(), tail: ` ${list[1]}` };
    const match = COMMAND.exec(line);
    if (!match) return null;
    const verb = match[1].toLowerCase().replace(/\s+/g, ' ');
    if (GOAL_FIT_VERBS.has(verb) && !Q_LABEL_FIRST.test(match[2]) && !goalFitLabels.has(FIRST_TOKEN.exec(match[2])?.[1])) return null;
    return { verb, tail: match[2] };
  });
  if (!parsed.some(Boolean)) return null;
  const bad = lines.find((_, i) => !parsed[i]);
  return bad === undefined ? parsed : { problem: bad.slice(0, 40) };
}

function cloneState(st) {
  return {
    decisions: new Map(st.decisions),
    goalFitState: Object.fromEntries(Object.entries(st.goalFitState).map(([k, v]) => [k, { ...v }])),
    goalFit: { link: [...st.goalFit.link], keep: [...st.goalFit.keep], drop: [...st.goalFit.drop] },
    approvedDrops: [...st.approvedDrops],
    applyProposals: st.applyProposals,
    applyAdvisors: st.applyAdvisors,
  };
}

// Applies one command to st in place and returns its problems; the caller keeps st only when no
// command of the reply had a problem, so a reply is applied whole or not at all.
function runCommand({ verb, tail }, ts, st, { items, builds, verdictItem }) {
  if (verb === 'ok advisors') {
    if (!OK_CHANGES_TAIL.test(tail)) return [{ ts, token: tail.trim(), reason: 'ok advisors takes no arguments' }];
    if (!verdictItem) return [{ ts, token: '', reason: 'no advisor verdict in this digest' }];
    st.applyAdvisors = true;
    return [];
  }
  if (verb === 'ok changes') {
    if (!OK_CHANGES_TAIL.test(tail)) return [{ ts, token: tail.trim(), reason: 'ok changes takes no arguments' }];
    st.applyProposals = true;
    for (const [label, entry] of Object.entries(st.goalFitState)) {
      if (entry.verb !== 'drop' || entry.status !== 'pending' || !isTs(entry.ts) || compareTs(ts, entry.ts) <= 0) continue;
      entry.status = 'approved';
      st.approvedDrops.push({ label, taskId: entry.taskId });
    }
    return [];
  }
  const tokens = tail.split(/[\s,]+/).filter(Boolean).map((t) => t.toUpperCase());
  if (tokens.length === 0) return [{ ts, token: '', reason: 'no items given' }];
  if (GOAL_FIT_VERBS.has(verb)) {
    const { targets, problems } = goalFitTargets(ts, verb, tokens, items, st.goalFitState);
    if (problems.length > 0) return problems;
    for (const item of targets) {
      st.goalFitState[item.label] = { verb, taskId: item.taskId, ts, status: verb === 'drop' ? 'pending' : 'done' };
      st.goalFit[verb].push(goalFitEntry(verb, item));
    }
    return [];
  }
  if (tokens.length === 1 && tokens[0] === 'ALL') {
    for (const item of builds) st.decisions.set(item.label, { verb, item });
    return [];
  }
  const { targets, problems } = buildTargets(ts, tokens, items, builds);
  if (problems.length > 0) return problems;
  for (const item of targets) st.decisions.set(item.label, { verb, item });
  return [];
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

function resolve(token, builds, targetsOf) {
  const exact = targetsOf.find((item) => item.label === token);
  if (exact) return exact;
  if (/^\d+$/.test(token)) return builds.find((item) => item.label === `B${token}`) ?? null;
  return null;
}

// Build, plan and automation targets for go/skip, or the problems that reject the reply.
function buildTargets(ts, tokens, items, builds) {
  const targets = [];
  const problems = [];
  const goable = items.filter((i) => GO_KINDS.has(i.kind));
  for (const token of tokens) {
    const item = resolve(token, builds, goable);
    const other = items.some((i) => i.label === token);
    if (item) targets.push(item);
    else if (token === 'ALL') problems.push({ ts, token, reason: 'all must be the only item' });
    else if (other) problems.push({ ts, token, reason: 'not a build item' });
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
  let decisions = new Map();
  const unknown = [];
  const processed = [];
  let applyProposals = false;
  let goalFitState = savedGoalFitState(digestState, goalFits);
  let goalFit = { link: [], keep: [], drop: [] };
  let approvedDrops = [];
  const verdictItem = items.find((item) => item.kind === ADVISOR_VERDICT_KIND) ?? null;
  let applyAdvisors = false;

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

  const goalFitLabels = new Set(goalFits.map((i) => i.label));
  let st = { decisions, goalFitState, goalFit, approvedDrops, applyProposals, applyAdvisors };
  for (const reply of accepted) {
    const commands = commandsOf(reply.text, goalFitLabels);
    if (commands === null) continue;
    processed.push(reply.ts);
    seen.add(reply.ts);
    if (commands.problem) {
      unknown.push({ ts: reply.ts, token: commands.problem, reason: 'line not understood' });
      continue;
    }
    const next = cloneState(st);
    const problems = commands.flatMap((c) => runCommand(c, reply.ts, next, { items, builds, verdictItem }));
    if (problems.length > 0) unknown.push(...problems);
    else st = next;
  }
  ({ decisions, goalFitState, goalFit, approvedDrops, applyProposals, applyAdvisors } = st);

  const pick = (verb, kind = 'build') =>
    items
      .filter((item) => item.kind === kind && decisions.get(item.label)?.verb === verb)
      .map((item) => (kind === 'build' ? { n: item.label, pageId: item.pageId } : { n: item.label, pageId: item.pageId, slug: item.slug ?? null }));
  const goalLinks = applyProposals
    ? items.filter((item) => item.kind === GOAL_LINK_KIND && item.taskId && item.goalId).map((item) => ({ label: item.label, taskId: item.taskId, goalId: item.goalId }))
    : [];

  return {
    approved: pick('go'),
    skipped: pick('skip'),
    approvedPlans: pick('go', PLAN_KIND),
    skippedPlans: pick('skip', PLAN_KIND),
    approvedAutomations: pick('go', AUTOMATION_KIND),
    skippedAutomations: pick('skip', AUTOMATION_KIND),
    applyProposals,
    goalLinks,
    applyAdvisors,
    advisorVerdict: applyAdvisors ? (verdictItem.verdicts ?? []) : [],
    unknown,
    processedTs: [...new Set([...(digestState.processedTs ?? []), ...processed])],
    goalFit,
    approvedDrops,
    goalFitState,
  };
}
