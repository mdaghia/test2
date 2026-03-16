/**
 * Script di seed – popola dati di esempio
 * Eseguire: node scripts/seed.js
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Utente = require('../models/Utente');
const AliquotaIMU = require('../models/AliquotaIMU');
const TariffaTARI = require('../models/TariffaTARI');

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

  // ── Tariffe TARI 2024 ─────────────────────────────────────────────────────
  await TariffaTARI.deleteMany({ anno: ANNO, comune: COMUNE });

  // Utenze DOMESTICHE – DPR 158/1999 Allegato 1
  // Ka=1 (coeff. quota fissa), Kb=1 (coeff. quota variabile)
  // tariffaFissa: €/mq/anno, tariffaVariabile: €/componente/anno
  await TariffaTARI.create([
    { anno: ANNO, comune: COMUNE, tipo: 'domestica', categoria: '1', descrizione: 'Utenza domestica – 1 componente',  Ka: 1, Kb: 1, tariffaFissa: 1.20, tariffaVariabile: 80.00 },
    { anno: ANNO, comune: COMUNE, tipo: 'domestica', categoria: '2', descrizione: 'Utenza domestica – 2 componenti', Ka: 1, Kb: 1, tariffaFissa: 1.40, tariffaVariabile: 55.00 },
    { anno: ANNO, comune: COMUNE, tipo: 'domestica', categoria: '3', descrizione: 'Utenza domestica – 3 componenti', Ka: 1, Kb: 1, tariffaFissa: 1.55, tariffaVariabile: 48.00 },
    { anno: ANNO, comune: COMUNE, tipo: 'domestica', categoria: '4', descrizione: 'Utenza domestica – 4 componenti', Ka: 1, Kb: 1, tariffaFissa: 1.70, tariffaVariabile: 43.00 },
    { anno: ANNO, comune: COMUNE, tipo: 'domestica', categoria: '5', descrizione: 'Utenza domestica – 5 componenti', Ka: 1, Kb: 1, tariffaFissa: 1.85, tariffaVariabile: 39.00 },
    { anno: ANNO, comune: COMUNE, tipo: 'domestica', categoria: '6', descrizione: 'Utenza domestica – 6+ componenti',Ka: 1, Kb: 1, tariffaFissa: 2.00, tariffaVariabile: 36.00 },
  ]);
  console.log('✅ Tariffe TARI 2024 domestiche create');

  // Utenze NON DOMESTICHE – DPR 158/1999 Allegato 2 (selezione categorie principali)
  // Kc=1 (quota fissa), Kd=1 (quota variabile)
  // tariffaFissa: €/mq/anno, tariffaVariabile: €/mq/anno
  await TariffaTARI.create([
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '1',  descrizione: 'Musei, biblioteche, scuole, associazioni, luoghi di culto', Kc: 1, Kd: 1, tariffaFissa: 0.60, tariffaVariabile: 0.30 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '2',  descrizione: 'Cinematografi e teatri',                              Kc: 1, Kd: 1, tariffaFissa: 0.80, tariffaVariabile: 0.40 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '3',  descrizione: 'Autorimesse e magazzini senza vendita diretta',        Kc: 1, Kd: 1, tariffaFissa: 0.90, tariffaVariabile: 0.50 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '7',  descrizione: 'Alberghi con ristorante',                             Kc: 1, Kd: 1, tariffaFissa: 2.20, tariffaVariabile: 2.80 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '8',  descrizione: 'Alberghi senza ristorante',                           Kc: 1, Kd: 1, tariffaFissa: 1.80, tariffaVariabile: 2.20 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '11', descrizione: 'Agenzie, studi professionali, uffici, agenzie viaggi', Kc: 1, Kd: 1, tariffaFissa: 1.40, tariffaVariabile: 1.20 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '13', descrizione: 'Negozi abbigliamento, calzature, librerie, ferramenta',Kc: 1, Kd: 1, tariffaFissa: 1.60, tariffaVariabile: 1.80 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '18', descrizione: 'Bar, caffè, pasticcerie',                             Kc: 1, Kd: 1, tariffaFissa: 2.80, tariffaVariabile: 4.50 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '19', descrizione: 'Ristoranti, trattorie, osterie, pizzerie, pub',        Kc: 1, Kd: 1, tariffaFissa: 3.20, tariffaVariabile: 6.00 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '23', descrizione: 'Industrie, capannoni produzione, ingrosso',            Kc: 1, Kd: 1, tariffaFissa: 1.10, tariffaVariabile: 0.90 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '24', descrizione: 'Supermercati, macellerie, salumerie, alimentari',      Kc: 1, Kd: 1, tariffaFissa: 2.40, tariffaVariabile: 3.80 },
    { anno: ANNO, comune: COMUNE, tipo: 'non_domestica', categoria: '30', descrizione: 'Studi medici, dentistici, veterinari, laboratori analisi', Kc: 1, Kd: 1, tariffaFissa: 1.70, tariffaVariabile: 1.50 },
  ]);
  console.log('✅ Tariffe TARI 2024 non domestiche create');

  await mongoose.disconnect();
  console.log('🎉 Seed completato!');
}

seed().catch(err => { console.error(err); process.exit(1); });
