/**
 * Bulk Send End-to-End Test
 * Run: node test.bulk.js
 * Tests all bulk endpoints without needing WhatsApp connected
 */

require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'admin123';
process.env.PORT = 3099;

const http = require('http');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost', port: 3099, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Build app without WhatsApp
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
  console.log('\n=== Bulk Send System Tests ===\n');

  const app = buildApp();
  const server = app.listen(3099);
  await new Promise(r => server.on('listening', r));
  console.log('  [Server] Listening on port 3099\n');

  // [1] Login
  console.log('[1] Auth');
  const login = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  assert('Login returns 200', login.status === 200);
  assert('Login returns token', typeof login.body.token === 'string');
  const token = login.body.token;

  // [2] Health
  console.log('\n[2] Health check');
  const health = await request('GET', '/health');
  assert('Health returns ok', health.body.status === 'ok');

  // [3] WhatsApp status
  console.log('\n[3] WhatsApp status endpoint');
  const status = await request('GET', '/api/whatsapp/status', null, token);
  assert('Status returns 200', status.status === 200);
  assert('Status has status field', typeof status.body.status === 'string');
  assert('Status is disconnected (no WA init)', status.body.status === 'disconnected');
  console.log(`     WA Status: ${status.body.status}`);

  // [4] Contacts
  console.log('\n[4] Contacts endpoint');
  const contacts = await request('GET', '/api/whatsapp/contacts', null, token);
  assert('Contacts returns 200', contacts.status === 200);
  assert('Contacts has array', Array.isArray(contacts.body.contacts));
  console.log(`     Contacts loaded: ${contacts.body.total}`);

  // [5] Bulk status (idle)
  console.log('\n[5] Bulk status — idle state');
  const bulkIdle = await request('GET', '/api/whatsapp/bulk/status', null, token);
  assert('Bulk status returns 200', bulkIdle.status === 200);
  assert('Bulk not running initially', bulkIdle.body.running === false);
  assert('Bulk has sent field', typeof bulkIdle.body.sent === 'number');
  assert('Bulk has failed field', typeof bulkIdle.body.failed === 'number');
  assert('Bulk has results array', Array.isArray(bulkIdle.body.results));

  // [6] Bulk start — no contacts
  console.log('\n[6] Bulk start — validation');
  // Temporarily empty contacts
  const contactsFile = path.resolve(__dirname, 'data/contacts.csv');
  const originalContent = fs.readFileSync(contactsFile, 'utf8');
  fs.writeFileSync(contactsFile, 'name,phone,message\n');

  const bulkNoContacts = await request('POST', '/api/whatsapp/bulk/start', { message: 'Test', delaySeconds: 1 }, token);
  assert('Returns 400 when no contacts', bulkNoContacts.status === 400);
  assert('Error mentions contacts', bulkNoContacts.body.error?.includes('contacts'));

  // Restore contacts
  fs.writeFileSync(contactsFile, originalContent);

  // [7] Bulk start — WA not connected (expected to fail gracefully)
  console.log('\n[7] Bulk start — WA disconnected');
  const bulkStart = await request('POST', '/api/whatsapp/bulk/start', { message: 'Hello {name}!', delaySeconds: 1 }, token);
  assert('Bulk start returns 200 (job queued)', bulkStart.status === 200);
  assert('Returns total contacts', typeof bulkStart.body.total === 'number');
  console.log(`     Job started for ${bulkStart.body.total} contacts`);

  // Wait a moment for async job to process
  await new Promise(r => setTimeout(r, 1500));

  // [8] Bulk status — after start
  console.log('\n[8] Bulk status — after start');
  const bulkAfter = await request('GET', '/api/whatsapp/bulk/status', null, token);
  assert('Bulk status returns 200', bulkAfter.status === 200);
  assert('Has results array', Array.isArray(bulkAfter.body.results));
  assert('Results have name field', bulkAfter.body.results.length === 0 || 'name' in bulkAfter.body.results[0]);
  assert('Results have status field', bulkAfter.body.results.length === 0 || 'status' in bulkAfter.body.results[0]);
  console.log(`     Sent: ${bulkAfter.body.sent}, Failed: ${bulkAfter.body.failed}, Running: ${bulkAfter.body.running}`);

  // [9] Bulk stop — when not running
  console.log('\n[9] Bulk stop — when not running');
  const bulkStop = await request('POST', '/api/whatsapp/bulk/stop', {}, token);
  assert('Stop returns 400 when not running', bulkStop.status === 400);

  // [10] Message log
  console.log('\n[10] Message log');
  const msgs = await request('GET', '/api/whatsapp/messages', null, token);
  assert('Messages returns 200', msgs.status === 200);
  assert('Messages has array', Array.isArray(msgs.body.messages));

  // [11] Clear log
  console.log('\n[11] Clear message log');
  const clear = await request('DELETE', '/api/whatsapp/messages', null, token);
  assert('Clear returns 200', clear.status === 200);
  assert('Clear returns success', clear.body.success === true);

  // [12] {name} replacement logic
  console.log('\n[12] {name} placeholder replacement');
  function replaceName(msg, name) {
    return msg.replace(/\{name\}/gi, name || '');
  }
  assert('Replaces {name}', replaceName('Hello {name}!', 'Rahul') === 'Hello Rahul!');
  assert('Replaces {NAME} case-insensitive', replaceName('Hi {NAME}!', 'Priya') === 'Hi Priya!');
  assert('Handles missing name', replaceName('Hello {name}!', '') === 'Hello !');
  assert('No replacement when no placeholder', replaceName('Hello!', 'Rahul') === 'Hello!');

  // [13] Phone number validation
  console.log('\n[13] Phone number validation');
  function isValidIndianPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
  }
  assert('Valid 10-digit number', isValidIndianPhone('9876543210'));
  assert('Valid with country code', isValidIndianPhone('919876543210'));
  assert('Rejects short number', !isValidIndianPhone('12345'));
  assert('Strips non-digits', isValidIndianPhone('+91-987-654-3210'));

  server.close();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
