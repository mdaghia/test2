'use strict';
/**
 * Export Service — CSV e Excel per i moduli di reportistica
 */
const ExcelJS = require('exceljs');

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function fmtEuro(v) {
  return v != null ? Number(v).toFixed(2).replace('.', ',') : '0,00';
}
function fmtData(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('it-IT');
}
function nomeContribuente(c) {
  if (!c) return '';
  if (c.ragioneSociale) return c.ragioneSociale;
  return [c.cognome, c.nome].filter(Boolean).join(' ');
}

// ── Column definitions per tipo ────────────────────────────────────────────
const COLUMNS = {
  'versamenti-imu': [
    { header: 'N. Versamento', key: 'numeroVersamento', width: 22 },
    { header: 'Anno Imposta',  key: 'annoImposta',      width: 12 },
    { header: 'Contribuente',  key: 'contribuente',     width: 30 },
    { header: 'Cod. Fiscale',  key: 'codiceFiscale',    width: 18 },
    { header: 'Data Versamento', key: 'dataVersamento', width: 16 },
    { header: 'Importo Dovuto €', key: 'importoDovuto', width: 16 },
    { header: 'Importo Versato €', key: 'importoVersato', width: 17 },
    { header: 'Differenza €',  key: 'differenza',       width: 14 },
    { header: 'Tipo',          key: 'tipo',              width: 14 },
    { header: 'Stato',         key: 'stato',             width: 14 },
  ],
  'versamenti-tari': [
    { header: 'N. Versamento', key: 'numeroVersamento', width: 22 },
    { header: 'Anno Imposta',  key: 'annoImposta',      width: 12 },
    { header: 'Contribuente',  key: 'contribuente',     width: 30 },
    { header: 'Cod. Fiscale',  key: 'codiceFiscale',    width: 18 },
    { header: 'Data Versamento', key: 'dataVersamento', width: 16 },
    { header: 'Importo Dovuto €', key: 'importoDovuto', width: 16 },
    { header: 'Importo Versato €', key: 'importoVersato', width: 17 },
    { header: 'Tipo Rata',     key: 'tipo',              width: 14 },
    { header: 'Stato',         key: 'stato',             width: 14 },
  ],
  'dichiarazioni-imu': [
    { header: 'N. Dichiarazione', key: 'numeroDichiarazione', width: 22 },
    { header: 'Anno Imposta',    key: 'annoImposta',     width: 12 },
    { header: 'Contribuente',    key: 'contribuente',    width: 30 },
    { header: 'Cod. Fiscale',    key: 'codiceFiscale',   width: 18 },
    { header: 'Importo Calcolato €', key: 'importoCalcolato', width: 20 },
    { header: 'Importo Acconto €',   key: 'importoAcconto',   width: 18 },
    { header: 'Importo Saldo €',     key: 'importoSaldo',     width: 18 },
    { header: 'Stato',           key: 'stato',           width: 14 },
  ],
  'dichiarazioni-tari': [
    { header: 'N. Dichiarazione', key: 'numeroDichiarazione', width: 22 },
    { header: 'Anno',            key: 'anno',            width: 10 },
    { header: 'Contribuente',    key: 'contribuente',    width: 30 },
    { header: 'Cod. Fiscale',    key: 'codiceFiscale',   width: 18 },
    { header: 'Importo Calcolato €', key: 'importoCalcolato', width: 20 },
    { header: 'Stato',           key: 'stato',           width: 14 },
  ],
  'libro-ruoli': [
    { header: 'N. Atto',        key: 'numeroAtto',       width: 22 },
    { header: 'Anno Imposta',   key: 'annoImposta',      width: 12 },
    { header: 'Tipo Atto',      key: 'tipoAtto',         width: 28 },
    { header: 'Contribuente',   key: 'contribuente',     width: 30 },
    { header: 'Cod. Fiscale',   key: 'codiceFiscale',    width: 18 },
    { header: 'Totale Richiesto €', key: 'totaleRichiesto', width: 20 },
    { header: 'Data Emissione', key: 'dataEmissione',    width: 16 },
    { header: 'Data Notifica',  key: 'dataNotifica',     width: 14 },
    { header: 'Stato',          key: 'stato',            width: 16 },
  ],
};

