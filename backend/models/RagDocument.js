const { Schema, model } = require('mongoose');

const ragDocumentSchema = new Schema({
  titolo: { type: String, required: true, trim: true },
  tipo: {
    type: String,
    enum: ['delibera', 'regolamento', 'circolare', 'faq', 'altro'],
    default: 'delibera',
  },
  tributo: {
    type: String,
    enum: ['IMU', 'TARI', 'entrambi', 'altro'],
    default: 'entrambi',
  },
  anno: { type: Number },
  descrizione: { type: String, trim: true },
  nomeFile: { type: String },
  mimeType: { type: String },
  dimensione: { type: Number }, // bytes
  numeroChunks: { type: Number, default: 0 },
  qdrantIds: [{ type: String }],
  caricatoDa: { type: Schema.Types.ObjectId, ref: 'Utente' },
  stato: {
    type: String,
    enum: ['in_elaborazione', 'indicizzato', 'errore'],
    default: 'in_elaborazione',
  },
  errore: { type: String },
  tags: [{ type: String }],
}, { timestamps: true });

ragDocumentSchema.index({ tipo: 1, tributo: 1, anno: -1 });

module.exports = model('RagDocument', ragDocumentSchema);
