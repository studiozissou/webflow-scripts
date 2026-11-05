// Drives a persistent Chrome profile and fetches Vinted catalog HTML from inside a loaded tab.

import { VINTED_DOMAIN } from '../config.js';
import { detectChallenge } from './vinted-parse.js';

const DEBUG = process.env.DEBUG === '1';

export class ChallengeError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ChallengeError';
    this.status = status;
  }
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function openSession({
  profileDir,
  headless = false,
  onScreen = false,
  domain = VINTED_DOMAIN,
  chromium,
} = {}) {
  const browser = chromium ?? (await import('playwright')).chromium;
  const context = await browser.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless,
    args: onScreen ? [] : ['--window-position=-2400,0'],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`https://${domain}/`, { waitUntil: 'domcontentloaded' });
  DEBUG && console.log('[vinted-browser] session open', domain);
  return { context, page, close: () => context.close() };
}

export function waitForClose(session) {
  return new Promise((resolve) => session.context.once('close', resolve));
}

export async function fetchHtml(page, url, { sleep = defaultSleep, random = Math.random } = {}) {
  await sleep(1000 + Math.round(random() * 2000));
  const res = await page.evaluate(async (target) => {
    const r = await fetch(target, { credentials: 'include' });
    return { status: r.status, headers: { 'cf-mitigated': r.headers.get('cf-mitigated') }, body: await r.text() };
  }, url);
  if (detectChallenge(res)) throw new ChallengeError(`Cloudflare challenge (HTTP ${res.status})`, res.status);
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
  DEBUG && console.log('[vinted-browser] fetched', url, res.body.length);
  return res.body;
}
