require('dotenv').config();
const express = require('express');
const morgan  = require('morgan');
const dayjs   = require('dayjs');
const logger  = require('./logger');
const { ping }  = require('./oracle/client');
const { fullSync, deltaSync, syncContribuenti, syncImmobili, getOracleCounts } = require('./sync/syncService');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(morgan('tiny', { stream: { write: m => logger.http(m.trim()) } }));

// ── In-memory job state ────────────────────────────────────────────────────
let currentJob = null;  // { type, startedAt, status }
let lastResult = null;

function isRunning() { return currentJob?.status === 'running'; }

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date(), job: currentJob });
});

// ── Oracle connectivity test ───────────────────────────────────────────────
app.get('/oracle/ping', async (_req, res) => {
  try {
    await ping();
    const counts = await getOracleCounts();
    res.json({ status: 'connected', counts });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ── Trigger full sync ──────────────────────────────────────────────────────
app.post('/sync/full', async (_req, res) => {
  if (isRunning()) return res.status(409).json({ message: 'Sync già in corso', job: currentJob });

  currentJob = { type: 'full', startedAt: new Date().toISOString(), status: 'running' };
  res.json({ message: 'Full sync avviato', job: currentJob });

  fullSync()
    .then(result => { lastResult = result; currentJob = { ...currentJob, status: 'done', completedAt: result.completedAt }; })
    .catch(err  => { lastResult = { error: err.message }; currentJob = { ...currentJob, status: 'error', error: err.message }; logger.error('Full sync error', err); });
});

// ── Trigger delta sync ────────────────────────────────────────────────────
app.post('/sync/delta', async (req, res) => {
  if (isRunning()) return res.status(409).json({ message: 'Sync già in corso', job: currentJob });

  // Default: last 25 hours (overlap safety)
  const since = req.body?.since || dayjs().subtract(25, 'hour').toISOString();
  currentJob  = { type: 'delta', since, startedAt: new Date().toISOString(), status: 'running' };
  res.json({ message: 'Delta sync avviato', job: currentJob });

  deltaSync(since)
    .then(result => { lastResult = result; currentJob = { ...currentJob, status: 'done', completedAt: result.completedAt }; })
    .catch(err  => { lastResult = { error: err.message }; currentJob = { ...currentJob, status: 'error', error: err.message }; logger.error('Delta sync error', err); });
});

// ── Trigger sync singolo tipo ─────────────────────────────────────────────
app.post('/sync/:tipo(contribuenti|immobili)', async (req, res) => {
  if (isRunning()) return res.status(409).json({ message: 'Sync già in corso' });

  const { tipo } = req.params;
  const { since } = req.body || {};
  currentJob = { type: tipo, since, startedAt: new Date().toISOString(), status: 'running' };
  res.json({ message: `Sync ${tipo} avviato`, job: currentJob });

  const fn = tipo === 'contribuenti' ? syncContribuenti : syncImmobili;
  fn(since ? { since } : {})
    .then(result => { lastResult = result; currentJob = { ...currentJob, status: 'done' }; })
    .catch(err  => { lastResult = { error: err.message }; currentJob = { ...currentJob, status: 'error', error: err.message }; logger.error(`${tipo} sync error`, err); });
});

// ── Status ────────────────────────────────────────────────────────────────
app.get('/sync/status', (_req, res) => {
  res.json({ currentJob, lastResult });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Sync Service avviato → porta ${PORT}`);
  logger.info(`Oracle target: ${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE}`);
  logger.info(`Backend API: ${process.env.BACKEND_URL}`);
});
