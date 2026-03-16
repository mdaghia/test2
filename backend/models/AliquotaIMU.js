const mongoose = require('mongoose');

const aliquotaIMUSchema = new mongoose.Schema({
  anno:         { type: Number, required: true },
  comune:       { type: String, required: true },

  tipoImmobile: {
    type: String,
    required: true,
    enum: [
      'abitazione_principale_A1_A8_A9',   // escluse cat. lusso – esente
      'abitazione_principale',             // A2, A3, A4, A5, A6, A7
      'pertinenza_abitazione_principale',
      'abitazione_secondaria',
      'locato',
      'comodato',
      'strumentale_A10_D',
      'D_eccetto_D5',
      'D5',
      'C1',
      'terreni_agricoli',
      'aree_fabbricabili',
      'altro',
    ],
  },

  aliquota:     { type: Number, required: true, min: 0, max: 10.6 }, // per mille
  detrazione:   { type: Number, default: 0 },   // € fisso da sottrarre
  riduzionePerc:{ type: Number, default: 0 },   // % riduzione sul tributo

  descrizione:  String,
  esente:       { type: Boolean, default: false },

  creatoDA:     { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
  modificatoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
}, { timestamps: true });

aliquotaIMUSchema.index({ anno: 1, comune: 1, tipoImmobile: 1 }, { unique: true });

module.exports = mongoose.model('AliquotaIMU', aliquotaIMUSchema);
