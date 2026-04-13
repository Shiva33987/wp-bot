const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { logMessage, findContactName } = require('../csv/csvService');

let client = null;
let clientStatus = 'disconnected'; // disconnected | qr_ready | authenticated | ready
let currentQR = null; // Store current QR code data URL

function getClient() { return client; }
function getStatus() { return clientStatus; }
function getQR() { return currentQR; }

function initWhatsApp() {
  if (client) {
    console.log('[WhatsApp] Client already initialized');
    return;
  }

  console.log('[WhatsApp] Creating new client...');
  
  try {
    client = new Client({
      authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process',
        ],
      },
    });
  } catch (err) {
    console.error('[WhatsApp] Failed to create client:', err.message);
    clientStatus = 'disconnected';
    client = null;
    throw err;
  }

  client.on('qr', async (qr) => {
    clientStatus = 'qr_ready';
    console.log('\n[WhatsApp] Scan the QR code below:\n');
    qrcode.generate(qr, { small: true });
    
    // Generate QR code as data URL for frontend
    try {
      currentQR = await QRCode.toDataURL(qr);
      console.log('[WhatsApp] QR code ready for frontend');
    } catch (err) {
      console.error('[WhatsApp] Failed to generate QR data URL:', err.message);
    }
  });

  client.on('authenticated', () => {
    clientStatus = 'authenticated';
    currentQR = null; // Clear QR code after authentication
    console.log('[WhatsApp] Authenticated successfully');
  });

  client.on('ready', () => {
    clientStatus = 'ready';
    currentQR = null; // Clear QR code when ready
    console.log('[WhatsApp] Client is ready');
  });

  client.on('disconnected', (reason) => {
    clientStatus = 'disconnected';
    currentQR = null;
    console.log('[WhatsApp] Disconnected:', reason);
    client = null;
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Authentication failure:', msg);
    clientStatus = 'disconnected';
    currentQR = null;
    client = null;
  });

  client.on('loading_screen', (percent) => {
    console.log('[WhatsApp] Loading...', percent + '%');
  });

  // Log all incoming messages (replies) to CSV
  client.on('message', async (msg) => {
    // ── Filter out non-real messages ──────────────────────────────────────
    // Skip status broadcasts
    if (msg.from === 'status@broadcast') return;
    // Skip group messages (group IDs end with @g.us)
    if (msg.from?.endsWith('@g.us')) return;
    // Skip reactions (type = 'reaction')
    if (msg.type === 'reaction') return;
    // Skip empty messages
    if (!msg.body && !msg.hasMedia) return;
    // Skip messages from self
    if (msg.fromMe) return;
    // Skip system/notification messages
    if (['notification', 'notification_template', 'e2e_notification', 'call_log', 'protocol'].includes(msg.type)) return;
    // Skip single emoji reactions (❤️ etc.)
    const emojiOnly = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*$/u;
    if (msg.body && emojiOnly.test(msg.body)) return;
    // Skip non-numeric senders (email-based IDs, gmail etc.)
    const senderDigits = (msg.from || '').replace(/\D/g, '');
    if (senderDigits.length < 6 && !msg.from?.includes('@c.us')) return;
    // ─────────────────────────────────────────────────────────────────────

    let displayNumber = '';
    let senderName = '';

    try {
      const contact = await msg.getContact();
      displayNumber = contact.number || '';
      senderName = contact.pushname || contact.name || '';
    } catch {
      displayNumber = (msg.from || '')
        .replace('@c.us', '')
        .replace(/#.*$/, '')
        .replace(/@lid$/, '')
        .replace(/\D/g, '');
    }

    if (!senderName) {
      senderName = msg._data?.notifyName || msg.notifyName || '';
    }

    const csvName = findContactName(displayNumber);
    if (csvName) senderName = csvName;

    console.log(`[WhatsApp] Received from ${senderName || displayNumber}: ${msg.body}`);

    try {
      await logMessage({
        direction: 'received',
        from: displayNumber,
        to: 'bot',
        name: senderName,
        message: msg.body || '[Media]',
        status: 'received',
      });
    } catch (err) {
      console.error('[CSV] Failed to log incoming message:', err.message);
    }

    // Auto-reply
    if (msg.body.toLowerCase() === 'hello' || msg.body.toLowerCase() === 'hi') {
      await msg.reply('Hello! 👋 Welcome. We are here to help you. Please type your query.');
    }
    if (msg.body.toLowerCase() === 'help' || msg.body === '?') {
      await msg.reply('🇮🇳 *WhatsApp Bot India*\n\nYou can:\n• Type *HELLO* - Get a welcome message\n• Type *HELP* - Show this menu\n• Type *STOP* - Unsubscribe\n\nContact us: support@example.in');
    }
    if (msg.body.toLowerCase() === 'stop') {
      await msg.reply('Your unsubscribe request has been received. We will not send you any more messages. Thank you!');
    }
  });

  try {
    client.initialize();
    console.log('[WhatsApp] Initializing client...');
  } catch (err) {
    console.error('[WhatsApp] Initialization failed:', err.message);
    clientStatus = 'disconnected';
    client = null;
    throw err;
  }
}

/**
 * Send a message to a single number.
 * @param {string} to - phone number e.g. "5511999999999"
 * @param {string} message - text to send
 * @param {string} name - contact name for logging
 */
async function sendMessage(to, message, name = '') {
  if (!client || (clientStatus !== 'ready' && clientStatus !== 'authenticated')) {
    throw new Error('WhatsApp client is not ready. Status: ' + clientStatus + '. Please connect WhatsApp first.');
  }

  // Normalize phone — add 91 for 10-digit Indian numbers
  let phone = String(to).replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;
  else if (phone.length === 11 && phone.startsWith('0')) phone = '91' + phone.slice(1);

  const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
  await client.sendMessage(chatId, message);

  await logMessage({
    direction: 'sent',
    from: 'bot',
    to: chatId,
    name,
    message,
    status: 'sent',
  });

  return { success: true, to: chatId, name, message };
}

