const mongoose = require('mongoose');

const rigaDichiarazioneSchema = new mongoose.Schema({
  immobile:          { type: mongoose.Schema.Types.ObjectId, ref: 'Immobile', required: true },
  tipoImmobile:      { type: String, required: true },
  quotaPossesso:     { type: Number, required: true, min: 0, max: 100 },
  mesiPossesso:      { type: Number, required: true, min: 1, max: 12 },
  renditaCatastale:  { type: Number, required: true },
  moltiplicatore:    { type: Number, required: true },
  baseImponibile:    { type: Number, required: true },
  aliquotaApplicata: { type: Number, required: true },
  detrazione:        { type: Number, default: 0 },
  riduzionePerc:     { type: Number, default: 0 },
  importoCalcolato:  { type: Number, required: true },
  esente:            { type: Boolean, default: false },
  note:              String,
}, { _id: false });

const dichiarazioneIMUSchema = new mongoose.Schema({
  // Identificazione
  numeroDichiarazione: { type: String, unique: true },
  annoDichiarazione:   { type: Number, required: true },
  annoImposta:         { type: Number, required: true },
  tipoDichiarazione:   {
    type: String,
    enum: ['originale', 'integrativa', 'rettificativa'],
    default: 'originale',
  },
  dichiarazioneOriginale: { type: mongoose.Schema.Types.ObjectId, ref: 'DichiarazioneIMU' },

  // Contribuente
  contribuente: { type: mongoose.Schema.Types.ObjectId, ref: 'Contribuente', required: true },

  // Immobili dichiarati
  righe: [rigaDichiarazioneSchema],

  // Calcolo
  totaleImponibile:  { type: Number, default: 0 },
  totaleImposta:     { type: Number, default: 0 },
  totaleDovuto:      { type: Number, default: 0 },  // dopo detrazioni e riduzioni
  importoAcconto:    { type: Number, default: 0 },  // 50% o calcolato su anno precedente
  importoSaldo:      { type: Number, default: 0 },

  // Stato
  stato: {
    type: String,
    enum: ['bozza', 'presentata', 'in_lavorazione', 'definita', 'rettificata', 'annullata'],
    default: 'bozza',
  },
  motivoAnnullamento: String,

  // Date
  dataPresentazione: Date,
  dataProtocollo:    Date,
  numeroProtocollo:  String,

  // Operatore
  operatore:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utente', required: true },
  modificatoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },

  // Log stato
  storiaStati: [{
    stato:   String,
    data:    { type: Date, default: Date.now },
    utente:  { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
    nota:    String,
  }],

  note: String,
}, { timestamps: true });

dichiarazioneIMUSchema.index({ contribuente: 1, annoImposta: 1 });
dichiarazioneIMUSchema.index({ stato: 1, annoImposta: 1 });
dichiarazioneIMUSchema.index({ numeroDichiarazione: 1 });

// Auto-generate numero dichiarazione
dichiarazioneIMUSchema.pre('save', async function(next) {
  if (!this.numeroDichiarazione) {
    const count = await this.constructor.countDocuments({ annoImposta: this.annoImposta });
    this.numeroDichiarazione = `IMU-${this.annoImposta}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('DichiarazioneIMU', dichiarazioneIMUSchema);
