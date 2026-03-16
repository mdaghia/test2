/**
 * Motore di calcolo TARES / TARI
 * Riferimenti normativi:
 *   - D.Lgs 152/2006
 *   - DPR 158/1999 (metodo normalizzato)
 *   - L.147/2013 (art.1 cc.639-704, TARI)
 */

/**
 * Categorie utenza domestica (DPR 158/1999 – Allegato 1)
 */
const CATEGORIE_DOMESTICHE = [
  { componenti: 1, descrizione: 'Utenza 1 componente' },
  { componenti: 2, descrizione: 'Utenza 2 componenti' },
  { componenti: 3, descrizione: 'Utenza 3 componenti' },
  { componenti: 4, descrizione: 'Utenza 4 componenti' },
  { componenti: 5, descrizione: 'Utenza 5 componenti' },
  { componenti: 6, descrizione: 'Utenza 6+ componenti' },
];

/**
 * Categorie utenza non domestica (DPR 158/1999 – Allegato 2)
 */
const CATEGORIE_NON_DOMESTICHE = [
  { codice: '1',  descrizione: 'Musei, biblioteche, scuole, associazioni, luoghi di culto' },
  { codice: '2',  descrizione: 'Cinematografi e teatri' },
  { codice: '3',  descrizione: 'Autorimesse e magazzini senza vendita diretta' },
  { codice: '4',  descrizione: 'Campeggi, distributori carburanti, impianti sportivi' },
  { codice: '5',  descrizione: 'Stabilimenti balneari e di cura' },
  { codice: '6',  descrizione: 'Esposizioni, autosaloni' },
  { codice: '7',  descrizione: 'Alberghi con ristorante' },
  { codice: '8',  descrizione: 'Alberghi senza ristorante' },
  { codice: '9',  descrizione: 'Carceri, riformatori, caserme, ospedali' },
  { codice: '10', descrizione: 'Ospedali privati, case di cura' },
  { codice: '11', descrizione: 'Agenzie, studi professionali, uffici, agenzie viaggi' },
  { codice: '12', descrizione: 'Banche, istituti di credito, studi professionali' },
  { codice: '13', descrizione: 'Negozi abbigliamento, calzature, librerie, cartolerie, ferramenta' },
  { codice: '14', descrizione: 'Edicole, farmacie, tabaccai, plurilicenze' },
  { codice: '15', descrizione: 'Negozi particolari quali filatelia, tende, cappelli, ombrelli' },
  { codice: '16', descrizione: 'Ortofrutta, pescherie, fiori e piante, pizza al taglio' },
  { codice: '17', descrizione: 'Ipermercati di generi misti' },
  { codice: '18', descrizione: 'Bar, caffè, pasticcerie' },
  { codice: '19', descrizione: 'Ristoranti, trattorie, osterie, pizzerie, pub' },
  { codice: '20', descrizione: 'Mense, birrerie, amburgherie' },
  { codice: '21', descrizione: 'Artigianato tipo botteghe: falegname, elettricista, fabbro' },
  { codice: '22', descrizione: 'Carrozzerie, autofficine, elettrauto' },
  { codice: '23', descrizione: 'Industrie, capannoni produzione, ingrosso' },
  { codice: '24', descrizione: 'Supermercati, pane e pasta, macellerie, salumerie, generi alimentari' },
  { codice: '25', descrizione: 'Plurilicenze alimentari e miste' },
  { codice: '26', descrizione: 'Ortofrutta, pescherie, fiori e piante (maggiore 200mq)' },
  { codice: '27', descrizione: 'Pizzerie al taglio, rosticcerie, friggitorie, pasticcerie industriali' },
  { codice: '28', descrizione: 'Ipermercati (oltre 2500 mq)' },
  { codice: '29', descrizione: 'Discoteche, sale giochi, bowling, luna park' },
  { codice: '30', descrizione: 'Studi medici, dentistici, veterinari, laboratori analisi' },
];

/**
 * Calcola TARI utenza domestica
 * Quota fissa: Ka × superficie × (tariffa fissa per comp)
 * Quota variabile: Kb × numero_componenti × (tariffa variabile per comp)
 */
