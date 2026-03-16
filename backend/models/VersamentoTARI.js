/**
 * Versamento TARI
 * Codici tributo F24 di riferimento:
 *   3944 – TARI tributo
 *   3945 – TARI interessi
 *   3946 – TARI sanzioni
 */
const mongoose = require('mongoose');

const versamentoTARISchema = new mongoose.Schema({
  numeroVersamento: { type: String, unique: true },
  annoImposta:      { type: Number, required: true },

  contribuente:  { type: mongoose.Schema.Types.ObjectId, ref: 'Contribuente', required: true },
  dichiarazione: { type: mongoose.Schema.Types.ObjectId, ref: 'DichiarazioneTARI' },

  tipoRata: {
    type: String,
    enum: ['prima_rata', 'seconda_rata', 'saldo', 'unica_soluzione', 'accertamento', 'ravvedimento'],
    required: true,
  },
  scadenza:       { type: Date, required: true },
  dataVersamento: { type: Date, required: true },

  importoDovuto:  { type: Number, required: true, min: 0 },
  importoVersato: { type: Number, required: true, min: 0 },
  differenza:     { type: Number, default: 0 },  // dovuto - versato
  sanzioni:       { type: Number, default: 0 },
  interessi:      { type: Number, default: 0 },

  modalitaPagamento: {
    type: String,
    enum: ['F24', 'bollettino_postale', 'PagoPA', 'bonifico', 'contanti', 'altro'],
    required: true,
  },
  codiceTributo:  String,  // 3944 / 3945 / 3946
  numeroRicevuta: String,
  fileRicevuta:   String,

  stato: {
    type: String,
    enum: ['registrato', 'verificato', 'riconciliato', 'annullato', 'a_rimborso'],
    default: 'registrato',
  },
  motivoAnnullamento: String,

  operatore:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utente', required: true },
  modificatoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
  note: String,
}, { timestamps: true });

versamentoTARISchema.index({ contribuente: 1, annoImposta: 1 });
versamentoTARISchema.index({ dichiarazione: 1 });
versamentoTARISchema.index({ stato: 1 });

versamentoTARISchema.pre('save', async function(next) {
  if (!this.numeroVersamento) {
    const count = await this.constructor.countDocuments({ annoImposta: this.annoImposta });
    this.numeroVersamento = `VER-TARI-${this.annoImposta}-${String(count + 1).padStart(6, '0')}`;
  }
  this.differenza = this.importoDovuto - this.importoVersato;
  next();
});

module.exports = mongoose.model('VersamentoTARI', versamentoTARISchema);
