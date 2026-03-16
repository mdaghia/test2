/**
 * Dichiarazione TARI annuale
 * Raggruppa le utenze di un contribuente per un anno d'imposta.
 * Rate: 30/04 (40%), 30/06 (30%), 30/11 (saldo)
 */
const mongoose = require('mongoose');

const rigaRiduzione = new mongoose.Schema({
  tipo:       String,
  percentuale:Number,
  importo:    Number,
}, { _id: false });

const rigaDichiarazioneSchema = new mongoose.Schema({
  utenza:            { type: mongoose.Schema.Types.ObjectId, ref: 'UtenzaTARI', required: true },
  tariffaApplicata:  { type: mongoose.Schema.Types.ObjectId, ref: 'TariffaTARI' },

  // Snapshot dei parametri al momento del calcolo
  tipo:              String,   // domestica / non_domestica
  categoriaTARI:     String,
  superficie:        Number,
  componentiNucleo:  Number,
  mesiOccupazione:   Number,
  Ka: Number, Kb: Number, Kc: Number, Kd: Number,
  tariffaFissa:      Number,
  tariffaVariabile:  Number,

  // Risultati calcolo
  quotaFissa:        Number,
  quotaVariabile:    Number,
  importoLordo:      Number,
  riduzioniApplicate:[rigaRiduzione],
  totaleRiduzioni:   Number,
  importoCalcolato:  Number,  // netto dopo riduzioni

  note: String,
}, { _id: false });

const dichiarazioneTARISchema = new mongoose.Schema({
  numeroDichiarazione: { type: String, unique: true },
  anno:                { type: Number, required: true },
  tipoDichiarazione: {
    type: String,
    enum: ['originale', 'integrativa', 'rettificativa'],
    default: 'originale',
  },
  dichiarazioneOriginale: { type: mongoose.Schema.Types.ObjectId, ref: 'DichiarazioneTARI' },

  contribuente: { type: mongoose.Schema.Types.ObjectId, ref: 'Contribuente', required: true },

  righe: [rigaDichiarazioneSchema],

  // Totali
  totaleAnno:          { type: Number, default: 0 },

  // Ripartizione rate (L.147/2013 art.1 c.688)
  importoPrimaRata:    { type: Number, default: 0 }, // 40% – scadenza 30/04
  scadenzaPrimaRata:   { type: Date },
  importoSecondaRata:  { type: Number, default: 0 }, // 30% – scadenza 30/06
  scadenzaSecondaRata: { type: Date },
  importoSaldo:        { type: Number, default: 0 }, // restante – scadenza 30/11
  scadenzaSaldo:       { type: Date },

  stato: {
    type: String,
    enum: ['bozza', 'presentata', 'in_lavorazione', 'definita', 'rettificata', 'annullata'],
    default: 'bozza',
  },
  motivoAnnullamento: String,

  dataPresentazione:  Date,
  dataProtocollo:     Date,
  numeroProtocollo:   String,

  operatore:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utente', required: true },
  modificatoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },

  storiaStati: [{
    stato:  String,
    data:   { type: Date, default: Date.now },
    utente: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
    nota:   String,
  }],

  note: String,
}, { timestamps: true });

dichiarazioneTARISchema.index({ contribuente: 1, anno: 1 });
dichiarazioneTARISchema.index({ stato: 1, anno: 1 });
dichiarazioneTARISchema.index({ numeroDichiarazione: 1 });

dichiarazioneTARISchema.pre('save', async function(next) {
  if (!this.numeroDichiarazione) {
    const count = await this.constructor.countDocuments({ anno: this.anno });
    this.numeroDichiarazione = `TARI-${this.anno}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('DichiarazioneTARI', dichiarazioneTARISchema);
