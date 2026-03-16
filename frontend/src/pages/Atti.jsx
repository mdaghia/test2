import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { attiAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import { fmt, STATI_ATTO, TIPI_ATTO, downloadBlob } from '../utils/formatters';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import Card from '../components/common/Card';
import { toast } from 'react-toastify';

const LIMIT = 20;
const btn = (label, onClick, color = '#3b82f6', small = false) => (
  <button onClick={onClick} style={{ padding: small ? '3px 8px' : '6px 14px', border: 'none', borderRadius: 6, background: color, color: '#fff', cursor: 'pointer', fontSize: small ? '.75rem' : '.82rem' }}>{label}</button>
);

export default function Atti() {
  const { annoCorrente } = useSelector(s => s.ui);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ stato: '', tipoAtto: '' });
  const [showForm, setShowForm] = useState(false);
  const [showMassiva, setShowMassiva] = useState(false);
  const [annullaId, setAnnullaId] = useState(null);
  const [motivazione, setMotivazione] = useState('');
  const { execute } = useApiAction();

  const { data: atti, total, loading, refetch } = useApiData(
    attiAPI.list,
    { page, limit: LIMIT, annoImposta: annoCorrente, ...filters },
    [page, annoCorrente, filters]
  );

  const handleStampa = async (id, numeroAtto) => {
    try {
      const res = await attiAPI.stampa(id);
      downloadBlob(res.data, `atto_${numeroAtto}.pdf`);
    } catch { toast.error('Errore stampa'); }
  };

  const handleCambiaStato = async (id, stato) => {
    await execute(() => attiAPI.cambiaStato(id, { stato }), `Atto aggiornato: ${stato}`);
    refetch();
  };

  const handleAnnulla = async () => {
    await execute(() => attiAPI.annulla(annullaId, { motivazione }), 'Atto annullato');
    setAnnullaId(null); setMotivazione(''); refetch();
  };

  const columns = [
    { key: 'numeroAtto', label: 'N° Atto', width: 160 },
    { key: 'tipoAtto', label: 'Tipo', render: v => TIPI_ATTO[v] || v },
    { key: 'contribuente', label: 'Contribuente', render: c => c ? `${c.cognome || ''} ${c.nome || c.ragioneSociale || ''}`.trim() : '—' },
    { key: 'totaleRichiesto', label: 'Totale', render: v => <span style={{ fontWeight: 600 }}>{fmt.euro(v)}</span> },
    { key: 'stato', label: 'Stato', render: v => { const s = STATI_ATTO[v]; return s ? <StatusBadge label={s.label} color={s.color} /> : v; } },
    { key: 'dataEmissione', label: 'Emissione', render: v => fmt.data(v) },
    { key: 'dataNotifica', label: 'Notifica', render: v => fmt.data(v) },
    { key: 'scadenzaPagamento', label: 'Scadenza', render: v => {
      if (!v) return '—';
      const scad = new Date(v);
      const oggi = new Date();
      const color = scad < oggi ? '#ef4444' : scad - oggi < 7 * 86400000 ? '#f59e0b' : '#22c55e';
      return <span style={{ color, fontWeight: 600 }}>{fmt.data(v)}</span>;
    }},
    { key: '_id', label: 'Azioni', width: 200, render: (id, row) => (
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {btn('PDF', () => handleStampa(id, row.numeroAtto), '#14b8a6', true)}
        {row.stato === 'emesso' && btn('Notifica', () => handleCambiaStato(id, 'notificato'), '#f59e0b', true)}
        {row.stato === 'notificato' && btn('Pagato', () => handleCambiaStato(id, 'pagato'), '#22c55e', true)}
        {!['annullato', 'pagato', 'definito'].includes(row.stato) && btn('Annulla', () => setAnnullaId(id), '#ef4444', true)}
      </div>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Atti/Provvedimenti – {annoCorrente}</h2>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {btn('Emissione Massiva', () => setShowMassiva(true), '#8b5cf6')}
          {btn('+ Nuovo Atto', () => setShowForm(true))}
        </div>
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Stato</label>
            <select value={filters.stato} onChange={e => { setFilters(f => ({ ...f, stato: e.target.value })); setPage(1); }}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '.85rem' }}>
              <option value="">Tutti</option>
              {Object.entries(STATI_ATTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Atto</label>
            <select value={filters.tipoAtto} onChange={e => { setFilters(f => ({ ...f, tipoAtto: e.target.value })); setPage(1); }}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '.85rem' }}>
              <option value="">Tutti</option>
              {Object.entries(TIPI_ATTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {btn('Aggiorna', refetch, '#64748b')}
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={atti || []} loading={loading} />
        {total > LIMIT && <Pagination page={page} pages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onChange={setPage} />}
      </Card>

      <NuovoAttoModal open={showForm} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refetch(); }} annoImposta={annoCorrente} />
      <EmissioneMassivaModal open={showMassiva} onClose={() => setShowMassiva(false)} annoImposta={annoCorrente} />

      <Modal open={!!annullaId} title="Annulla Atto" onClose={() => setAnnullaId(null)}>
        <textarea value={motivazione} onChange={e => setMotivazione(e.target.value)} rows={3} placeholder="Motivazione..."
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box', marginBottom: '1rem' }} />
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
          {btn('Indietro', () => setAnnullaId(null), '#64748b')}
          {btn('Conferma Annullamento', handleAnnulla, '#ef4444')}
        </div>
      </Modal>
    </div>
  );
}

