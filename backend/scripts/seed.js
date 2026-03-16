/**
 * Script di seed – popola dati di esempio
 * Eseguire: node scripts/seed.js
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Utente = require('../models/Utente');
const AliquotaIMU = require('../models/AliquotaIMU');

const COMUNE = process.env.COMUNE_NOME || 'Comune di Esempio';
const ANNO = 2024;

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('DB connesso');

  // Utenti
  await Utente.deleteMany({});
  await Utente.create([
    { username: 'admin', password: 'Admin@1234', nome: 'Super', cognome: 'Admin', email: 'admin@comune.it', ruolo: 'admin' },
    { username: 'supervisore', password: 'Super@1234', nome: 'Mario', cognome: 'Rossi', email: 'supervisore@comune.it', ruolo: 'supervisore' },
    { username: 'operatore', password: 'Oper@1234', nome: 'Anna', cognome: 'Verdi', email: 'operatore@comune.it', ruolo: 'operatore' },
  ]);
  console.log('✅ Utenti creati');

  // Aliquote IMU 2024
  await AliquotaIMU.deleteMany({ anno: ANNO, comune: COMUNE });
  await AliquotaIMU.create([
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'abitazione_principale',              aliquota: 0,    detrazione: 200, esente: true,  descrizione: 'Abitazione principale (escluse cat. A1/A8/A9) – ESENTE' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'abitazione_principale_A1_A8_A9',    aliquota: 6,    detrazione: 200, esente: false, descrizione: 'Abitazione principale cat. lusso A1/A8/A9 – 6‰' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'pertinenza_abitazione_principale',  aliquota: 0,    detrazione: 0,   esente: true,  descrizione: 'Pertinenza abitazione principale – ESENTE' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'abitazione_secondaria',             aliquota: 10.6, detrazione: 0,   esente: false, descrizione: 'Abitazione secondaria – 10,6‰ (max legge)' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'locato',                            aliquota: 7.6,  detrazione: 0,   esente: false, descrizione: 'Fabbricati locati – 7,6‰' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'comodato',                          aliquota: 7.6,  riduzionePerc: 50, detrazione: 0, esente: false, descrizione: 'Comodato uso gratuito a parenti 1° grado – riduzione 50%' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'strumentale_A10_D',                 aliquota: 9.6,  detrazione: 0,   esente: false, descrizione: 'Strumentali A10 e Gruppo D – 9,6‰' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'D_eccetto_D5',                      aliquota: 7.6,  detrazione: 0,   esente: false, descrizione: 'Fabbricati D (escluso D5) – 7,6‰' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'D5',                                aliquota: 9.6,  detrazione: 0,   esente: false, descrizione: 'Istituti di credito D5 – 9,6‰' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'C1',                                aliquota: 8.6,  detrazione: 0,   esente: false, descrizione: 'Negozi e botteghe C1 – 8,6‰' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'aree_fabbricabili',                 aliquota: 10.6, detrazione: 0,   esente: false, descrizione: 'Aree fabbricabili – 10,6‰' },
    { anno: ANNO, comune: COMUNE, tipoImmobile: 'altro',                             aliquota: 8.6,  detrazione: 0,   esente: false, descrizione: 'Altri fabbricati – 8,6‰' },
  ]);
  console.log('✅ Aliquote IMU 2024 create');

  await mongoose.disconnect();
  console.log('🎉 Seed completato!');
}

seed().catch(err => { console.error(err); process.exit(1); });
