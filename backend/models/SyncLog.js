const { Schema, model } = require('mongoose');

const syncLogSchema = new Schema({
  tipo:    { type: String, enum: ['full', 'delta', 'contribuenti', 'immobili'], required: true },
  source:  { type: String, default: 'acsor' },
  since:   { type: Date },                    // per delta sync
  stato:   { type: String, enum: ['avviato', 'completato', 'errore'], default: 'avviato' },

  // Contatori
  totaleRecord: { type: Number, default: 0 },
  upserted:     { type: Number, default: 0 },
  modified:     { type: Number, default: 0 },
  errors:       { type: Number, default: 0 },

  errore:   { type: String },                 // messaggio errore se fallito
  elapsedMs: { type: Number },

  avviatoDa: { type: String, default: 'n8n' }, // 'n8n' | 'manual' | 'api'
}, { timestamps: true });

syncLogSchema.index({ tipo: 1, createdAt: -1 });

module.exports = model('SyncLog', syncLogSchema);
