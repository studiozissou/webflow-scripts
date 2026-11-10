// Formats the snapshot rollup for Slack: class counts, the two digest headline lines, and thread reply 1 "Where is everything" with one *Class (N)* header per class and display-only items S1..Sn numbered across classes (every Waiting item, top 5 of the rest, Stale only on Amsterdam Mondays, at most 40 lines), in short plain STE sentences with digits; untrusted titles lose dashes, emoji and Slack markup, and the cloud fallback line shows when remote sessions were not listed.
import { classify, failedBuild } from './sessions.js';
import { amsterdamDate, workingDaysBetween } from './workdays.js';
import { isStale } from './snapshot.js';

export const TOP_N = 5;
export const MAX_LINES = 40;
export const CLOUD_FALLBACK = 'Cloud sessions: not available in scheduled run';
const TITLE_WORDS = 8;
const DETAIL_WORDS = 12;

const LABELS = { waiting: 'Waiting on you', inFlight: 'In flight', built: 'Built, not merged', planned: 'Planned', stale: 'Stale' };
const KIND = { job: 'Job', desktop: 'Desktop session', cli: 'Session', cloud: 'Cloud session', remote: 'Remote session', worktree: 'Branch', pr: 'PR', spec: 'Spec', plan: 'Plan' };

// Untrusted text in a bulletin: no dashes, emoji, shortcodes, Slack markup or mentions; few words.
function plain(text, maxWords) {
  const words = String(text ?? '')
    .replace(/[‒–—―]/g, '-')
    .replace(/(?![©®™])\p{Extended_Pictographic}|️/gu, '')
    .replace(/:[a-z_+-][a-z0-9_+-]*:/gi, '')
    .replace(/[*_`~<>|]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, maxWords).join(' ').replace(/[\s,;:-]+$/, '');
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function ago(lastActivity, nowMs) {
  const minutes = Math.max(1, Math.round((nowMs - Date.parse(lastActivity)) / 60_000));
  return minutes < 60 ? `${minutes} min` : plural(Math.round(minutes / 60), 'hour');
}

// No result.json (a died job) means no date to show.
const buildLine = (result) => `Build job ${plain(result.status, 1)}${result.at ? ` on ${amsterdamDate(result.at)}` : ''}`;

function reasons(item, cls, nowMs) {
  const kind = KIND[item.kind] ?? 'Session';
  const out = [];
  if (cls === 'waiting') {
    if (item.kind === 'plan') out.push('Plan waits for your go');
    else if (failedBuild(item) && !item.needsUser) out.push(buildLine(item.result), 'Check it');
    else if (item.pr?.reviewRequested && !item.needsUser) out.push(`PR ${item.pr.number} needs your review`);
    else out.push(`${kind} waits on you`);
    const detail = plain(item.detail, DETAIL_WORDS);
    if (detail) out.push(`Asks: ${detail}`);
  } else if (cls === 'inFlight') {
    out.push(item.state === 'working' || !item.lastActivity ? `${kind} is working` : `Active ${ago(item.lastActivity, nowMs)} ago`);
  } else if (cls === 'built' || cls === 'stale') {
    if (item.branch) out.push(`Branch ${plain(item.branch, 1)}`);
    if (item.ahead > 0) out.push(`${plural(item.ahead, 'commit')} ahead of main`);
    if (item.pr) out.push(`PR ${item.pr.number} is open`);
    if (cls === 'built' && item.result) out.push(buildLine(item.result));
    if (cls === 'stale') {
      out.push(item.lastActivity ? `No activity for ${workingDaysBetween(item.lastActivity, new Date(nowMs))} working days` : 'No activity found');
    }
  } else if (cls === 'planned') {
    const status = plain(String(item.spec?.status ?? '').split(/[,;(]|\s[-‒–—―]\s/)[0], 4).toLowerCase();
    out.push(status ? `Spec is ${status}` : 'Spec is ready', 'No build branch yet');
  }
  return out;
}

function itemLine(n, item, cls, nowMs) {
  const title = plain(item.title, TITLE_WORDS) || `Untitled ${(KIND[item.kind] ?? 'session').toLowerCase()}`;
  const sentences = [title, ...reasons(item, cls, nowMs)].map((s) => (/[.!?]$/.test(s) ? s : `${s}.`));
  return `S${n}. ${sentences.join(' ')}`;
}

const isMonday = (now) => new Date(`${amsterdamDate(now)}T12:00:00Z`).getUTCDay() === 1;

export function rollup(snapshot, { now = new Date() } = {}) {
  const nowMs = new Date(now).getTime();
  const classes = classify(snapshot, { now: new Date(nowMs).toISOString() });
  const counts = {
    waiting: classes.waiting.length,
    inFlight: classes.inFlight.length,
    built: classes.built.length,
    planned: classes.planned.length,
    stale: classes.stale.length,
    plansToApprove: classes.waiting.filter((i) => i.kind === 'plan').length,
  };
  const headline = `Waiting on you: ${counts.waiting}\nIn flight: ${counts.inFlight} · Built: ${counts.built} · Plans to approve: ${counts.plansToApprove}`;

  const shown = ['waiting', 'inFlight', 'built', 'planned', ...(isMonday(now) ? ['stale'] : [])];
  const fallback = snapshot?.sources?.remote === 'ok' ? [] : [CLOUD_FALLBACK];
  const fixed = 1 + shown.length + fallback.length;
  const limits = Object.fromEntries(shown.map((c) => [c, Math.min(classes[c].length, TOP_N)]));
  // Every Waiting item, as far as the line cap allows.
  const others = shown.filter((c) => c !== 'waiting').reduce((sum, c) => sum + limits[c], 0);
  limits.waiting = Math.min(classes.waiting.length, MAX_LINES - fixed - others);

  const lines = ['*Where is everything*'];
  const items = [];
  for (const cls of shown) {
    const list = classes[cls].slice(0, limits[cls]);
    const total = classes[cls].length;
    lines.push(`*${LABELS[cls]} (${list.length < total ? `${list.length} of ${total}` : total})*`);
    for (const item of list) {
      const n = items.length + 1;
      items.push({ n: `S${n}`, id: item.id, class: cls });
      lines.push(itemLine(n, item, cls, nowMs));
    }
  }
  lines.push(...fallback);
  return { counts, headline, thread: lines.join('\n'), items, outdated: isStale(snapshot, now) };
}
