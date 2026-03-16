const mongoose = require('mongoose');

const versamentoIMUSchema = new mongoose.Schema({
  numeroVersamento: { type: String, unique: true },
  annoImposta:      { type: Number, required: true },

  contribuente:     { type: mongoose.Schema.Types.ObjectId, ref: 'Contribuente', required: true },
  dichiarazione:    { type: mongoose.Schema.Types.ObjectId, ref: 'DichiarazioneIMU' },

  // Tipo rata
  tipoRata: {
    type: String,
    enum: ['acconto', 'saldo', 'unica_soluzione', 'accertamento', 'ravvedimento'],
    required: true,
  },
  scadenza: { type: Date, required: true },

  // Importi
  importoDovuto:  { type: Number, required: true, min: 0 },
  importoVersato: { type: Number, required: true, min: 0 },
  differenza:     { type: Number, default: 0 },  // dovuto - versato (> 0 = a debito)
  sanzioni:       { type: Number, default: 0 },
  interessi:      { type: Number, default: 0 },

  // Modalità pagamento
  modalitaPagamento: {
    type: String,
    enum: ['F24', 'bollettino_postale', 'PagoPA', 'bonifico', 'contanti', 'altro'],
    required: true,
  },
  dataVersamento: { type: Date, required: true },
  codiceF24:      String,
  codiceTributo:  String,  // es. 3912, 3913, 3914...

  // Ricevuta
  numeroRicevuta: String,
  fileRicevuta:   String,  // path/URL

  // Stato
  stato: {
    type: String,
    enum: ['registrato', 'verificato', 'riconciliato', 'annullato', 'a_rimborso'],
    default: 'registrato',
  },
  motivoAnnullamento: String,

  // Operatore
  operatore:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utente', required: true },
  modificatoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
  note:         String,
}, { timestamps: true });

versamentoIMUSchema.index({ contribuente: 1, annoImposta: 1 });
versamentoIMUSchema.index({ dichiarazione: 1 });
versamentoIMUSchema.index({ stato: 1 });

versamentoIMUSchema.pre('save', async function(next) {
  if (!this.numeroVersamento) {
    const count = await this.constructor.countDocuments({ annoImposta: this.annoImposta });
    this.numeroVersamento = `VER-IMU-${this.annoImposta}-${String(count + 1).padStart(6, '0')}`;
  }
  this.differenza = this.importoDovuto - this.importoVersato;
  next();
});

module.exports = mongoose.model('VersamentoIMU', versamentoIMUSchema);
