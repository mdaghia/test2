import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { dichiarazioniAPI, contribuentiAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import { fmt, STATI_DICHIARAZIONE, downloadBlob } from '../utils/formatters';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import Card from '../components/common/Card';
import { toast } from 'react-toastify';

const LIMIT = 20;

function btn(label, onClick, color = '#3b82f6', small = false) {
  return (
    <button onClick={onClick} style={{
      padding: small ? '3px 8px' : '6px 14px', border: 'none', borderRadius: 6,
      background: color, color: '#fff', cursor: 'pointer', fontSize: small ? '.75rem' : '.82rem', fontWeight: 500,
    }}>{label}</button>
  );
}

export default function Dichiarazioni() {
  const { annoCorrente } = useSelector(s => s.ui);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ stato: '' });
  const [showForm, setShowForm] = useState(false);
  const [showAnnulla, setShowAnnulla] = useState(null);
  const [motivazioneAnnulla, setMotivazioneAnnulla] = useState('');
  const { execute, loading: actLoading } = useApiAction();

  const { data: dichiarazioni, total, loading, refetch } = useApiData(
    dichiarazioniAPI.list,
    { page, limit: LIMIT, annoImposta: annoCorrente, ...filters },
    [page, annoCorrente, filters]
  );

  const handleStampa = async (id) => {
    try {
      const res = await dichiarazioniAPI.stampa(id);
      downloadBlob(res.data, `dichiarazione_${id}.pdf`);
    } catch { toast.error('Errore stampa'); }
  };

  const handleCalcola = async (id) => {
    await execute(
      () => dichiarazioniAPI.calcola(id, {}),
      'Calcolo IMU completato',
    );
    refetch();
  };

  const handleAnnulla = async () => {
    if (!showAnnulla) return;
    await execute(
      () => dichiarazioniAPI.annulla(showAnnulla, { motivazione: motivazioneAnnulla }),
      'Dichiarazione annullata',
    );
    setShowAnnulla(null);
    setMotivazioneAnnulla('');
    refetch();
  };

  const columns = [
    { key: 'numeroDichiarazione', label: 'N° Dichiarazione', width: 160 },
    { key: 'contribuente', label: 'Contribuente', render: (c) => c ? `${c.cognome || ''} ${c.nome || c.ragioneSociale || ''}`.trim() : '—' },
    { key: 'tipoDichiarazione', label: 'Tipo', render: v => v?.replace('_', ' ') || '—' },
    { key: 'totaleDovuto', label: 'Totale Dovuto', render: v => fmt.euro(v) },
    { key: 'stato', label: 'Stato', render: v => { const s = STATI_DICHIARAZIONE[v]; return s ? <StatusBadge label={s.label} color={s.color} /> : v; } },
    { key: 'dataPresentazione', label: 'Data Presentazione', render: v => fmt.data(v) },
    { key: '_id', label: 'Azioni', width: 220, render: (id, row) => (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {btn('Dettaglio', () => navigate(`/dichiarazioni/${id}`), '#6366f1', true)}
        {row.stato !== 'annullata' && btn('Calcola', () => handleCalcola(id), '#f59e0b', true)}
        {btn('PDF', () => handleStampa(id), '#14b8a6', true)}
        {!['annullata', 'definita'].includes(row.stato) && btn('Annulla', () => setShowAnnulla(id), '#ef4444', true)}
      </div>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
          Dichiarazioni IMU – {annoCorrente}
        </h2>
        {btn('+ Nuova Dichiarazione', () => setShowForm(true))}
      </div>

      {/* Filtri */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stato</label>
            <select value={filters.stato} onChange={e => { setFilters(f => ({ ...f, stato: e.target.value })); setPage(1); }}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '.85rem' }}>
              <option value="">Tutti</option>
              {Object.entries(STATI_DICHIARAZIONE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {btn('Aggiorna', refetch, '#64748b')}
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={dichiarazioni || []} loading={loading} />
        {total > LIMIT && <Pagination page={page} pages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onChange={setPage} />}
      </Card>

      {/* Modal Nuova Dichiarazione */}
      <NuovaDichiarazioneModal open={showForm} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refetch(); }} />

      {/* Modal Annullamento */}
      <Modal open={!!showAnnulla} title="Annulla Dichiarazione" onClose={() => setShowAnnulla(null)}>
        <p style={{ color: '#374151', fontSize: '.9rem' }}>Inserire la motivazione dell'annullamento (la dichiarazione non verrà eliminata).</p>
        <textarea value={motivazioneAnnulla} onChange={e => setMotivazioneAnnulla(e.target.value)} rows={3}
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '.875rem', boxSizing: 'border-box' }}
          placeholder="Motivazione annullamento..." />
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          {btn('Annulla Operazione', () => setShowAnnulla(null), '#64748b')}
          {btn('Conferma Annullamento', handleAnnulla, '#ef4444')}
        </div>
      </Modal>
    </div>
  );
}

// ── Modal Nuova Dichiarazione ─────────────────────────────────────────────
function NuovaDichiarazioneModal({ open, onClose, onSuccess }) {
  const { annoCorrente } = useSelector(s => s.ui);
  const [form, setForm] = useState({ annoImposta: annoCorrente, tipoDichiarazione: 'originale', contribuenteId: '', righe: [] });
  const [cfSearch, setCfSearch] = useState('');
  const [contribuente, setContribuente] = useState(null);
  const { execute, loading } = useApiAction();

  const cercaContribuente = useCallback(async () => {
    if (!cfSearch) return;
    try {
      const res = await contribuentiAPI.cerca({ cf: cfSearch });
      if (res.data.data.length > 0) {
        setContribuente(res.data.data[0]);
        setForm(f => ({ ...f, contribuente: res.data.data[0]._id }));
      } else toast.warn('Contribuente non trovato');
    } catch { toast.error('Errore ricerca'); }
  }, [cfSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await execute(
      () => dichiarazioniAPI.create({ ...form, annoDichiarazione: new Date().getFullYear() }),
      'Dichiarazione creata con successo',
    );
    onSuccess();
  };

  return (
    <Modal open={open} title="Nuova Dichiarazione IMU" onClose={onClose} width={700}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Anno Imposta *</label>
            <input type="number" value={form.annoImposta} onChange={e => setForm(f => ({ ...f, annoImposta: Number(e.target.value) }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Dichiarazione *</label>
            <select value={form.tipoDichiarazione} onChange={e => setForm(f => ({ ...f, tipoDichiarazione: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <option value="originale">Originale</option>
              <option value="integrativa">Integrativa</option>
              <option value="rettificativa">Rettificativa</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Contribuente *</label>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input value={cfSearch} onChange={e => setCfSearch(e.target.value.toUpperCase())}
              placeholder="Codice Fiscale" style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }} />
            {btn('Cerca', cercaContribuente, '#3b82f6')}
          </div>
          {contribuente && (
            <div style={{ marginTop: '.5rem', padding: '.5rem .75rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: '.85rem' }}>
              ✅ {contribuente.cognome} {contribuente.nome} – CF: {contribuente.codiceFiscale}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          {btn('Annulla', onClose, '#64748b')}
          <button type="submit" disabled={loading || !contribuente}
            style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: (loading || !contribuente) ? .6 : 1 }}>
            {loading ? 'Creazione...' : 'Crea Dichiarazione'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
