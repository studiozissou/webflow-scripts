// Entry for gbp:approve, run by hand only: parses `<slug> <n…|all>`, builds the real or fixture context and applies the chosen pack items.
import { mkdtempSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTokenProvider, isMainModule, redact } from '../auth.js';
import { approveItems } from './approve.js';
import { configPath, loadCareConfig } from './config.js';
import { createFixtureFetch, fixtureConfigPath, loadFixtureGoogle } from './fixture.js';
import { LANDED, careDir, fixtureCareDir, globalOffPath } from './pack.js';

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const CREDENTIALS = ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN'];
const USAGE = 'usage: npm run gbp:approve -- <slug> <n…|all>\n';

class UsageError extends Error {}

function parseCli(argv) {
  const [slug, ...rest] = argv;
  if (!slug || rest.length === 0) throw new UsageError('give a client slug and item numbers or all');
  try {
    configPath(slug);
  } catch (err) {
    throw new UsageError(err.message);
  }
  if (rest.length === 1 && rest[0] === 'all') return { slug, selection: 'all' };
  if (!rest.every((value) => /^[1-9]\d*$/.test(value))) {
    throw new UsageError('item numbers must be positive whole numbers, or the single word all');
  }
  return { slug, selection: [...new Set(rest.map(Number))] };
}

function buildContext(slug, deps, env, root) {
  const fixtureDir = env.GBP_CARE_FIXTURE ? resolve(env.GBP_CARE_FIXTURE) : null;
  if (fixtureDir) {
    const data = loadFixtureGoogle(fixtureDir, slug, { afterPack: true });
    return {
      config: loadCareConfig(slug, { path: fixtureConfigPath(fixtureDir, slug) }),
      ctx: {
        fetch: deps.fetch ?? createFixtureFetch(data, { now: deps.now ?? Date.now }),
        getToken: async () => 'fixture-access',
        sleep: async () => {},
      },
      dir: fixtureCareDir(root, slug),
      lockRoot: deps.lockRoot ?? join(root, '.claude', 'care', 'fixture-packs', 'locks'),
      logPath: deps.logPath ?? join(mkdtempSync(join(tmpdir(), 'gbp-care-fixture-log-')), 'changes.jsonl'),
      sleep: deps.sleep ?? (async () => {}),
      secrets: [],
    };
  }
  const missing = CREDENTIALS.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `GBP_CLIENT_ID, GBP_CLIENT_SECRET and GBP_REFRESH_TOKEN must be set (missing: ${missing.join(', ')}); run through scripts/gbp-env.sh`,
    );
  }
  const fetch = deps.fetch ?? globalThis.fetch;
  return {
    config: loadCareConfig(slug, { root }),
    ctx: {
      fetch,
      getToken: createTokenProvider({
        clientId: env.GBP_CLIENT_ID,
        clientSecret: env.GBP_CLIENT_SECRET,
        refreshToken: env.GBP_REFRESH_TOKEN,
        fetch,
      }),
    },
    dir: careDir(root, slug),
    lockRoot: deps.lockRoot ?? join(homedir(), '.cache', 'gbp-care'),
    logPath: deps.logPath,
    sleep: deps.sleep,
    secrets: [env.GBP_CLIENT_SECRET, env.GBP_REFRESH_TOKEN],
  };
}

export async function main(argv, deps = {}) {
  const writer = deps.writer ?? ((text) => process.stderr.write(text));
  const env = deps.env ?? process.env;
  let args;
  try {
    args = parseCli(argv);
  } catch (err) {
    writer(`${err.message}\n${USAGE}`);
    return 2;
  }
  const root = resolve(deps.root ?? env.GBP_CARE_REPO ?? DEFAULT_ROOT);
  let context;
  try {
    context = buildContext(args.slug, deps, env, root);
  } catch (err) {
    writer(`gbp:approve: ${redact(err.message)}\n`);
    return 1;
  }
  try {
    const outcome = await approveItems({
      slug: args.slug,
      selection: args.selection,
      config: context.config,
      ctx: context.ctx,
      dir: context.dir,
      globalOff: globalOffPath(root),
      lockRoot: context.lockRoot,
      logPath: context.logPath,
      now: deps.now ?? Date.now,
      ...(context.sleep ? { sleep: context.sleep } : {}),
      writer,
      secrets: context.secrets,
    });
    if (outcome.refused) {
      writer(`refused: ${outcome.refused}\n`);
      return 1;
    }
    if (outcome.results.length === 0) {
      writer('gbp:approve: nothing selected to apply\n');
      return 1;
    }
    return outcome.results.every((result) => LANDED.has(result.state)) ? 0 : 1;
  } catch (err) {
    writer(`gbp:approve: ${redact(err.message, context.secrets)}\n`);
    return 1;
  }
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
