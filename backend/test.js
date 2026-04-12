/**
 * Test suite — run with: node test.js
 * Covers: auth, JWT, CSV read/write, contact lookup, number formatting
 */

require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { parse } = require('csv-parse/sync');
const { createObjectCsvWriter } = require('csv-writer');

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

const TEST_LOG = path.resolve(__dirname, 'data/test_log.csv');
const TEST_CONTACTS = path.resolve(__dirname, 'data/contacts.csv');

async function runTests() {
  console.log('\n=== WhatsApp Chatbot CSV Tests ===\n');

  // [1] Auth
  console.log('[1] Auth: JWT token generation and verification');
  const token = jwt.sign({ username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  assert('Token is a non-empty string', typeof token === 'string' && token.length > 0);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assert('Decoded username matches', decoded.username === 'admin');
  let threw = false;
  try { jwt.verify('bad.token', process.env.JWT_SECRET); } catch { threw = true; }
  assert('Invalid token throws', threw);

  // [2] Password hashing
  console.log('\n[2] Auth: Password hashing');
  const hashed = await bcrypt.hash('secret123', 10);
  assert('Correct password matches', await bcrypt.compare('secret123', hashed));
  assert('Wrong password rejected', !(await bcrypt.compare('wrong', hashed)));

  // [3] contacts.csv parsing
  console.log('\n[3] CSV: Read contacts.csv');
  assert('contacts.csv exists', fs.existsSync(TEST_CONTACTS));
  const raw = fs.readFileSync(TEST_CONTACTS, 'utf8');
  const contacts = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  assert('Has at least one contact', contacts.length > 0);
  assert('Contact has name field', 'name' in contacts[0]);
  assert('Contact has phone field', 'phone' in contacts[0]);
  assert('Contact has message field', 'message' in contacts[0]);

  // [4] CSV log write and read
  console.log('\n[4] CSV: Write and read messages_log');
  // Clean up test log
  if (fs.existsSync(TEST_LOG)) fs.unlinkSync(TEST_LOG);
  fs.writeFileSync(TEST_LOG, 'timestamp,direction,from,to,name,message,status\n');

  const writer = createObjectCsvWriter({
    path: TEST_LOG,
    header: [
      { id: 'timestamp', title: 'timestamp' },
      { id: 'direction', title: 'direction' },
      { id: 'from', title: 'from' },
      { id: 'to', title: 'to' },
      { id: 'name', title: 'name' },
      { id: 'message', title: 'message' },
      { id: 'status', title: 'status' },
    ],
    append: true,
  });

  await writer.writeRecords([
    { timestamp: new Date().toISOString(), direction: 'sent', from: 'bot', to: '5511999990001@c.us', name: 'John Doe', message: 'Hello John!', status: 'sent' },
    { timestamp: new Date().toISOString(), direction: 'received', from: '5511999990001@c.us', to: 'bot', name: 'John Doe', message: 'Hi bot!', status: 'received' },
  ]);

  const logContent = fs.readFileSync(TEST_LOG, 'utf8');
  const logRows = parse(logContent, { columns: true, skip_empty_lines: true, trim: true });
  assert('Log has 2 records', logRows.length === 2);
  assert('First record direction is sent', logRows[0].direction === 'sent');
  assert('Second record direction is received', logRows[1].direction === 'received');
  assert('Sent record has correct name', logRows[0].name === 'John Doe');
  assert('Received record has message', logRows[1].message === 'Hi bot!');

  // [5] Contact name lookup
  console.log('\n[5] CSV: Contact name lookup by phone');
  function findContactName(phone) {
    const normalized = phone.replace('@c.us', '').replace(/\D/g, '');
    const found = contacts.find(c => c.phone.replace(/\D/g, '') === normalized);
    return found ? found.name : '';
  }
  const firstName = contacts[0].name;
  const firstPhone = contacts[0].phone;
  assert('Finds name by plain phone', findContactName(firstPhone) === firstName);
  assert('Finds name by @c.us phone', findContactName(firstPhone + '@c.us') === firstName);
  assert('Returns empty for unknown number', findContactName('0000000000') === '');

  // [6] Phone number formatting
  console.log('\n[6] WhatsApp: Phone number formatting');
  const fmt = (n) => n.includes('@c.us') ? n : `${n}@c.us`;
  assert('Adds @c.us suffix', fmt('5511999999999') === '5511999999999@c.us');
  assert('Does not double-add suffix', fmt('5511999999999@c.us') === '5511999999999@c.us');

  // [7] Middleware token extraction
  console.log('\n[7] Middleware: Bearer token extraction');
  const extract = (h) => (h && h.split(' ')[1]) || null;
  assert('Extracts from Bearer header', extract('Bearer abc123') === 'abc123');
  assert('Returns null for missing header', extract(undefined) === null);
  assert('Returns null for no space', extract('NoSpace') === null);

  // Cleanup
  if (fs.existsSync(TEST_LOG)) fs.unlinkSync(TEST_LOG);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
