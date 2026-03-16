/**
 * Servizio Stampe PDF
 * Genera documenti ufficiali usando PDFKit
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || path.join(__dirname, '..', 'output');

// Assicura directory output
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Helpers ────────────────────────────────────────────────────────────────
function formatEuro(val) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);
}
function formatData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT');
}

function intestazioneComune(doc) {
  doc.fontSize(10).font('Helvetica-Bold')
     .text(process.env.COMUNE_NOME || 'COMUNE DI ESEMPIO', { align: 'center' })
     .text('AREA TRIBUTI – SERVIZIO IMU/TARI', { align: 'center' })
     .font('Helvetica').fontSize(8)
     .text(`C.F. ${process.env.COMUNE_CODICE_FISCALE || 'XXXXXXXXXX'}`, { align: 'center' })
     .moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);
}

function footerPagina(doc, pageNum) {
  const bottom = doc.page.height - 50;
  doc.fontSize(7).font('Helvetica').opacity(0.6)
     .text(`Pag. ${pageNum} – Documento generato il ${new Date().toLocaleDateString('it-IT')} – Sistema Gestione Tributaria`, 50, bottom, { align: 'center' })
     .opacity(1);
}

function createPDF(filename) {
  const filePath = path.join(OUTPUT_DIR, filename);
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  return { doc, filePath, stream };
}

// ── Stampa Dichiarazione IMU ───────────────────────────────────────────────
async function stampaDichiarazioneIMU(dichiarazione) {
  const filename = `dichiarazione_imu_${dichiarazione.numeroDichiarazione}_${uuidv4().slice(0, 8)}.pdf`;
  const { doc, filePath, stream } = createPDF(filename);

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);

    try {
      intestazioneComune(doc);

      doc.fontSize(14).font('Helvetica-Bold')
         .text('DICHIARAZIONE IMU', { align: 'center' })
         .font('Helvetica').fontSize(9)
         .text(`N° ${dichiarazione.numeroDichiarazione}   Anno imposta: ${dichiarazione.annoImposta}`, { align: 'center' })
         .moveDown(1);

      // Sezione contribuente
      doc.fontSize(10).font('Helvetica-Bold').text('DATI CONTRIBUENTE').moveDown(0.3);
      const contrib = dichiarazione.contribuente;
      const denominazione = contrib?.tipo === 'persona_fisica'
        ? `${contrib.cognome} ${contrib.nome}` : contrib?.ragioneSociale || '—';

      doc.font('Helvetica').fontSize(9)
         .text(`Denominazione: ${denominazione}`)
         .text(`Codice Fiscale: ${contrib?.codiceFiscale || '—'}`)
         .text(`Residenza: ${contrib?.residenza?.via || '—'}, ${contrib?.residenza?.comune || '—'}`)
         .moveDown(0.8);

      // Tabella immobili
      doc.fontSize(10).font('Helvetica-Bold').text('IMMOBILI DICHIARATI').moveDown(0.3);

      const colX = [50, 120, 170, 250, 310, 380, 445, 510];
      const headers = ['Cat.', 'Rendita', 'Base Imp.', 'Aliquota‰', 'Quota%', 'Mesi', 'Importo'];
      doc.fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: colX[i+1] - colX[i] - 5 }));
      doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke().moveDown(0.2);

      doc.font('Helvetica').fontSize(8);
      for (const riga of (dichiarazione.righe || [])) {
        const y = doc.y;
        doc.text(riga.immobile?.categoriaCatastale || '—', colX[0], y)
           .text(formatEuro(riga.renditaCatastale), colX[1], y)
           .text(formatEuro(riga.baseImponibile), colX[2], y)
           .text(`${riga.aliquotaApplicata}‰`, colX[3], y)
           .text(`${riga.quotaPossesso}%`, colX[4], y)
           .text(String(riga.mesiPossesso), colX[5], y)
           .text(formatEuro(riga.importoCalcolato), colX[6], y);
        doc.moveDown(0.4);
      }
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

      // Totali
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`TOTALE IMPOSTA DOVUTA: ${formatEuro(dichiarazione.totaleDovuto)}`, { align: 'right' })
         .font('Helvetica')
         .text(`  di cui acconto (16/06): ${formatEuro(dichiarazione.importoAcconto)}`, { align: 'right' })
         .text(`  di cui saldo (16/12):   ${formatEuro(dichiarazione.importoSaldo)}`, { align: 'right' })
         .moveDown(1);

      // Stato e note
      doc.fontSize(8)
         .text(`Stato: ${dichiarazione.stato.toUpperCase()}   Data presentazione: ${formatData(dichiarazione.dataPresentazione)}`)
         .text(`Operatore: ${dichiarazione.operatore?.nome || ''} ${dichiarazione.operatore?.cognome || ''}`)
         .moveDown(1);

      // Spazio firma
      doc.text('Firma del contribuente ______________________   Firma dell\'operatore ______________________', { align: 'center' });

      footerPagina(doc, 1);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── Stampa Atto Provvedimento ──────────────────────────────────────────────
async function stampaAttoProvvedimento(atto) {
  const filename = `atto_${atto.numeroAtto}_${uuidv4().slice(0, 8)}.pdf`;
  const { doc, filePath, stream } = createPDF(filename);

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);

    try {
      intestazioneComune(doc);

      const titoloAtto = {
        avviso_accertamento:       'AVVISO DI ACCERTAMENTO IMU',
        avviso_liquidazione:       'AVVISO DI LIQUIDAZIONE IMU',
        ingiunzione_pagamento:     'INGIUNZIONE DI PAGAMENTO',
        sgravio:                   'PROVVEDIMENTO DI SGRAVIO',
        rimborso:                  'PROVVEDIMENTO DI RIMBORSO',
        comunicazione_irregolarita:'COMUNICAZIONE DI IRREGOLARITÀ',
      }[atto.tipoAtto] || 'ATTO TRIBUTARIO';

      doc.fontSize(13).font('Helvetica-Bold').text(titoloAtto, { align: 'center' })
         .font('Helvetica').fontSize(9)
         .text(`N° ${atto.numeroAtto}  –  Anno Imposta ${atto.annoImposta}`, { align: 'center' })
         .moveDown(1);

      // Contribuente
      const contrib = atto.contribuente;
      const denom = contrib?.tipo === 'persona_fisica'
        ? `${contrib.cognome} ${contrib.nome}` : contrib?.ragioneSociale || '—';

      doc.fontSize(9).font('Helvetica-Bold').text('AL CONTRIBUENTE:').font('Helvetica')
         .text(denom)
         .text(`C.F./P.IVA: ${contrib?.codiceFiscale || '—'}`)
         .text(`${contrib?.residenza?.via || ''}, ${contrib?.residenza?.civico || ''} – ${contrib?.residenza?.cap || ''} ${contrib?.residenza?.comune || ''}`)
         .moveDown(1);

      // Corpo atto
      doc.fontSize(9).font('Helvetica')
         .text('VISTO il D.Lgs. 23/2011 e s.m.i. istitutivo dell\'IMU;')
         .text('VISTA la Legge 160/2019 (Legge di Bilancio 2020);')
         .text('VISTO il Regolamento Comunale IMU vigente;')
         .moveDown(0.5)
         .font('Helvetica-Bold').text('ACCERTA E NOTIFICA')
         .font('Helvetica').moveDown(0.3)
         .text(atto.motivazione || 'Omesso o insufficiente versamento IMU')
         .moveDown(0.8);

      // Tabella importi
      doc.font('Helvetica-Bold').fontSize(9).text('PROSPETTO IMPORTI');
      doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke().moveDown(0.3);
      doc.font('Helvetica').fontSize(9);

      const rows = [
        ['Imposta dovuta:', formatEuro(atto.impostaDovuta)],
        ['Imposta versata:', formatEuro(atto.impostaVersata)],
        ['Differenza accertata:', formatEuro(atto.differenzaAccertata)],
        ['Sanzioni (30%):', formatEuro(atto.sanzioni)],
        ['Interessi (tasso legale):', formatEuro(atto.interessi)],
      ];
      for (const [label, value] of rows) {
        doc.text(label, 50, doc.y).text(value, 350, doc.y - doc.currentLineHeight());
        doc.moveDown(0.4);
      }
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.font('Helvetica-Bold').fontSize(10)
         .text('TOTALE DA CORRISPONDERE:', 50, doc.y + 5)
         .text(formatEuro(atto.totaleRichiesto), 350, doc.y - doc.currentLineHeight())
         .moveDown(1);

      // Modalità pagamento
      doc.font('Helvetica').fontSize(8)
         .text('Il pagamento dovrà essere effettuato entro 60 giorni dalla notifica tramite modello F24 con codice tributo 3912 (ordinaria) o 3913 (principale).')
         .moveDown(0.5)
         .text(`Scadenza pagamento: ${formatData(atto.scadenzaPagamento)}`)
         .moveDown(1);

      // Ricorso
      doc.font('Helvetica-Bold').fontSize(8).text('AVVERTENZA – RICORSO')
         .font('Helvetica').fontSize(7)
         .text('Avverso il presente atto è possibile proporre ricorso alla Commissione Tributaria Provinciale competente entro 60 giorni dalla notifica, ai sensi del D.Lgs. 546/1992.')
         .moveDown(1);

      // Firme
      doc.fontSize(8)
         .text(`${process.env.COMUNE_NOME || 'Il Comune'}, lì ${formatData(atto.dataEmissione)}`, { align: 'right' })
         .moveDown(0.5)
         .text(`Il Responsabile del Servizio Tributi`, { align: 'right' })
         .text(atto.firmatario || '____________________', { align: 'right' });

      footerPagina(doc, 1);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── Stampa Massiva ─────────────────────────────────────────────────────────
async function stampaMassiva(tipoStampa, parametri, jobId) {
  const archivio = path.join(OUTPUT_DIR, `massiva_${jobId}`);
  if (!fs.existsSync(archivio)) fs.mkdirSync(archivio, { recursive: true });

  let records = [];
  let count = 0;

  if (tipoStampa === 'stampa_massiva_dichiarazioni') {
    const DichiarazioneIMU = require('../models/DichiarazioneIMU');
    const query = { annoImposta: parametri.annoImposta };
    if (parametri.stati?.length) query.stato = { $in: parametri.stati };
    records = await DichiarazioneIMU.find(query)
      .populate('contribuente').populate('righe.immobile').populate('operatore');
    for (const dich of records) {
      await stampaDichiarazioneIMU(dich);
      count++;
    }
  } else if (tipoStampa === 'stampa_massiva_atti') {
    const AttoProvvedimento = require('../models/AttoProvvedimento');
    const query = { annoImposta: parametri.annoImposta };
    if (parametri.stati?.length) query.stato = { $in: parametri.stati };
    if (parametri.tipiAtto?.length) query.tipoAtto = { $in: parametri.tipiAtto };
    records = await AttoProvvedimento.find(query).populate('contribuente');
    for (const atto of records) {
      await stampaAttoProvvedimento(atto);
      count++;
    }
  }

  return { fileOutput: archivio, count };
}

module.exports = {
  stampaDichiarazioneIMU,
  stampaAttoProvvedimento,
  stampaMassiva,
};
