const express = require('express');
const multer = require('multer');
const { authenticate } = require('../auth/authMiddleware');
const { sendMessage, sendToAllContacts, startBulkSend, stopBulkSend, getBulkStatus, getStatus, getQR, logout, initWhatsApp } = require('../whatsapp/whatsappClient');
const { readContacts, deleteContact, deleteAllContacts, readLog, saveContacts, clearLog, cleanLog } = require('../csv/csvService');

const router = express.Router();

// Normalize Indian phone numbers — strips non-digits, adds 91 if 10-digit
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;          // 9876543210 → 919876543210
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1); // 09876543210
  return digits; // already has country code or international
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
      'application/csv',
      'text/plain',
    ];
    const ext = (file.originalname || '').toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Use .csv, .xlsx or .xls`));
    }
  },
});

// Separate multer for media uploads (images, videos, documents, audio)
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 64 * 1024 * 1024 }, // 64MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/3gpp', 'video/quicktime',
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    const ext = (file.originalname || '').toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/.test(ext);
    const isVideo = /\.(mp4|3gp|mov)$/.test(ext);
    const isAudio = /\.(mp3|ogg|wav|m4a)$/.test(ext);
    const isDoc   = /\.(pdf|doc|docx|xls|xlsx)$/.test(ext);
    if (allowed.includes(file.mimetype) || isImage || isVideo || isAudio || isDoc) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported media type. Allowed: images, videos, audio, PDF, Word, Excel'));
    }
  },
});

router.use(authenticate);

router.get('/status', (req, res) => {
  res.json({ status: getStatus(), qr: getQR() });
});

// POST /api/whatsapp/init - Initialize WhatsApp client
router.post('/init', (req, res) => {
  try {
    const status = getStatus();
    if (status !== 'disconnected') {
      return res.json({ message: 'WhatsApp already initialized', status });
    }
    initWhatsApp();
    res.json({ message: 'WhatsApp client initializing...', status: 'initializing' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/logout - Logout from WhatsApp
router.post('/logout', async (req, res) => {
  try {
    const result = await logout();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/contacts', (req, res) => {
  try {
    const contacts = readContacts();
    res.json({ total: contacts.length, contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/contacts — add a single contact manually
router.post('/contacts', (req, res) => {
  try {
    const { name, phone, message } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    const normalized = normalizePhone(phone);
    if (normalized.length < 10) return res.status(400).json({ error: 'Invalid phone number' });

    const existing = readContacts();
    if (existing.find(c => c.phone === normalized)) {
      return res.status(409).json({ error: 'Contact with this number already exists' });
    }

    const newContact = { name: (name || '').trim(), phone: normalized, message: (message || '').trim() };
    saveContacts([...existing, newContact]);
    res.status(201).json({ success: true, contact: newContact });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/whatsapp/contacts/:phone - Delete a specific contact (must come BEFORE /contacts)
router.delete('/contacts/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    const result = deleteContact(phone);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/whatsapp/contacts - Delete all contacts
router.delete('/contacts', (req, res) => {
  try {
    const result = deleteAllContacts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send', async (req, res) => {
  const { to, message, name } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: '"to" and "message" are required' });
  }
  try {
    const result = await sendMessage(to, message, name || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send-all', async (req, res) => {
  try {
    const contacts = readContacts();
    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts found in contacts.csv' });
    }
    const results = await sendToAllContacts(contacts);
    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    res.json({ total: contacts.length, sent, failed, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/bulk/start
router.post('/bulk/start', async (req, res) => {
  try {
    const { message, delaySeconds = 3, mediaPath, mediaCaption } = req.body;
    const contacts = readContacts();
    if (contacts.length === 0) return res.status(400).json({ error: 'No contacts found. Please upload contacts first.' });
    const delayMs = Math.max(1, Number(delaySeconds)) * 1000;
    const job = await startBulkSend(contacts, message || '', delayMs, mediaPath || null, mediaCaption || '');
    res.json({ message: 'Bulk send started', total: job.total, delaySeconds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/media/upload — upload media file, returns saved path
router.post('/media/upload', (req, res, next) => {
  mediaUpload.single('media')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No media file uploaded' });

    const fs = require('fs');
    const path = require('path');
    const mime = require('mime-types');

    const mediaDir = path.resolve(__dirname, '../../data/media');
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

    const ext = path.extname(req.file.originalname) || ('.' + (mime.extension(req.file.mimetype) || 'bin'));
    const filename = `media_${Date.now()}${ext}`;
    const filepath = path.join(mediaDir, filename);

    fs.writeFileSync(filepath, req.file.buffer);

    const mimeType = req.file.mimetype;
    let mediaType = 'document';
    if (mimeType.startsWith('image/')) mediaType = 'image';
    else if (mimeType.startsWith('video/')) mediaType = 'video';
    else if (mimeType.startsWith('audio/')) mediaType = 'audio';

    console.log(`[Media] Saved: ${filename} (${mediaType}, ${(req.file.size / 1024).toFixed(1)}KB)`);

    res.json({
      success: true,
      filename,
      filepath,
      mediaType,
      mimeType,
      size: req.file.size,
      originalName: req.file.originalname,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/whatsapp/media — clear uploaded media
router.delete('/media', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const mediaDir = path.resolve(__dirname, '../../data/media');
    if (fs.existsSync(mediaDir)) {
      fs.readdirSync(mediaDir).forEach(f => fs.unlinkSync(path.join(mediaDir, f)));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/bulk/status
router.get('/bulk/status', (req, res) => {
  const job = getBulkStatus();
  if (!job) return res.json({ running: false, total: 0, sent: 0, failed: 0, results: [] });
  res.json(job);
});

// POST /api/whatsapp/bulk/stop
router.post('/bulk/stop', (req, res) => {
  try {
    const job = stopBulkSend();
    res.json({ message: 'Bulk send stopped', sent: job.sent, failed: job.failed });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/messages', (req, res) => {
  try {
    const messages = readLog();
    const { direction } = req.query;
    const filtered = direction ? messages.filter(m => m.direction === direction) : messages;
    res.json({ total: filtered.length, messages: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/whatsapp/messages — clear all message logs
router.delete('/messages', (req, res) => {
  try {
    clearLog();
    res.json({ success: true, message: 'Message log cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/messages/clean — clean up LID/c.us entries in log
router.post('/messages/clean', (req, res) => {
  try {
    cleanLog();
    res.json({ success: true, message: 'Log cleaned up' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/upload-csv — upload a CSV or Excel file, returns headers + preview rows
router.post('/upload-csv', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Make sure the field name is "file".' });

    const ExcelJS = require('exceljs');
    const { parse } = require('csv-parse/sync');
    const filename = (req.file.originalname || '').toLowerCase();
    let rows = [];

    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];
      const headers = [];
      
      const headerRow = sheet.getRow(1);
      headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        headers[colNum - 1] = String(cell.value || '');
      });

      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const obj = {};
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          const header = headers[colNum - 1];
          if (header) {
            obj[header] = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
          }
        });
        if (Object.values(obj).some(v => v)) rows.push(obj);
      });
    } else {
      // Default: treat as CSV
      const content = req.file.buffer.toString('utf8');
      rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    }

    if (rows.length === 0) return res.status(400).json({ error: 'File is empty or has no data rows' });
    const headers = Object.keys(rows[0]);
    const preview = rows.slice(0, 5);
    res.json({ headers, preview, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

// POST /api/whatsapp/import-contacts — save mapped contacts to contacts.csv
router.post('/import-contacts', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { nameCol, phoneCol, messageCol, defaultMessage } = req.body;
    if (!nameCol || !phoneCol) return res.status(400).json({ error: 'Name and phone columns are required' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ExcelJS = require('exceljs');
    const { parse } = require('csv-parse/sync');
    const filename = (req.file.originalname || '').toLowerCase();
    let rows = [];

    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];
      const headers = [];
      
      const headerRow = sheet.getRow(1);
      headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        headers[colNum - 1] = String(cell.value || '');
      });

      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const obj = {};
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          const header = headers[colNum - 1];
          if (header) {
            obj[header] = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
          }
        });
        if (Object.values(obj).some(v => v)) rows.push(obj);
      });
    } else {
      const content = req.file.buffer.toString('utf8');
      rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    }

    const contacts = rows.map(row => ({
      name: String(row[nameCol] || '').trim(),
      phone: normalizePhone(String(row[phoneCol] || '')),
      message: messageCol ? String(row[messageCol] || defaultMessage || '').trim() : (defaultMessage || ''),
    })).filter(c => c.phone.length >= 10);

    saveContacts(contacts);
    res.json({ success: true, imported: contacts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/import-sheets — fetch from Google Sheets public CSV export URL
router.post('/import-sheets', async (req, res) => {
  try {
    const { sheetUrl, nameCol, phoneCol, messageCol, defaultMessage } = req.body;
    if (!sheetUrl) return res.status(400).json({ error: 'Google Sheets URL is required' });
    if (!nameCol || !phoneCol) return res.status(400).json({ error: 'Name and phone columns are required' });

    const https = require('https');
    const http = require('http');

    // Convert Google Sheets URL to CSV export URL
    let csvUrl = sheetUrl;
    if (sheetUrl.includes('docs.google.com/spreadsheets')) {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) return res.status(400).json({ error: 'Invalid Google Sheets URL' });
      csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }

    const fetchUrl = (url) => new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          return fetchUrl(new URL(resp.headers.location, url).href).then(resolve).catch(reject);
        }
        if (resp.statusCode !== 200) {
          return reject(new Error('Failed to fetch: HTTP ' + resp.statusCode));
        }
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => resolve(data));
      }).on('error', reject);
    });

    const content = await fetchUrl(csvUrl);
    const { parse } = require('csv-parse/sync');
    const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });

    if (rows.length === 0) return res.status(400).json({ error: 'Sheet is empty' });

    const contacts = rows.map(row => ({
      name: row[nameCol] || '',
      phone: normalizePhone(row[phoneCol] || ''),
      message: messageCol ? (row[messageCol] || defaultMessage || '') : (defaultMessage || ''),
    })).filter(c => c.phone.length >= 10);

    saveContacts(contacts);
    res.json({ success: true, imported: contacts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/preview-sheets — get headers + preview from Google Sheets
router.post('/preview-sheets', async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl) return res.status(400).json({ error: 'Sheet URL is required' });

    const https = require('https');
    const http = require('http');

    let csvUrl = sheetUrl;
    if (sheetUrl.includes('docs.google.com/spreadsheets')) {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) return res.status(400).json({ error: 'Invalid Google Sheets URL' });
      csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }

    const fetchUrl = (url) => new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          return fetchUrl(new URL(resp.headers.location, url).href).then(resolve).catch(reject);
        }
        if (resp.statusCode !== 200) {
          return reject(new Error('Failed to fetch: HTTP ' + resp.statusCode));
        }
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => resolve(data));
      }).on('error', reject);
    });

    const content = await fetchUrl(csvUrl);
    const { parse } = require('csv-parse/sync');
    const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    if (rows.length === 0) return res.status(400).json({ error: 'Sheet is empty' });

    const headers = Object.keys(rows[0]);
    const preview = rows.slice(0, 5);
    res.json({ headers, preview, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sheet: ' + err.message });
  }
});

module.exports = router;
