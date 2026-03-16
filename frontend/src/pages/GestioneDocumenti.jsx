import React, { useState, useRef } from 'react';
import { ragAPI } from '../services/api';
import { useApiData, useApiAction } from '../hooks/useQuery';
import { fmt } from '../utils/formatters';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';

const TIPI = ['delibera', 'regolamento', 'circolare', 'faq', 'altro'];
const TRIBUTI = ['entrambi', 'IMU', 'TARI', 'altro'];

const STATO_COLOR = {
  indicizzato:     '#22c55e',
  in_elaborazione: '#f59e0b',
  errore:          '#ef4444',
};

function badge(stato) {
  return (
    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700,
      background: STATO_COLOR[stato] + '22', color: STATO_COLOR[stato] }}>
      {stato === 'in_elaborazione' ? '⏳ In elaborazione'
        : stato === 'indicizzato' ? '✓ Indicizzato' : '✗ Errore'}
    </span>
  );
}

export default function GestioneDocumenti() {
  const [showUpload, setShowUpload] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [filter, setFilter] = useState({ tipo: '', tributo: '' });
  const { execute } = useApiAction();

  const { data: docs, loading, refetch } = useApiData(
    ragAPI.list, filter, [filter]
  );

  const handleDelete = async () => {
    await execute(() => ragAPI.remove(deleteId), 'Documento rimosso dall\'indice');
    setDeleteId(null);
    refetch();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Gestione Documenti RAG</h2>
          <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#64748b' }}>
            Carica delibere, regolamenti e circolari per arricchire la knowledge base dell'Assistente IA
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} style={{ padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          + Carica Documento
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', fontSize: '.85rem', color: '#0369a1' }}>
        ℹ️ I documenti caricati vengono indicizzati in un database vettoriale (Qdrant) e utilizzati dall'Assistente Tributario per rispondere con contesto normativo specifico del Comune.
        Formati supportati: <strong>PDF, TXT</strong>. Max 25 MB per file.
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[['Tipo', 'tipo', ['', ...TIPI]], ['Tributo', 'tributo', ['', ...TRIBUTI]]].map(([label, key, opts]) => (
            <div key={key}>
              <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
              <select value={filter[key]} onChange={e => setFilter(f => ({ ...f, [key]: e.target.value }))}
                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '.85rem' }}>
                {opts.map(o => <option key={o} value={o}>{o || 'Tutti'}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* Documents table */}
      <Card>
        {loading
          ? <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Caricamento…</p>
          : !docs?.length
            ? <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Nessun documento indicizzato. Carica la prima delibera!</p>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Titolo', 'Tipo', 'Tributo', 'Anno', 'Chunks', 'Caricato da', 'Data', 'Stato', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                        {d.titolo}
                        {d.descrizione && <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: 2 }}>{d.descrizione.slice(0, 80)}{d.descrizione.length > 80 ? '…' : ''}</div>}
                      </td>
                      <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: 12, fontSize: '.75rem' }}>{d.tipo}</span></td>
                      <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', background: d.tributo === 'IMU' ? '#fef3c7' : d.tributo === 'TARI' ? '#d1fae5' : '#ede9fe', borderRadius: 12, fontSize: '.75rem', fontWeight: 600 }}>{d.tributo}</span></td>
                      <td style={{ padding: '10px 12px' }}>{d.anno || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{d.numeroChunks || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{d.caricatoDa?.username || '—'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmt.data(d.createdAt)}</td>
                      <td style={{ padding: '10px 12px' }}>{badge(d.stato)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => setDeleteId(d._id)}
                          style={{ padding: '3px 10px', border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', borderRadius: 6, cursor: 'pointer', fontSize: '.75rem' }}>
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </Card>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); refetch(); }} />

      <Modal open={!!deleteId} title="Rimuovi documento" onClose={() => setDeleteId(null)}>
        <p style={{ color: '#374151' }}>Il documento verrà rimosso dall'indice vettoriale e l'assistente non potrà più usarlo. Confermare?</p>
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button onClick={() => setDeleteId(null)} style={{ padding: '7px 16px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Annulla</button>
          <button onClick={handleDelete} style={{ padding: '7px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Rimuovi</button>
        </div>
      </Modal>
    </div>
  );
}

function UploadModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ titolo: '', tipo: 'delibera', tributo: 'entrambi', anno: '', descrizione: '', tags: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Seleziona un file PDF o TXT'); return; }
    setError(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      await ragAPI.upload(fd);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Errore nel caricamento');
    } finally { setUploading(false); }
  };

  const inp = (label, key, type = 'text') => (
    <div>
      <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={form[key]} onChange={f(key)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <Modal open={open} title="Carica Documento Normativo" onClose={onClose} width={580}>
      <form onSubmit={handleSubmit}>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '.75rem', marginBottom: '1rem', color: '#b91c1c', fontSize: '.85rem' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            {inp('Titolo *', 'titolo')}
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo documento</label>
            <select value={form.tipo} onChange={f('tipo')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}>
              {TIPI.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tributo di riferimento</label>
            <select value={form.tributo} onChange={f('tributo')} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}>
              {TRIBUTI.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {inp('Anno di riferimento', 'anno', 'number')}
          {inp('Tag (separati da virgola)', 'tags')}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Descrizione</label>
            <textarea value={form.descrizione} onChange={f('descrizione')} rows={2}
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>File *</label>
            <div onClick={() => fileRef.current.click()}
              style={{ border: '2px dashed #c7d2fe', borderRadius: 10, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: '#fafafe' }}>
              {file
                ? <span style={{ color: '#6366f1', fontWeight: 600 }}>📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                : <span style={{ color: '#94a3b8' }}>Clicca per selezionare un file PDF o TXT</span>
              }
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0])} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Annulla</button>
          <button type="submit" disabled={uploading} style={{ padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {uploading ? '⏳ Caricamento…' : '⬆ Carica e Indicizza'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
