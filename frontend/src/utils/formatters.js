import dayjs from 'dayjs';
import 'dayjs/locale/it';
dayjs.locale('it');

export const fmt = {
  euro:  v => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v || 0),
  data:  v => v ? dayjs(v).format('DD/MM/YYYY') : '—',
  dataOra: v => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
  perc:  v => `${(v || 0).toFixed(2)}%`,
  aliq:  v => `${(v || 0).toFixed(2)}‰`,
  cf:    v => v ? v.toUpperCase() : '—',
};

export const STATI_DICHIARAZIONE = {
  bozza:         { label: 'Bozza',         color: '#94a3b8' },
  presentata:    { label: 'Presentata',    color: '#3b82f6' },
  in_lavorazione:{ label: 'In Lavorazione',color: '#f59e0b' },
  definita:      { label: 'Definita',      color: '#22c55e' },
  rettificata:   { label: 'Rettificata',   color: '#8b5cf6' },
  annullata:     { label: 'Annullata',     color: '#ef4444' },
};

export const STATI_ATTO = {
  bozza:     { label: 'Bozza',     color: '#94a3b8' },
  emesso:    { label: 'Emesso',    color: '#3b82f6' },
  notificato:{ label: 'Notificato',color: '#f59e0b' },
  pagato:    { label: 'Pagato',    color: '#22c55e' },
  in_ricorso:{ label: 'In Ricorso',color: '#8b5cf6' },
  sospeso:   { label: 'Sospeso',   color: '#6366f1' },
  definito:  { label: 'Definito',  color: '#14b8a6' },
  annullato: { label: 'Annullato', color: '#ef4444' },
};

export const STATI_VERSAMENTO = {
  registrato:  { label: 'Registrato',  color: '#3b82f6' },
  verificato:  { label: 'Verificato',  color: '#f59e0b' },
  riconciliato:{ label: 'Riconciliato',color: '#22c55e' },
  annullato:   { label: 'Annullato',   color: '#ef4444' },
  a_rimborso:  { label: 'A Rimborso',  color: '#8b5cf6' },
};

export const TIPI_ATTO = {
  avviso_accertamento:        'Avviso di Accertamento',
  avviso_liquidazione:        'Avviso di Liquidazione',
  ingiunzione_pagamento:      'Ingiunzione di Pagamento',
  sgravio:                    'Sgravio',
  rimborso:                   'Rimborso',
  comunicazione_irregolarita: 'Comunicazione Irregolarità',
  diniego_rimborso:           'Diniego Rimborso',
};

export const STATI_TARI = {
  bozza:         { label: 'Bozza',         color: '#94a3b8' },
  presentata:    { label: 'Presentata',    color: '#3b82f6' },
  in_lavorazione:{ label: 'In Lavorazione',color: '#f59e0b' },
  definita:      { label: 'Definita',      color: '#22c55e' },
  rettificata:   { label: 'Rettificata',   color: '#8b5cf6' },
  annullata:     { label: 'Annullata',     color: '#ef4444' },
};

export const STATI_UTENZA_TARI = {
  attiva:    { label: 'Attiva',    color: '#22c55e' },
  cessata:   { label: 'Cessata',   color: '#94a3b8' },
  sospesa:   { label: 'Sospesa',   color: '#f59e0b' },
  annullata: { label: 'Annullata', color: '#ef4444' },
};

export const CATEGORIE_DOM_LABEL = {
  '1': '1 componente', '2': '2 componenti', '3': '3 componenti',
  '4': '4 componenti', '5': '5 componenti', '6': '6+ componenti',
};

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