function rowFromRecord(tipo, r) {
  const c = r.contribuente || {};
  const base = {
    contribuente:  nomeContribuente(c),
    codiceFiscale: c.codiceFiscale || '',
  };
  switch (tipo) {
    case 'versamenti-imu':
    case 'versamenti-tari':
      return { ...base,
        numeroVersamento: r.numeroVersamento || '',
        annoImposta:  r.annoImposta,
        dataVersamento: fmtData(r.dataVersamento),
        importoDovuto:  fmtEuro(r.importoDovuto),
        importoVersato: fmtEuro(r.importoVersato),
        differenza:     fmtEuro((r.importoDovuto || 0) - (r.importoVersato || 0)),
        tipo: r.tipo || '',
        stato: r.stato,
      };
    case 'dichiarazioni-imu':
      return { ...base,
        numeroDichiarazione: r.numeroDichiarazione || '',
        annoImposta:         r.annoImposta,
        importoCalcolato:    fmtEuro(r.importoCalcolato),
        importoAcconto:      fmtEuro(r.importoAcconto),
        importoSaldo:        fmtEuro(r.importoSaldo),
        stato: r.stato,
      };
    case 'dichiarazioni-tari':
      return { ...base,
        numeroDichiarazione: r.numeroDichiarazione || '',
        anno:                r.anno,
        importoCalcolato:    fmtEuro(r.importoCalcolato),
        stato: r.stato,
      };
    case 'libro-ruoli':
      return { ...base,
        numeroAtto:       r.numeroAtto || '',
        annoImposta:      r.annoImposta,
        tipoAtto:         (r.tipoAtto || '').replace(/_/g, ' '),
        totaleRichiesto:  fmtEuro(r.totaleRichiesto || r.importoSgravioRimborso),
        dataEmissione:    fmtData(r.dataEmissione),
        dataNotifica:     fmtData(r.dataNotifica),
        stato: r.stato,
      };
    default: return base;
  }
}

// ── CSV ────────────────────────────────────────────────────────────────────
function generateCSV(tipo, records) {
  const cols = COLUMNS[tipo] || [];
  const header = cols.map(c => `"${c.header}"`).join(';');
  const rows = records.map(r => {
    const row = rowFromRecord(tipo, r);
    return cols.map(c => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(';');
  });
  return [header, ...rows].join('\r\n');
}

// ── Excel ─────────────────────────────────────────────────────────────────
async function generateExcel(tipo, records, anno) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator  = process.env.COMUNE_NOME || 'Comune';
  workbook.created  = new Date();
  const cols = COLUMNS[tipo] || [];
  const label = tipo.replace(/-/g, ' ').toUpperCase();
  const ws = workbook.addWorksheet(label.slice(0, 31));

  // Title row
  ws.mergeCells(1, 1, 1, cols.length);
  const title = ws.getCell('A1');
  title.value = `${process.env.COMUNE_NOME || 'COMUNE'} — ${label}${anno ? ' – ' + anno : ''}`;
  title.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  title.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
  title.alignment = { horizontal: 'center' };
  ws.getRow(1).height = 24;

  // Header row
  ws.columns = cols;
  const hRow = ws.getRow(2);
  cols.forEach((c, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = c.header;
    cell.font  = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center' };
  });
  hRow.height = 18;

  // Data rows
  records.forEach((r, idx) => {
    const row = rowFromRecord(tipo, r);
    const wsRow = ws.getRow(idx + 3);
    cols.forEach((c, ci) => { wsRow.getCell(ci + 1).value = row[c.key] ?? ''; });
    if (idx % 2 === 0) {
      wsRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
      });
    }
  });

  // Border all cells
  const totalRows = records.length + 2;
  for (let r = 1; r <= totalRows; r++) {
    ws.getRow(r).eachCell({ includeEmpty: true }, cell => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  }

  return workbook.xlsx.writeBuffer();
}

module.exports = { generateCSV, generateExcel, MESI };
