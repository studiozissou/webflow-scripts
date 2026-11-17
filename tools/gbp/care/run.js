// Weekly care runner: reads each client's profile through the read-only guard, drafts with a tool-less claude and writes a pack, never applying anything.
import { spawn as nodeSpawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createTokenProvider, isMainModule, redact } from '../auth.js';
import { main as slackMain } from '../../slack/cli.js';
import { draftTextProblems } from './claim-lint.js';
import { collect, needsInsights, validateHours } from './collect.js';
import { configPath, listConfiguredSlugs, loadCareConfig } from './config.js';
import { buildDraftInput, draftAll, validatePost, validateReply } from './draft.js';
import { fixtureConfigPath, fixtureSlugs, fixtureSpawn, createFixtureFetch, loadFixtureGoogle } from './fixture.js';
import { readOnlyFetch } from './guard.js';
import {
  DAY_MS,
  PACK_VERSION,
  UNKNOWN,
  careDir,
  fixtureCareDir,
  freePackPaths,
  globalOffPath,
  latestPack,
  localDate,
  priorInsightMonths,
  readPack,
  recentPackPaths,
  writePack,
} from './pack.js';

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const POST_EVERY_DAYS = 7;
const VOICE_MAX = 6000;
const REASON_MAX = 80;
const POST_SENT = new Set(['applying', 'live', 'pending', 'mismatch', 'unverified', 'error', UNKNOWN]);
const DRY_RUN_REASON = 'dry run: not drafted';
const POSTING_OFF = 'posting off: appeal by hand';
const CREDENTIALS = ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN'];
const USAGE = `usage: npm run gbp:care -- (--client <slug> [--client <slug>...] | --all) [--dry-run]
`;

class UsageError extends Error {}

function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        client: { type: 'string', multiple: true },
        all: { type: 'boolean' },
        'dry-run': { type: 'boolean' },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (err) {
    throw new UsageError(err.message);
  }
  const { client = [], all = false } = parsed.values;
  if (all === (client.length > 0)) throw new UsageError('give --client <slug> or --all, not both');
  for (const slug of client) configPath(slug);
  return { clients: client, all, dryRun: parsed.values['dry-run'] === true };
}

function readVoice(root, voice) {
  if (!voice) return '';
  try {
    return readFileSync(resolve(root, voice), 'utf8').slice(0, VOICE_MAX);
  } catch {
    return null;
  }
}

function sentPost(dir, now) {
  for (const path of recentPackPaths(dir, localDate(now - POST_EVERY_DAYS * DAY_MS)).reverse()) {
    let pack;
    try {
      pack = readPack(path);
    } catch {
      continue;
    }
    const item = (pack.items ?? []).find((entry) => entry?.type === 'post' && POST_SENT.has(entry.state));
    if (item) return { date: pack.date, state: item.state };
  }
  return null;
}

const asItem = (problems, extra) =>
  problems.length === 0 ? { state: 'drafted', ...extra } : { state: 'not approvable', problems, ...extra };

function replyItem(review, drafts, config) {
  const base = {
    type: 'reply',
    review: { reviewId: review.reviewId, starRating: review.starRating, text: review.text, starOnly: review.starOnly },
    before: { reviewReply: null },
  };
  if (drafts.reason) {
    return { ...base, state: 'not approvable', reason: drafts.reason, intent: { reviewId: review.reviewId, comment: '' } };
  }
  const draft = drafts.replies.find((entry) => entry?.reviewId === review.reviewId);
  const comment = typeof draft?.text === 'string' ? draft.text : '';
  const problems = validateReply(draft, { review, languages: config.languages }).problems;
  if (comment) problems.push(...draftTextProblems('reply', comment, config));
  return { ...base, ...asItem(problems, {}), intent: { reviewId: review.reviewId, comment } };
}

function postItem(facts, drafts, config, lastTheme) {
  const base = {
    type: 'post',
    before: { latestPostCreateTime: facts.posts.latest?.createTime ?? null },
  };
  if (drafts.reason) {
    return { ...base, state: 'not approvable', reason: drafts.reason, intent: { summary: '', languageCode: config.languages[0] } };
  }
  const draft = drafts.post;
  const summary = typeof draft?.text === 'string' ? draft.text : '';
  const problems = validatePost(draft, {
    languages: config.languages,
    ctaUrls: config.ctaUrls,
    recentSummaries: facts.posts.recentSummaries,
    lastTheme,
  }).problems;
  if (summary) problems.push(...draftTextProblems('post', summary, config));
  const intent = {
    summary,
    languageCode: draft?.lang ?? config.languages[0],
    ...(draft?.button ? { button: draft.button } : {}),
  };
  return { ...base, ...asItem(problems, {}), intent, theme: draft?.theme ?? null };
}

