'use strict';
/**
 * Sync Controller — riceve batch da sync-service (Oracle ACSOR) e fa bulkWrite su MongoDB
 * Auth: header x-sync-key (pre-shared secret, NON JWT)
 */
const mongoose = require('mongoose');
const Contribuente      = require('../models/Contribuente');
const Immobile          = require('../models/Immobile');
const SyncLog           = require('../models/SyncLog');
const logger            = require('../utils/logger');

// ── Middleware auth sync-key ───────────────────────────────────────────────
exports.authSyncKey = (req, res, next) => {
  const key = req.headers['x-sync-key'];
  if (!key || key !== process.env.SYNC_API_KEY) {
    return res.status(401).json({ message: 'Sync API key non valida' });
  }
  next();
};

// ── Bulk upsert Contribuenti ───────────────────────────────────────────────
exports.syncContribuenti = async (req, res, next) => {
  const start = Date.now();
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0)
    return res.status(400).json({ message: 'records[] obbligatorio e non vuoto' });

  const log = await SyncLog.create({ tipo: 'contribuenti', totaleRecord: records.length, stato: 'avviato', avviatoDa: 'sync-service' });

  try {
    const ops = records
      .filter(r => r.codiceFiscale?.trim())
      .map(r => ({
        updateOne: {
          filter: { codiceFiscale: r.codiceFiscale.toUpperCase() },
          update: {
            $set: {
              tipo:           r.tipo,
              nome:           r.nome,
              cognome:        r.cognome,
              sesso:          r.sesso,
              dataNascita:    r.dataNascita,
              luogoNascita:   r.luogoNascita,
              ragioneSociale: r.ragioneSociale,
              partitaIva:     r.partitaIva,
              email:          r.email,
              pec:            r.pec,
              telefono:       r.telefono,
              residenza:      r.residenza,
              acsorId:        r.acsorId,
            },
            $setOnInsert: { stato: 'attivo' },
          },
          upsert: true,
        },
      }));

    const result = await Contribuente.bulkWrite(ops, { ordered: false });

    const upserted = result.upsertedCount || 0;
    const modified = result.modifiedCount  || 0;

    await SyncLog.findByIdAndUpdate(log._id, {
      stato: 'completato', upserted, modified,
      errors: records.length - ops.length,
      elapsedMs: Date.now() - start,
    });

    logger.info(`[sync/contribuenti] ${records.length} → upserted:${upserted} modified:${modified}`);
    res.json({ upserted, modified, errors: records.length - ops.length, totaleRecord: records.length });
  } catch (err) {
    await SyncLog.findByIdAndUpdate(log._id, { stato: 'errore', errore: err.message, elapsedMs: Date.now() - start });
    logger.error('[sync/contribuenti] errore', err);
    next(err);
  }
};

// ── Bulk upsert Immobili ───────────────────────────────────────────────────
exports.syncImmobili = async (req, res, next) => {
  const start = Date.now();
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0)
    return res.status(400).json({ message: 'records[] obbligatorio e non vuoto' });

  const log = await SyncLog.create({ tipo: 'immobili', totaleRecord: records.length, stato: 'avviato', avviatoDa: 'sync-service' });

  try {
    // Lookup acsorId → MongoDB _id per i contribuenti in questo batch
    const acsorIds = [...new Set(records.map(r => r.acsorCodSoggetto).filter(Boolean))];
    const contributenti = await Contribuente.find({ acsorId: { $in: acsorIds } }, '_id acsorId').lean();
    const acsorToOid = Object.fromEntries(contributenti.map(c => [c.acsorId, c._id]));

    let errors = 0;
    const ops = [];

    for (const r of records) {
      const contribuenteOid = acsorToOid[r.acsorCodSoggetto];
      if (!contribuenteOid) {
        logger.warn(`[sync/immobili] contribuente ACSOR ${r.acsorCodSoggetto} non trovato su MongoDB`);
        errors++;
        continue;
      }
      if (!r.foglio || !r.particella) { errors++; continue; }

      // Normalize categoria catastale (rimuovi slash se presente)
      const cat = (r.categoriaCatastale || '').replace('/', '').toUpperCase();

      ops.push({
        updateOne: {
          filter: {
            foglio:     r.foglio,
            particella: r.particella,
            ...(r.subalterno ? { subalterno: r.subalterno } : {}),
          },
          update: {
            $set: {
              categoriaCatastale: cat || 'A2',
              classe:             r.classe,
              consistenza:        r.consistenza,
              renditaCatastale:   r.renditaCatastale || 0,
              indirizzo:          r.indirizzo || '—',
              civico:             r.civico,
              cap:                r.cap,
              comune:             r.comune || '—',
              tipoUtilizzo:       r.tipoUtilizzo || 'abitazione_secondaria',
              sezione:            r.sezione,
              subalterno:         r.subalterno,
            },
            $setOnInsert: { stato: 'attivo' },
            // Gestione possessore: upsert del possessore nel subdocument array
            $addToSet: {
              possessori: {
                contribuente: contribuenteOid,
                quota:        r.percentualePossesso || 100,
                diritto:      r.diritto || 'proprieta',
                dataInizio:   r.dataInizioPossesso || new Date('2000-01-01'),
              },
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      await SyncLog.findByIdAndUpdate(log._id, { stato: 'completato', errors, elapsedMs: Date.now() - start });
      return res.json({ upserted: 0, modified: 0, errors, totaleRecord: records.length });
    }

    const result = await Immobile.bulkWrite(ops, { ordered: false });
    const upserted = result.upsertedCount || 0;
    const modified = result.modifiedCount  || 0;

    await SyncLog.findByIdAndUpdate(log._id, {
      stato: 'completato', upserted, modified, errors: errors + (ops.length - upserted - modified),
      elapsedMs: Date.now() - start,
    });

    logger.info(`[sync/immobili] ${records.length} → upserted:${upserted} modified:${modified} skip:${errors}`);
    res.json({ upserted, modified, errors, totaleRecord: records.length });
  } catch (err) {
    await SyncLog.findByIdAndUpdate(log._id, { stato: 'errore', errore: err.message, elapsedMs: Date.now() - start });
    logger.error('[sync/immobili] errore', err);
    next(err);
  }
};

// ── Sync log (per UI frontend) ─────────────────────────────────────────────
exports.listLog = async (req, res, next) => {
  try {
    const logs = await SyncLog.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ data: logs });
  } catch (err) { next(err); }
};

// ── Stato ultimo sync ─────────────────────────────────────────────────────
exports.syncStatus = async (req, res, next) => {
  try {
    const [lastC, lastI] = await Promise.all([
      SyncLog.findOne({ tipo: 'contribuenti', stato: 'completato' }).sort({ createdAt: -1 }).lean(),
      SyncLog.findOne({ tipo: 'immobili',     stato: 'completato' }).sort({ createdAt: -1 }).lean(),
    ]);
    const [nContribuenti, nImmobili] = await Promise.all([
      require('../models/Contribuente').countDocuments({ acsorId: { $exists: true } }),
      require('../models/Immobile').countDocuments({ stato: 'attivo' }),
    ]);
    res.json({
      data: {
        contribuenti: { ultimo: lastC?.createdAt, record: nContribuenti },
        immobili:     { ultimo: lastI?.createdAt, record: nImmobili },
      },
    });
  } catch (err) { next(err); }
};
