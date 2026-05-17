const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createObjectCsvWriter } = require('csv-writer');

const CONTACTS_FILE = path.resolve(__dirname, '../../data/contacts.csv');
const LOG_FILE = path.resolve(__dirname, '../../data/messages_log.csv');

// Ensure log file exists with headers
function ensureLogFile() {
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, 'timestamp,direction,from,to,name,message,status\n');
  }
}

/**
 * Read all contacts from contacts.csv
 * Returns array of { name, phone, message }
 */
function readContacts() {
  if (!fs.existsSync(CONTACTS_FILE)) {
    throw new Error(`contacts.csv not found at ${CONTACTS_FILE}`);
  }
  const content = fs.readFileSync(CONTACTS_FILE, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

/**
 * Delete a contact by phone number
 */
function deleteContact(phone) {
  const contacts = readContacts();
  const filtered = contacts.filter(c => c.phone !== phone);
  
  if (filtered.length === contacts.length) {
    throw new Error('Contact not found');
  }
  
  saveContacts(filtered);
  
  console.log(`[CSV] Deleted contact: ${phone}`);
  return { success: true, deleted: contacts.length - filtered.length };
}

/**
 * Delete all contacts
 */
function deleteAllContacts() {
  const contacts = readContacts();
  const count = contacts.length;
  
  saveContacts([]);
  
  console.log(`[CSV] Deleted all ${count} contacts`);
  return { success: true, deleted: count };
}

/**
 * Append a message record to messages_log.csv
 * direction: 'sent' | 'received'
 */
async function logMessage({ direction, from, to, name = '', message, status = 'ok' }) {
  ensureLogFile();
  
  const escape = (v) => {
    const s = String(v || '');
    return `"${s.replace(/"/g, '""')}"`;
  };

  const row = [
    new Date().toISOString(),
    direction,
    from,
    to,
    escape(name),
    escape(message),
    status
  ].join(',') + '\n';

  fs.appendFileSync(LOG_FILE, row);
  console.log(`[CSV] Logged ${direction} message | ${from} → ${to}`);
}

/**
 * Read all records from messages_log.csv
 */
function readLog() {
  ensureLogFile();
  const content = fs.readFileSync(LOG_FILE, 'utf8');
  try {
    return parse(content, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    console.error('[CSV] Failed to parse log:', err.message);
    return [];
  }
}

/**
 * Look up a contact name by phone number
 * Handles @c.us suffix, #lid format, and plain numbers
 */
function findContactName(phone) {
  try {
    const contacts = readContacts();
    // Strip @c.us, #lid and any non-digit chars for comparison
    const normalized = String(phone)
      .replace(/@c\.us$/i, '')
      .replace(/#.*$/, '')       // remove #lid suffix
      .replace(/@lid$/i, '')     // remove @lid suffix
      .replace(/\D/g, '');       // keep only digits

    if (!normalized || normalized.length < 6) return '';

    const found = contacts.find(c => {
      const cp = String(c.phone).replace(/\D/g, '');
      // Match exact or suffix (e.g. 919876543210 matches 9876543210)
      return cp === normalized || cp.endsWith(normalized) || normalized.endsWith(cp);
    });
    return found ? found.name : '';
  } catch {
    return '';
  }
}

/**
 * Clean up LID entries and fake messages from the message log
 */
function cleanLog() {
  ensureLogFile();
  const content = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = content.split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1);

  const FAKE_NUMBERS = ['status', 'broadcast', 'msadwika99@gmail.com'];
  const FAKE_PATTERNS = [/^status@/, /gmail\.com/, /^[a-zA-Z]/]; // non-numeric senders

  const cleaned = dataLines
    .filter(line => {
      if (!line.trim()) return false;
      const parts = line.split(',');
      if (parts.length < 3) return false;
      const from = parts[2]?.trim() || '';
      const direction = parts[1]?.trim();
      const message = parts[5]?.trim() || '';
      // Remove status broadcasts, email-based IDs, and non-numeric senders
      if (FAKE_NUMBERS.some(f => from.includes(f))) return false;
      if (FAKE_PATTERNS.some(p => p.test(from))) return false;
      // Remove empty received messages (reactions, delivery receipts)
      if (direction === 'received' && !message) return false;
      // Remove single emoji reactions
      const emojiOnly = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*$/u;
      if (direction === 'received' && emojiOnly.test(message)) return false;
      return true;
    })
    .map(line => {
      if (!line.trim()) return line;
      return line
        .replace(/([0-9]+)#[a-zA-Z0-9]+/g, '$1')
        .replace(/([0-9]+)@lid/g, '$1')
        .replace(/@c\.us/g, '');
    })
    .map(line => {
      if (!line.trim()) return line;
      const parts = line.split(',');
      if (parts.length >= 5 && parts[4].trim() === '.') parts[4] = '';
      return parts.join(',');
    });

  fs.writeFileSync(LOG_FILE, [header, ...cleaned].join('\n'));
  console.log('[CSV] Log cleaned up');
}

/**
 * Save contacts array to contacts.csv (overwrites)
 */
function saveContacts(contacts) {
  const header = 'name,phone,message\n';
  const rows = contacts.map(c => {
    // Robust CSV escaping: wrap in quotes, escape existing quotes by doubling them
    const escape = (v) => {
      const s = String(v || '');
      return `"${s.replace(/"/g, '""')}"`;
    };
    return `${escape(c.name)},${escape(c.phone)},${escape(c.message)}`;
  }).join('\n');
  fs.writeFileSync(CONTACTS_FILE, header + rows + (rows ? '\n' : ''));
  console.log(`[CSV] Saved ${contacts.length} contacts`);
}

/**
 * Clear all message logs
 */
function clearLog() {
  fs.writeFileSync(LOG_FILE, 'timestamp,direction,from,to,name,message,status\n');
  console.log('[CSV] Message log cleared');
}

module.exports = { readContacts, deleteContact, deleteAllContacts, saveContacts, logMessage, readLog, clearLog, cleanLog, findContactName };