async function hoursItem(ctx, facts) {
  const proposal = facts.hours;
  const validation = await validateHours(ctx, facts.location.name, proposal, facts.merchant);
  return {
    type: 'hours',
    state: validation.valid ? 'drafted' : 'not approvable',
    ...(validation.valid ? {} : { reason: `Google rejects: ${validation.error}` }),
    changes: proposal.changes,
    intent: { edits: proposal.edits },
    before: { regularHours: proposal.before.regularHours, specialHours: proposal.before.specialHours },
  };
}

async function getDrafts(job, { config, facts, reviews, wantPost, lastTheme, voiceText }) {
  if (reviews.length === 0 && !wantPost) return { replies: [], post: null };
  if (!job.spawn) return { reason: DRY_RUN_REASON };
  const input = buildDraftInput({
    business: facts.location.title,
    languages: config.languages,
    sector: config.sector,
    voiceText,
    reviews,
    post: wantPost
      ? { themes: config.postThemes, recentSummaries: facts.posts.recentSummaries, lastTheme, ctaUrls: config.ctaUrls }
      : null,
  });
  try {
    return await draftAll({
      spawn: job.spawn,
      claudeBin: job.claudeBin,
      makeTempDir: job.makeTempDir,
      env: job.env,
      input,
    });
  } catch (err) {
    return { reason: `draft failed: ${redact(err.message, job.secrets)}` };
  }
}

