import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { elaborazioniAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import { fmt } from '../utils/formatters';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import Card from '../components/common/Card';

const LIMIT = 20;
const btn = (l, fn, c = '#3b82f6', sm = false) => (
  <button onClick={fn} style={{ padding: sm ? '3px 8px' : '6px 14px', border: 'none', borderRadius: 6, background: c, color: '#fff', cursor: 'pointer', fontSize: sm ? '.75rem' : '.82rem' }}>{l}</button>
);

const STATI_COLOR = {
  in_coda: '#94a3b8', in_elaborazione: '#f59e0b', completata: '#22c55e',
  completata_con_errori: '#f97316', fallita: '#ef4444', annullata: '#94a3b8',
};

const TIPI_ELAB = {
  calcolo_massivo_imu:       'Calcolo Massivo IMU',
  emissione_massiva_atti:    'Emissione Massiva Atti',
  stampa_massiva_dichiarazioni: 'Stampa Massiva Dichiarazioni',
  stampa_massiva_atti:       'Stampa Massiva Atti',
  stampa_massiva_avvisi:     'Stampa Massiva Avvisi',
  riconciliazione_versamenti:'Riconciliazione Versamenti',
};

export default function Elaborazioni() {
  const { annoCorrente } = useSelector(s => s.ui);
  const [page, setPage] = useState(1);
  const [showCalcolo, setShowCalcolo] = useState(false);
  const [showStampa, setShowStampa] = useState(false);
  const { execute } = useApiAction();

  const { data: elaborazioni, total, loading, refetch } = useApiData(
    elaborazioniAPI.list, { page, limit: LIMIT }, [page]
  );

  const handleAnnulla = async (id) => {
    await execute(() => elaborazioniAPI.annulla(id), 'Elaborazione annullata');
    refetch();
  };

  const ProgBar = ({ perc }) => (
    <div style={{ background: '#f1f5f9', borderRadius: 999, height: 6, width: 100 }}>
      <div style={{ background: '#3b82f6', borderRadius: 999, height: 6, width: `${Math.min(perc, 100)}%`, transition: 'width .3s' }} />
    </div>
  );

  const columns = [
    { key: 'tipoElaborazione', label: 'Tipo', render: v => TIPI_ELAB[v] || v },
    { key: 'descrizione', label: 'Descrizione' },
    { key: 'stato', label: 'Stato', render: v => <StatusBadge label={v?.replace('_', ' ')} color={STATI_COLOR[v] || '#94a3b8'} /> },
    { key: 'percentuale', label: 'Progresso', render: (v, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <ProgBar perc={v || 0} />
        <span style={{ fontSize: '.75rem', color: '#64748b' }}>{row.recordElaborati}/{row.totaleRecord}</span>
      </div>
    )},
    { key: 'durataMsec', label: 'Durata', render: v => v ? `${(v / 1000).toFixed(1)}s` : '—' },
    { key: 'dataRichiesta', label: 'Richiesta', render: v => fmt.dataOra(v) },
    { key: 'richiestoDA', label: 'Operatore', render: u => u ? `${u.nome} ${u.cognome}` : '—' },
    { key: '_id', label: 'Azioni', width: 120, render: (id, row) => (
      <div style={{ display: 'flex', gap: '4px' }}>
        {row.fileOutput && btn('Download', () => elaborazioniAPI.scaricaOutput(id), '#14b8a6', true)}
        {row.stato === 'in_coda' && btn('Annulla', () => handleAnnulla(id), '#ef4444', true)}
      </div>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Elaborazioni Massive (Kafka)</h2>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {btn('📊 Calcolo Massivo', () => setShowCalcolo(true), '#3b82f6')}
          {btn('🖨 Stampa Massiva', () => setShowStampa(true), '#8b5cf6')}
          {btn('↻ Aggiorna', refetch, '#64748b')}
        </div>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '1rem', marginBottom: '1rem', fontSize: '.85rem', color: '#92400e' }}>
        ⚡ Le elaborazioni massive vengono processate in background via <strong>Apache Kafka</strong>.
        Aggiorna periodicamente per vedere lo stato aggiornato. Puoi continuare a lavorare nel frattempo.
      </div>

      <Card>
        <DataTable columns={columns} data={elaborazioni || []} loading={loading} />
        {total > LIMIT && <Pagination page={page} pages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onChange={setPage} />}
      </Card>

      <CalcoloMassivoModal open={showCalcolo} onClose={() => setShowCalcolo(false)} onSuccess={() => { setShowCalcolo(false); refetch(); }} annoImposta={annoCorrente} />
      <StampaMassivaModal open={showStampa} onClose={() => setShowStampa(false)} onSuccess={() => { setShowStampa(false); refetch(); }} annoImposta={annoCorrente} />
    </div>
  );
}

function CalcoloMassivoModal({ open, onClose, onSuccess, annoImposta }) {
  const [anno, setAnno] = useState(annoImposta);
  const { execute, loading } = useApiAction();

  const avvia = async () => {
    await execute(() => elaborazioniAPI.avviaCalcolo({ annoImposta: anno }), 'Calcolo massivo accodato');
    onSuccess();
  };

  return (
    <Modal open={open} title="Avvia Calcolo Massivo IMU" onClose={onClose} width={480}>
      <p style={{ color: '#374151', fontSize: '.9rem' }}>
        Il calcolo viene eseguito su <strong>tutte le dichiarazioni</strong> in stato "Presentata" o "In Lavorazione"
        per l'anno selezionato. Il processo è gestito da Kafka e non bloccherà l'interfaccia.
      </p>
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Anno Imposta</label>
        <input type="number" value={anno} onChange={e => setAnno(Number(e.target.value))}
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
        {btn('Annulla', onClose, '#64748b')}
        {btn(loading ? 'Avvio...' : '🚀 Avvia Calcolo', avvia, '#3b82f6')}
      </div>
    </Modal>
  );
}

function StampaMassivaModal({ open, onClose, onSuccess, annoImposta }) {
  const [tipoStampa, setTipoStampa] = useState('stampa_massiva_dichiarazioni');
  const [stati, setStati] = useState(['definita']);
  const { execute, loading } = useApiAction();

  const avvia = async () => {
    await execute(() => elaborazioniAPI.avviaStampa({ tipoStampa, annoImposta, stati }), 'Stampa massiva accodata');
    onSuccess();
  };

  const TIPI = [
    { value: 'stampa_massiva_dichiarazioni', label: 'Dichiarazioni IMU' },
    { value: 'stampa_massiva_atti',          label: 'Atti/Provvedimenti' },
    { value: 'stampa_massiva_avvisi',        label: 'Avvisi di Accertamento' },
  ];

  return (
    <Modal open={open} title="Avvia Stampa Massiva" onClose={onClose} width={500}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Stampa</label>
        <select value={tipoStampa} onChange={e => setTipoStampa(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          {TIPI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <p style={{ color: '#374151', fontSize: '.85rem' }}>
        La stampa massiva genera PDF per tutti i documenti filtrati e li raccoglie in un archivio scaricabile.
        Il processo è gestito da Kafka.
      </p>
      <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
        {btn('Annulla', onClose, '#64748b')}
        {btn(loading ? 'Avvio...' : '🚀 Avvia Stampa', avvia, '#8b5cf6')}
      </div>
    </Modal>
  );
}
