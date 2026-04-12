require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow Vercel frontend + localhost
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check — Render pings this to keep the service alive
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  console.log('[Server] Ready to accept requests');

  // Auto-clean LID entries from message log on startup
  try {
    const { cleanLog } = require('./src/csv/csvService');
    cleanLog();
  } catch { /* ignore if log doesn't exist yet */ }
}).on('error', (err) => {
  console.error('[Server] Failed to start:', err.message);
  process.exit(1);
});
