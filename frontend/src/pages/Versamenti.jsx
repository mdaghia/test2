import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { versamentiAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import { fmt, STATI_VERSAMENTO } from '../utils/formatters';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import Card from '../components/common/Card';
import { toast } from 'react-toastify';

const LIMIT = 20;

function btn(label, onClick, color = '#3b82f6', small = false) {
  return <button onClick={onClick} style={{ padding: small ? '3px 8px' : '6px 14px', border: 'none', borderRadius: 6, background: color, color: '#fff', cursor: 'pointer', fontSize: small ? '.75rem' : '.82rem' }}>{label}</button>;
}

const TIPI_RATA = { acconto: 'Acconto', saldo: 'Saldo', unica_soluzione: 'Unica Soluzione', accertamento: 'Accertamento', ravvedimento: 'Ravvedimento' };
const MODALITA = ['F24', 'bollettino_postale', 'PagoPA', 'bonifico', 'contanti', 'altro'];

export default function Versamenti() {
  const { annoCorrente } = useSelector(s => s.ui);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ stato: '', tipoRata: '' });
  const [showForm, setShowForm] = useState(false);
  const [showRavvedimento, setShowRavvedimento] = useState(false);
  const [annullaId, setAnnullaId] = useState(null);
  const [motivazione, setMotivazione] = useState('');
  const { execute } = useApiAction();

  const { data: versamenti, total, loading, refetch } = useApiData(
    versamentiAPI.list,
    { page, limit: LIMIT, annoImposta: annoCorrente, ...filters },
    [page, annoCorrente, filters]
  );

  const handleAnnulla = async () => {
    await execute(() => versamentiAPI.annulla(annullaId, { motivazione }), 'Versamento annullato');
    setAnnullaId(null); setMotivazione(''); refetch();
  };

  const columns = [
    { key: 'numeroVersamento', label: 'N° Versamento', width: 160 },
    { key: 'contribuente', label: 'Contribuente', render: c => c ? `${c.cognome || ''} ${c.nome || c.ragioneSociale || ''}`.trim() : '—' },
    { key: 'tipoRata', label: 'Tipo Rata', render: v => TIPI_RATA[v] || v },
    { key: 'importoDovuto', label: 'Dovuto', render: v => fmt.euro(v) },
    { key: 'importoVersato', label: 'Versato', render: v => fmt.euro(v) },
    { key: 'differenza', label: 'Diff.', render: (v) => <span style={{ color: v > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{fmt.euro(v)}</span> },
    { key: 'dataVersamento', label: 'Data', render: v => fmt.data(v) },
    { key: 'modalitaPagamento', label: 'Modalità' },
    { key: 'stato', label: 'Stato', render: v => { const s = STATI_VERSAMENTO[v]; return s ? <StatusBadge label={s.label} color={s.color} /> : v; } },
    { key: '_id', label: 'Azioni', width: 80, render: (id, row) => row.stato !== 'annullato' && btn('Annulla', () => setAnnullaId(id), '#ef4444', true) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Versamenti IMU – {annoCorrente}</h2>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {btn('Calcola Ravvedimento', () => setShowRavvedimento(true), '#f59e0b')}
          {btn('+ Registra Versamento', () => setShowForm(true))}
        </div>
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[['Stato', 'stato', ['', ...Object.keys(STATI_VERSAMENTO)], Object.fromEntries(Object.entries(STATI_VERSAMENTO).map(([k, v]) => [k, v.label]))],
            ['Tipo Rata', 'tipoRata', ['', ...Object.keys(TIPI_RATA)], { '': 'Tutti', ...TIPI_RATA }]
          ].map(([label, field, opts, map]) => (
            <div key={field}>
              <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
              <select value={filters[field]} onChange={e => { setFilters(f => ({ ...f, [field]: e.target.value })); setPage(1); }}
                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '.85rem' }}>
                {opts.map(o => <option key={o} value={o}>{map[o] || 'Tutti'}</option>)}
              </select>
            </div>
          ))}
          {btn('Aggiorna', refetch, '#64748b')}
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={versamenti || []} loading={loading} />
        {total > LIMIT && <Pagination page={page} pages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onChange={setPage} />}
      </Card>

      <NuovoVersamentoModal open={showForm} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refetch(); }} annoImposta={annoCorrente} />
      <RavvedimentoModal open={showRavvedimento} onClose={() => setShowRavvedimento(false)} />

      <Modal open={!!annullaId} title="Annulla Versamento" onClose={() => setAnnullaId(null)}>
        <p style={{ color: '#374151', fontSize: '.9rem' }}>Motivazione dell'annullamento (operazione reversibile solo con nuovo inserimento).</p>
        <textarea value={motivazione} onChange={e => setMotivazione(e.target.value)} rows={3}
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          {btn('Indietro', () => setAnnullaId(null), '#64748b')}
          {btn('Conferma Annullamento', handleAnnulla, '#ef4444')}
        </div>
      </Modal>
    </div>
  );
}

