require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log('[Server] Ready to accept requests');

  // Auto-clean LID entries from message log on startup
  try {
    const { cleanLog } = require('./src/csv/csvService');
    cleanLog();
  } catch { /* ignore if log doesn't exist yet */ }
}).on('error', (err) => {
  console.error('[Server] Failed to start:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} is already in use`);
  }
  process.exit(1);
});
