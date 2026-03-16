const { Schema, model } = require('mongoose');

const fonteSchema = new Schema({
  documentoId: String,
  titoloDocumento: String,
  estratto: String,
  punteggio: Number,
}, { _id: false });

const messaggioSchema = new Schema({
  ruolo: { type: String, enum: ['user', 'assistant'], required: true },
  contenuto: { type: String, required: true },
  fonti: [fonteSchema],
  ts: { type: Date, default: Date.now },
}, { _id: false });

const chatSessionSchema = new Schema({
  operatore: { type: Schema.Types.ObjectId, ref: 'Utente', required: true },
  titolo: { type: String, default: 'Nuova conversazione' },
  messaggi: [messaggioSchema],
  annoContesto: { type: Number },        // anno fiscale di riferimento
  tributoContesto: { type: String, enum: ['IMU', 'TARI', 'entrambi'], default: 'entrambi' },
  stato: { type: String, enum: ['attiva', 'archiviata'], default: 'attiva' },
}, { timestamps: true });

chatSessionSchema.index({ operatore: 1, createdAt: -1 });

module.exports = model('ChatSession', chatSessionSchema);
