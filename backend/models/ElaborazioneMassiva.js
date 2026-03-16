const mongoose = require('mongoose');

const elaborazioneMassivaSchema = new mongoose.Schema({
  tipoElaborazione: {
    type: String,
    required: true,
    enum: [
      'calcolo_massivo_imu',
      'emissione_massiva_atti',
      'stampa_massiva_dichiarazioni',
      'stampa_massiva_atti',
      'stampa_massiva_avvisi',
      'riconciliazione_versamenti',
      'invio_notifiche',
    ],
  },

  descrizione:  String,

  // Filtri applicati all'elaborazione
  parametri: {
    annoImposta: Number,
    stati:       [String],
    contribuenti:[mongoose.Schema.Types.ObjectId],
    tipiAtto:    [String],
    dataInizio:  Date,
    dataFine:    Date,
    filtriExtra: mongoose.Schema.Types.Mixed,
  },

  // Kafka
  kafkaJobId:  String,
  topicRichiesta: String,

  // Stato elaborazione
  stato: {
    type: String,
    enum: ['in_coda', 'in_elaborazione', 'completata', 'completata_con_errori', 'fallita', 'annullata'],
    default: 'in_coda',
  },

  // Progresso
  totaleRecord:    { type: Number, default: 0 },
  recordElaborati: { type: Number, default: 0 },
  recordErrore:    { type: Number, default: 0 },
  percentuale:     { type: Number, default: 0 },

  // Risultati
  risultati: [{
    rifId:   mongoose.Schema.Types.ObjectId,
    stato:   String,
    messaggio: String,
    dati:    mongoose.Schema.Types.Mixed,
  }],

  errori: [{
    rifId:   mongoose.Schema.Types.ObjectId,
    errore:  String,
    stack:   String,
  }],

  // File output
  fileOutput: String,  // path file ZIP con i documenti

  // Tempi
  dataRichiesta:    { type: Date, default: Date.now },
  dataInizio:       Date,
  dataCompletamento: Date,
  durataMsec:       Number,

  // Operatore
  richiestoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente', required: true },
  note:        String,
}, { timestamps: true });

elaborazioneMassivaSchema.index({ stato: 1, tipoElaborazione: 1 });
elaborazioneMassivaSchema.index({ richiestoDA: 1 });

module.exports = mongoose.model('ElaborazioneMassiva', elaborazioneMassivaSchema);
