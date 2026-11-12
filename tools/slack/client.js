// Thin Slack Web API client for the Daybook bot: bot and app tokens from SLACK_BOT_TOKEN / SLACK_APP_TOKEN or the Keychain (mcp/slack-bot, mcp/slack-app), and api(), a form-encoded POST that throws with the Slack error code on ok:false and never puts a token in an error.
import { execFileSync } from 'node:child_process';

export const DEFAULT_API_BASE = 'https://slack.com/api';

function resolveToken(envName, account, { env = process.env, exec = execFileSync } = {}) {
  if (env[envName]) return env[envName];
  let raw;
  try {
    raw = exec('security', ['find-generic-password', '-s', 'mcp', '-a', account, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    throw new Error(`Slack token not found: set ${envName} or add Keychain item -s mcp -a ${account}`);
  }
  const token = String(raw ?? '').trim();
  if (!token) throw new Error(`Slack token from Keychain item mcp/${account} is empty`);
  return token;
}

export const resolveBotToken = (options) => resolveToken('SLACK_BOT_TOKEN', 'slack-bot', options);
export const resolveAppToken = (options) => resolveToken('SLACK_APP_TOKEN', 'slack-app', options);

export async function api(method, params = {}, { token, base, env = process.env, fetch: doFetch = fetch } = {}) {
  const auth = token ?? resolveBotToken({ env });
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) body.set(key, String(value));
  let res;
  try {
    res = await doFetch(`${base ?? env.SLACK_API_BASE ?? DEFAULT_API_BASE}/${method}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' },
      body,
    });
  } catch (err) {
    throw new Error(`slack ${method}: request failed (${err.cause?.code ?? err.name})`);
  }
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`slack ${method}: HTTP ${res.status}, not JSON`);
  }
  if (!json?.ok) throw new Error(`slack ${method}: ${json?.error ?? `HTTP ${res.status}`}`);
  return json;
}