/**
 * Send messages to all contacts loaded from contacts.csv
 */
async function sendToAllContacts(contacts) {
  const results = [];
  for (const contact of contacts) {
    try {
      const result = await sendMessage(contact.phone, contact.message, contact.name);
      results.push({ ...result, error: null });
    } catch (err) {
      console.error(`[WhatsApp] Failed to send to ${contact.phone}:`, err.message);
      await logMessage({
        direction: 'sent', from: 'bot', to: contact.phone,
        name: contact.name, message: contact.message,
        status: 'failed: ' + err.message,
      }).catch(() => {});
      results.push({ success: false, to: contact.phone, name: contact.name, error: err.message });
    }
  }
  return results;
}

/**
 * Send a message with media attachment.
 */
async function sendMessageWithMedia(to, media, caption, name = '') {
  if (!client || (clientStatus !== 'ready' && clientStatus !== 'authenticated')) {
    throw new Error('WhatsApp client is not ready. Status: ' + clientStatus);
  }
  let phone = String(to).replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;
  else if (phone.length === 11 && phone.startsWith('0')) phone = '91' + phone.slice(1);
  const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
  await client.sendMessage(chatId, media, { caption });
  await logMessage({
    direction: 'sent', from: 'bot', to: chatId, name,
    message: `[Media] ${caption || ''}`, status: 'sent',
  });
  return { success: true, to: chatId, name };
}

// ── Bulk send state ────────────────────────────────────────────────────────
let bulkJob = null; // { total, sent, failed, stopped, running, results, startedAt }

function getBulkStatus() { return bulkJob; }

/**
 * Start a bulk send job with delay between messages.
 * @param {Array}  contacts   - array of { name, phone, message }
 * @param {string} message    - override message (if provided, used for all contacts)
 * @param {number} delayMs    - delay between messages in milliseconds
 * @param {string} mediaPath  - optional path to media file to attach
 * @param {string} mediaCaption - optional caption for media
 */
async function startBulkSend(contacts, message, delayMs = 2000, mediaPath = null, mediaCaption = '') {
  if (bulkJob && bulkJob.running) {
    throw new Error('A bulk send job is already running');
  }

  bulkJob = {
    total: contacts.length,
    sent: 0,
    failed: 0,
    stopped: false,
    running: true,
    results: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
    hasMedia: !!mediaPath,
  };

  // Run async without blocking
  (async () => {
    const { MessageMedia } = require('whatsapp-web.js');
    const fs = require('fs');
    const path = require('path');
    const mime = require('mime-types');

    let media = null;
    if (mediaPath && fs.existsSync(mediaPath)) {
      try {
        const data = fs.readFileSync(mediaPath).toString('base64');
        const mimeType = mime.lookup(mediaPath) || 'application/octet-stream';
        const filename = path.basename(mediaPath);
        media = new MessageMedia(mimeType, data, filename);
        console.log(`[Bulk] Media loaded: ${filename}`);
      } catch (err) {
        console.error('[Bulk] Failed to load media:', err.message);
        media = null;
      }
    }

    for (let i = 0; i < contacts.length; i++) {
      if (bulkJob.stopped) break;

      const contact = contacts[i];
      const rawText = message || contact.message || '';
      const text = rawText.replace(/\{name\}/gi, contact.name || '');
      // Also replace {name} in media caption
      const caption = (mediaCaption || text).replace(/\{name\}/gi, contact.name || '');

      try {
        if (media) {
          await sendMessageWithMedia(contact.phone, media, caption, contact.name);
        } else {
          await sendMessage(contact.phone, text, contact.name);
        }
        bulkJob.sent++;
        bulkJob.results.push({ name: contact.name, phone: contact.phone, status: 'sent' });
        console.log(`[Bulk] ${bulkJob.sent}/${bulkJob.total} sent to ${contact.name}`);
      } catch (err) {
        bulkJob.failed++;
        bulkJob.results.push({ name: contact.name, phone: contact.phone, status: 'failed', error: err.message });
        console.error(`[Bulk] Failed to send to ${contact.phone}:`, err.message);
        await logMessage({
          direction: 'sent', from: 'bot', to: contact.phone,
          name: contact.name, message: text,
          status: 'failed: ' + err.message,
        }).catch(() => {});
      }

      if (i < contacts.length - 1 && !bulkJob.stopped) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    bulkJob.running = false;
    bulkJob.finishedAt = new Date().toISOString();
    console.log(`[Bulk] Done. Sent: ${bulkJob.sent}, Failed: ${bulkJob.failed}`);
  })();

  return bulkJob;
}

function stopBulkSend() {
  if (!bulkJob || !bulkJob.running) throw new Error('No bulk job is running');
  bulkJob.stopped = true;
  bulkJob.running = false;
  bulkJob.finishedAt = new Date().toISOString();
  return bulkJob;
}

/**
 * Logout and destroy WhatsApp session
 */
async function logout() {
  if (!client) {
    throw new Error('No active WhatsApp session');
  }
  
  try {
    await client.logout();
    await client.destroy();
    client = null;
    clientStatus = 'disconnected';
    currentQR = null;
    console.log('[WhatsApp] Logged out successfully');
    return { success: true, message: 'Logged out successfully' };
  } catch (err) {
    console.error('[WhatsApp] Logout failed:', err.message);
    throw err;
  }
}

module.exports = { initWhatsApp, sendMessage, sendToAllContacts, startBulkSend, stopBulkSend, getBulkStatus, getStatus, getClient, getQR, logout };
