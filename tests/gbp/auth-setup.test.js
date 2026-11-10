// Tests for the one-time sign-in helpers: auth URL, state check, Keychain command and code exchange.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  SCOPE,
  buildAuthUrl,
  checkState,
  parseCallback,
  securityAddCommand,
  exchangeCode,
  readKeychain,
  saveRefreshToken,
  startLoopback,
} from '../../tools/gbp/auth-setup.js';
import { FAKE_REFRESH, FAKE_SECRET, FAKE_CLIENT_ID, json } from './helpers.js';

const MODULE_PATH = fileURLToPath(
  new URL('../../tools/gbp/auth-setup.js', import.meta.url),
);

describe('buildAuthUrl', () => {
  it('requests offline consent for business.manage only', () => {
    const url = new URL(
      buildAuthUrl({
        clientId: FAKE_CLIENT_ID,
        redirectUri: 'http://127.0.0.1:5555/oauth2callback',
        state: 'abc',
      }),
    );
    assert.equal(
      url.origin + url.pathname,
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    assert.equal(url.searchParams.get('access_type'), 'offline');
    assert.equal(url.searchParams.get('prompt'), 'consent');
    assert.equal(
      url.searchParams.get('scope'),
      'https://www.googleapis.com/auth/business.manage',
    );
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('state'), 'abc');
    assert.equal(url.searchParams.get('client_id'), FAKE_CLIENT_ID);
    assert.equal(
      url.searchParams.get('redirect_uri'),
      'http://127.0.0.1:5555/oauth2callback',
    );
    assert.equal(SCOPE, 'https://www.googleapis.com/auth/business.manage');
  });
});

describe('checkState', () => {
  it('accepts only an exact match', () => {
    assert.equal(checkState('abc123', 'abc123'), true);
    assert.equal(checkState('abc123', 'abc124'), false);
    assert.equal(checkState('abc123', 'abc'), false);
    assert.equal(checkState('abc123', null), false);
    assert.equal(checkState('', ''), false);
  });
});

describe('parseCallback', () => {
  const base = 'http://127.0.0.1:5555/oauth2callback';
  it('returns the code when state matches', () => {
    assert.equal(parseCallback(`${base}?code=xyz&state=s1`, 's1'), 'xyz');
  });
  it('rejects a state mismatch', () => {
    assert.throws(() => parseCallback(`${base}?code=xyz&state=bad`, 's1'), /state/i);
  });
  it('checks state before trusting an error parameter', () => {
    assert.throws(
      () => parseCallback(`${base}?error=access_denied&state=bad`, 's1'),
      /state/i,
    );
  });
  it('reports a Google error when state matches', () => {
    assert.throws(
      () => parseCallback(`${base}?error=access_denied&state=s1`, 's1'),
      /access_denied/,
    );
  });
  it('rejects a missing code', () => {
    assert.throws(() => parseCallback(`${base}?state=s1`, 's1'), /code/i);
  });
});

describe('securityAddCommand', () => {
  it('builds the exact add-generic-password line', () => {
    assert.equal(
      securityAddCommand('abc/def_1-2.3'),
      'add-generic-password -U -s mcp -a gbp-refresh-token -T /usr/bin/security -w "abc/def_1-2.3"\n',
    );
  });
  it('escapes quotes and backslashes', () => {
    assert.ok(securityAddCommand('a"b\\c $d').endsWith('-w "a\\"b\\\\c $d"\n'));
  });
  it('refuses values that could break out of the line', () => {
    assert.throws(
      () => securityAddCommand('abc\nadd-generic-password -a other'),
      /control/i,
    );
    assert.throws(() => securityAddCommand('abc\rdef'), /control/i);
    assert.throws(() => securityAddCommand(''), /empty/i);
  });
  it('does not put the value in an error', () => {
    assert.throws(
      () => securityAddCommand(`${FAKE_REFRESH}\n`),
      (err) => !err.message.includes(FAKE_REFRESH),
    );
  });
});

