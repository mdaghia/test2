import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { dichiarazioniTariAPI, contribuentiAPI, utenzeTariAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import { fmt, STATI_DICHIARAZIONE, downloadBlob } from '../utils/formatters';
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

export default function DichiarazioniTARI() {
  const { annoCorrente } = useSelector(s => s.ui);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ stato: '' });
  const [showForm, setShowForm] = useState(false);
  const [showAnnulla, setShowAnnulla] = useState(null);
  const [motivazione, setMotivazione] = useState('');
  const [dettaglio, setDettaglio] = useState(null);
  const { execute } = useApiAction();

  const { data, total, loading, refetch } = useApiData(
    dichiarazioniTariAPI.list,
    { page, limit: LIMIT, anno: annoCorrente, ...filters },
    [page, annoCorrente, filters]
  );

  const handleCalcola = async (id) => {
    await execute(() => dichiarazioniTariAPI.calcola(id, {}), 'Calcolo TARI completato');
    refetch();
    if (dettaglio?._id === id) {
      const res = await dichiarazioniTariAPI.getOne(id);
      setDettaglio(res.data.data);
    }
  };

  const handleStampa = async (id, numero) => {
    try {
      const res = await dichiarazioniTariAPI.stampa(id);
      downloadBlob(res.data, `tari_${numero}.pdf`);
    } catch { toast.error('Errore stampa'); }
  };

  const handleAnnulla = async () => {
    await execute(() => dichiarazioniTariAPI.annulla(showAnnulla, { motivazione }), 'Dichiarazione TARI annullata');
    setShowAnnulla(null); setMotivazione(''); refetch();
  };

  const handleCambiaStato = async (id, stato) => {
    await execute(() => dichiarazioniTariAPI.cambiaStato(id, { stato }), `Stato aggiornato: ${stato}`);
    refetch();
  };

  const columns = [
    { key: 'numeroDichiarazione', label: 'N° Dichiarazione', width: 160 },
    { key: 'contribuente', label: 'Contribuente', render: c => c ? `${c.cognome || ''} ${c.nome || c.ragioneSociale || ''}`.trim() : '—' },
    { key: 'tipoDichiarazione', label: 'Tipo', render: v => v?.replace('_', ' ') || '—' },
    { key: 'totaleAnno', label: 'Totale Annuo', render: v => <strong>{fmt.euro(v)}</strong> },
    { key: 'importoPrimaRata', label: '1ª Rata (30/04)', render: v => fmt.euro(v) },
    { key: 'importoSaldo', label: 'Saldo (30/11)', render: v => fmt.euro(v) },
    { key: 'stato', label: 'Stato', render: v => { const s = STATI_DICHIARAZIONE[v]; return s ? <StatusBadge label={s.label} color={s.color} /> : v; } },
    { key: '_id', label: 'Azioni', width: 240, render: (id, row) => (
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {btn('Dettaglio', () => dichiarazioniTariAPI.getOne(id).then(r => setDettaglio(r.data.data)), '#6366f1', true)}
        {row.stato !== 'annullata' && btn('Calcola', () => handleCalcola(id), '#f59e0b', true)}
        {btn('PDF', () => handleStampa(id, row.numeroDichiarazione), '#14b8a6', true)}
        {row.stato === 'presentata' && btn('Lavorazione', () => handleCambiaStato(id, 'in_lavorazione'), '#3b82f6', true)}
        {row.stato === 'in_lavorazione' && btn('Definisci', () => handleCambiaStato(id, 'definita'), '#22c55e', true)}
        {!['annullata', 'definita'].includes(row.stato) && btn('Annulla', () => setShowAnnulla(id), '#ef4444', true)}
      </div>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Dichiarazioni TARI – {annoCorrente}</h2>
        {btn('+ Nuova Dichiarazione TARI', () => setShowForm(true))}
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Stato</label>
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
        <DataTable columns={columns} data={data || []} loading={loading} />
        {total > LIMIT && <Pagination page={page} pages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onChange={setPage} />}
      </Card>

      <NuovaDichTARIModal open={showForm} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refetch(); }} annoCorrente={annoCorrente} />

      <Modal open={!!showAnnulla} title="Annulla Dichiarazione TARI" onClose={() => setShowAnnulla(null)}>
        <textarea value={motivazione} onChange={e => setMotivazione(e.target.value)} rows={3} placeholder="Motivazione..."
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box', marginBottom: '1rem' }} />
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
          {btn('Indietro', () => setShowAnnulla(null), '#64748b')}
          {btn('Conferma Annullamento', handleAnnulla, '#ef4444')}
        </div>
      </Modal>

      {/* Dettaglio dichiarazione */}
      {dettaglio && (
        <Modal open={!!dettaglio} title={`Dettaglio – ${dettaglio.numeroDichiarazione}`} onClose={() => setDettaglio(null)} width={780}>
          <DettaglioTARI d={dettaglio} onCalcola={() => handleCalcola(dettaglio._id)} />
        </Modal>
      )}
    </div>
  );
}

