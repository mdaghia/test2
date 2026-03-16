'use strict';
/**
 * Sync Service — legge da Oracle ACSOR e invia al backend Tax Management via API
 * Supporta:
 *   - Full sync (tutti i record attivi)
 *   - Delta sync (solo modificati da una data in poi)
 * Chiama endpoint backend: POST /api/v1/sync/contribuenti e /sync/immobili
 */
const axios = require('axios');
const dayjs = require('dayjs');
const { query } = require('../oracle/client');
const {
  SQL_SOGGETTI_FULL, SQL_SOGGETTI_DELTA,
  SQL_IMMOBILI_FULL, SQL_IMMOBILI_DELTA,
  SQL_COUNT_SOGGETTI, SQL_COUNT_IMMOBILI,
} = require('../oracle/queries');
const { mapContribuente } = require('../mappers/contribuente');
const { mapImmobile }     = require('../mappers/immobile');
const logger = require('../logger');

const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 200;

const backendApi = axios.create({
  baseURL: process.env.BACKEND_URL || 'http://backend:5000/api/v1',
  timeout: 60_000,
  headers: { 'x-sync-key': process.env.SYNC_API_KEY || '' },
});

// ── Generic batch sender ───────────────────────────────────────────────────
async function sendBatch(endpoint, records) {
  const res = await backendApi.post(endpoint, { records });
  return res.data;
}

// ── Chunker ────────────────────────────────────────────────────────────────
function* chunkArray(arr, size) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

// ── Sync Contribuenti ─────────────────────────────────────────────────────
async function syncContribuenti({ since } = {}) {
  const sql    = since ? SQL_SOGGETTI_DELTA : SQL_SOGGETTI_FULL;
  const binds  = since ? { since: new Date(since) } : {};
  const label  = since ? `delta (since ${dayjs(since).format('YYYY-MM-DD HH:mm')})` : 'full';

  logger.info(`[contribuenti] Avvio sync ${label}`);
  const rows = await query(sql, binds);
  logger.info(`[contribuenti] Letti ${rows.length} soggetti da Oracle`);

  const mapped = rows.map(mapContribuente);
  let totale = { upserted: 0, modified: 0, errors: 0 };

  for (const batch of chunkArray(mapped, BATCH_SIZE)) {
    const result = await sendBatch('/sync/contribuenti', batch);
    totale.upserted += result.upserted || 0;
    totale.modified  += result.modified  || 0;
    totale.errors    += result.errors    || 0;
    logger.info(`[contribuenti] Batch inviato: ${batch.length} record → ${JSON.stringify(result)}`);
  }

  logger.info(`[contribuenti] Sync completata: ${JSON.stringify(totale)}`);
  return { tipo: 'contribuenti', ...totale, totaleRecord: rows.length };
}

// ── Sync Immobili ─────────────────────────────────────────────────────────
async function syncImmobili({ since } = {}) {
  const sql   = since ? SQL_IMMOBILI_DELTA : SQL_IMMOBILI_FULL;
  const binds = since ? { since: new Date(since) } : {};
  const label = since ? `delta (since ${dayjs(since).format('YYYY-MM-DD HH:mm')})` : 'full';

  logger.info(`[immobili] Avvio sync ${label}`);
  const rows = await query(sql, binds);
  logger.info(`[immobili] Lette ${rows.length} righe da Oracle`);

  const mapped = rows.map(mapImmobile);
  let totale = { upserted: 0, modified: 0, errors: 0 };

  for (const batch of chunkArray(mapped, BATCH_SIZE)) {
    const result = await sendBatch('/sync/immobili', batch);
    totale.upserted += result.upserted || 0;
    totale.modified  += result.modified  || 0;
    totale.errors    += result.errors    || 0;
    logger.info(`[immobili] Batch inviato: ${batch.length} record → ${JSON.stringify(result)}`);
  }

  logger.info(`[immobili] Sync completata: ${JSON.stringify(totale)}`);
  return { tipo: 'immobili', ...totale, totaleRecord: rows.length };
}

// ── Full sync (entrambi) ───────────────────────────────────────────────────
async function fullSync() {
  const start = Date.now();
  const results = [];

  results.push(await syncContribuenti());
  results.push(await syncImmobili());

  const elapsed = Math.round((Date.now() - start) / 1000);
  return { tipo: 'full', results, elapsedSeconds: elapsed, completedAt: new Date().toISOString() };
}

// ── Delta sync ─────────────────────────────────────────────────────────────
async function deltaSync(since) {
  const start = Date.now();
  const results = [];

  results.push(await syncContribuenti({ since }));
  results.push(await syncImmobili({ since }));

  const elapsed = Math.round((Date.now() - start) / 1000);
  return { tipo: 'delta', since, results, elapsedSeconds: elapsed, completedAt: new Date().toISOString() };
}

// ── Count totals from Oracle ───────────────────────────────────────────────
async function getOracleCounts() {
  const [cs, ci] = await Promise.all([
    query(SQL_COUNT_SOGGETTI),
    query(SQL_COUNT_IMMOBILI),
  ]);
  return {
    soggetti: cs[0]?.CNT || 0,
    immobili: ci[0]?.CNT || 0,
  };
}

module.exports = { syncContribuenti, syncImmobili, fullSync, deltaSync, getOracleCounts };