function calcolaTariDomestica({ superficie, componenti, tariffaFissa, tariffaVariabile, coeffKa = 1, coeffKb = 1 }) {
  const quotaFissa = superficie * tariffaFissa * coeffKa;
  const quotaVariabile = componenti * tariffaVariabile * coeffKb;
  const totale = quotaFissa + quotaVariabile;

  return {
    quotaFissa:    Math.round(quotaFissa * 100) / 100,
    quotaVariabile: Math.round(quotaVariabile * 100) / 100,
    totale:        Math.round(totale * 100) / 100,
    addicomunale:  0,  // addizionale da calcolare separatamente
  };
}

/**
 * Calcola TARI utenza non domestica
 * Quota fissa: Kc × superficie × (tariffa fissa per cat)
 * Quota variabile: Kd × superficie × (tariffa variabile per cat)
 */
function calcolaTariNonDomestica({ superficie, tariffaFissa, tariffaVariabile, coeffKc = 1, coeffKd = 1 }) {
  const quotaFissa = superficie * tariffaFissa * coeffKc;
  const quotaVariabile = superficie * tariffaVariabile * coeffKd;
  const totale = quotaFissa + quotaVariabile;

  return {
    quotaFissa:    Math.round(quotaFissa * 100) / 100,
    quotaVariabile: Math.round(quotaVariabile * 100) / 100,
    totale:        Math.round(totale * 100) / 100,
  };
}

/**
 * Applica riduzioni TARI
 * - Abitazioni con unica occupazione (25%)
 * - Fabbricati rurali ad uso abitativo (25%)
 * - Compostaggio domestico (20%)
 * - Locali con utilizzo stagionale (<183gg/anno, 30%)
 */
function applicaRiduzioniTari(importo, riduzioni = []) {
  let importoRidotto = importo;
  const dettaglioRiduzioni = [];

  for (const riduzione of riduzioni) {
    let perc = 0;
    switch (riduzione.tipo) {
      case 'unica_occupazione':   perc = 25; break;
      case 'rurale':              perc = 25; break;
      case 'compostaggio':        perc = 20; break;
      case 'stagionale':          perc = 30; break;
      case 'riciclo_certificato': perc = 15; break;
      default:                    perc = riduzione.percentuale || 0;
    }
    const importoRiduzione = importoRidotto * (perc / 100);
    importoRidotto -= importoRiduzione;
    dettaglioRiduzioni.push({ tipo: riduzione.tipo, perc, importo: Math.round(importoRiduzione * 100) / 100 });
  }

  return {
    importoOriginale: importo,
    importoRidotto:   Math.round(importoRidotto * 100) / 100,
    totalRiduzioni:   Math.round((importo - importoRidotto) * 100) / 100,
    dettaglioRiduzioni,
  };
}

/**
 * Calcola TARI per una singola riga (utenza) partendo dalla tariffa DB
 * @param {Object} riga     - riga della dichiarazione (o utenza + tariffa inline)
 * @param {Object} tariffa  - documento TariffaTARI dal DB
 * @returns {Object} dettaglio calcolo con importoCalcolato
 */
function calcolaRigaTARI(riga, tariffa) {
  const { superficie, componentiNucleo = 1, mesiOccupazione = 12, riduzioni = [], tipo } = riga;

  let risultato;
  if (tipo === 'domestica') {
    risultato = calcolaTariDomestica({
      superficie,
      componenti:    componentiNucleo,
      tariffaFissa:  tariffa.tariffaFissa,
      tariffaVariabile: tariffa.tariffaVariabile,
      coeffKa:       tariffa.Ka,
      coeffKb:       tariffa.Kb,
    });
  } else {
    risultato = calcolaTariNonDomestica({
      superficie,
      tariffaFissa:  tariffa.tariffaFissa,
      tariffaVariabile: tariffa.tariffaVariabile,
      coeffKc:       tariffa.Kc,
      coeffKd:       tariffa.Kd,
    });
  }

  // Ragguaglio ai mesi di effettiva occupazione
  const fattoreMesi = mesiOccupazione / 12;
  const importoProRata = Math.round(risultato.totale * fattoreMesi * 100) / 100;

  // Applica riduzioni
  const ridCalc = applicaRiduzioniTari(importoProRata, riduzioni);

  return {
    quotaFissa:         Math.round(risultato.quotaFissa * fattoreMesi * 100) / 100,
    quotaVariabile:     Math.round(risultato.quotaVariabile * fattoreMesi * 100) / 100,
    importoLordo:       importoProRata,
    riduzioniApplicate: ridCalc.dettaglioRiduzioni,
    totaleRiduzioni:    ridCalc.totalRiduzioni,
    importoCalcolato:   ridCalc.importoRidotto,
    // snapshot tariffa
    Ka: tariffa.Ka, Kb: tariffa.Kb,
    Kc: tariffa.Kc, Kd: tariffa.Kd,
    tariffaFissa:     tariffa.tariffaFissa,
    tariffaVariabile: tariffa.tariffaVariabile,
  };
}

