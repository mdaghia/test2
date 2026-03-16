/**
 * Motore di calcolo IMU
 * Riferimenti normativi:
 *   - D.Lgs 23/2011 (IMU)
 *   - L.160/2019 (Legge di Bilancio 2020 – nuova IMU)
 *   - DM 701/1994 (moltiplicatori catastali)
 */

const AliquotaIMU = require('../models/AliquotaIMU');
const { CATEGORIE_CATASTALI } = require('../models/Immobile');
const logger = require('../utils/logger');

// Coefficiente rivalutazione rendite catastali (art.3 comma 48 L.662/1996)
const COEFF_RIVALUTAZIONE = 1.05;

// Map categoria → tipo aliquota di default
const CATEGORIA_TO_TIPO = {
  A10: 'strumentale_A10_D',
  D5:  'D5',
  C1:  'C1',
};

function getTipoAliquotaPerCategoria(categoria, tipoUtilizzo) {
  if (tipoUtilizzo === 'abitazione_principale') {
    const catLusso = ['A1', 'A8', 'A9'];
    return catLusso.includes(categoria)
      ? 'abitazione_principale_A1_A8_A9'
      : 'abitazione_principale';
  }
  if (tipoUtilizzo === 'pertinenza_principale') return 'pertinenza_abitazione_principale';
  if (tipoUtilizzo === 'locato') return 'locato';
  if (tipoUtilizzo === 'comodato') return 'comodato';
  if (CATEGORIA_TO_TIPO[categoria]) return CATEGORIA_TO_TIPO[categoria];

  // Fabbricati D (escluso D5) → aliquota specifica
  if (categoria.startsWith('D') && categoria !== 'D5') return 'D_eccetto_D5';

  return 'altro';
}

/**
 * Calcola la base imponibile di un immobile
 * BI = rendita × 1.05 × moltiplicatore
 */
function calcolaBaseImponibile(renditaCatastale, categoriaCatastale) {
  const info = CATEGORIE_CATASTALI[categoriaCatastale];
  if (!info) throw new Error(`Categoria catastale non valida: ${categoriaCatastale}`);
  const moltiplicatore = info.moltiplicatore;
  if (moltiplicatore === 0) return { baseImponibile: 0, moltiplicatore };
  const baseImponibile = renditaCatastale * COEFF_RIVALUTAZIONE * moltiplicatore;
  return { baseImponibile: Math.round(baseImponibile * 100) / 100, moltiplicatore };
}

/**
 * Calcola IMU per una singola riga immobile
 */
function calcolaRigaIMU({ baseImponibile, aliquota, quotaPossesso, mesiPossesso, detrazione, riduzionePerc, esente }) {
  if (esente) return { importoLordo: 0, importoNetto: 0, detrazione: 0 };

  // IMU lorda = BI × (aliquota / 1000) × (quota / 100) × (mesi / 12)
  const importoLordo = baseImponibile * (aliquota / 1000) * (quotaPossesso / 100) * (mesiPossesso / 12);

  // Riduzione percentuale (es. 50% immobili locati a canone concordato)
  const importoDopoRiduzione = riduzionePerc > 0
    ? importoLordo * (1 - riduzionePerc / 100)
    : importoLordo;

  // Detrazione fissa (es. 200€ abitazione principale)
  const importoNetto = Math.max(0, importoDopoRiduzione - (detrazione || 0));

  return {
    importoLordo:  Math.round(importoLordo * 100) / 100,
    importoNetto:  Math.round(importoNetto * 100) / 100,
    detrazione:    detrazione || 0,
  };
}

/**
 * Calcola IMU completo per una dichiarazione
 * @param {Object} dichiarazione - documento dichiarazione con righe populate
 * @param {string} comune
 * @param {number} annoImposta
 */
