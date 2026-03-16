const mongoose = require('mongoose');

// Categorie catastali con moltiplicatori (DM 701/1994 aggiornato)
const CATEGORIE_CATASTALI = {
  // Gruppo A - Abitazioni e residenze
  A1:  { descrizione: 'Abitazioni signorili',           moltiplicatore: 160 },
  A2:  { descrizione: 'Abitazioni civili',              moltiplicatore: 160 },
  A3:  { descrizione: 'Abitazioni economiche',          moltiplicatore: 160 },
  A4:  { descrizione: 'Abitazioni popolari',            moltiplicatore: 160 },
  A5:  { descrizione: 'Abitazioni ultrapopolari',       moltiplicatore: 160 },
  A6:  { descrizione: 'Abitazioni rurali',              moltiplicatore: 160 },
  A7:  { descrizione: 'Villini',                        moltiplicatore: 160 },
  A8:  { descrizione: 'Ville',                          moltiplicatore: 160 },
  A9:  { descrizione: 'Castelli e palazzi storici',     moltiplicatore: 160 },
  A10: { descrizione: 'Uffici e studi privati',         moltiplicatore: 80  },
  A11: { descrizione: 'Abitazioni tipiche locali',      moltiplicatore: 160 },
  // Gruppo B - Collegi, scuole, ecc.
  B1:  { descrizione: 'Collegi e convitti',             moltiplicatore: 140 },
  B2:  { descrizione: 'Case di cura',                   moltiplicatore: 140 },
  B3:  { descrizione: 'Prigioni e riformatori',         moltiplicatore: 140 },
  B4:  { descrizione: 'Uffici pubblici',                moltiplicatore: 140 },
  B5:  { descrizione: 'Scuole e laboratori',            moltiplicatore: 140 },
  B6:  { descrizione: 'Biblioteche, musei',             moltiplicatore: 140 },
  B7:  { descrizione: 'Cappelle ed oratori',            moltiplicatore: 140 },
  B8:  { descrizione: 'Magazzini sotterranei',          moltiplicatore: 140 },
  // Gruppo C - Negozi, magazzini, ecc.
  C1:  { descrizione: 'Negozi e botteghe',              moltiplicatore: 55  },
  C2:  { descrizione: 'Magazzini e depositi',           moltiplicatore: 160 },
  C3:  { descrizione: 'Laboratori artigianali',         moltiplicatore: 140 },
  C4:  { descrizione: 'Fabbricati sport privati',       moltiplicatore: 140 },
  C5:  { descrizione: 'Stabilimenti balneari',          moltiplicatore: 140 },
  C6:  { descrizione: 'Stalle, scuderie, rimesse',      moltiplicatore: 160 },
  C7:  { descrizione: 'Tettoie chiuse o aperte',        moltiplicatore: 160 },
  // Gruppo D - Industrie e commercio
  D1:  { descrizione: 'Opifici',                        moltiplicatore: 60  },
  D2:  { descrizione: 'Alberghi e pensioni',            moltiplicatore: 60  },
  D3:  { descrizione: 'Teatri, cinema, sale convegni',  moltiplicatore: 60  },
  D4:  { descrizione: 'Case di cura private',           moltiplicatore: 60  },
  D5:  { descrizione: 'Istituti di credito',            moltiplicatore: 80  },
  D6:  { descrizione: 'Fabbricati sport pubblici',      moltiplicatore: 60  },
  D7:  { descrizione: 'Fabbricati per speciali esigenze', moltiplicatore: 60 },
  D8:  { descrizione: 'Fabbricati per usi speciali',    moltiplicatore: 60  },
  D9:  { descrizione: 'Edifici galleggianti',           moltiplicatore: 60  },
  D10: { descrizione: 'Fabbricati rurali strumentali',  moltiplicatore: 60  },
  // Gruppo E - Stazioni, fari, ponti ecc.
  E1:  { descrizione: 'Stazioni per servizi di trasporto', moltiplicatore: 80 },
  E2:  { descrizione: 'Ponti comunali e provinciali',   moltiplicatore: 80  },
  E3:  { descrizione: 'Costruzioni e fabbricati diversi', moltiplicatore: 80 },
  E4:  { descrizione: 'Recinti chiusi per speciali esigenze', moltiplicatore: 80 },
  E5:  { descrizione: 'Fabbricati costruzioni galleggianti',  moltiplicatore: 80 },
  E6:  { descrizione: 'Fari, semafori, torri',          moltiplicatore: 80  },
  E7:  { descrizione: 'Fabbricati destinati all\'esercizio pubblico del culto', moltiplicatore: 80 },
  E8:  { descrizione: 'Fabbricati per l\'esercizio del culto', moltiplicatore: 80 },
  E9:  { descrizione: 'Edifici a destinazione particolare', moltiplicatore: 80 },
  // Gruppo F - Entità non produttive di reddito
  F1:  { descrizione: 'Aree urbane',                    moltiplicatore: 0   },
  F2:  { descrizione: 'Unità collabenti',               moltiplicatore: 0   },
  F3:  { descrizione: 'Unità in corso di costruzione',  moltiplicatore: 0   },
  F4:  { descrizione: 'Unità in corso di definizione',  moltiplicatore: 0   },
  F5:  { descrizione: 'Lastrico solare',                moltiplicatore: 0   },
};

