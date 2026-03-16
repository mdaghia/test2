const mongoose = require('mongoose');

const indirizzoSchema = new mongoose.Schema({
  via:      { type: String, required: true },
  civico:   String,
  cap:      String,
  comune:   { type: String, required: true },
  provincia:String,
  stato:    { type: String, default: 'IT' },
}, { _id: false });

const contribuenteSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['persona_fisica', 'persona_giuridica'],
    required: true,
  },

  // Persona fisica
  nome:           String,
  cognome:        String,
  dataNascita:    Date,
  luogoNascita:   String,
  sesso:          { type: String, enum: ['M', 'F'] },

  // Persona giuridica
  ragioneSociale: String,
  formaGiuridica: String,

  // Comune
  codiceFiscale:  { type: String, required: true, unique: true, uppercase: true, trim: true },
  partitaIva:     { type: String, sparse: true },

  // Recapiti
  email:          String,
  pec:            String,
  telefono:       String,

  // Indirizzi
  residenza:      indirizzoSchema,
  domicilioFiscale: indirizzoSchema,

  // Gestionale
  stato:    { type: String, enum: ['attivo', 'cessato', 'annullato'], default: 'attivo' },
  note:     String,

  creatoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
  modificatoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
}, { timestamps: true });

contribuenteSchema.index({ codiceFiscale: 1 });
contribuenteSchema.index({ cognome: 'text', nome: 'text', ragioneSociale: 'text' });

contribuenteSchema.virtual('denominazione').get(function() {
  return this.tipo === 'persona_fisica'
    ? `${this.cognome} ${this.nome}`.trim()
    : this.ragioneSociale;
});

module.exports = mongoose.model('Contribuente', contribuenteSchema);
