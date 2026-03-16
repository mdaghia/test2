import React, { useState } from 'react';
import { contribuentiAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import { fmt } from '../utils/formatters';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';

const LIMIT = 20;
const btn = (l, fn, c = '#3b82f6', sm = false) => <button onClick={fn} style={{ padding: sm ? '3px 8px' : '6px 14px', border: 'none', borderRadius: 6, background: c, color: '#fff', cursor: 'pointer', fontSize: sm ? '.75rem' : '.82rem' }}>{l}</button>;

export default function Contribuenti() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const { execute } = useApiAction();

  const { data, total, loading, refetch } = useApiData(
    contribuentiAPI.list, { page, limit: LIMIT, search }, [page, search]
  );

  const handleSave = async (dati) => {
    if (editItem) {
      await execute(() => contribuentiAPI.update(editItem._id, dati), 'Contribuente aggiornato');
    } else {
      await execute(() => contribuentiAPI.create(dati), 'Contribuente creato');
    }
    setShowForm(false); setEditItem(null); refetch();
  };

  const columns = [
    { key: 'codiceFiscale', label: 'Codice Fiscale', width: 140 },
    { key: 'cognome', label: 'Cognome / Ragione Sociale', render: (v, row) => row.tipo === 'persona_fisica' ? `${row.cognome || ''} ${row.nome || ''}`.trim() : row.ragioneSociale },
    { key: 'tipo', label: 'Tipo', render: v => v === 'persona_fisica' ? '👤 Persona Fisica' : '🏢 Persona Giuridica' },
    { key: 'email', label: 'Email' },
    { key: 'residenza', label: 'Residenza', render: v => v ? `${v.via}, ${v.comune}` : '—' },
    { key: 'stato', label: 'Stato', render: v => <span style={{ color: v === 'attivo' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{v}</span> },
    { key: '_id', label: 'Azioni', width: 120, render: (id, row) => (
      <div style={{ display: 'flex', gap: '4px' }}>
        {btn('Modifica', () => { setEditItem(row); setShowForm(true); }, '#6366f1', true)}
        {row.stato === 'attivo' && btn('Annulla', () => execute(() => contribuentiAPI.annulla(id), 'Annullato').then(refetch), '#ef4444', true)}
      </div>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Contribuenti</h2>
        {btn('+ Nuovo Contribuente', () => { setEditItem(null); setShowForm(true); })}
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="🔍 Cerca per nome, cognome, ragione sociale..."
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '.875rem', boxSizing: 'border-box' }} />
      </Card>

      <Card>
        <DataTable columns={columns} data={data || []} loading={loading} />
        {total > LIMIT && <Pagination page={page} pages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onChange={setPage} />}
      </Card>

      <ContribuenteModal open={showForm} item={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} onSave={handleSave} />
    </div>
  );
}

function ContribuenteModal({ open, item, onClose, onSave }) {
  const [form, setForm] = useState({ tipo: 'persona_fisica', nome: '', cognome: '', ragioneSociale: '', codiceFiscale: '', partitaIva: '', email: '', telefono: '', residenza: { via: '', civico: '', cap: '', comune: '', provincia: '' } });
  React.useEffect(() => { if (item) setForm({ ...item }); else setForm({ tipo: 'persona_fisica', nome: '', cognome: '', ragioneSociale: '', codiceFiscale: '', partitaIva: '', email: '', telefono: '', residenza: { via: '', civico: '', cap: '', comune: '', provincia: '' } }); }, [item, open]);
  const { loading } = useApiAction();
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const fRes = k => e => setForm(p => ({ ...p, residenza: { ...p.residenza, [k]: e.target.value } }));

  const inp = (label, val, onChange, type = 'text') => (
    <div>
      <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={val} onChange={onChange} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <Modal open={open} title={item ? 'Modifica Contribuente' : 'Nuovo Contribuente'} onClose={onClose} width={720}>
      <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo *</label>
          <select value={form.tipo} onChange={f('tipo')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <option value="persona_fisica">Persona Fisica</option>
            <option value="persona_giuridica">Persona Giuridica</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {form.tipo === 'persona_fisica'
            ? <>{inp('Cognome *', form.cognome, f('cognome'))}{inp('Nome *', form.nome, f('nome'))}</>
            : <div style={{ gridColumn: '1/-1' }}>{inp('Ragione Sociale *', form.ragioneSociale, f('ragioneSociale'))}</div>
          }
          {inp('Codice Fiscale *', form.codiceFiscale, f('codiceFiscale'))}
          {inp('Partita IVA', form.partitaIva, f('partitaIva'))}
          {inp('Email', form.email, f('email'), 'email')}
          {inp('Telefono', form.telefono, f('telefono'))}
        </div>

        <h4 style={{ margin: '0 0 .75rem', fontSize: '.9rem', color: '#374151' }}>Residenza / Sede Legale</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {inp('Via/Piazza', form.residenza?.via, fRes('via'))}
          {inp('Civico', form.residenza?.civico, fRes('civico'))}
          {inp('CAP', form.residenza?.cap, fRes('cap'))}
          {inp('Comune', form.residenza?.comune, fRes('comune'))}
          {inp('Provincia', form.residenza?.provincia, fRes('provincia'))}
        </div>

        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: '#fff' }}>Annulla</button>
          <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Salva</button>
        </div>
      </form>
    </Modal>
  );
}
