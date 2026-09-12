/**
 * Local development server
 * - Serves static frontend files
 * - Exposes POST /api/chat using the same handler as Netlify
 *
 * Usage:
 *   1. Copy .env.example to .env and insert API keys
 *   2. npm install
 *   3. npm start
 *   4. Open http://localhost:8888
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Load .env if present
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv optional if env vars already set
}

const { handleChat } = require('../lib/chatHandler');
const { checkRateLimit } = require('../lib/utils/rateLimit');

const PORT = process.env.PORT || 8888;
const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const absolute = path.join(ROOT, filePath);

  if (!absolute.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Do not serve secrets or server internals
  const blocked = ['.env', 'node_modules', 'netlify', 'lib', 'scripts', 'knowledge', 'data'];
  const relative = path.relative(ROOT, absolute).replace(/\\/g, '/');
  if (blocked.some((b) => relative === b || relative.startsWith(b + '/'))) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  fs.readFile(absolute, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(absolute).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
    sendJson(res, 204, {});
    return;
  }

  if (url.pathname === '/api/chat' && req.method === 'POST') {
    const rate = checkRateLimit(req.socket.remoteAddress || 'local');
    if (!rate.allowed) {
      sendJson(res, 429, {
        success: false,
        error: 'Too many requests. Please wait a moment and try again.'
      });
      return;
    }

    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || '{}');
      const result = await handleChat(body);
      sendJson(res, result.statusCode, result.payload);
    } catch {
      sendJson(res, 400, { success: false, error: 'Invalid request.' });
    }
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, url.pathname);
    return;
  }

  sendJson(res, 405, { success: false, error: 'Method not allowed.' });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Islamic History AI — local server');
  console.log(`  → http://localhost:${PORT}`);
  console.log('');
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('your_groq')) {
    console.warn('  Warning: GROQ_API_KEY is not set. Copy .env.example to .env');
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_gemini')) {
    console.warn('  Warning: GEMINI_API_KEY is not set. Fallback will fail without it.');
  }
  console.log('');
});