function NuovoAttoModal({ open, onClose, onSuccess, annoImposta }) {
  const [form, setForm] = useState({ annoImposta, tipoAtto: 'avviso_accertamento', motivazione: '', dataEmissione: new Date().toISOString().slice(0, 10), impostaDovuta: '', impostaVersata: '' });
  const { execute, loading } = useApiAction();
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dati = { ...form, differenzaAccertata: (Number(form.impostaDovuta) - Number(form.impostaVersata)) };
    await execute(() => attiAPI.create(dati), 'Atto creato');
    onSuccess();
  };

  return (
    <Modal open={open} title="Nuovo Atto/Provvedimento" onClose={onClose} width={700}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Atto *</label>
            <select value={form.tipoAtto} onChange={f('tipoAtto')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {Object.entries(TIPI_ATTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Data Emissione *</label>
            <input type="date" value={form.dataEmissione} onChange={f('dataEmissione')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Imposta Dovuta €</label>
            <input type="number" value={form.impostaDovuta} onChange={f('impostaDovuta')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Imposta Versata €</label>
            <input type="number" value={form.impostaVersata} onChange={f('impostaVersata')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Motivazione *</label>
          <textarea value={form.motivazione} onChange={f('motivazione')} rows={3} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          {btn('Annulla', onClose, '#64748b')}
          <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Salvataggio...' : 'Crea Atto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EmissioneMassivaModal({ open, onClose, annoImposta }) {
  const { execute, loading } = useApiAction();
  const [msg, setMsg] = useState('');

  const avvia = async () => {
    const res = await execute(() => attiAPI.emissioneMassiva({ annoImposta, descrizione: `Emissione massiva ${annoImposta}` }), null, 'Errore');
    if (res) setMsg(`✅ Elaborazione accodata: ${res.data._id}`);
  };

  return (
    <Modal open={open} title="Emissione Massiva Avvisi di Accertamento" onClose={onClose} width={500}>
      <p style={{ color: '#374151', fontSize: '.9rem' }}>
        Questa operazione individuerà tutte le dichiarazioni <strong>definite</strong> per l'anno {annoCorrente} con importi non versati
        e genererà automaticamente gli avvisi di accertamento tramite Kafka.
      </p>
      {msg && <div style={{ padding: '.75rem', background: '#f0fdf4', borderRadius: 8, color: '#166534', fontSize: '.85rem', marginBottom: '1rem' }}>{msg}</div>}
      <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
        {btn('Chiudi', onClose, '#64748b')}
        {!msg && btn(loading ? 'Avvio in corso...' : '🚀 Avvia Emissione Massiva', avvia, '#8b5cf6')}
      </div>
    </Modal>
  );
}
