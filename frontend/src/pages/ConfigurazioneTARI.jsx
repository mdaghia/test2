import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { tariffeTariAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import DataTable from '../components/common/DataTable';
import { toast } from 'react-toastify';

const btn = (l, fn, c = '#3b82f6') => (
  <button onClick={fn} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: c, color: '#fff', cursor: 'pointer', fontSize: '.82rem' }}>{l}</button>
);

const CATEGORIE_DOM = [
  { value: '1', label: '1 componente' },
  { value: '2', label: '2 componenti' },
  { value: '3', label: '3 componenti' },
  { value: '4', label: '4 componenti' },
  { value: '5', label: '5 componenti' },
  { value: '6', label: '6+ componenti' },
];

const CATEGORIE_NON_DOM = Array.from({ length: 30 }, (_, i) => ({ value: String(i + 1), label: `Cat. ${i + 1}` }));

export default function ConfigurazioneTARI() {
  const { annoCorrente } = useSelector(s => s.ui);
  const [tab, setTab] = useState('domestica');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showCopia, setShowCopia] = useState(false);
  const { execute } = useApiAction();

  const { data: tariffe, loading, refetch } = useApiData(
    tariffeTariAPI.list, { anno: annoCorrente, tipo: tab }, [annoCorrente, tab]
  );

  const handleSave = async (dati) => {
    if (editItem) {
      await execute(() => tariffeTariAPI.update(editItem._id, dati), 'Tariffa aggiornata');
    } else {
      await execute(() => tariffeTariAPI.create({ ...dati, anno: annoCorrente, tipo: tab }), 'Tariffa creata');
    }
    setShowForm(false); setEditItem(null); refetch();
  };

  const tabStyle = (active) => ({
    padding: '8px 20px', border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 400,
    borderBottom: active ? '3px solid #3b82f6' : '3px solid transparent',
    background: 'none', fontSize: '.9rem', color: active ? '#3b82f6' : '#64748b',
  });

  const columns = [
    { key: 'categoria', label: 'Cat.', width: 60 },
    { key: 'descrizione', label: 'Descrizione' },
    { key: 'tariffaFissa', label: 'Tariffa Fissa €/mq', render: v => `€ ${v?.toFixed(4)}` },
    { key: 'tariffaVariabile', label: tab === 'domestica' ? 'Tariffa Var. €/comp' : 'Tariffa Var. €/mq', render: v => `€ ${v?.toFixed(4)}` },
    { key: 'Ka', label: 'Ka', render: (v, row) => tab === 'domestica' ? v : '—' },
    { key: 'Kb', label: 'Kb', render: (v, row) => tab === 'domestica' ? row.Kb : '—' },
    { key: 'Kc', label: 'Kc', render: (v, row) => tab === 'non_domestica' ? v : '—' },
    { key: 'Kd', label: 'Kd', render: (v, row) => tab === 'non_domestica' ? row.Kd : '—' },
    { key: '_id', label: 'Azioni', width: 80, render: (id, row) => (
      <button onClick={() => { setEditItem(row); setShowForm(true); }}
        style={{ padding: '3px 10px', border: 'none', borderRadius: 6, background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: '.75rem' }}>
        Modifica
      </button>
    )},
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
        Configurazione Tariffe TARI – {annoCorrente}
      </h2>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', fontSize: '.85rem', color: '#1e40af' }}>
        ℹ️ Tariffe calcolate con il <strong>metodo normalizzato DPR 158/1999</strong>.
        Le tariffe fisse sono in <strong>€/mq/anno</strong>.
        Per le <em>utenze domestiche</em> la tariffa variabile è <strong>€/componente/anno</strong>;
        per le <em>non domestiche</em> è <strong>€/mq/anno</strong>.
      </div>

      <Card title="Tariffe TARI" action={
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {btn('Copia da Anno Prec.', () => setShowCopia(true), '#64748b')}
          {btn('+ Nuova Tariffa', () => { setEditItem(null); setShowForm(true); })}
        </div>
      }>
        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', display: 'flex' }}>
          <button style={tabStyle(tab === 'domestica')} onClick={() => setTab('domestica')}>🏠 Utenze Domestiche</button>
          <button style={tabStyle(tab === 'non_domestica')} onClick={() => setTab('non_domestica')}>🏢 Utenze Non Domestiche</button>
        </div>

        <DataTable columns={columns} data={tariffe || []} loading={loading}
          emptyText={`Nessuna tariffa ${tab === 'domestica' ? 'domestica' : 'non domestica'} configurata per il ${annoCorrente}`} />
      </Card>

      <TariffaModal open={showForm} item={editItem} tipo={tab} onClose={() => { setShowForm(false); setEditItem(null); }}
        onSave={handleSave} categorieOpts={tab === 'domestica' ? CATEGORIE_DOM : CATEGORIE_NON_DOM} />

      <CopiaAnnoModal open={showCopia} onClose={() => setShowCopia(false)} annoDestino={annoCorrente}
        onSuccess={() => { setShowCopia(false); refetch(); toast.success('Tariffe copiate'); }} />
    </div>
  );
}

