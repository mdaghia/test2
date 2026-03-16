/**
 * Tariffe TARI – metodo normalizzato DPR 158/1999
 * Ogni record definisce la tariffa per anno/comune/tipo/categoria
 */
const mongoose = require('mongoose');

const tariffaTARISchema = new mongoose.Schema({
  anno:    { type: Number, required: true },
  comune:  { type: String, required: true },

  tipo: {
    type: String,
    required: true,
    enum: ['domestica', 'non_domestica'],
  },

  // Per domestica: '1'..'6' (numero componenti del nucleo)
  // Per non_domestica: '1'..'30' (categoria DPR 158/1999 Allegato 2)
  categoria:   { type: String, required: true },
  descrizione: { type: String, required: true },

  // Coefficienti metodo normalizzato (di default 1)
  // Quota fissa domestica:  Ka × superficie × tariffaFissa
  // Quota var. domestica:   Kb × componenti × tariffaVariabile
  // Quota fissa non-dom:    Kc × superficie × tariffaFissa
  // Quota var. non-dom:     Kd × superficie × tariffaVariabile
  Ka: { type: Number, default: 1, min: 0 },
  Kb: { type: Number, default: 1, min: 0 },
  Kc: { type: Number, default: 1, min: 0 },
  Kd: { type: Number, default: 1, min: 0 },

  tariffaFissa:    { type: Number, required: true, min: 0 }, // €/mq/anno
  tariffaVariabile:{ type: Number, required: true, min: 0 }, // €/componente/anno (dom) | €/mq/anno (non-dom)

  creatoDA:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
  modificatoDA:{ type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
}, { timestamps: true });

tariffaTARISchema.index({ anno: 1, comune: 1, tipo: 1, categoria: 1 }, { unique: true });

module.exports = mongoose.model('TariffaTARI', tariffaTARISchema);