function NuovoVersamentoModal({ open, onClose, onSuccess, annoImposta }) {
  const [form, setForm] = useState({ annoImposta, tipoRata: 'saldo', importoDovuto: '', importoVersato: '', dataVersamento: new Date().toISOString().slice(0, 10), modalitaPagamento: 'F24', scadenza: '' });
  const { execute, loading } = useApiAction();
  const f = (k) => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await execute(() => versamentiAPI.create(form), 'Versamento registrato');
    onSuccess();
  };

  const inp = (label, key, type = 'text', opts) => (
    <div>
      <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      {type === 'select'
        ? <select value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
      }
    </div>
  );

  return (
    <Modal open={open} title="Registra Versamento IMU" onClose={onClose} width={600}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {inp('Anno Imposta *', 'annoImposta', 'number')}
          {inp('Tipo Rata *', 'tipoRata', 'select', Object.keys(TIPI_RATA))}
          {inp('Importo Dovuto € *', 'importoDovuto', 'number')}
          {inp('Importo Versato € *', 'importoVersato', 'number')}
          {inp('Data Versamento *', 'dataVersamento', 'date')}
          {inp('Scadenza', 'scadenza', 'date')}
          {inp('Modalità Pagamento *', 'modalitaPagamento', 'select', MODALITA)}
          {inp('Codice Tributo F24', 'codiceTributo')}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          {btn('Annulla', onClose, '#64748b')}
          <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Salvataggio...' : 'Registra Versamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RavvedimentoModal({ open, onClose }) {
  const [form, setForm] = useState({ importo: '', dataScadenza: '', dataPagamento: new Date().toISOString().slice(0, 10) });
  const [risultato, setRisultato] = useState(null);
  const { execute, loading } = useApiAction();
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const calcola = async (e) => {
    e.preventDefault();
    const res = await execute(() => versamentiAPI.calcolaRavvedimento(form), null, 'Errore calcolo');
    if (res) setRisultato(res.data);
  };

  return (
    <Modal open={open} title="Calcolo Ravvedimento Operoso" onClose={onClose} width={520}>
      <form onSubmit={calcola}>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
          {[['Importo Non Versato €', 'importo', 'number'], ['Data Scadenza Originale', 'dataScadenza', 'date'], ['Data Pagamento', 'dataPagamento', 'date']].map(([l, k, t]) => (
            <div key={k}>
              <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{l}</label>
              <input type={t} value={form[k]} onChange={f(k)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, marginBottom: '1rem' }}>
          {loading ? 'Calcolo...' : 'Calcola Ravvedimento'}
        </button>
      </form>
      {risultato && (
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 .75rem', fontSize: '.9rem' }}>Risultato Ravvedimento Operoso</h4>
          {[['Giorni di ritardo', risultato.giorniRitardo], ['Importo originale', fmt.euro(risultato.importoOriginale)], ['Sanzioni', fmt.euro(risultato.sanzione)], ['Interessi', fmt.euro(risultato.interessi)]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '.3rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '.85rem' }}>
              <span>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>
            <span>TOTALE DA VERSARE</span><span>{fmt.euro(risultato.totale)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