function TariffaModal({ open, item, tipo, onClose, onSave, categorieOpts }) {
  const [form, setForm] = useState({ categoria: '', descrizione: '', Ka: 1, Kb: 1, Kc: 1, Kd: 1, tariffaFissa: 0, tariffaVariabile: 0 });
  const { loading } = useApiAction();

  useEffect(() => {
    if (item) setForm({ categoria: item.categoria, descrizione: item.descrizione, Ka: item.Ka || 1, Kb: item.Kb || 1, Kc: item.Kc || 1, Kd: item.Kd || 1, tariffaFissa: item.tariffaFissa, tariffaVariabile: item.tariffaVariabile });
    else setForm({ categoria: '', descrizione: '', Ka: 1, Kb: 1, Kc: 1, Kd: 1, tariffaFissa: 0, tariffaVariabile: 0 });
  }, [item, open]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const inp = (label, key, type = 'text', opts) => (
    <div>
      <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      {type === 'select'
        ? <select value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}>
            <option value="">– seleziona –</option>
            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        : <input type={type} value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
      }
    </div>
  );

  return (
    <Modal open={open} title={`${item ? 'Modifica' : 'Nuova'} Tariffa – ${tipo === 'domestica' ? 'Domestica' : 'Non Domestica'}`} onClose={onClose} width={580}>
      <form onSubmit={e => { e.preventDefault(); onSave({ ...form, tariffaFissa: Number(form.tariffaFissa), tariffaVariabile: Number(form.tariffaVariabile), Ka: Number(form.Ka), Kb: Number(form.Kb), Kc: Number(form.Kc), Kd: Number(form.Kd) }); }}>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
          {inp('Categoria *', 'categoria', 'select', categorieOpts)}
          {inp('Descrizione *', 'descrizione')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {inp('Tariffa Fissa €/mq/anno *', 'tariffaFissa', 'number')}
            {inp(tipo === 'domestica' ? 'Tariffa Variabile €/comp/anno *' : 'Tariffa Variabile €/mq/anno *', 'tariffaVariabile', 'number')}
          </div>
          {tipo === 'domestica' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {inp('Coefficiente Ka (quota fissa)', 'Ka', 'number')}
              {inp('Coefficiente Kb (quota variabile)', 'Kb', 'number')}
            </div>
          )}
          {tipo === 'non_domestica' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {inp('Coefficiente Kc (quota fissa)', 'Kc', 'number')}
              {inp('Coefficiente Kd (quota variabile)', 'Kd', 'number')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          {btn('Annulla', onClose, '#64748b')}
          <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Salvataggio...' : 'Salva Tariffa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CopiaAnnoModal({ open, onClose, annoDestino, onSuccess }) {
  const [annoOrigine, setAnnoOrigine] = useState(annoDestino - 1);
  const { execute, loading } = useApiAction();

  const copia = async () => {
    await execute(() => tariffeTariAPI.copiaAnno({ annoOrigine, annoDestino, comune: process.env.REACT_APP_COMUNE || 'Comune di Esempio' }), null, 'Errore nella copia');
    onSuccess();
  };

  return (
    <Modal open={open} title="Copia Tariffe da Anno Precedente" onClose={onClose} width={420}>
      <p style={{ color: '#374151', fontSize: '.9rem' }}>Copia tutte le tariffe TARI (domestiche e non) dall'anno selezionato verso il {annoDestino}.</p>
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Anno Origine</label>
        <input type="number" value={annoOrigine} onChange={e => setAnnoOrigine(Number(e.target.value))}
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
        {btn('Annulla', onClose, '#64748b')}
        {btn(loading ? 'Copia...' : 'Copia Tariffe', copia, '#6366f1')}
      </div>
    </Modal>
  );
}