async function calcolaDichiarazioneIMU(dichiarazione, comune, annoImposta) {
  const righeCalcolate = [];
  let totaleImponibile = 0;
  let totaleImposta = 0;

  for (const riga of dichiarazione.righe) {
    const { baseImponibile, moltiplicatore } = calcolaBaseImponibile(
      riga.renditaCatastale,
      riga.immobile?.categoriaCatastale || riga.categoriaCatastale,
    );

    // Determina tipo aliquota
    const tipoAliquota = getTipoAliquotaPerCategoria(
      riga.immobile?.categoriaCatastale || riga.categoriaCatastale,
      riga.tipoImmobile,
    );

    // Carica aliquota dal DB
    const aliquotaDoc = await AliquotaIMU.findOne({
      anno: annoImposta,
      comune,
      tipoImmobile: tipoAliquota,
    });

    if (!aliquotaDoc) {
      logger.warn(`Aliquota non trovata per ${tipoAliquota} anno ${annoImposta} comune ${comune}`);
      righeCalcolate.push({
        ...riga.toObject?.() || riga,
        baseImponibile,
        moltiplicatore,
        aliquotaApplicata: 0,
        importoCalcolato: 0,
        esente: true,
        errore: 'Aliquota non configurata',
      });
      continue;
    }

    const { importoNetto, importoLordo, detrazione } = calcolaRigaIMU({
      baseImponibile,
      aliquota:       aliquotaDoc.aliquota,
      quotaPossesso:  riga.quotaPossesso,
      mesiPossesso:   riga.mesiPossesso,
      detrazione:     aliquotaDoc.detrazione,
      riduzionePerc:  aliquotaDoc.riduzionePerc,
      esente:         aliquotaDoc.esente,
    });

    totaleImponibile += baseImponibile * (riga.quotaPossesso / 100);
    totaleImposta    += importoNetto;

    righeCalcolate.push({
      ...riga.toObject?.() || riga,
      baseImponibile,
      moltiplicatore,
      aliquotaApplicata: aliquotaDoc.aliquota,
      detrazione,
      riduzionePerc: aliquotaDoc.riduzionePerc,
      importoCalcolato: importoNetto,
      importoLordo,
      esente: aliquotaDoc.esente || false,
    });
  }

  const totaleDovuto = Math.ceil(totaleImposta); // arrotondamento all'euro superiore
  const importoAcconto  = Math.floor(totaleDovuto * 0.5);
  const importoSaldo    = totaleDovuto - importoAcconto;

  return {
    righe:            righeCalcolate,
    totaleImponibile: Math.round(totaleImponibile * 100) / 100,
    totaleImposta:    Math.round(totaleImposta * 100) / 100,
    totaleDovuto,
    importoAcconto,
    importoSaldo,
  };
}

/**
 * Calcolo ravvedimento operoso
 */
function calcolaRavvedimento(importoNonVersato, dataScadenza, dataPagamento) {
  const giorniRitardo = Math.floor((dataPagamento - dataScadenza) / (1000 * 60 * 60 * 24));
  const tassoInteresse = 0.025; // tasso legale 2024

  let aliquotaSanzione;
  if (giorniRitardo <= 14)       aliquotaSanzione = 0.001;  // 0.1% per giorno (sprint)
  else if (giorniRitardo <= 30)  aliquotaSanzione = 0.015;  // 1/10 del 15%
  else if (giorniRitardo <= 90)  aliquotaSanzione = 0.0167; // 1/9 del 15%
  else if (giorniRitardo <= 180) aliquotaSanzione = 0.0375; // 1/8 del 30%
  else if (giorniRitardo <= 365) aliquotaSanzione = 0.0429; // 1/7 del 30%
  else if (giorniRitardo <= 730) aliquotaSanzione = 0.05;   // 1/6 del 30%
  else                           aliquotaSanzione = 0.0556; // 1/5 del 30%

  const anni = giorniRitardo / 365;
  const interessi   = importoNonVersato * tassoInteresse * anni;
  const sanzione    = aliquotaSanzione <= 0.0011
    ? importoNonVersato * aliquotaSanzione * giorniRitardo
    : importoNonVersato * aliquotaSanzione;

  return {
    importoOriginale: importoNonVersato,
    giorniRitardo,
    sanzione:   Math.round(sanzione * 100) / 100,
    interessi:  Math.round(interessi * 100) / 100,
    totale:     Math.round((importoNonVersato + sanzione + interessi) * 100) / 100,
  };
}

module.exports = {
  calcolaBaseImponibile,
  calcolaRigaIMU,
  calcolaDichiarazioneIMU,
  calcolaRavvedimento,
  getTipoAliquotaPerCategoria,
  COEFF_RIVALUTAZIONE,
};
