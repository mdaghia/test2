import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { versamenti_tariAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import { fmt, STATI_VERSAMENTO, downloadBlob } from '../utils/formatters';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import Card from '../components/common/Card';

const LIMIT = 20;

function btn(label, onClick, color = '#3b82f6', small = false) {
  return <button onClick={onClick} style={{ padding: small ? '3px 8px' : '6px 14px', border: 'none', borderRadius: 6, background: color, color: '#fff', cursor: 'pointer', fontSize: small ? '.75rem' : '.82rem' }}>{label}</button>;
}

const TIPI_RATA = {
  prima_rata:      'Prima Rata (40%)',
  seconda_rata:    'Seconda Rata (30%)',
  saldo:           'Saldo (30%)',
  unica_soluzione: 'Unica Soluzione',
  accertamento:    'Accertamento',
};

const CODICI_TRIBUTO = ['3944', '3945', '3946'];
const MODALITA = ['F24', 'bollettino_postale', 'PagoPA', 'bonifico', 'contanti', 'altro'];

export default function VersamentiTARI() {
  const { annoCorrente } = useSelector(s => s.ui);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ stato: '', tipoRata: '' });
  const [showForm, setShowForm] = useState(false);
  const [annullaId, setAnnullaId] = useState(null);
  const [motivazione, setMotivazione] = useState('');
  const [estrattoContrib, setEstrattoContrib] = useState(null);
  const [showEstratto, setShowEstratto] = useState(false);
  const { execute } = useApiAction();

  const { data: versamenti, total, loading, refetch } = useApiData(
    versamenti_tariAPI.list,
    { page, limit: LIMIT, annoImposta: annoCorrente, ...filters },
    [page, annoCorrente, filters]
  );

  const handleAnnulla = async () => {
    await execute(() => versamenti_tariAPI.annulla(annullaId, { motivazione }), 'Versamento TARI annullato');
    setAnnullaId(null); setMotivazione(''); refetch();
  };

  const columns = [
    { key: 'numeroVersamento', label: 'N° Versamento', width: 180 },
    { key: 'contribuente', label: 'Contribuente', render: c => c ? `${c.cognome || ''} ${c.nome || c.ragioneSociale || ''}`.trim() : '—' },
    { key: 'tipoRata', label: 'Tipo Rata', render: v => TIPI_RATA[v] || v },
    { key: 'codiceTributo', label: 'Cod. Tributo', width: 100 },
    { key: 'importoDovuto', label: 'Dovuto', render: v => fmt.euro(v) },
    { key: 'importoVersato', label: 'Versato', render: v => fmt.euro(v) },
    { key: 'differenza', label: 'Diff.', render: v => <span style={{ color: v > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{fmt.euro(v)}</span> },
    { key: 'dataVersamento', label: 'Data', render: v => fmt.data(v) },
    { key: 'modalitaPagamento', label: 'Modalità' },
    { key: 'stato', label: 'Stato', render: v => { const s = STATI_VERSAMENTO[v]; return s ? <StatusBadge label={s.label} color={s.color} /> : v; } },
    { key: '_id', label: 'Azioni', width: 80, render: (id, row) => row.stato !== 'annullato' && btn('Annulla', () => setAnnullaId(id), '#ef4444', true) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Versamenti TARI – {annoCorrente}</h2>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {btn('Estratto Contribuente', () => setShowEstratto(true), '#6366f1')}
          {btn('+ Registra Versamento', () => setShowForm(true))}
        </div>
      </div>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', fontSize: '.85rem', color: '#1e40af' }}>
        ℹ️ Codici F24: <strong>3944</strong> tributo TARI, <strong>3945</strong> interessi, <strong>3946</strong> sanzioni.
        Rate: <strong>Prima 30/04</strong> (40%), <strong>Seconda 30/06</strong> (30%), <strong>Saldo 30/11</strong> (30%).
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            ['Stato', 'stato', ['', ...Object.keys(STATI_VERSAMENTO)], Object.fromEntries(Object.entries(STATI_VERSAMENTO).map(([k, v]) => [k, v.label]))],
            ['Tipo Rata', 'tipoRata', ['', ...Object.keys(TIPI_RATA)], { '': 'Tutti', ...TIPI_RATA }],
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

      <NuovoVersamentoTARIModal open={showForm} onClose={() => setShowForm(false)}
        onSuccess={() => { setShowForm(false); refetch(); }} annoImposta={annoCorrente} />

      <EstrattoModal open={showEstratto} onClose={() => setShowEstratto(false)} annoImposta={annoCorrente} />

      <Modal open={!!annullaId} title="Annulla Versamento TARI" onClose={() => setAnnullaId(null)}>
        <p style={{ color: '#374151', fontSize: '.9rem' }}>Inserire la motivazione dell'annullamento.</p>
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

function NuovoVersamentoTARIModal({ open, onClose, onSuccess, annoImposta }) {
  const [form, setForm] = useState({
    annoImposta,
    tipoRata: 'prima_rata',
    importoDovuto: '',
    importoVersato: '',
    dataVersamento: new Date().toISOString().slice(0, 10),
    scadenza: '',
    modalitaPagamento: 'F24',
    codiceTributo: '3944',
    note: '',
  });
  const { execute, loading } = useApiAction();
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await execute(() => versamenti_tariAPI.create({
      ...form,
      importoDovuto: Number(form.importoDovuto),
      importoVersato: Number(form.importoVersato),
    }), 'Versamento TARI registrato');
    onSuccess();
  };

  const inp = (label, key, type = 'text', opts) => (
    <div>
      <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      {type === 'select'
        ? <select value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}>
            {opts.map(o => <option key={o} value={o}>{typeof o === 'string' ? o : o}</option>)}
          </select>
        : <input type={type} value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
      }
    </div>
  );

  const tipiRataOpts = Object.entries(TIPI_RATA).map(([v, l]) => ({ value: v, label: l }));

  return (
    <Modal open={open} title="Registra Versamento TARI" onClose={onClose} width={620}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Anno Imposta *</label>
            <input type="number" value={form.annoImposta} onChange={f('annoImposta')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Rata *</label>
            <select value={form.tipoRata} onChange={f('tipoRata')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}>
              {tipiRataOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {inp('Importo Dovuto € *', 'importoDovuto', 'number')}
          {inp('Importo Versato € *', 'importoVersato', 'number')}
          {inp('Data Versamento *', 'dataVersamento', 'date')}
          {inp('Scadenza', 'scadenza', 'date')}
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Modalità Pagamento *</label>
            <select value={form.modalitaPagamento} onChange={f('modalitaPagamento')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}>
              {MODALITA.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Codice Tributo F24</label>
            <select value={form.codiceTributo} onChange={f('codiceTributo')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}>
              <option value="">— nessuno —</option>
              <option value="3944">3944 – Tributo TARI</option>
              <option value="3945">3945 – Interessi TARI</option>
              <option value="3946">3946 – Sanzioni TARI</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Note</label>
          <textarea value={form.note} onChange={f('note')} rows={2}
            style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Annulla</button>
          <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Salvataggio...' : 'Registra Versamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EstrattoModal({ open, onClose, annoImposta }) {
  const [cf, setCf] = useState('');
  const [data, setData] = useState(null);
  const { execute, loading } = useApiAction();

  const cerca = async (e) => {
    e.preventDefault();
    const res = await execute(() => versamenti_tariAPI.estratto({ cf, annoImposta }), null, 'CF non trovato');
    if (res) setData(res.data);
  };

  const totDovuto = data?.reduce((s, r) => s + (r.importoDovuto || 0), 0) || 0;
  const totVersato = data?.reduce((s, r) => s + (r.importoVersato || 0), 0) || 0;

  return (
    <Modal open={open} title="Estratto Versamenti TARI per Contribuente" onClose={() => { onClose(); setData(null); setCf(''); }} width={620}>
      <form onSubmit={cerca} style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Codice Fiscale / P.IVA</label>
          <input value={cf} onChange={e => setCf(e.target.value.toUpperCase())} placeholder="RSSMRA70A01H501Z"
            style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          {loading ? '...' : 'Cerca'}
        </button>
      </form>

      {data && (
        <>
          {data.length === 0
            ? <p style={{ color: '#64748b', textAlign: 'center' }}>Nessun versamento trovato per questo contribuente nell'anno {annoImposta}.</p>
            : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {['N° Versamento', 'Tipo Rata', 'Dovuto', 'Versato', 'Data', 'Stato'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(v => (
                      <tr key={v._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px' }}>{v.numeroVersamento}</td>
                        <td style={{ padding: '6px 10px' }}>{TIPI_RATA[v.tipoRata] || v.tipoRata}</td>
                        <td style={{ padding: '6px 10px' }}>{fmt.euro(v.importoDovuto)}</td>
                        <td style={{ padding: '6px 10px' }}>{fmt.euro(v.importoVersato)}</td>
                        <td style={{ padding: '6px 10px' }}>{fmt.data(v.dataVersamento)}</td>
                        <td style={{ padding: '6px 10px' }}>{v.stato}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', marginTop: '1rem', padding: '.75rem', background: '#f8fafc', borderRadius: 8, fontSize: '.9rem' }}>
                  <span>Totale Dovuto: <strong>{fmt.euro(totDovuto)}</strong></span>
                  <span>Totale Versato: <strong style={{ color: totVersato >= totDovuto ? '#22c55e' : '#ef4444' }}>{fmt.euro(totVersato)}</strong></span>
                  <span>Saldo: <strong style={{ color: totDovuto - totVersato > 0 ? '#ef4444' : '#22c55e' }}>{fmt.euro(totDovuto - totVersato)}</strong></span>
                </div>
              </>
            )
          }
        </>
      )}
    </Modal>
  );
}
