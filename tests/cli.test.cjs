const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { createServer } = require('node:http');
const { resolve } = require('node:path');
const { promisify } = require('node:util');
const { test } = require('node:test');
const run = promisify(execFile);
const script = resolve(__dirname, '../scripts/rv-api.cjs');

async function fixture(handler, operation) {
  const server = createServer(handler);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const invoke = (args, extraEnv = {}) => run(process.execPath, [script, ...args, '--json'], {
    env: { ...process.env, RENDERINGVIDEO_API_ORIGIN: origin, RENDERINGVIDEO_API_KEY: 'sk-test', RV_API_KEY: '', RENDERINGVIDEO_AGENT_KEY: '', RENDERINGVIDEO_TIMEOUT_MS: '2000', ...extraEnv }, timeout: 5000,
  });
  try { await operation(invoke); }
  finally { server.closeAllConnections(); await new Promise(done => server.close(done)); }
}

test('preserves API-key authentication and emits one JSON object', async () => {
  await fixture((req, res) => {
    assert.equal(req.url, '/api/v1/capabilities');
    assert.equal(req.headers.authorization, 'Bearer sk-test');
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ success: true, apiVersion: 'v1' }));
  }, async invoke => assert.equal(JSON.parse((await invoke(['capabilities'])).stdout).apiVersion, 'v1'));
});

test('encodes resource IDs and preserves query values', async () => {
  await fixture((req, res) => {
    assert.equal(req.url, '/api/v1/preview/a%2Fb%3F%23');
    res.setHeader('content-type', 'application/json');
    res.end('{"success":true,"config":{}}');
  }, async invoke => { await invoke(['get-preview', 'a/b?#']); });
});

test('rejects a successful HTTP response carrying an API failure', async () => {
  await fixture((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end('{"success":false,"code":"INVALID_CONFIG","error":"Bad schema"}');
  }, async invoke => { await assert.rejects(invoke(['capabilities']), error => error.stderr.includes('INVALID_CONFIG')); });
});

test('does not replay or follow redirects and rejects ambiguous credential configuration', async () => {
  let calls = 0;
  await fixture((req, res) => { calls++; res.writeHead(302, { location: '/api/v1/other' }); res.end(); }, async invoke => {
    await assert.rejects(invoke(['capabilities']));
    assert.equal(calls, 1);
    await assert.rejects(invoke(['capabilities'], { RENDERINGVIDEO_AGENT_KEY: 'ak_test' }), error => error.stderr.includes('not both'));
    assert.equal(calls, 1);
  });
});
