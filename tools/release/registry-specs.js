// Picks the runnable Playwright specs from tests/registry.json (all, or since last deploy plus critical) and runs them with the acceptance config.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = 'tests/acceptance/';
const CONFIG = 'tests/acceptance/playwright.config.js';

export function selectSpecs(registry, { since = false, exists = existsSync } = {}) {
  const last = registry.lastDeployed;
  const run = [];
  const skipped = [];
  for (const entry of registry.testPages || []) {
    const { slug, spec } = entry;
    let reason = null;
    if (!spec) reason = 'no spec path';
    else if (!spec.startsWith(ROOT)) reason = 'outside tests/acceptance';
    else if (!spec.endsWith('.spec.js')) reason = 'not a .spec.js file';
    else if (!exists(spec)) reason = 'missing file';
    if (reason) {
      skipped.push({ slug, spec, reason });
      continue;
    }
    if (since && last && !(entry.created > last) && !entry.critical) continue;
    if (!run.includes(spec)) run.push(spec);
  }
  return { run, skipped };
}

function main() {
  const since = process.argv.includes('--since');
  const registry = JSON.parse(readFileSync('tests/registry.json', 'utf8'));
  const { run, skipped } = selectSpecs(registry, { since });
  process.stdout.write(
    `Registry specs: ${run.length} to run (${since ? `since ${registry.lastDeployed || 'never'} + critical` : 'full'}), ${skipped.length} skipped\n`,
  );
  for (const s of skipped) process.stdout.write(`  skip ${s.slug}: ${s.reason}${s.spec ? ` (${s.spec})` : ''}\n`);
  if (!run.length) return;
  const res = spawnSync('npx', ['playwright', 'test', ...run, `--config=${CONFIG}`, '--reporter=list'], {
    stdio: 'inherit',
  });
  process.exitCode = res.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
