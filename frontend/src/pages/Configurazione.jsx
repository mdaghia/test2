import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { aliquoteAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import DataTable from '../components/common/DataTable';
import { toast } from 'react-toastify';

const btn = (l, fn, c = '#3b82f6') => (
  <button onClick={fn} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: c, color: '#fff', cursor: 'pointer', fontSize: '.82rem' }}>{l}</button>
);

const TIPI_IMM = [
  { value: 'abitazione_principale', label: 'Abitazione Principale (A2-A7)' },
  { value: 'abitazione_principale_A1_A8_A9', label: 'Abitazione Principale Lusso (A1/A8/A9)' },
  { value: 'pertinenza_abitazione_principale', label: 'Pertinenza Ab. Principale' },
  { value: 'abitazione_secondaria', label: 'Abitazione Secondaria' },
  { value: 'locato', label: 'Immobile Locato' },
  { value: 'comodato', label: 'Comodato Uso Gratuito' },
  { value: 'strumentale_A10_D', label: 'Strumentale A10 / Gruppo D' },
  { value: 'D_eccetto_D5', label: 'Gruppo D (escluso D5)' },
  { value: 'D5', label: 'D5 – Istituti di Credito' },
  { value: 'C1', label: 'C1 – Negozi e Botteghe' },
  { value: 'terreni_agricoli', label: 'Terreni Agricoli' },
  { value: 'aree_fabbricabili', label: 'Aree Fabbricabili' },
  { value: 'altro', label: 'Altro' },
];

export default function Configurazione() {
  const { annoCorrente } = useSelector(s => s.ui);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showCopia, setShowCopia] = useState(false);
  const { execute } = useApiAction();

  const { data: aliquote, loading, refetch } = useApiData(
    aliquoteAPI.list, { anno: annoCorrente }, [annoCorrente]
  );

  const handleSave = async (dati) => {
    if (editItem) {
      await execute(() => aliquoteAPI.update(editItem._id, dati), 'Aliquota aggiornata');
    } else {
      await execute(() => aliquoteAPI.create({ ...dati, anno: annoCorrente }), 'Aliquota creata');
    }
    setShowForm(false); setEditItem(null); refetch();
  };

  const columns = [
    { key: 'tipoImmobile', label: 'Tipo Immobile', render: v => TIPI_IMM.find(t => t.value === v)?.label || v },
    { key: 'aliquota', label: 'Aliquota ‰', render: v => <strong>{v}‰</strong> },
    { key: 'detrazione', label: 'Detrazione €', render: v => v > 0 ? `€ ${v}` : '—' },
    { key: 'riduzionePerc', label: 'Riduzione %', render: v => v > 0 ? `${v}%` : '—' },
    { key: 'esente', label: 'Esente', render: v => v ? <span style={{ color: '#22c55e', fontWeight: 600 }}>Sì</span> : 'No' },
    { key: 'descrizione', label: 'Note' },
    { key: '_id', label: 'Azioni', width: 100, render: (id, row) => (
      <button onClick={() => { setEditItem(row); setShowForm(true); }}
        style={{ padding: '3px 10px', border: 'none', borderRadius: 6, background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: '.75rem' }}>
        Modifica
      </button>
    )},
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
        Configurazione Aliquote IMU – {annoCorrente}
      </h2>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', fontSize: '.85rem', color: '#1e40af' }}>
        ℹ️ Le aliquote IMU sono espresse in <strong>per mille (‰)</strong>. Il limite massimo per legge è <strong>10,6‰</strong>.
        L'aliquota base IMU è deliberata annualmente dal Consiglio Comunale entro il 31 marzo.
      </div>

      <Card title="Aliquote IMU" action={
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {btn('Copia da Anno Prec.', () => setShowCopia(true), '#64748b')}
          {btn('+ Nuova Aliquota', () => { setEditItem(null); setShowForm(true); })}
        </div>
      }>
        <DataTable columns={columns} data={aliquote || []} loading={loading} emptyText="Nessuna aliquota configurata per questo anno" />
      </Card>

      <AliquotaModal
        open={showForm}
        item={editItem}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        onSave={handleSave}
      />

      <CopiaAnnoModal open={showCopia} onClose={() => setShowCopia(false)} annoDestino={annoCorrente}
        onSuccess={() => { setShowCopia(false); refetch(); toast.success('Aliquote copiate'); }} />
    </div>
  );
}

function AliquotaModal({ open, item, onClose, onSave }) {
  const [form, setForm] = useState({ tipoImmobile: '', aliquota: 0, detrazione: 0, riduzionePerc: 0, esente: false, descrizione: '' });
  const { execute, loading } = useApiAction();

  React.useEffect(() => {
    if (item) setForm({ tipoImmobile: item.tipoImmobile, aliquota: item.aliquota, detrazione: item.detrazione || 0, riduzionePerc: item.riduzionePerc || 0, esente: item.esente || false, descrizione: item.descrizione || '' });
    else setForm({ tipoImmobile: '', aliquota: 0, detrazione: 0, riduzionePerc: 0, esente: false, descrizione: '' });
  }, [item, open]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave({ ...form, aliquota: Number(form.aliquota), detrazione: Number(form.detrazione), riduzionePerc: Number(form.riduzionePerc) });
  };

  const inp = (label, key, type = 'text', opts) => (
    <div>
      <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      {type === 'select'
        ? <select value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}>
            <option value="">– seleziona –</option>
            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        : type === 'checkbox'
          ? <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: 4 }}>
              <input type="checkbox" checked={form[key]} onChange={f(key)} /> Sì
            </label>
          : <input type={type} value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
      }
    </div>
  );

  return (
    <Modal open={open} title={item ? 'Modifica Aliquota' : 'Nuova Aliquota'} onClose={onClose} width={560}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
          {inp('Tipo Immobile *', 'tipoImmobile', 'select', TIPI_IMM)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {inp('Aliquota ‰ *', 'aliquota', 'number')}
            {inp('Detrazione € fissa', 'detrazione', 'number')}
            {inp('Riduzione %', 'riduzionePerc', 'number')}
          </div>
          {inp('Esente', 'esente', 'checkbox')}
          {inp('Note/Descrizione', 'descrizione')}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          {btn('Annulla', onClose, '#64748b')}
          <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Salvataggio...' : 'Salva Aliquota'}
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
    await execute(() => aliquoteAPI.copiaAnno({ annoOrigine, annoDestino, comune: process.env.REACT_APP_COMUNE || 'Comune di Esempio' }), null);
    onSuccess();
  };

  return (
    <Modal open={open} title="Copia Aliquote da Anno Precedente" onClose={onClose} width={420}>
      <p style={{ color: '#374151', fontSize: '.9rem' }}>Copia tutte le aliquote dall'anno selezionato verso l'anno {annoDestino}.</p>
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Anno Origine</label>
        <input type="number" value={annoOrigine} onChange={e => setAnnoOrigine(Number(e.target.value))}
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
        {btn('Annulla', onClose, '#64748b')}
        {btn(loading ? 'Copia...' : 'Copia Aliquote', copia, '#6366f1')}
      </div>
    </Modal>
  );
}
