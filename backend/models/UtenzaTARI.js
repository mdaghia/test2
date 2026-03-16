/**
 * Utenza TARI
 * Rappresenta il punto di applicazione del tributo: una locazione fisica
 * (domestica o non domestica) intestata a un contribuente.
 * Riferimento normativo: L.147/2013 art.1 cc.639-704 (TARI)
 */
const mongoose = require('mongoose');

const riduzioneSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: [
      'unica_occupazione',    // 25% – abitazione con un solo occupante
      'rurale',               // 25% – fabbricati rurali abitativi
      'compostaggio',         // 20% – compostaggio domestico documentato
      'stagionale',           // 30% – utilizzo < 183 gg/anno
      'riciclo_certificato',  // 15% – conferimento certificato al riciclo
      'altra',                // % libera definita dal Comune
    ],
    required: true,
  },
  percentuale: { type: Number, min: 0, max: 100 },  // usata solo per tipo 'altra'
  nota: String,
}, { _id: false });

const utenzaTARISchema = new mongoose.Schema({
  numeroUtenza: { type: String, unique: true },
  anno:   { type: Number, required: true },

  tipo: {
    type: String,
    required: true,
    enum: ['domestica', 'non_domestica'],
  },

  // Categoria DPR 158/1999
  // Domestica: '1' (1 comp.) … '6' (6+ comp.)
  // Non domestica: '1'..'30' (vedi CATEGORIE_NON_DOMESTICHE in calcoloTARES)
  categoriaTARI: { type: String, required: true },

  contribuente: { type: mongoose.Schema.Types.ObjectId, ref: 'Contribuente', required: true },
  immobile:     { type: mongoose.Schema.Types.ObjectId, ref: 'Immobile' },

  // Dati locazione
  indirizzo:  { type: String, required: true },
  civico:     String,
  cap:        String,
  comune:     { type: String, required: true },

  superficie:        { type: Number, required: true, min: 1 },  // mq
  componentiNucleo:  { type: Number, default: 1, min: 1 },      // solo per domestica

  // Periodo occupazione nell'anno
  dataInizio:        { type: Date, required: true },
  dataFine:          Date,
  mesiOccupazione:   { type: Number, required: true, min: 1, max: 12, default: 12 },

  riduzioni: [riduzioneSchema],

  stato: {
    type: String,
    enum: ['attiva', 'cessata', 'sospesa', 'annullata'],
    default: 'attiva',
  },
  motivoAnnullamento: String,

  storiaStati: [{
    stato:  String,
    data:   { type: Date, default: Date.now },
    utente: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
    nota:   String,
  }],

  creatoDA:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
  modificatoDA:{ type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
  note: String,
}, { timestamps: true });

utenzaTARISchema.index({ contribuente: 1, anno: 1 });
utenzaTARISchema.index({ comune: 1, stato: 1 });
utenzaTARISchema.index({ immobile: 1 });

utenzaTARISchema.pre('save', async function(next) {
  if (!this.numeroUtenza) {
    const count = await this.constructor.countDocuments({ anno: this.anno });
    this.numeroUtenza = `UTENZA-TARI-${this.anno}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('UtenzaTARI', utenzaTARISchema);