async function runClient(job, slug) {
  const dir = job.fixtureDir ? fixtureCareDir(job.root, slug) : careDir(job.root, slug);
  const date = localDate(job.now());
  const createdAt = new Date(job.now()).toISOString();
  const pack = {
    version: PACK_VERSION,
    slug,
    date,
    createdAt,
    location: { name: null, title: null, v4Name: null },
    paused: false,
    items: [],
    ownerChecks: [],
    notes: [],
    insights: null,
  };
  const off = [globalOffPath(job.root), join(dir, 'gbp.off')].find((path) => existsSync(path));
  if (off) {
    pack.paused = { reason: `kill switch on (${off})` };
    return { paths: writePack(dir, pack, freePackPaths(dir, date)), pack };
  }

  const config = job.fixtureDir
    ? loadCareConfig(slug, { path: fixtureConfigPath(job.fixtureDir, slug) })
    : loadCareConfig(slug, { root: job.root });
  const ctx = job.ctxFor(slug);
  const wantInsights = needsInsights(date, priorInsightMonths(dir, date));
  const facts = await collect({ ctx, config, now: job.now, wantInsights });
  pack.location = facts.location;

  const previous = latestPack(dir, date);
  let lastTheme = null;
  if (previous) {
    try {
      lastTheme = readPack(previous).theme ?? null;
    } catch {
      pack.notes.push('previous pack unreadable; theme repeat not checked');
    }
  }
  const reviews = facts.reviews.unanswered;
  const postingBlocked = config.posting !== 'on' || facts.posts.rejected;
  const due = facts.posts.daysSinceLast === null || facts.posts.daysSinceLast >= POST_EVERY_DAYS;
  const sent = postingBlocked ? null : sentPost(dir, job.now());
  const wantPost = !postingBlocked && !sent && due;
  if (postingBlocked) pack.notes.push(POSTING_OFF);
  else if (sent) pack.notes.push(`post sent ${sent.date} (${sent.state}): not drafting another`);
  else if (!due) pack.notes.push(`last post ${facts.posts.daysSinceLast} days ago; no post this week`);

  const voiceText = readVoice(job.root, config.voice);
  if (voiceText === null) pack.notes.push('voice file not found; drafted without it');
  const drafts = await getDrafts(job, { config, facts, reviews, wantPost, lastTheme, voiceText: voiceText ?? '' });

  const items = reviews.map((review) => replyItem(review, drafts, config));
  if (wantPost) {
    const { theme, ...item } = postItem(facts, drafts, config, lastTheme);
    items.push(item);
    if (theme) pack.theme = theme;
  }
  if (facts.hours) {
    pack.ownerChecks.push(...facts.hours.ownerChecks);
    if (facts.hours.edits) items.push(await hoursItem(ctx, facts));
  }
  pack.items = items.map((item, index) => ({ n: index + 1, ...item }));
  if (facts.insights) {
    pack.insights = facts.insights.unavailable
      ? facts.insights
      : { ...facts.insights, totalReviewCount: facts.reviews.totalReviewCount, averageRating: facts.reviews.averageRating };
  }
  return { paths: writePack(dir, pack, freePackPaths(dir, date)), pack };
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const shortReason = (text, secrets) => redact(text, secrets).slice(0, REASON_MAX);

function countsLine(slug, outcome, secrets) {
  if (outcome.error) return `${slug} failed: ${shortReason(outcome.error.message, secrets)}`;
  if (outcome.pack.paused) return `${slug} paused: ${shortReason(outcome.pack.paused.reason, secrets)}`;
  const drafted = (type) => outcome.pack.items.filter((item) => item.type === type && item.state === 'drafted').length;
  const counts = [
    plural(drafted('reply'), 'reply', 'replies'),
    plural(drafted('post'), 'post', 'posts'),
    plural(drafted('hours'), 'hours change', 'hours changes'),
    plural(outcome.pack.ownerChecks.length, 'owner check', 'owner checks'),
  ];
  return `${slug} ${counts.join(', ')}`;
}

async function defaultPostSlack(text) {
  const dir = mkdtempSync(join(tmpdir(), 'gbp-care-slack-'));
  const file = join(dir, 'message.txt');
  try {
    writeFileSync(file, `${text}\n`, { mode: 0o600 });
    return await slackMain(['post', '--file', file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function buildJob(options, deps) {
  const env = deps.env ?? process.env;
  const root = resolve(deps.root ?? env.GBP_CARE_REPO ?? DEFAULT_ROOT);
  const now = deps.now ?? Date.now;
  const record = deps.record;
  const { spawn: realSpawn = nodeSpawn } = deps;
  const job = {
    env,
    root,
    now,
    claudeBin: env.CLAUDE_BIN || 'claude',
    makeTempDir: deps.makeTempDir ?? (() => mkdtemp(join(tmpdir(), 'gbp-care-claude-'))),
    secrets: [],
    fixtureDir: env.GBP_CARE_FIXTURE ? resolve(env.GBP_CARE_FIXTURE) : null,
  };
  if (job.fixtureDir) {
    const stdout = readFileSync(join(job.fixtureDir, 'drafts-run.json'), 'utf8');
    job.spawn = fixtureSpawn(stdout);
    job.makeTempDir = async () => tmpdir();
    job.ctxFor = (slug) => {
      const fetch = readOnlyFetch(
        deps.fetch ?? createFixtureFetch(loadFixtureGoogle(job.fixtureDir, slug), { now }),
        { record },
      );
      return { fetch, getToken: async () => 'fixture-access', sleep: async () => {} };
    };
    return job;
  }
  const missing = CREDENTIALS.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `${CREDENTIALS.slice(0, 2).join(', ')} and ${CREDENTIALS[2]} must be set (missing: ${missing.join(', ')}); run through scripts/gbp-env.sh. No pack written.`,
    );
  }
  job.secrets = [env.GBP_CLIENT_SECRET, env.GBP_REFRESH_TOKEN];
  job.spawn = options.dryRun ? null : realSpawn;
  const fetch = readOnlyFetch(deps.fetch ?? globalThis.fetch, { record });
  const getToken = createTokenProvider({
    clientId: env.GBP_CLIENT_ID,
    clientSecret: env.GBP_CLIENT_SECRET,
    refreshToken: env.GBP_REFRESH_TOKEN,
    fetch,
    now,
  });
  job.ctxFor = () => ({ fetch, getToken });
  return job;
}

export async function main(argv, deps = {}) {
  const writer = deps.writer ?? ((text) => process.stderr.write(text));
  let options;
  try {
    options = parseCli(argv);
  } catch (err) {
    writer(`${err.message}\n${USAGE}`);
    return 2;
  }
  let job;
  try {
    job = buildJob(options, deps);
  } catch (err) {
    writer(`gbp:care: ${redact(err.message)}\n`);
    return 1;
  }
  const slugs = options.all
    ? job.fixtureDir
      ? fixtureSlugs(job.fixtureDir)
      : listConfiguredSlugs({ root: job.root })
    : options.clients;
  if (slugs.length === 0) {
    writer('gbp:care: no configured clients\n');
    return 1;
  }

  const outcomes = [];
  for (const slug of slugs) {
    try {
      const outcome = await runClient(job, slug);
      outcomes.push([slug, outcome]);
      const approvable = outcome.pack.items.filter((item) => item.state === 'drafted').length;
      writer(
        outcome.pack.paused
          ? `${slug}: paused, ${outcome.pack.paused.reason}; pack ${outcome.paths.md}\n`
          : `${slug}: ${outcome.pack.items.length} items, ${approvable} approvable; pack ${outcome.paths.md}\n`,
      );
    } catch (err) {
      outcomes.push([slug, { error: err }]);
      writer(`${slug}: failed, ${redact(err.message, job.secrets)}\n`);
    }
  }

  if (!options.dryRun && !job.fixtureDir) {
    const date = localDate(job.now());
    const text = `GBP care ${date}: ${outcomes.map(([slug, outcome]) => countsLine(slug, outcome, job.secrets)).join('; ')}`;
    try {
      const code = await (deps.postSlack ?? defaultPostSlack)(text);
      if (code !== 0) writer(`gbp:care: Slack ping exited ${code}\n`);
    } catch (err) {
      writer(`gbp:care: Slack ping failed, ${redact(err.message)}\n`);
    }
  }
  return outcomes.some(([, outcome]) => outcome.error) ? 1 : 0;
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
