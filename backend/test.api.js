/**
 * API integration test — run with: node test.api.js
 * Starts Express without WhatsApp, tests all HTTP routes end-to-end.
 */

require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'admin123';
process.env.PORT = 3099; // isolated port for testing

const http = require('http');

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

// Simple HTTP client helper
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3099,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Build Express app without starting WhatsApp
function buildApp() {
  const express = require('express');
  const cors = require('cors');
  const authRoutes = require('./src/routes/authRoutes');
  const whatsappRoutes = require('./src/routes/whatsappRoutes');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/whatsapp', whatsappRoutes);
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  return app;
}

async function runTests() {
  console.log('\n=== API Integration Tests ===\n');

  const app = buildApp();
  const server = app.listen(3099);
  await new Promise(r => server.on('listening', r));
  console.log('  [Server] Listening on port 3099\n');

  let token = '';

  // [1] Health check
  console.log('[1] GET /health');
  const health = await request('GET', '/health');
  assert('Returns 200', health.status === 200);
  assert('Status is ok', health.body.status === 'ok');

  // [2] Login — wrong credentials
  console.log('\n[2] POST /api/auth/login — invalid credentials');
  const badLogin = await request('POST', '/api/auth/login', { username: 'wrong', password: 'bad' });
  assert('Returns 401', badLogin.status === 401);
  assert('Returns error message', !!badLogin.body.error);

  // [3] Login — correct credentials
  console.log('\n[3] POST /api/auth/login — valid credentials');
  const goodLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  assert('Returns 200', goodLogin.status === 200);
  assert('Returns token', typeof goodLogin.body.token === 'string');
  token = goodLogin.body.token;

  // [4] Register new user
  console.log('\n[4] POST /api/auth/register');
  const reg = await request('POST', '/api/auth/register', { username: 'testuser', password: 'pass123' });
  assert('Returns 201', reg.status === 201);

  // [5] Register duplicate user
  const dup = await request('POST', '/api/auth/register', { username: 'testuser', password: 'pass123' });
  assert('Duplicate returns 409', dup.status === 409);

  // [6] Login as new user
  const newLogin = await request('POST', '/api/auth/login', { username: 'testuser', password: 'pass123' });
  assert('New user can login', newLogin.status === 200);

  // [7] Protected route — no token
  console.log('\n[5] GET /api/whatsapp/status — no token');
  const noAuth = await request('GET', '/api/whatsapp/status');
  assert('Returns 401 without token', noAuth.status === 401);

  // [8] Protected route — bad token
  const badAuth = await request('GET', '/api/whatsapp/status', null, 'bad.token.here');
  assert('Returns 403 with bad token', badAuth.status === 403);

  // [9] WhatsApp status — authenticated
  console.log('\n[6] GET /api/whatsapp/status — authenticated');
  const status = await request('GET', '/api/whatsapp/status', null, token);
  assert('Returns 200', status.status === 200);
  assert('Has status field', typeof status.body.status === 'string');
  assert('Status is disconnected (no WA init)', status.body.status === 'disconnected');

  // [10] GET contacts
  console.log('\n[7] GET /api/whatsapp/contacts');
  const contacts = await request('GET', '/api/whatsapp/contacts', null, token);
  assert('Returns 200', contacts.status === 200);
  assert('Has contacts array', Array.isArray(contacts.body.contacts));
  assert('Has at least one contact', contacts.body.total >= 1);
  assert('Contact has name/phone/message', contacts.body.contacts[0].name && contacts.body.contacts[0].phone);

  // [11] GET messages log
  console.log('\n[8] GET /api/whatsapp/messages');
  const msgs = await request('GET', '/api/whatsapp/messages', null, token);
  assert('Returns 200', msgs.status === 200);
  assert('Has messages array', Array.isArray(msgs.body.messages));

  // [12] GET messages filtered by direction
  const sent = await request('GET', '/api/whatsapp/messages?direction=sent', null, token);
  assert('Filter by direction=sent works', sent.status === 200);
  const received = await request('GET', '/api/whatsapp/messages?direction=received', null, token);
  assert('Filter by direction=received works', received.status === 200);

  // [13] POST /send — missing fields
  console.log('\n[9] POST /api/whatsapp/send — validation');
  const missingFields = await request('POST', '/api/whatsapp/send', { to: '5511999999999' }, token);
  assert('Returns 400 when message missing', missingFields.status === 400);

  const missingTo = await request('POST', '/api/whatsapp/send', { message: 'hello' }, token);
  assert('Returns 400 when to missing', missingTo.status === 400);

  // [14] POST /send — WA not ready (expected 500)
  const sendNotReady = await request('POST', '/api/whatsapp/send', { to: '5511999999999', message: 'test' }, token);
  assert('Returns 500 when WA not ready', sendNotReady.status === 500);
  assert('Error mentions not ready', sendNotReady.body.error.includes('not ready'));

  // [15] POST /send-all — WA not ready (expected 500)
  console.log('\n[10] POST /api/whatsapp/send-all — WA not ready');
  const sendAll = await request('POST', '/api/whatsapp/send-all', {}, token);
  assert('Returns 500 when WA not ready', sendAll.status === 500);

  server.close();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