const possessoSchema = new mongoose.Schema({
  contribuente:  { type: mongoose.Schema.Types.ObjectId, ref: 'Contribuente', required: true },
  quota:         { type: Number, required: true, min: 0, max: 100 },  // percentuale
  diritto:       { type: String, enum: ['proprieta', 'usufrutto', 'uso', 'abitazione', 'enfiteusi', 'superficie'], default: 'proprieta' },
  dataInizio:    { type: Date, required: true },
  dataFine:      Date,
}, { _id: false });

const immobileSchema = new mongoose.Schema({
  // Dati catastali
  foglio:       { type: String, required: true },
  particella:   { type: String, required: true },
  subalterno:   String,
  sezione:      String,
  categoriaCatastale: {
    type: String,
    required: true,
    enum: Object.keys(CATEGORIE_CATASTALI),
  },
  classe:       String,
  consistenza:  String,
  renditaCatastale: { type: Number, required: true, min: 0 },
  superficie:   Number,  // mq

  // Indirizzo
  indirizzo:    { type: String, required: true },
  civico:       String,
  cap:          String,
  comune:       { type: String, required: true },
  provincia:    String,

  // Tipo utilizzo
  tipoUtilizzo: {
    type: String,
    enum: [
      'abitazione_principale',
      'abitazione_secondaria',
      'locato',
      'comodato',
      'strumentale',
      'pertinenza_principale',
      'pertinenza_secondaria',
      'esente',
      'altro',
    ],
    required: true,
  },
  abitazionePrincipale: { type: Boolean, default: false },

  // Possessori
  possessori: [possessoSchema],

  // Gestionale
  stato:       { type: String, enum: ['attivo', 'annullato'], default: 'attivo' },
  note:        String,
  creatoDA:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
  modificatoDA: { type: mongoose.Schema.Types.ObjectId, ref: 'Utente' },
}, { timestamps: true });

immobileSchema.index({ foglio: 1, particella: 1, subalterno: 1 });
immobileSchema.index({ 'possessori.contribuente': 1 });
immobileSchema.index({ comune: 1, stato: 1 });

immobileSchema.virtual('moltiplicatore').get(function() {
  return CATEGORIE_CATASTALI[this.categoriaCatastale]?.moltiplicatore || 0;
});

immobileSchema.virtual('baseImponibile').get(function() {
  const rivalutazione = 1.05;
  return this.renditaCatastale * rivalutazione * this.moltiplicatore;
});

module.exports = mongoose.model('Immobile', immobileSchema);
module.exports.CATEGORIE_CATASTALI = CATEGORIE_CATASTALI;
