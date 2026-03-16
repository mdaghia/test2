import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { utenzeTariAPI, contribuentiAPI, immobiliAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import { fmt } from '../utils/formatters';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import Card from '../components/common/Card';
import { toast } from 'react-toastify';

const LIMIT = 20;
const btn = (l, fn, c = '#3b82f6', sm = false) => (
  <button onClick={fn} style={{ padding: sm ? '3px 8px' : '6px 14px', border: 'none', borderRadius: 6, background: c, color: '#fff', cursor: 'pointer', fontSize: sm ? '.75rem' : '.82rem' }}>{l}</button>
);

const STATI_UTENZA = {
  attiva:   { label: 'Attiva',   color: '#22c55e' },
  cessata:  { label: 'Cessata',  color: '#94a3b8' },
  sospesa:  { label: 'Sospesa',  color: '#f59e0b' },
  annullata:{ label: 'Annullata',color: '#ef4444' },
};

const CAT_DOM  = Array.from({ length: 6 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}${i === 5 ? '+' : ''} componente${i > 0 ? 'i' : ''}` }));
const CAT_NDOM = Array.from({ length: 30 }, (_, i) => ({ value: String(i + 1), label: `Cat. ${i + 1}` }));

const TIPI_RIDUZIONE = [
  { value: 'unica_occupazione',   label: 'Unica occupazione (25%)' },
  { value: 'rurale',              label: 'Fabbricato rurale (25%)' },
  { value: 'compostaggio',        label: 'Compostaggio domestico (20%)' },
  { value: 'stagionale',          label: 'Utilizzo stagionale (30%)' },
  { value: 'riciclo_certificato', label: 'Riciclo certificato (15%)' },
  { value: 'altra',               label: 'Altra riduzione (%)' },
];

export default function UtenzeTARI() {
  const { annoCorrente } = useSelector(s => s.ui);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ tipo: '', stato: 'attiva' });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [annullaId, setAnnullaId] = useState(null);
  const [motivazione, setMotivazione] = useState('');
  const { execute } = useApiAction();

  const { data, total, loading, refetch } = useApiData(
    utenzeTariAPI.list,
    { page, limit: LIMIT, anno: annoCorrente, ...filters },
    [page, annoCorrente, filters]
  );

  const handleSave = async (dati) => {
    if (editItem) {
      await execute(() => utenzeTariAPI.update(editItem._id, dati), 'Utenza aggiornata');
    } else {
      await execute(() => utenzeTariAPI.create({ ...dati, anno: annoCorrente }), 'Utenza creata');
    }
    setShowForm(false); setEditItem(null); refetch();
  };

  const handleAnnulla = async () => {
    await execute(() => utenzeTariAPI.annulla(annullaId, { motivazione }), 'Utenza annullata');
    setAnnullaId(null); setMotivazione(''); refetch();
  };

  const columns = [
    { key: 'numeroUtenza', label: 'N° Utenza', width: 160 },
    { key: 'contribuente', label: 'Contribuente', render: c => c ? `${c.cognome || ''} ${c.nome || c.ragioneSociale || ''}`.trim() : '—' },
    { key: 'tipo', label: 'Tipo', render: v => v === 'domestica' ? '🏠 Domestica' : '🏢 Non Domestica' },
    { key: 'categoriaTARI', label: 'Cat.', width: 50 },
    { key: 'indirizzo', label: 'Indirizzo', render: (v, r) => `${v}, ${r.comune || ''}` },
    { key: 'superficie', label: 'mq', width: 60 },
    { key: 'componentiNucleo', label: 'Comp.', width: 60, render: (v, r) => r.tipo === 'domestica' ? v : '—' },
    { key: 'mesiOccupazione', label: 'Mesi', width: 55 },
    { key: 'riduzioni', label: 'Riduzioni', render: v => v?.length ? v.map(r => r.tipo).join(', ') : '—' },
    { key: 'stato', label: 'Stato', render: v => { const s = STATI_UTENZA[v]; return s ? <StatusBadge label={s.label} color={s.color} /> : v; } },
    { key: '_id', label: 'Azioni', width: 120, render: (id, row) => (
      <div style={{ display: 'flex', gap: '3px' }}>
        {btn('Modifica', () => { setEditItem(row); setShowForm(true); }, '#6366f1', true)}
        {row.stato !== 'annullata' && btn('Annulla', () => setAnnullaId(id), '#ef4444', true)}
      </div>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Utenze TARI – {annoCorrente}</h2>
        {btn('+ Nuova Utenza', () => { setEditItem(null); setShowForm(true); })}
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo</label>
            <select value={filters.tipo} onChange={e => { setFilters(f => ({ ...f, tipo: e.target.value })); setPage(1); }}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '.85rem' }}>
              <option value="">Tutti</option>
              <option value="domestica">🏠 Domestica</option>
              <option value="non_domestica">🏢 Non Domestica</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Stato</label>
            <select value={filters.stato} onChange={e => { setFilters(f => ({ ...f, stato: e.target.value })); setPage(1); }}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '.85rem' }}>
              <option value="">Tutti</option>
              {Object.entries(STATI_UTENZA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {btn('Aggiorna', refetch, '#64748b')}
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={data || []} loading={loading} />
        {total > LIMIT && <Pagination page={page} pages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onChange={setPage} />}
      </Card>

      <UtenzaModal open={showForm} item={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} onSave={handleSave} />

      <Modal open={!!annullaId} title="Annulla Utenza TARI" onClose={() => setAnnullaId(null)}>
        <p style={{ color: '#374151', fontSize: '.9rem' }}>L'annullamento è logico — l'utenza rimarrà in archivio con stato "annullata".</p>
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

function UtenzaModal({ open, item, onClose, onSave }) {
  const [form, setForm] = useState({
    tipo: 'domestica', categoriaTARI: '3', contribuente: '', immobile: '',
    indirizzo: '', civico: '', cap: '', comune: '',
    superficie: '', componentiNucleo: 3, mesiOccupazione: 12,
    dataInizio: new Date().toISOString().slice(0, 10), dataFine: '',
    riduzioni: [],
  });
  const [cfSearch, setCfSearch] = useState('');
  const [contribuente, setContribuente] = useState(null);
  const [newRiduzione, setNewRiduzione] = useState({ tipo: 'unica_occupazione', percentuale: 0 });
  const { loading } = useApiAction();

  React.useEffect(() => {
    if (item) { setForm({ ...item, dataInizio: item.dataInizio?.slice?.(0, 10) || '', dataFine: item.dataFine?.slice?.(0, 10) || '', contribuente: item.contribuente?._id || item.contribuente }); setContribuente(item.contribuente); }
    else { setForm({ tipo: 'domestica', categoriaTARI: '3', contribuente: '', immobile: '', indirizzo: '', civico: '', cap: '', comune: '', superficie: '', componentiNucleo: 3, mesiOccupazione: 12, dataInizio: new Date().toISOString().slice(0, 10), dataFine: '', riduzioni: [] }); setContribuente(null); }
  }, [item, open]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const cercaContribuente = useCallback(async () => {
    if (!cfSearch) return;
    try {
      const res = await contribuentiAPI.cerca({ cf: cfSearch });
      if (res.data.data.length > 0) {
        setContribuente(res.data.data[0]);
        setForm(p => ({ ...p, contribuente: res.data.data[0]._id }));
      } else toast.warn('Contribuente non trovato');
    } catch { toast.error('Errore ricerca'); }
  }, [cfSearch]);

  const categorieOpts = form.tipo === 'domestica' ? CAT_DOM : CAT_NDOM;

  const addRiduzione = () => {
    setForm(p => ({ ...p, riduzioni: [...p.riduzioni, { ...newRiduzione }] }));
    setNewRiduzione({ tipo: 'unica_occupazione', percentuale: 0 });
  };

  const removeRiduzione = (idx) => setForm(p => ({ ...p, riduzioni: p.riduzioni.filter((_, i) => i !== idx) }));

  const inp = (label, key, type = 'text') => (
    <div>
      <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <Modal open={open} title={item ? 'Modifica Utenza TARI' : 'Nuova Utenza TARI'} onClose={onClose} width={760}>
      <form onSubmit={e => { e.preventDefault(); onSave({ ...form, superficie: Number(form.superficie), componentiNucleo: Number(form.componentiNucleo), mesiOccupazione: Number(form.mesiOccupazione) }); }}>

        {/* Tipo e categoria */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Utenza *</label>
            <select value={form.tipo} onChange={e => { f('tipo')(e); setForm(p => ({ ...p, tipo: e.target.value, categoriaTARI: e.target.value === 'domestica' ? '3' : '11' })); }}
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <option value="domestica">🏠 Domestica</option>
              <option value="non_domestica">🏢 Non Domestica</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Categoria *</label>
            <select value={form.categoriaTARI} onChange={f('categoriaTARI')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {categorieOpts.map(o => <option key={o.value} value={o.value}>{o.value} – {o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Contribuente */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Contribuente *</label>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input value={cfSearch} onChange={e => setCfSearch(e.target.value.toUpperCase())} placeholder="Cerca per Codice Fiscale"
              style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }} />
            {btn('Cerca', cercaContribuente)}
          </div>
          {contribuente && <div style={{ marginTop: '.5rem', padding: '.5rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: '.85rem' }}>
            ✅ {contribuente.cognome} {contribuente.nome} – {contribuente.codiceFiscale}
          </div>}
        </div>

        {/* Indirizzo */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {inp('Indirizzo *', 'indirizzo')}
          {inp('Civico', 'civico')}
          {inp('CAP', 'cap')}
          {inp('Comune *', 'comune')}
        </div>

        {/* Superficie e periodo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {inp('Superficie mq *', 'superficie', 'number')}
          {form.tipo === 'domestica' && inp('N. Componenti', 'componentiNucleo', 'number')}
          {inp('Mesi Occupazione', 'mesiOccupazione', 'number')}
          {inp('Data Inizio', 'dataInizio', 'date')}
          {inp('Data Fine', 'dataFine', 'date')}
        </div>

        {/* Riduzioni */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Riduzioni Applicabili</label>
          {form.riduzioni.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: 4, background: '#f8fafc', padding: '.4rem .75rem', borderRadius: 8 }}>
              <span style={{ flex: 1, fontSize: '.85rem' }}>{TIPI_RIDUZIONE.find(t => t.value === r.tipo)?.label || r.tipo}{r.tipo === 'altra' ? ` – ${r.percentuale}%` : ''}</span>
              <button type="button" onClick={() => removeRiduzione(i)} style={{ border: 'none', background: '#ef4444', color: '#fff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '.75rem' }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
            <select value={newRiduzione.tipo} onChange={e => setNewRiduzione(r => ({ ...r, tipo: e.target.value }))}
              style={{ flex: 1, padding: '6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '.85rem' }}>
              {TIPI_RIDUZIONE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {newRiduzione.tipo === 'altra' && (
              <input type="number" value={newRiduzione.percentuale} onChange={e => setNewRiduzione(r => ({ ...r, percentuale: Number(e.target.value) }))}
                placeholder="%" style={{ width: 70, padding: '6px', border: '1px solid #e2e8f0', borderRadius: 6 }} />
            )}
            {btn('+ Aggiungi', addRiduzione, '#22c55e')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          {btn('Annulla', onClose, '#64748b')}
          <button type="submit" disabled={loading || !form.contribuente} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: !form.contribuente ? .6 : 1 }}>
            {loading ? 'Salvataggio...' : 'Salva Utenza'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
