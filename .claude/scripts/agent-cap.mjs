// PreToolUse hook that refuses the Agent tool while the 5-hour usage file reports a recent reading at or above the limit.
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIMIT = 75;
const MAX_AGE_MS = 10 * 60 * 1000;
const DEBUG = false;

export function usageFile(env = process.env) {
  return env.AGENT_CAP_FILE || join(homedir(), '.claude/usage-5h');
}

export function parseUsage(text) {
  const match = String(text ?? '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function checkCap({ path = usageFile(), now = Date.now(), limit = LIMIT } = {}) {
  try {
    const { mtimeMs } = statSync(path);
    if (now - mtimeMs > MAX_AGE_MS) return { code: 0, stderr: '' };
    const usage = parseUsage(readFileSync(path, 'utf8'));
    DEBUG && console.log('agent-cap', { path, usage });
    if (usage === null || usage < limit) return { code: 0, stderr: '' };
    return { code: 2, stderr: `5-hour usage at ${usage}%: do this inline with Grep and Read instead of spawning an agent.\n` };
  } catch {
    return { code: 0, stderr: '' };
  }
}

function isMain() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  const result = checkCap();
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.code;
}
