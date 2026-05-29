const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

let server;
let baseUrl;

// Start the app for integration testing on an ephemeral port
before((_, done) => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  const app = require('../server');
  server = app.listen(0, () => {
    const addr = server.address();
    baseUrl = `http://localhost:${addr.port}`;
    done();
  });
});

after((_, done) => {
  server.close(done);
});

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, baseUrl);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(out || '{}') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    http.get(url.href, resolve).on('error', reject);
  });
}

describe('POST /api/generate — validation', () => {
  it('returns 400 when transcript is missing', async () => {
    const { status, body } = await post('/api/generate', {});
    assert.equal(status, 400);
    assert.match(body.error, /Missing "transcript"/);
  });

  it('returns 400 when transcript is empty string', async () => {
    const { status, body } = await post('/api/generate', { transcript: '   ' });
    assert.equal(status, 400);
    assert.match(body.error, /empty/);
  });

  it('returns 400 when transcript is too short', async () => {
    const { status, body } = await post('/api/generate', { transcript: 'hi' });
    assert.equal(status, 400);
    assert.match(body.error, /too short/);
  });

  it('returns 400 when transcript is not a string', async () => {
    const { status, body } = await post('/api/generate', { transcript: 123 });
    assert.equal(status, 400);
    assert.match(body.error, /must be a string/);
  });
});

describe('Static serving', () => {
  it('serves index.html at /', async () => {
    const res = await get('/');
    assert.equal(res.statusCode, 200);
    const chunks = [];
    for await (const c of res) chunks.push(c);
    const html = Buffer.concat(chunks).toString();
    assert.match(html, /Roadmap Scribe/);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await get('/nonexistent');
    assert.equal(res.statusCode, 404);
  });
});