/**
 * Calcola TARI completo per una dichiarazione
 * @param {Object} dichiarazione - documento DichiarazioneTARI con righe populate
 * @param {string} comune
 * @param {number} anno
 */
async function calcolaDichiarazioneTARI(dichiarazione, comune, anno) {
  const TariffaTARI = require('../models/TariffaTARI');
  const logger = require('../utils/logger');

  const righeCalcolate = [];
  let totaleAnno = 0;

  for (const riga of dichiarazione.righe) {
    const utenza = riga.utenza;
    const tipo = utenza?.tipo || riga.tipo;
    const categoriaTARI = utenza?.categoriaTARI || riga.categoriaTARI;

    const tariffa = await TariffaTARI.findOne({ anno, comune, tipo, categoria: categoriaTARI });

    if (!tariffa) {
      logger.warn(`Tariffa TARI non trovata: anno=${anno} comune=${comune} tipo=${tipo} cat=${categoriaTARI}`);
      righeCalcolate.push({
        ...riga.toObject?.() || riga,
        importoCalcolato: 0,
        errore: 'Tariffa non configurata',
      });
      continue;
    }

    const calc = calcolaRigaTARI({
      superficie:        utenza?.superficie || riga.superficie,
      componentiNucleo:  utenza?.componentiNucleo || riga.componentiNucleo,
      mesiOccupazione:   utenza?.mesiOccupazione || riga.mesiOccupazione || 12,
      riduzioni:         utenza?.riduzioni || riga.riduzioni || [],
      tipo,
    }, tariffa);

    totaleAnno += calc.importoCalcolato;
    righeCalcolate.push({
      ...riga.toObject?.() || riga,
      tariffaApplicata: tariffa._id,
      tipo, categoriaTARI,
      superficie:       utenza?.superficie || riga.superficie,
      componentiNucleo: utenza?.componentiNucleo || riga.componentiNucleo,
      mesiOccupazione:  utenza?.mesiOccupazione || riga.mesiOccupazione || 12,
      ...calc,
    });
  }

  totaleAnno = Math.ceil(totaleAnno);  // arrotonda all'euro superiore

  // Rate secondo L.147/2013 art.1 c.688
  const anno_ = dichiarazione.anno || anno;
  const importoPrimaRata   = Math.floor(totaleAnno * 0.40);  // 40% – 30/04
  const importoSecondaRata = Math.floor(totaleAnno * 0.30);  // 30% – 30/06
  const importoSaldo       = totaleAnno - importoPrimaRata - importoSecondaRata; // restante – 30/11

  return {
    righe:            righeCalcolate,
    totaleAnno,
    importoPrimaRata,
    scadenzaPrimaRata:   new Date(`${anno_}-04-30`),
    importoSecondaRata,
    scadenzaSecondaRata: new Date(`${anno_}-06-30`),
    importoSaldo,
    scadenzaSaldo:       new Date(`${anno_}-11-30`),
  };
}

module.exports = {
  calcolaTariDomestica,
  calcolaTariNonDomestica,
  applicaRiduzioniTari,
  calcolaRigaTARI,
  calcolaDichiarazioneTARI,
  CATEGORIE_DOMESTICHE,
  CATEGORIE_NON_DOMESTICHE,
};
