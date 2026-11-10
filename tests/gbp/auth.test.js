// Tests for access token caching, refresh failures and secret redaction.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTokenProvider, redact } from '../../tools/gbp/auth.js';
import {
  FAKE_ACCESS,
  FAKE_REFRESH,
  FAKE_SECRET,
  FAKE_CLIENT_ID,
  json,
} from './helpers.js';

const setup = (responder, startAt = 0) => {
  const state = { time: startAt, calls: [] };
  const getToken = createTokenProvider({
    clientId: FAKE_CLIENT_ID,
    clientSecret: FAKE_SECRET,
    refreshToken: FAKE_REFRESH,
    now: () => state.time,
    fetch: async (url, init) => {
      state.calls.push({ url: String(url), init });
      return responder(state.calls.length);
    },
  });
  return { state, getToken };
};

describe('createTokenProvider', () => {
  it('posts a refresh_token grant to the Google token endpoint', async () => {
    const { state, getToken } = setup(() =>
      json({ access_token: FAKE_ACCESS, expires_in: 3600 }),
    );
    assert.equal(await getToken(), FAKE_ACCESS);
    const { url, init } = state.calls[0];
    assert.equal(url, 'https://oauth2.googleapis.com/token');
    assert.equal(init.method, 'POST');
    const sent = new URLSearchParams(init.body);
    assert.equal(sent.get('grant_type'), 'refresh_token');
    assert.equal(sent.get('refresh_token'), FAKE_REFRESH);
    assert.equal(sent.get('client_id'), FAKE_CLIENT_ID);
    assert.equal(sent.get('client_secret'), FAKE_SECRET);
  });

  it('caches the token until shortly before expiry', async () => {
    const { state, getToken } = setup((n) =>
      json({ access_token: `${FAKE_ACCESS}${n}`, expires_in: 3600 }),
    );
    assert.equal(await getToken(), `${FAKE_ACCESS}1`);
    state.time = 3_000_000;
    assert.equal(await getToken(), `${FAKE_ACCESS}1`);
    assert.equal(state.calls.length, 1);
    state.time = 3_590_000;
    assert.equal(await getToken(), `${FAKE_ACCESS}2`);
    assert.equal(state.calls.length, 2);
  });

  it('shares one refresh between concurrent callers', async () => {
    const { state, getToken } = setup(() =>
      json({ access_token: FAKE_ACCESS, expires_in: 3600 }),
    );
    await Promise.all([getToken(), getToken(), getToken()]);
    assert.equal(state.calls.length, 1);
  });

  it('does not cache a token without a usable expiry', async () => {
    const { state, getToken } = setup(() => json({ access_token: FAKE_ACCESS }));
    await getToken();
    await getToken();
    assert.equal(state.calls.length, 2);
  });

  it('throws without token, secret or raw body when refresh fails', async () => {
    const rawBody = {
      error: 'invalid_grant',
      error_description: `rawDescription ${FAKE_REFRESH} ${FAKE_SECRET} ${FAKE_ACCESS}`,
    };
    const { getToken } = setup(() => json(rawBody, 400));
    await assert.rejects(getToken, (err) => {
      assert.match(err.message, /400/);
      assert.match(err.message, /invalid_grant/);
      for (const forbidden of [
        FAKE_REFRESH,
        FAKE_SECRET,
        FAKE_ACCESS,
        'rawDescription',
      ]) {
        assert.ok(!err.message.includes(forbidden), `leaked ${forbidden}`);
      }
      return true;
    });
  });

  it('does not echo an unrecognised error code from the body', async () => {
    const { getToken } = setup(() => json({ error: `weird ${FAKE_SECRET}` }, 400));
    await assert.rejects(getToken, (err) => {
      assert.ok(!err.message.includes(FAKE_SECRET));
      assert.ok(!err.message.includes('weird'));
      return true;
    });
  });

  it('fails clearly when a 200 response has no access token', async () => {
    const { getToken } = setup(() => new Response('not json at all'));
    await assert.rejects(getToken, (err) => {
      assert.match(err.message, /no access token/i);
      assert.ok(!err.message.includes('not json at all'));
      return true;
    });
  });

  it('redacts a network failure message and tries again on the next call', async () => {
    let attempts = 0;
    const provider = createTokenProvider({
      clientId: FAKE_CLIENT_ID,
      clientSecret: FAKE_SECRET,
      refreshToken: FAKE_REFRESH,
      now: () => 0,
      fetch: async () => {
        attempts += 1;
        throw new Error(`connect failed with ${FAKE_REFRESH}`);
      },
    });
    await assert.rejects(provider, (err) => {
      assert.ok(!err.message.includes(FAKE_REFRESH));
      assert.match(err.message, /connect failed/);
      return true;
    });
    await assert.rejects(provider);
    assert.equal(attempts, 2);
  });
});

describe('redact', () => {
  it('removes secret shapes', () => {
    const text = `a ${FAKE_ACCESS} b ${FAKE_REFRESH} c ${FAKE_SECRET} d`;
    const out = redact(text);
    for (const secret of [FAKE_ACCESS, FAKE_REFRESH, FAKE_SECRET]) {
      assert.ok(!out.includes(secret));
    }
    assert.match(out, /^a .* b .* c .* d$/);
  });

  it('removes bearer headers and token parameters', () => {
    assert.ok(!redact('Authorization: Bearer abc.def-123').includes('abc.def-123'));
    assert.ok(!redact('refresh_token=abc123&x=1').includes('abc123'));
    assert.ok(!redact('client_secret=abc123').includes('abc123'));
    assert.ok(!redact('{"access_token":"abc123"}').includes('abc123'));
  });

  it('removes explicitly supplied values and ignores empty ones', () => {
    assert.equal(
      redact('hello plainvalue', ['plainvalue', '', undefined]),
      'hello [redacted]',
    );
  });

  it('leaves ordinary text and tracking URLs alone', () => {
    const url = 'https://example.com/en?utm_source=google&utm_medium=organic';
    assert.equal(redact(url), url);
  });

  it('keeps JSON valid when a redacted value sits next to an escaped quote', () => {
    const text = JSON.stringify({ message: 'access_token=abc"def' });
    const parsed = JSON.parse(redact(text));
    assert.ok(!parsed.message.includes('abc'));
  });

  it('turns non-strings into strings', () => {
    assert.equal(redact(undefined), 'undefined');
  });
});
