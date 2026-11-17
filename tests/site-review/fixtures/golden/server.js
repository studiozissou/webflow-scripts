// Local golden fixture site with stateful endpoints (retry, rate limit, transient 404, redirect chain, bot wall) plus a second host that plays the external web.

import http from 'node:http';
import { gzipSync } from 'node:zlib';
import {
  PAGES,
  COPY_TEXT,
  EXTRA_SITEMAP_PATHS,
  NOT_LINKED_FROM_HOME,
  ROBOTS_TXT,
  BOT_WALL_HTML,
  NOT_FOUND_HTML,
  SECURITY_HEADERS,
  layout,
} from './site.js';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const HOME_VARIANTS = ['/about/', '/About', '/about?utm_source=newsletter', '/about#team'];

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}

function startExternal(log) {
  const server = http.createServer((req, res) => {
    log.push({ host: 'external', path: req.url, method: req.method, headers: req.headers, at: Date.now() });
    const routes = {
      '/ok': [200, 'text/html', '<!DOCTYPE html><html><head><title>External</title></head><body>ok</body></html>'],
      '/gone': [404, 'text/html', NOT_FOUND_HTML],
      '/forbidden': [403, 'text/html', 'Forbidden'],
      '/rate': [429, 'text/html', 'Too many requests'],
      '/img-404.png': [404, 'text/plain', 'missing'],
    };
    const [status, type, body] = routes[req.url] ?? [404, 'text/html', NOT_FOUND_HTML];
    res.writeHead(status, { 'content-type': type });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  return server;
}

function sitemapXml(origin) {
  const paths = [...PAGES.map((page) => page.path), ...EXTRA_SITEMAP_PATHS];
  const urls = paths.map((path) => `  <url><loc>${origin}${path}</loc><lastmod>2026-11-01</lastmod></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function homeBody() {
  const links = PAGES.filter((page) => !NOT_LINKED_FROM_HOME.has(page.path)).map(
    (page) => `<li><a href="${page.path}">${page.path.slice(1)} page</a></li>`,
  );
  const variants = HOME_VARIANTS.map((href) => `<li><a href="${href}">About, spelt ${href}</a></li>`);
  return `<ul>\n${[...links, ...variants].join('\n')}\n</ul>`;
}

function render(page, { origin, externalOrigin, variant }) {
  let html = layout(page.path === '/' ? { ...page, body: homeBody() } : page);
  const brokenLink =
    variant === 'fixed'
      ? '<a href="/about">The link that used to be broken</a>\n<a href="/new-missing">A link broken this month</a>'
      : '<a href="/missing-page">A broken internal link</a>';
  html = html
    .replaceAll('{{copy}}', COPY_TEXT)
    .replaceAll('{{brokenLink}}', brokenLink)
    .replaceAll('{{external}}', externalOrigin)
    .replaceAll('{{origin}}', origin);
  if (variant === 'sitewide') html = html.replace(/<meta name="description"[^>]*>\n?/g, '');
  return html;
}

export async function startGoldenServer({ variant = 'base', port: wantedPort = 0, externalPort: wantedExternal = 0 } = {}) {
  const requests = [];
  const counts = new Map();
  const pages = new Map(PAGES.map((page) => [page.path.toLowerCase(), page]));
  const external = startExternal(requests);
  const externalPort = await listen(external, wantedExternal);
  const externalOrigin = `http://127.0.0.1:${externalPort}`;
  let origin = '';

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, origin);
    const path = url.pathname;
    const count = (counts.get(path) ?? 0) + 1;
    counts.set(path, count);
    requests.push({ host: 'site', path: req.url, method: req.method, headers: req.headers, at: Date.now() });

    const send = (status, body, headers = {}, { gzip = true } = {}) => {
      const out = { ...SECURITY_HEADERS, ...headers };
      let payload = body == null ? null : Buffer.from(body);
      if (payload && gzip && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
        payload = gzipSync(payload);
        out['content-encoding'] = 'gzip';
      }
      if (payload) out['content-length'] = payload.length;
      res.writeHead(status, out);
      res.end(req.method === 'HEAD' ? undefined : payload);
    };
    const html = 'text/html; charset=utf-8';
    const redirect = (status, location) => send(status, null, { location });

    if (path === '/robots.txt') return send(200, ROBOTS_TXT(origin), { 'content-type': 'text/plain' });
    if (path === '/sitemap.xml') return send(200, sitemapXml(origin), { 'content-type': 'application/xml' });
    if (path === '/images/photo.png') return send(200, PNG, { 'content-type': 'image/png' }, { gzip: false });
    if (path === '/document.pdf') return send(200, '%PDF-1.4\n%golden\n', { 'content-type': 'application/pdf' }, { gzip: false });
    if (path === '/reset') return req.socket.destroy();
    if (path === '/redirect-a') return redirect(302, '/redirect-b');
    if (path === '/redirect-b') return redirect(302, '/redirect-c');
    if (path === '/redirect-c') return send(200, layout({ path, title: 'End of the redirect chain', description: 'End of chain.', h1: 'End' }), { 'content-type': html });
    if (path === '/moved' || path === '/old-page') return redirect(301, '/about');
    if (path === '/always-503') return send(503, 'Service unavailable', { 'content-type': 'text/plain' });
    if (path === '/gone-then-back' && count === 1) return send(404, NOT_FOUND_HTML, { 'content-type': html });
    if (path === '/flaky-503' && count === 1) return send(503, 'Service unavailable', { 'content-type': 'text/plain' });
    if (path === '/flaky-429' && count === 1) return send(429, 'Slow down', { 'content-type': 'text/plain', 'retry-after': '1' });

    const page = pages.get(path === '/' ? '/' : path.replace(/\/+$/, '').toLowerCase()) ??
      (path === '/gone-then-back' ? { path, title: 'Back again after a transient 404', description: 'Back.', h1: 'Back' } : null);
    if (!page) return send(404, NOT_FOUND_HTML, { 'content-type': html });

    if (!/Mozilla/.test(req.headers['user-agent'] ?? '')) return send(200, BOT_WALL_HTML, { 'content-type': html });

    const body = render(page, { origin, externalOrigin, variant });
    return send(200, body, { 'content-type': page.contentType ?? html }, { gzip: page.gzip !== false });
  });

  const port = await listen(server, wantedPort);
  origin = `http://127.0.0.1:${port}`;

  return {
    url: origin,
    origin,
    externalOrigin,
    port,
    requests,
    countOf: (path) => counts.get(path) ?? 0,
    reset() {
      counts.clear();
      requests.length = 0;
    },
    async close() {
      await Promise.all([close(server), close(external)]);
    },
  };
}
