require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initKafka } = require('./config/kafka');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes – IMU
const authRoutes = require('./routes/auth');
const contribuentiRoutes = require('./routes/contribuenti');
const immobiliRoutes = require('./routes/immobili');
const aliquoteRoutes = require('./routes/aliquote');
const dichiarazioniRoutes = require('./routes/dichiarazioni');
const versamentiRoutes = require('./routes/versamenti');
const attiRoutes = require('./routes/atti');
const stampeRoutes = require('./routes/stampe');
const elaborazioniRoutes = require('./routes/elaborazioni');
const dashboardRoutes = require('./routes/dashboard');
// Routes – TARI
const tariffeTariRoutes = require('./routes/tariffeTari');
const utenzeTariRoutes = require('./routes/utenzeTari');
const dichiarazioniTariRoutes = require('./routes/dichiarazioniTari');
const versamenti_tariRoutes = require('./routes/versamenti_tari');
// Routes – Sync ACSOR
const syncRoutes = require('./routes/sync');
// Routes – Reportistica
const reportRoutes = require('./routes/report');
// Routes – AI / RAG
const ragRoutes  = require('./routes/rag');
const chatRoutes = require('./routes/chat');

const app = express();

// ── Security & Middleware ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } }));

// Global rate limiter
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true }));

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── API Routes ─────────────────────────────────────────────────────────────
const api = express.Router();
api.use('/auth', authRoutes);
api.use('/contribuenti', contribuentiRoutes);
api.use('/immobili', immobiliRoutes);
api.use('/aliquote', aliquoteRoutes);
api.use('/dichiarazioni', dichiarazioniRoutes);
api.use('/versamenti', versamentiRoutes);
api.use('/atti', attiRoutes);
api.use('/stampe', stampeRoutes);
api.use('/elaborazioni', elaborazioniRoutes);
api.use('/dashboard', dashboardRoutes);
// TARI
api.use('/tari/tariffe', tariffeTariRoutes);
api.use('/tari/utenze', utenzeTariRoutes);
api.use('/tari/dichiarazioni', dichiarazioniTariRoutes);
api.use('/tari/versamenti', versamenti_tariRoutes);
// Sync ACSOR (service-to-service + UI read)
api.use('/sync', syncRoutes);
// Reportistica
api.use('/report', reportRoutes);
// AI / RAG
api.use('/rag', ragRoutes);
api.use('/chat', chatRoutes);

app.use('/api/v1', api);

// ── Error Handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();
    await initKafka();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`🚀 Tax Management API running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Bootstrap failed', err);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received – shutting down gracefully');
  process.exit(0);
});

module.exports = app;
