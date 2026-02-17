#!/usr/bin/env node
/**
 * Local dev server with CORS headers.
 * Use when viewing Webflow preview (rhpcircle.webflow.io) with localhost assets.
 * Fonts and other cross-origin resources will load correctly.
 *
 * Run from repo root: node projects/ready-hit-play-prod/serve-cors.js
 * Then open: http://localhost:8080/projects/ready-hit-play-prod/reference/case-study-template.html
 * And in Webflow custom code, point init/CSS to: http://localhost:8080/projects/ready-hit-play-prod/
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = path.resolve(__dirname, '../..');

const MIME = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.html': 'text/html',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const filePath = path.join(ROOT, req.url.split('?')[0] || '/');
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`CORS server: http://localhost:${PORT}`);
  console.log(`Assets base: http://localhost:${PORT}/projects/ready-hit-play-prod/`);
});
