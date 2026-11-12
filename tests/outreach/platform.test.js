// Covers builder fingerprinting from HTML, headers and URL: Wix, Squarespace, WordPress with generator version, Webflow, Jimdo, builder subdomains and "made with" badges.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform } from '../../tools/outreach/platform.js';
import { html } from './helpers.js';

const detect = (name, url, headers = {}) => detectPlatform({ html: html(name), headers, url });

test('Wix free site: builder, badge and builder subdomain', () => {
  const p = detect('wix-free', 'https://bakkerijverzonnen.wixsite.com/home');
  assert.equal(p.builder, 'wix');
  assert.equal(p.badge, true);
  assert.equal(p.builderSubdomain, true);
  assert.ok(Array.isArray(p.signals) && p.signals.length > 0);
});

test('Wix is found from a response header alone', () => {
  const p = detectPlatform({ html: '<html><body>hoi</body></html>', headers: { 'x-wix-request-id': '1700000000.000' }, url: 'https://bakkerij-verzonnen.test/' });
  assert.equal(p.builder, 'wix');
  assert.equal(p.builderSubdomain, false);
});

test('Squarespace on its own domain: no badge, not end of life', () => {
  const p = detect('squarespace', 'https://bloemen-fictief.test/');
  assert.equal(p.builder, 'squarespace');
  assert.equal(p.badge, false);
  assert.equal(p.eol, false);
  assert.equal(p.builderSubdomain, false);
});

test('Squarespace is found from the server header', () => {
  const p = detectPlatform({ html: '<html></html>', headers: { server: 'Squarespace' }, url: 'https://bloemen-fictief.test/' });
  assert.equal(p.builder, 'squarespace');
});

test('WordPress with generator below 6 is end of life and reports its version', () => {
  const p = detect('wordpress-old', 'http://eetcafe-verzinsel.test/');
  assert.equal(p.builder, 'wordpress');
  assert.equal(p.version, '5.8.3');
  assert.equal(p.eol, true);
});

test('WordPress 6+ is not end of life', () => {
  const p = detect('wordpress-new', 'https://wijnbar-denkbeeld.test/');
  assert.equal(p.builder, 'wordpress');
  assert.equal(p.version, '6.6.2');
  assert.equal(p.eol, false);
});

test('WordPress without a generator meta: version unknown, never guessed as end of life', () => {
  const p = detectPlatform({ html: '<link rel="stylesheet" href="/wp-content/themes/x/style.css">', headers: {}, url: 'https://wijnbar-denkbeeld.test/' });
  assert.equal(p.builder, 'wordpress');
  assert.equal(p.version, null);
  assert.equal(p.eol, false);
});

test('Webflow on a custom domain: no badge', () => {
  const p = detect('webflow', 'https://koffiebar-voorbeeld.test/');
  assert.equal(p.builder, 'webflow');
  assert.equal(p.badge, false);
  assert.equal(p.eol, false);
  assert.equal(p.builderSubdomain, false);
});

test('Webflow free plan on webflow.io with the Made in Webflow badge', () => {
  const p = detect('webflow-free', 'https://kapper-fictief.webflow.io/');
  assert.equal(p.builder, 'webflow');
  assert.equal(p.badge, true);
  assert.equal(p.builderSubdomain, true);
});

test('Jimdo free site with the Gemaakt met Jimdo badge', () => {
  const p = detect('jimdo-free', 'https://dierenpraktijk-zogenaamd.jimdofree.com/');
  assert.equal(p.builder, 'jimdo');
  assert.equal(p.badge, true);
  assert.equal(p.builderSubdomain, true);
});

test('Hand-built site is unknown with no badge and no end of life', () => {
  const p = detect('healthy', 'https://trattoria-fittizia.test/');
  assert.equal(p.builder, 'unknown');
  assert.equal(p.version, null);
  assert.equal(p.badge, false);
  assert.equal(p.eol, false);
  assert.equal(p.builderSubdomain, false);
});

test('detectPlatform tolerates missing headers and empty HTML', () => {
  const p = detectPlatform({ html: '', url: 'https://leeg.test/' });
  assert.equal(p.builder, 'unknown');
});
