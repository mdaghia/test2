import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { reportAPI, contribuentiAPI } from '../services/api';
import Card from '../components/common/Card';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── Helpers ────────────────────────────────────────────────────────────────
const ANNO_CORRENTE = new Date().getFullYear();
const ANNI = Array.from({ length: 5 }, (_, i) => ANNO_CORRENTE - i);
const fmtEuro = v => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v || 0);
const fmtData = d => d ? new Date(d).toLocaleDateString('it-IT') : '—';

function KpiCard({ label, value, sub, color = '#6366f1' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '1.1rem 1.4rem', boxShadow: '0 1px 6px rgba(0,0,0,.07)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '.72rem', color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function AnnoSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))}
      style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: '.9rem', background: '#fff', cursor: 'pointer' }}>
      {ANNI.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB 1 – CRUSCOTTO
// ────────────────────────────────────────────────────────────────────────────
function TabCruscotto() {
  const [anno, setAnno] = useState(ANNO_CORRENTE);
  const [kpi, setKpi] = useState(null);
  const [mensili, setMensili] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        reportAPI.riepilogo(anno),
        reportAPI.versamentiMensili(anno),
      ]);
      setKpi(r1.data.data);
      setMensili(r2.data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [anno]);

  useEffect(() => { load(); }, [load]);

  const barData = {
    labels: mensili.map(m => m.label),
    datasets: [
      { label: 'IMU',  data: mensili.map(m => m.imu),  backgroundColor: '#6366f1', borderRadius: 6, borderSkipped: false },
      { label: 'TARI', data: mensili.map(m => m.tari), backgroundColor: '#22c55e', borderRadius: 6, borderSkipped: false },
    ],
  };

  const attiEntries = kpi ? Object.entries(kpi.atti || {}) : [];
  const doughnutData = attiEntries.length ? {
    labels: attiEntries.map(([k]) => k.replace(/_/g, ' ')),
    datasets: [{ data: attiEntries.map(([, v]) => v.count), backgroundColor: ['#6366f1','#f59e0b','#ef4444','#22c55e','#06b6d4','#a78bfa','#fb923c'] }],
  } : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h3 style={{ margin: 0, color: '#1e293b' }}>Cruscotto entrate — Anno {anno}</h3>
        <AnnoSelect value={anno} onChange={setAnno} />
      </div>
      {loading ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Caricamento…</p> : kpi && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KpiCard label="Totale entrate" value={fmtEuro(kpi.totaleEntrate)} color="#6366f1" />
            <KpiCard label="Entrate IMU" value={fmtEuro(kpi.imu.entrate)} sub={`${kpi.imu.versamenti} versamenti`} color="#818cf8" />
            <KpiCard label="Entrate TARI" value={fmtEuro(kpi.tari.entrate)} sub={`${kpi.tari.versamenti} versamenti`} color="#22c55e" />
            <KpiCard label="Dichiarazioni IMU" value={kpi.imu.dichiarazioni} color="#f59e0b" />
            <KpiCard label="Dichiarazioni TARI" value={kpi.tari.dichiarazioni} color="#06b6d4" />
            <KpiCard label="Atti emessi" value={Object.values(kpi.atti || {}).reduce((s, v) => s + v.count, 0)} color="#ef4444" />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: doughnutData ? '2fr 1fr' : '1fr', gap: '1.5rem' }}>
            <Card>
              <h4 style={{ margin: '0 0 1rem', color: '#374151' }}>Versamenti mensili {anno}</h4>
              <Bar data={barData} options={{
                responsive: true, plugins: { legend: { position: 'top' } },
                scales: { y: { ticks: { callback: v => '€' + v.toLocaleString('it-IT') } } },
              }} />
            </Card>
            {doughnutData && (
              <Card>
                <h4 style={{ margin: '0 0 1rem', color: '#374151' }}>Atti per tipo</h4>
                <Doughnut data={doughnutData} options={{
                  responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
                }} />
                <div style={{ marginTop: '1rem' }}>
                  {attiEntries.map(([tipo, v]) => (
                    <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#374151' }}>{tipo.replace(/_/g, ' ')}</span>
                      <span style={{ fontWeight: 600 }}>{v.count} · {fmtEuro(v.totale)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB 2 – ESTRATTO CONTO
// ────────────────────────────────────────────────────────────────────────────
function TabEstrattoConto() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [anno, setAnno] = useState('');
  const [dati, setDati] = useState(null);
  const [loading, setLoading] = useState(false);

  const cerca = useCallback(async () => {
    if (query.trim().length < 2) return;
    try {
      const r = await contribuentiAPI.cerca(query);
      setResults(r.data.data || []);
    } catch { /* ignore */ }
  }, [query]);

  useEffect(() => { cerca(); }, [cerca]);

  const loadEstratto = async (c) => {
    setSelected(c);
    setResults([]);
    setLoading(true);
    try {
      const r = await reportAPI.estrattoConto(c._id, anno || null);
      setDati(r.data.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const Section = ({ title, rows, cols }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <h5 style={{ margin: '0 0 .6rem', fontSize: '.85rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.05em' }}>{title}</h5>
      {rows.length === 0
        ? <p style={{ color: '#94a3b8', fontSize: '.82rem' }}>Nessun dato</p>
        : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {cols.map(c => <th key={c.key} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0' }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {cols.map(c => <td key={c.key} style={{ padding: '7px 10px', color: '#1e293b' }}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  );

  return (
    <div>
      <h3 style={{ margin: '0 0 1rem', color: '#1e293b' }}>Estratto Conto Contribuente</h3>
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Cerca contribuente</label>
            <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null); setDati(null); }}
              placeholder="Nome, cognome o codice fiscale…"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
            {results.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
                {results.map(c => (
                  <div key={c._id} onClick={() => { setQuery(c.ragioneSociale || `${c.cognome} ${c.nome}`); loadEstratto(c); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '.85rem', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <strong>{c.ragioneSociale || `${c.cognome} ${c.nome}`}</strong>
                    <span style={{ color: '#64748b', marginLeft: 8 }}>{c.codiceFiscale}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Anno (opzionale)</label>
            <select value={anno} onChange={e => setAnno(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <option value="">Tutti gli anni</option>
              {ANNI.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          {selected && (
            <button onClick={() => loadEstratto(selected)}
              style={{ padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-end' }}>
              Aggiorna
            </button>
          )}
        </div>
      </Card>

      {loading && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Caricamento estratto…</p>}

      {dati && !loading && (
        <div>
          {/* Header contribuente */}
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: 14, padding: '1.2rem 1.5rem', marginBottom: '1.5rem', color: '#fff' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              {dati.contribuente.ragioneSociale || `${dati.contribuente.cognome} ${dati.contribuente.nome}`}
            </div>
            <div style={{ fontSize: '.82rem', opacity: .9, marginTop: 4 }}>
              C.F. {dati.contribuente.codiceFiscale}
              {anno && <span> · Anno {anno}</span>}
            </div>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
              <div><div style={{ fontSize: '.72rem', opacity: .8 }}>Totale versato IMU</div><div style={{ fontWeight: 700 }}>{fmtEuro(dati.imu.totaleVersato)}</div></div>
              <div><div style={{ fontSize: '.72rem', opacity: .8 }}>Totale versato TARI</div><div style={{ fontWeight: 700 }}>{fmtEuro(dati.tari.totaleVersato)}</div></div>
              <div><div style={{ fontSize: '.72rem', opacity: .8 }}>Totale complessivo</div><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fmtEuro(dati.totaleVersato)}</div></div>
            </div>
          </div>

          <Card>
            <Section title="Versamenti IMU" rows={dati.imu.versamenti} cols={[
              { key: 'annoImposta', label: 'Anno' },
              { key: 'dataVersamento', label: 'Data', render: r => fmtData(r.dataVersamento) },
              { key: 'importoDovuto', label: 'Dovuto €', render: r => fmtEuro(r.importoDovuto) },
              { key: 'importoVersato', label: 'Versato €', render: r => fmtEuro(r.importoVersato) },
              { key: 'stato', label: 'Stato', render: r => <StatoBadge stato={r.stato} /> },
            ]} />
            <Section title="Versamenti TARI" rows={dati.tari.versamenti} cols={[
              { key: 'annoImposta', label: 'Anno' },
              { key: 'dataVersamento', label: 'Data', render: r => fmtData(r.dataVersamento) },
              { key: 'importoDovuto', label: 'Dovuto €', render: r => fmtEuro(r.importoDovuto) },
              { key: 'importoVersato', label: 'Versato €', render: r => fmtEuro(r.importoVersato) },
              { key: 'stato', label: 'Stato', render: r => <StatoBadge stato={r.stato} /> },
            ]} />
            <Section title="Atti / Provvedimenti" rows={dati.atti} cols={[
              { key: 'numeroAtto', label: 'N. Atto' },
              { key: 'annoImposta', label: 'Anno' },
              { key: 'tipoAtto', label: 'Tipo', render: r => r.tipoAtto?.replace(/_/g, ' ') },
              { key: 'totaleRichiesto', label: 'Totale €', render: r => fmtEuro(r.totaleRichiesto || r.importoSgravioRimborso) },
              { key: 'dataEmissione', label: 'Emesso', render: r => fmtData(r.dataEmissione) },
              { key: 'stato', label: 'Stato', render: r => <StatoBadge stato={r.stato} /> },
            ]} />
          </Card>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB 3 – LIBRO DEI RUOLI
// ────────────────────────────────────────────────────────────────────────────
const TIPO_ATTO_OPTS = ['', 'avviso_accertamento', 'avviso_liquidazione', 'ingiunzione_pagamento', 'sgravio', 'rimborso', 'comunicazione_irregolarita', 'diniego_rimborso'];
const STATO_ATTO_OPTS = ['', 'bozza', 'emesso', 'notificato', 'pagato', 'in_ricorso', 'sospeso', 'definito', 'annullato'];

function TabLibroRuoli() {
  const [anno, setAnno] = useState(ANNO_CORRENTE);
  const [tipoAtto, setTipoAtto] = useState('');
  const [stato, setStato] = useState('');
  const [page, setPage] = useState(1);
  const [dati, setDati] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await reportAPI.libroRuoli({ anno, tipoAtto: tipoAtto || undefined, stato: stato || undefined, page, limit: 30 });
      setDati(r.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [anno, tipoAtto, stato, page]);

  useEffect(() => { setPage(1); }, [anno, tipoAtto, stato]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h3 style={{ margin: 0 }}>Libro dei Ruoli — Atti e Provvedimenti</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportButton tipo="libro-ruoli" anno={anno} label="⬇ Excel" format="excel" />
          <ExportButton tipo="libro-ruoli" anno={anno} label="⬇ CSV" format="csv" />
        </div>
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Anno</label>
            <AnnoSelect value={anno} onChange={v => setAnno(v)} />
          </div>
          {[['Tipo atto', tipoAtto, setTipoAtto, TIPO_ATTO_OPTS], ['Stato', stato, setStato, STATO_ATTO_OPTS]].map(([label, val, set, opts]) => (
            <div key={label}>
              <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
              <select value={val} onChange={e => set(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '.85rem' }}>
                {opts.map(o => <option key={o} value={o}>{o ? o.replace(/_/g, ' ') : 'Tutti'}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: '.75rem' }}>
          {dati.total} atti trovati · Pagina {page}/{dati.pages}
        </div>
        {loading ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Caricamento…</p> : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['N. Atto','Anno','Tipo','Contribuente','C.F.','Totale €','Emissione','Notifica','Stato'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dati.data.map(a => {
                  const c = a.contribuente || {};
                  return (
                    <tr key={a._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: '#6366f1' }}>{a.numeroAtto}</td>
                      <td style={{ padding: '7px 10px' }}>{a.annoImposta}</td>
                      <td style={{ padding: '7px 10px' }}><span style={{ padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', fontSize: '.75rem' }}>{(a.tipoAtto||'').replace(/_/g,' ')}</span></td>
                      <td style={{ padding: '7px 10px' }}>{c.ragioneSociale || `${c.cognome||''} ${c.nome||''}`.trim()}</td>
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace' }}>{c.codiceFiscale}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 600 }}>{fmtEuro(a.totaleRichiesto || a.importoSgravioRimborso)}</td>
                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{fmtData(a.dataEmissione)}</td>
                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{fmtData(a.dataNotifica)}</td>
                      <td style={{ padding: '7px 10px' }}><StatoBadge stato={a.stato} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {dati.pages > 1 && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: '1rem' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btnStyle}>‹ Prec</button>
                <span style={{ padding: '6px 12px', fontSize: '.85rem' }}>Pag. {page} / {dati.pages}</span>
                <button onClick={() => setPage(p => Math.min(dati.pages, p + 1))} disabled={page === dati.pages} style={btnStyle}>Succ ›</button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB 4 – EXPORT DATI
// ────────────────────────────────────────────────────────────────────────────
const EXPORT_SETS = [
  { tipo: 'versamenti-imu',    label: 'Versamenti IMU',    icon: '🏠', color: '#818cf8' },
  { tipo: 'versamenti-tari',   label: 'Versamenti TARI',   icon: '🗑', color: '#22c55e' },
  { tipo: 'dichiarazioni-imu', label: 'Dichiarazioni IMU', icon: '📄', color: '#f59e0b' },
  { tipo: 'dichiarazioni-tari',label: 'Dichiarazioni TARI',icon: '📋', color: '#06b6d4' },
  { tipo: 'libro-ruoli',       label: 'Libro dei Ruoli',   icon: '⚖️', color: '#ef4444' },
];

function TabExport() {
  const [anno, setAnno] = useState(ANNO_CORRENTE);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h3 style={{ margin: 0 }}>Export Dati</h3>
        <AnnoSelect value={anno} onChange={setAnno} />
      </div>

      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', fontSize: '.85rem', color: '#0369a1' }}>
        ℹ️ I file CSV sono compatibili con Excel (separatore <strong>;</strong>, encoding UTF-8 BOM).
        I file Excel (<strong>.xlsx</strong>) includono formattazione e colori istituzionali.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
        {EXPORT_SETS.map(({ tipo, label, icon, color }) => (
          <Card key={tipo} style={{ borderTop: `4px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{label}</div>
                <div style={{ fontSize: '.75rem', color: '#64748b' }}>Anno {anno}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <ExportButton tipo={tipo} anno={anno} label="⬇ Excel" format="excel" style={{ flex: 1, background: color }} />
              <ExportButton tipo={tipo} anno={anno} label="⬇ CSV" format="csv" style={{ flex: 1 }} />
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: '1.5rem' }}>
        <h4 style={{ margin: '0 0 .75rem', color: '#374151' }}>Export multiplo (tutti gli anni)</h4>
        <p style={{ color: '#64748b', fontSize: '.85rem', margin: '0 0 1rem' }}>
          Esporta tutti i dati disponibili senza filtro per anno (file di grandi dimensioni).
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXPORT_SETS.map(({ tipo, label }) => (
            <ExportButton key={tipo} tipo={tipo} anno={null} label={label} format="excel"
              style={{ fontSize: '.78rem', padding: '6px 12px' }} />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────
function ExportButton({ tipo, anno, label, format, style: extraStyle }) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const r = await reportAPI.export({ tipo, anno: anno || undefined, format });
      const blob = new Blob([r.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}-${anno || 'tutti'}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <button onClick={download} disabled={loading} style={{
      padding: '7px 14px', borderRadius: 8, border: 'none',
      background: format === 'excel' ? '#6366f1' : '#e2e8f0',
      color: format === 'excel' ? '#fff' : '#374151',
      cursor: loading ? 'default' : 'pointer', fontWeight: 600, fontSize: '.82rem',
      ...extraStyle,
    }}>
      {loading ? '⏳' : label}
    </button>
  );
}

const STATO_COLORS = {
  pagato: '#22c55e', emesso: '#3b82f6', notificato: '#6366f1',
  annullato: '#94a3b8', in_ricorso: '#f59e0b', bozza: '#94a3b8',
  definito: '#0ea5e9', sospeso: '#f97316',
};
function StatoBadge({ stato }) {
  const col = STATO_COLORS[stato] || '#94a3b8';
  return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '.72rem', fontWeight: 700, background: col + '22', color: col }}>{stato}</span>;
}

const btnStyle = {
  padding: '6px 14px', background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 8, cursor: 'pointer', fontSize: '.85rem',
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'cruscotto',    label: '📊 Cruscotto',      component: TabCruscotto },
  { id: 'estratto',    label: '👤 Estratto Conto',  component: TabEstrattoConto },
  { id: 'ruoli',       label: '⚖️ Libro dei Ruoli', component: TabLibroRuoli },
  { id: 'export',      label: '⬇ Export Dati',      component: TabExport },
];

export default function Report() {
  const [activeTab, setActiveTab] = useState('cruscotto');
  const ActiveComp = TABS.find(t => t.id === activeTab)?.component || TabCruscotto;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Reportistica</h2>
        <p style={{ margin: 0, fontSize: '.85rem', color: '#64748b' }}>
          Cruscotto entrate, estratti conto, libro dei ruoli, export CSV/Excel
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: '1.5rem', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            border: 'none', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem',
            background: activeTab === t.id ? '#fff' : 'transparent',
            color: activeTab === t.id ? '#6366f1' : '#64748b',
            boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            transition: 'all .15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <ActiveComp />
    </div>
  );
}
