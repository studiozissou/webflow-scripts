// Fixture mode for the care entry points: config and Google data from a folder, an in-memory Google that keeps writes, and a canned claude.
import { EventEmitter } from 'node:events';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadCareConfig } from './config.js';

const SLUG_FILE = /^([a-z0-9-]+)\.json$/;
const NOT_CONFIG = /^(?:google|drafts|reviews)/;

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const notFound = (method, path) =>
  reply({ error: { status: 'NOT_FOUND', message: `fixture has no route for ${method} ${path}` } }, 404);

export function fixtureConfigPath(dir, slug) {
  return join(dir, `${slug}.json`);
}

export function fixtureSlugs(dir) {
  return readdirSync(dir)
    .map((name) => name.match(SLUG_FILE))
    .filter((match) => match && !NOT_CONFIG.test(match[1]))
    .map((match) => match[1])
    .filter((slug) => {
      try {
        loadCareConfig(slug, { path: fixtureConfigPath(dir, slug) });
        return true;
      } catch {
        return false;
      }
    })
    .sort();
}

export function loadFixtureGoogle(dir, slug, { afterPack = false } = {}) {
  const own = join(dir, `google-${slug}.json`);
  const data = JSON.parse(readFileSync(existsSync(own) ? own : join(dir, 'google.json'), 'utf8'));
  const { afterPack: overlay, ...rest } = data;
  return afterPack && overlay ? { ...rest, ...overlay } : rest;
}

function locationSummary(location) {
  return { name: location.name, title: location.title, websiteUri: location.websiteUri };
}

export function createFixtureFetch(data, { now = Date.now } = {}) {
  const requests = [];
  data.reviews ??= [];
  data.posts ??= [];
  const account = data.account;
  const v4Base = `/v4/${account}/${data.location.name}`;

  function route(method, url, body) {
    const { host, pathname: path, searchParams } = url;
    if (host === 'oauth2.googleapis.com' && path === '/token' && method === 'POST') {
      return reply({ access_token: 'fixture-access', expires_in: 3600 });
    }
    if (host === 'mybusinessaccountmanagement.googleapis.com' && path === '/v1/accounts') {
      return reply({ accounts: [{ name: account }] });
    }
    if (host === 'mybusinessbusinessinformation.googleapis.com') {
      if (path === `/v1/${account}/locations`) return reply({ locations: [locationSummary(data.location)] });
      if (path === `/v1/${data.location.name}:getGoogleUpdated`) {
        return reply({ location: data.location, diffMask: '', pendingMask: '' });
      }
      if (path === `/v1/${data.location.name}`) {
        if (method === 'GET') return reply(data.location);
        if (method === 'PATCH') {
          if (searchParams.get('validateOnly') === 'true') return reply({});
          for (const field of (searchParams.get('updateMask') ?? '').split(',').filter(Boolean)) {
            data.location[field] = body[field];
          }
          return reply(data.location);
        }
      }
    }
    if (host === 'mybusiness.googleapis.com') {
      if (path === `${v4Base}/reviews` && method === 'GET') return reply({ reviews: data.reviews });
      const review = path.match(new RegExp(`^${v4Base}/reviews/([^/]+)(/reply)?$`));
      if (review) {
        const found = data.reviews.find((item) => item.reviewId === decodeURIComponent(review[1]));
        if (!found) return notFound(method, path);
        if (!review[2] && method === 'GET') return reply(found);
        if (review[2] && method === 'PUT') {
          found.reviewReply = { comment: body.comment, updateTime: new Date(now()).toISOString() };
          return reply(found.reviewReply);
        }
      }
      if (path === `${v4Base}/localPosts`) {
        if (method === 'GET') return reply({ localPosts: data.posts });
        if (method === 'POST') {
          const post = {
            ...body,
            name: `${account}/${data.location.name}/localPosts/fixture-${data.posts.length + 1}`,
            state: 'LIVE',
            createTime: new Date(now()).toISOString(),
          };
          data.posts.push(post);
          return reply(post);
        }
      }
    }
    if (host === 'businessprofileperformance.googleapis.com' && method === 'GET') {
      return reply(data.performance ?? { multiDailyMetricTimeSeries: [] });
    }
    return notFound(method, path);
  }

  const fixtureFetch = async (input, init = {}) => {
    const method = String(init.method ?? 'GET').toUpperCase();
    const url = new URL(String(input));
    const body = typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : init.body;
    requests.push({ method, url: url.href, body });
    return route(method, url, body);
  };
  fixtureFetch.requests = requests;
  return fixtureFetch;
}

export function fixtureSpawn(stdout) {
  return function spawnFixture() {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = { write: () => true, end: () => {} };
    child.kill = () => true;
    setImmediate(() => {
      child.stdout.emit('data', stdout);
      child.emit('close', 0, null);
    });
    return child;
  };
}