describe('exchangeCode', () => {
  const args = {
    code: 'auth-code',
    clientId: FAKE_CLIENT_ID,
    clientSecret: FAKE_SECRET,
    redirectUri: 'http://127.0.0.1:5555/oauth2callback',
  };
  it('returns the refresh token', async () => {
    let sent;
    const token = await exchangeCode({
      ...args,
      fetch: async (url, init) => {
        sent = new URLSearchParams(init.body);
        return json({ refresh_token: FAKE_REFRESH, access_token: 'unused' });
      },
    });
    assert.equal(token, FAKE_REFRESH);
    assert.equal(sent.get('grant_type'), 'authorization_code');
    assert.equal(sent.get('code'), 'auth-code');
  });
  it('fails clearly when Google returns no refresh token', async () => {
    await assert.rejects(
      exchangeCode({ ...args, fetch: async () => json({ access_token: 'unused' }) }),
      /no refresh token/i,
    );
  });
  it('hides secrets and the raw body on failure', async () => {
    await assert.rejects(
      exchangeCode({
        ...args,
        fetch: async () =>
          json({ error: 'invalid_grant', error_description: FAKE_SECRET }, 400),
      }),
      (err) => {
        assert.match(err.message, /400/);
        assert.match(err.message, /invalid_grant/);
        assert.ok(!err.message.includes(FAKE_SECRET));
        return true;
      },
    );
  });
});

describe('Keychain access', () => {
  it('reads with find-generic-password and trims the newline', async () => {
    const seen = [];
    const value = await readKeychain('gbp-client-id', {
      run: async (args) => {
        seen.push(args);
        return { code: 0, stdout: 'value\n' };
      },
    });
    assert.equal(value, 'value');
    assert.deepEqual(seen[0], [
      'find-generic-password',
      '-s',
      'mcp',
      '-a',
      'gbp-client-id',
      '-w',
    ]);
  });

  it('names the missing item without printing keychain output', async () => {
    await assert.rejects(
      readKeychain('gbp-client-id', {
        run: async () => ({ code: 44, stdout: 'output-text' }),
      }),
      (err) => {
        assert.match(err.message, /gbp-client-id/);
        assert.ok(!err.message.includes('output-text'));
        return true;
      },
    );
  });

  it('writes on stdin through security -i, never in arguments', async () => {
    const runs = [];
    await saveRefreshToken(FAKE_REFRESH, {
      run: async (args, stdin) => {
        runs.push({ args, stdin });
        return args[0] === '-i'
          ? { code: 0, stdout: '' }
          : { code: 0, stdout: `${FAKE_REFRESH}\n` };
      },
    });
    assert.deepEqual(runs[0].args, ['-i']);
    assert.ok(runs[0].stdin.includes(FAKE_REFRESH));
    assert.ok(runs.every((r) => !r.args.join(' ').includes(FAKE_REFRESH)));
  });

  it('fails when the saved value does not read back the same', async () => {
    await assert.rejects(
      saveRefreshToken(FAKE_REFRESH, {
        run: async (args) =>
          args[0] === '-i' ? { code: 0, stdout: '' } : { code: 0, stdout: 'truncated\n' },
      }),
      (err) => {
        assert.match(err.message, /read back/i);
        assert.ok(!err.message.includes(FAKE_REFRESH));
        assert.ok(!err.message.includes('truncated'));
        return true;
      },
    );
  });
});

describe('startLoopback', () => {
  it('binds to 127.0.0.1 on a random port and resolves the code', async () => {
    const loop = await startLoopback({ state: 'state-1', timeoutMs: 5000 });
    assert.equal(loop.address, '127.0.0.1');
    assert.ok(loop.port > 0);
    assert.equal(loop.redirectUri, `http://127.0.0.1:${loop.port}/oauth2callback`);
    const res = await fetch(`${loop.redirectUri}?code=abc&state=state-1`);
    assert.equal(res.status, 200);
    assert.equal(await loop.code, 'abc');
  });

  it('rejects a wrong state and does not echo it to the browser', async () => {
    const loop = await startLoopback({ state: 'state-1', timeoutMs: 5000 });
    const rejected = assert.rejects(loop.code, /state/i);
    const res = await fetch(`${loop.redirectUri}?code=abc&state=<script>`);
    assert.equal(res.status, 400);
    assert.ok(!(await res.text()).includes('<script>'));
    await rejected;
  });

  it('times out and closes', async () => {
    const loop = await startLoopback({ state: 'state-1', timeoutMs: 10 });
    await assert.rejects(loop.code, /timed out/i);
  });
});

describe('main guard', () => {
  it('importing the module starts no flow and prints nothing', () => {
    const r = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', `await import(${JSON.stringify(MODULE_PATH)});`],
      { encoding: 'utf8', timeout: 10000 },
    );
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
    assert.equal(r.stderr, '');
  });
});