function NuovaDichTARIModal({ open, onClose, onSuccess, annoCorrente }) {
  const [form, setForm] = useState({ anno: annoCorrente, tipoDichiarazione: 'originale', contribuente: '', righe: [] });
  const [cfSearch, setCfSearch] = useState('');
  const [contribuente, setContribuente] = useState(null);
  const [utenze, setUtenze] = useState([]);
  const { execute, loading } = useApiAction();

  const cercaContribuente = useCallback(async () => {
    if (!cfSearch) return;
    try {
      const res = await contribuentiAPI.cerca({ cf: cfSearch });
      if (res.data.data.length > 0) {
        const c = res.data.data[0];
        setContribuente(c);
        setForm(p => ({ ...p, contribuente: c._id }));
        // Carica utenze del contribuente
        const uRes = await utenzeTariAPI.perContribuente({ contribuenteId: c._id, anno: annoCorrente });
        setUtenze(uRes.data.data || []);
      } else toast.warn('Contribuente non trovato');
    } catch { toast.error('Errore ricerca'); }
  }, [cfSearch, annoCorrente]);

  const toggleUtenza = (utenzaId) => {
    setForm(p => {
      const exists = p.righe.some(r => r.utenza === utenzaId);
      return {
        ...p,
        righe: exists
          ? p.righe.filter(r => r.utenza !== utenzaId)
          : [...p.righe, { utenza: utenzaId }],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await execute(() => dichiarazioniTariAPI.create(form), 'Dichiarazione TARI creata');
    onSuccess();
  };

  return (
    <Modal open={open} title="Nuova Dichiarazione TARI" onClose={onClose} width={700}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Anno *</label>
            <input type="number" value={form.anno} onChange={e => setForm(p => ({ ...p, anno: Number(e.target.value) }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo *</label>
            <select value={form.tipoDichiarazione} onChange={e => setForm(p => ({ ...p, tipoDichiarazione: e.target.value }))}
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
            <input value={cfSearch} onChange={e => setCfSearch(e.target.value.toUpperCase())} placeholder="Codice Fiscale"
              style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }} />
            {btn('Cerca', cercaContribuente)}
          </div>
          {contribuente && <div style={{ marginTop: '.5rem', padding: '.5rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: '.85rem' }}>
            ✅ {contribuente.cognome} {contribuente.nome} – {contribuente.codiceFiscale}
          </div>}
        </div>

        {utenze.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Utenze TARI del Contribuente ({utenze.length}) – seleziona quelle da includere:
            </label>
            {utenze.map(u => (
              <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.4rem', background: '#f8fafc', borderRadius: 6, marginBottom: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.righe.some(r => r.utenza === u._id)} onChange={() => toggleUtenza(u._id)} />
                <span style={{ fontSize: '.85rem' }}>
                  {u.tipo === 'domestica' ? '🏠' : '🏢'} {u.numeroUtenza} – {u.indirizzo}, {u.comune} – {u.superficie}mq – Cat.{u.categoriaTARI}
                </span>
              </label>
            ))}
            {utenze.length > 0 && form.righe.length === 0 && (
              <p style={{ color: '#f59e0b', fontSize: '.8rem', margin: '.25rem 0 0' }}>⚠️ Seleziona almeno una utenza</p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          {btn('Annulla', onClose, '#64748b')}
          <button type="submit" disabled={loading || !contribuente || form.righe.length === 0}
            style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: (!contribuente || form.righe.length === 0) ? .6 : 1 }}>
            {loading ? 'Creazione...' : 'Crea Dichiarazione TARI'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DettaglioTARI({ d, onCalcola }) {
  const righe = d.righe || [];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <p style={{ margin: 0, fontSize: '.85rem', color: '#374151' }}><strong>Contribuente:</strong> {d.contribuente?.cognome} {d.contribuente?.nome}</p>
          <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#374151' }}><strong>C.F.:</strong> {d.contribuente?.codiceFiscale}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '.85rem', color: '#374151' }}><strong>Tipo:</strong> {d.tipoDichiarazione}</p>
          <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#374151' }}><strong>Presentata:</strong> {fmt.data(d.dataPresentazione)}</p>
        </div>
      </div>

      <h4 style={{ margin: '0 0 .5rem', fontSize: '.9rem' }}>Utenze</h4>
      {righe.length === 0
        ? <p style={{ color: '#94a3b8', fontSize: '.85rem' }}>Nessuna utenza. Clicca "Calcola" per elaborare.</p>
        : righe.map((r, i) => (
          <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '.75rem', marginBottom: '.5rem', fontSize: '.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{r.tipo === 'domestica' ? '🏠' : '🏢'} {r.utenza?.indirizzo || '—'} – Cat. {r.categoriaTARI}</strong>
              <strong style={{ color: '#1e293b' }}>{fmt.euro(r.importoCalcolato)}</strong>
            </div>
            <div style={{ color: '#64748b', marginTop: 4 }}>
              Q.Fissa: {fmt.euro(r.quotaFissa)} | Q.Variabile: {fmt.euro(r.quotaVariabile)} | Mesi: {r.mesiOccupazione}
              {r.riduzioniApplicate?.length > 0 && <span> | Riduzioni: -{fmt.euro(r.totaleRiduzioni)}</span>}
            </div>
          </div>
        ))
      }

      {d.totaleAnno > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 10, padding: '1rem', marginTop: '1rem', color: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
            <strong>TOTALE ANNUO</strong>
            <strong style={{ fontSize: '1.1rem' }}>{fmt.euro(d.totaleAnno)}</strong>
          </div>
          {[
            [`1ª Rata 40% – scad. ${fmt.data(d.scadenzaPrimaRata)}`, d.importoPrimaRata],
            [`2ª Rata 30% – scad. ${fmt.data(d.scadenzaSecondaRata)}`, d.importoSecondaRata],
            [`Saldo – scad. ${fmt.data(d.scadenzaSaldo)}`, d.importoSaldo],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', opacity: .85 }}>
              <span>{l}</span><span>{fmt.euro(v)}</span>
            </div>
          ))}
        </div>
      )}

      {btn('🧮 Ricalcola Importi', onCalcola, '#f59e0b')}
    </div>
  );
}
