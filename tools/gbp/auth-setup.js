// One-time browser sign-in that saves a Business Profile refresh token to the macOS Keychain without printing it.
import { execFile, spawn } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import {
  TOKEN_URL,
  isMainModule,
  readJsonSafely,
  redact,
  safeOAuthCode,
} from './auth.js';

export const SCOPE = 'https://www.googleapis.com/auth/business.manage';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SECURITY_BIN = '/usr/bin/security';
const KEYCHAIN_SERVICE = 'mcp';
const REFRESH_ACCOUNT = 'gbp-refresh-token';
const LOOPBACK_ADDRESS = '127.0.0.1';
const CALLBACK_PATH = '/oauth2callback';
const SIGN_IN_TIMEOUT_MS = 5 * 60_000;

export function buildAuthUrl({ clientId, redirectUri, state }) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  }).toString();
  return url.href;
}

export function checkState(expected, actual) {
  if (!expected || typeof actual !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseCallback(requestUrl, expectedState) {
  const { searchParams } = new URL(requestUrl, `http://${LOOPBACK_ADDRESS}`);
  if (!checkState(expectedState, searchParams.get('state'))) {
    throw new Error('Sign-in failed: the state value did not match this session');
  }
  const googleError = searchParams.get('error');
  if (googleError)
    throw new Error(`Sign-in failed: Google returned ${redact(googleError)}`);
  const code = searchParams.get('code');
  if (!code) throw new Error('Sign-in failed: no authorization code in the redirect');
  return code;
}

export function securityAddCommand(value) {
  if (!value) throw new Error('Refusing to save an empty value to the Keychain');
  const isControl = (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127;
  if ([...value].some(isControl)) {
    throw new Error(
      'Refusing to save a value containing control characters to the Keychain',
    );
  }
  const quoted = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `add-generic-password -U -s ${KEYCHAIN_SERVICE} -a ${REFRESH_ACCOUNT} -T ${SECURITY_BIN} -w "${quoted}"\n`;
}

export async function exchangeCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
  fetch: fetchFn = globalThis.fetch,
}) {
  const response = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }).toString(),
  });
  const body = await readJsonSafely(response);
  if (!response.ok) {
    throw new Error(
      `Code exchange failed: HTTP ${response.status} ${safeOAuthCode(body)}`,
    );
  }
  if (!body?.refresh_token) {
    throw new Error(
      'Code exchange failed: Google returned no refresh token. Remove this app at myaccount.google.com/permissions and run the sign-in again.',
    );
  }
  return body.refresh_token;
}

function runSecurity(args, stdin = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(SECURITY_BIN, args, { stdio: ['pipe', 'pipe', 'ignore'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', () => reject(new Error(`Could not run ${SECURITY_BIN}`)));
    child.on('close', (code) => resolve({ code, stdout }));
    child.stdin.end(stdin);
  });
}

export async function readKeychain(account, { run = runSecurity } = {}) {
  const args = ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-a', account, '-w'];
  const { code, stdout } = await run(args);
  const value = stdout.trim();
  if (code !== 0 || !value) {
    throw new Error(
      `Keychain item ${account} (service ${KEYCHAIN_SERVICE}) could not be read`,
    );
  }
  return value;
}

export async function saveRefreshToken(token, { run = runSecurity } = {}) {
  const { code } = await run(['-i'], securityAddCommand(token));
  if (code !== 0) throw new Error(`${SECURITY_BIN} could not save ${REFRESH_ACCOUNT}`);
  const saved = await readKeychain(REFRESH_ACCOUNT, { run });
  if (saved !== token) {
    throw new Error(
      `Keychain item ${REFRESH_ACCOUNT} did not read back the same after saving`,
    );
  }
}

export function startLoopback({ state, timeoutMs = SIGN_IN_TIMEOUT_MS }) {
  let settle;
  const code = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });
  code.catch(() => {});

  const server = createServer((req, res) => {
    if (new URL(req.url, `http://${LOOPBACK_ADDRESS}`).pathname !== CALLBACK_PATH) {
      res.writeHead(404).end();
      return;
    }
    const finish = (status, text, action) => {
      res.writeHead(status, { 'Content-Type': 'text/plain', Connection: 'close' });
      res.end(text, () => {
        shutdown();
        action();
      });
    };
    try {
      const value = parseCallback(req.url, state);
      finish(200, 'Signed in. You can close this tab.', () => settle.resolve(value));
    } catch (err) {
      finish(400, 'Sign-in failed. Check the terminal.', () => settle.reject(err));
    }
  });

  const timer = setTimeout(() => {
    shutdown();
    settle.reject(new Error('Sign-in timed out waiting for the browser redirect'));
  }, timeoutMs);

  function shutdown() {
    clearTimeout(timer);
    server.close();
    server.closeIdleConnections();
  }

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, LOOPBACK_ADDRESS, () => {
      const { address, port } = server.address();
      resolve({
        address,
        port,
        redirectUri: `http://${LOOPBACK_ADDRESS}:${port}${CALLBACK_PATH}`,
        code,
      });
    });
  });
}

function openBrowser(url) {
  execFile('/usr/bin/open', [url], (err) => {
    if (err) process.stderr.write(`Could not open a browser. Visit this URL:\n${url}\n`);
  });
}

async function main() {
  const clientId = await readKeychain('gbp-client-id');
  const clientSecret = await readKeychain('gbp-client-secret');
  const state = randomBytes(32).toString('hex');
  const loop = await startLoopback({ state });
  process.stderr.write('Opening the browser for Google sign-in.\n');
  openBrowser(buildAuthUrl({ clientId, redirectUri: loop.redirectUri, state }));
  const code = await loop.code;
  const token = await exchangeCode({
    code,
    clientId,
    clientSecret,
    redirectUri: loop.redirectUri,
  });
  await saveRefreshToken(token);
  process.stderr.write(`Saved ${REFRESH_ACCOUNT} to the Keychain.\n`);
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    process.stderr.write(`${redact(err.message)}\n`);
    process.exitCode = 1;
  });
}
