const mongoose = require('mongoose');

const attoProvvedimentoSchema = new mongoose.Schema({
  numeroAtto:    { type: String, unique: true },
  annoImposta:   { type: Number, required: true },
  tipoAtto: {
    type: String,
    required: true,
    enum: [
      'avviso_accertamento',
      'avviso_liquidazione',
      'ingiunzione_pagamento',
      'sgravio',
      'rimborso',
      'comunicazione_irregolarita',
      'diniego_rimborso',
    ],
  },

  contribuente:  { type: mongoose.Schema.Types.ObjectId, ref: 'Contribuente', required: true },
  dichiarazione: { type: mongoose.Schema.Types.ObjectId, ref: 'DichiarazioneIMU' },
  versamento:    { type: mongoose.Schema.Types.ObjectId, ref: 'VersamentoIMU' },

  // Motivazione e contestazione
  motivazione:   { type: String, required: true },
  imponibileAccertato: Number,
  impostaDovuta:  Number,
  impostaVersata: Number,
  differenzaAccertata: Number,
  sanzioni:      Number,
  interessi:     Number,
  totaleRichiesto: Number,

  // Per rimborsi/sgravi
  importoSgravioRimborso: Number,

  // Scadenze
  dataEmissione:  { type: Date, required: true, default: Date.now },
  dataNotifica:   Date,
  scadenzaPagamento: Date,    // 60gg dalla notifica di solito

  // Stato
  stato: {
    type: String,
    enum: [
      'bozza',
      'emesso',
      'notificato',
      'pagato',
      'in_ricorso',
      'sospeso',
      'definito',
      'annullato',
    ],
    default: 'bozza',
  },
  motivoAnnullamento: String,

  // Ricorso
  ricorsoDataPresentazione: Date,
  ricorsoEsito: { type: String, enum: ['accolto', 'parzialmente_accolto', 'respinto'] },
  ricorsoNote:  String,

  // Stampa
  templateStampa: { type: String, default: 'atto_standard' },
  pathDocumento:  String,
  dataStampa:     Date,

  // Operatori
  operatore:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utente', required: true },
  modificatoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
  firmatario:   String,

  // Storia stati
  storiaStati: [{
    stato:  String,
    data:   { type: Date, default: Date.now },
    utente: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
    nota:   String,
  }],

  note: String,
}, { timestamps: true });

attoProvvedimentoSchema.index({ contribuente: 1, annoImposta: 1 });
attoProvvedimentoSchema.index({ stato: 1, tipoAtto: 1 });
attoProvvedimentoSchema.index({ dataNotifica: 1 });

attoProvvedimentoSchema.pre('save', async function(next) {
  if (!this.numeroAtto) {
    const prefix = this.tipoAtto === 'avviso_accertamento' ? 'ACC'
      : this.tipoAtto === 'rimborso' ? 'RIM'
      : this.tipoAtto === 'sgravio' ? 'SGR'
      : 'ATT';
    const count = await this.constructor.countDocuments({
      tipoAtto: this.tipoAtto,
      annoImposta: this.annoImposta,
    });
    this.numeroAtto = `${prefix}-${this.annoImposta}-${String(count + 1).padStart(6, '0')}`;
  }
  // Calcola totale
  if (this.tipoAtto === 'avviso_accertamento') {
    this.totaleRichiesto = (this.differenzaAccertata || 0) + (this.sanzioni || 0) + (this.interessi || 0);
  }
  next();
});

module.exports = mongoose.model('AttoProvvedimento', attoProvvedimentoSchema);
