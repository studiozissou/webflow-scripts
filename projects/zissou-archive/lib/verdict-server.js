// Local 127.0.0.1 server that serves the flags page and appends Buy / Maybe / Junk marks to a CSV.

import { createServer } from 'node:http';
import { appendCsv } from './seen-store.js';

const DEBUG = process.env.DEBUG === '1';
const VERDICTS = new Set(['buy', 'maybe', 'junk']);
const VERDICT_HEADER = ['markedAt', 'id', 'verdict', 'queryId', 'price', 'title', 'url'];
const MAX_BODY = 64 * 1024;

function send(res, status, body = '', type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validVerdict(data) {
  if (!data || typeof data !== 'object') return false;
  if (!VERDICTS.has(data.verdict)) return false;
  return (typeof data.id === 'number' && Number.isFinite(data.id)) || (typeof data.id === 'string' && data.id !== '');
}

export function startVerdictServer({ html, csvPath, port = 0, idleMs = 30 * 60 * 1000, now = () => new Date() }) {
  let timer = null;
  let closing = null;
  let resolveClosed;
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });
  let allowedHosts = new Set();

  const server = createServer(async (req, res) => {
    touch();
    if (!allowedHosts.has(req.headers.host)) return send(res, 403, 'forbidden');
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    if (req.method === 'GET' && path === '/') return send(res, 200, html, 'text/html; charset=utf-8');
    if (path !== '/verdict') return send(res, 404, 'not found');
    if (req.method !== 'POST') return send(res, 405, 'method not allowed');
    if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) return send(res, 415, 'expected json');
    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch {
      return send(res, 400, 'bad json');
    }
    if (!validVerdict(data)) return send(res, 400, 'invalid verdict');
    try {
      await appendCsv(csvPath, VERDICT_HEADER, [
        {
          markedAt: now().toISOString(),
          id: data.id,
          verdict: data.verdict,
          queryId: data.queryId,
          price: data.price,
          title: data.title,
          url: data.url,
        },
      ]);
    } catch (err) {
      DEBUG && console.log('[verdict-server] write failed', err);
      return send(res, 500, 'write failed');
    }
    return send(res, 200, '{"ok":true}', 'application/json');
  });

  function close() {
    if (!closing) {
      clearTimeout(timer);
      closing = new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }).then(resolveClosed);
    }
    return closing;
  }

  function touch() {
    clearTimeout(timer);
    timer = setTimeout(close, idleMs);
    timer.unref();
  }

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      allowedHosts = new Set([`127.0.0.1:${actual}`, `localhost:${actual}`]);
      touch();
      resolve({ url: `http://127.0.0.1:${actual}/`, close, closed });
    });
  });
}
