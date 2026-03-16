import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';

const API_BASE = '/api/v1';

function getToken() { return localStorage.getItem('tax_token'); }

// ── Markdown-lite renderer ─────────────────────────────────────────────────
function MdText({ text }) {
  const html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:4px;font-size:.9em">$1</code>')
    .replace(/\n/g, '<br/>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Source chips ───────────────────────────────────────────────────────────
function Fonti({ fonti }) {
  const [open, setOpen] = useState(false);
  if (!fonti?.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '.72rem', padding: 0, textDecoration: 'underline' }}>
        {open ? '▲' : '▼'} {fonti.length} fonte{fonti.length > 1 ? 'i' : ''} normative
      </button>
      {open && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {fonti.map((f, i) => (
            <div key={i} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '6px 10px', fontSize: '.72rem', color: '#0369a1' }}>
              <strong>{f.titolo}</strong> <span style={{ opacity: .7 }}>(score {f.punteggio?.toFixed(2)})</span>
              <div style={{ marginTop: 2, color: '#374151', fontStyle: 'italic' }}>{f.estratto?.slice(0, 200)}…</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────
function Bubble({ msg, streaming }) {
  const isUser = msg.ruolo === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.85rem', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
          🤖
        </div>
      )}
      <div style={{
        maxWidth: '78%', padding: '10px 14px', borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? '#6366f1' : '#fff', color: isUser ? '#fff' : '#1e293b',
        boxShadow: '0 1px 4px rgba(0,0,0,.08)', fontSize: '.85rem', lineHeight: 1.6,
      }}>
        <MdText text={msg.contenuto} />
        {streaming && <span style={{ display: 'inline-block', width: 8, height: 14, background: '#6366f1', marginLeft: 4, borderRadius: 2, animation: 'blink 1s step-end infinite' }} />}
        {!isUser && <Fonti fonti={msg.fonti} />}
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const { annoCorrente } = useSelector(s => s.ui);
  const { token } = useSelector(s => s.auth);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [tributo, setTributo] = useState('entrambi');
  const [streaming, setStreaming] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Focus input when opened
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  // Load sessions list
  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE}/chat/sessioni`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const j = await r.json();
      setSessions(j.data || []);
    } catch { /* ignore */ }
  }, [token]);

  const loadSession = async (sid) => {
    try {
      const r = await fetch(`${API_BASE}/chat/sessioni/${sid}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const j = await r.json();
      setMessages(j.data.messaggi || []);
      setSessionId(sid);
      setShowSessions(false);
    } catch { /* ignore */ }
  };

  const newSession = () => {
    setMessages([]);
    setSessionId(null);
    setShowSessions(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    // Optimistic user bubble
    const userMsg = { ruolo: 'user', contenuto: text, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    // Placeholder for streaming assistant bubble
    const assistantMsg = { ruolo: 'assistant', contenuto: '', ts: new Date().toISOString(), fonti: [] };
    setMessages(prev => [...prev, assistantMsg]);
    setStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/chat/messaggio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ sessionId, contenuto: text, annoContesto: annoCorrente, tributoContesto: tributo }),
      });

      if (!res.ok) throw new Error('Errore server');
      if (!res.body) throw new Error('Streaming non supportato');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // last incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === 'fonti') {
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], fonti: evt.fonti };
                return copy;
              });
            } else if (evt.type === 'token') {
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], contenuto: copy[copy.length - 1].contenuto + evt.text };
                return copy;
              });
              if (!sessionId && evt._sessionId) setSessionId(evt._sessionId);
            } else if (evt.type === 'done') {
              break;
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], contenuto: `⚠️ Errore: ${err.message}` };
        return copy;
      });
    } finally {
      setStreaming(false);
      loadSessions();
    }
  };

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  if (!token) return null;

  return (
    <>
      {/* Blink animation */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} } @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* FAB button */}
      <button onClick={() => { setOpen(o => !o); if (!open) loadSessions(); }}
        title="Assistente Tributario IA"
        style={{
          position: 'fixed', bottom: 28, right: 28, width: 56, height: 56, borderRadius: '50%',
          background: open ? '#ef4444' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,.5)',
          fontSize: '1.4rem', color: '#fff', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }}>
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 28, width: 420, height: 580, zIndex: 999,
          background: '#f8fafc', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'slideUp .2s ease',
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '14px 16px', color: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>🤖 Assistente Tributario</div>
                <div style={{ fontSize: '.72rem', opacity: .85 }}>IMU · TARI · Anno {annoCorrente}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowSessions(o => !o); loadSessions(); }}
                  title="Storico conversazioni"
                  style={{ border: 'none', background: 'rgba(255,255,255,.2)', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '.75rem' }}>
                  📋
                </button>
                <button onClick={newSession} title="Nuova conversazione"
                  style={{ border: 'none', background: 'rgba(255,255,255,.2)', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '.75rem' }}>
                  + Nuova
                </button>
              </div>
            </div>
            {/* Tributo filter */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {['entrambi', 'IMU', 'TARI'].map(t => (
                <button key={t} onClick={() => setTributo(t)}
                  style={{ border: 'none', borderRadius: 20, padding: '3px 12px', cursor: 'pointer', fontSize: '.72rem', fontWeight: tributo === t ? 700 : 400,
                    background: tributo === t ? '#fff' : 'rgba(255,255,255,.2)', color: tributo === t ? '#6366f1' : '#fff' }}>
                  {t === 'entrambi' ? 'IMU + TARI' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions panel */}
          {showSessions && (
            <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', maxHeight: 180, overflowY: 'auto', flexShrink: 0 }}>
              {sessions.length === 0
                ? <p style={{ padding: '1rem', color: '#94a3b8', fontSize: '.82rem', textAlign: 'center' }}>Nessuna conversazione salvata</p>
                : sessions.map(s => (
                  <button key={s._id} onClick={() => loadSession(s._id)}
                    style={{ width: '100%', border: 'none', background: s._id === sessionId ? '#f0f0ff' : 'transparent', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '.82rem' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.titolo}</div>
                    <div style={{ color: '#94a3b8', fontSize: '.72rem' }}>{new Date(s.updatedAt).toLocaleDateString('it-IT')}</div>
                  </button>
                ))
              }
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏛</div>
                <p style={{ fontSize: '.85rem', lineHeight: 1.6 }}>
                  Chiedi informazioni su <strong>IMU</strong> o <strong>TARI</strong>.<br />
                  Rispondo usando le delibere del Comune e la normativa vigente.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
                  {[
                    'Come si calcola la base imponibile IMU?',
                    'Quali sono le aliquote TARI per uso domestico?',
                    'Quando scade la prima rata IMU?',
                  ].map(s => (
                    <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      style={{ border: '1px solid #e2e8f0', borderRadius: 20, padding: '6px 14px', background: '#fff', cursor: 'pointer', fontSize: '.78rem', color: '#6366f1', textAlign: 'left' }}>
                      💬 {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <Bubble key={i} msg={msg} streaming={streaming && i === messages.length - 1 && msg.ruolo === 'assistant'} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', background: '#fff', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Fai una domanda su IMU o TARI…"
                rows={1}
                style={{
                  flex: 1, border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px',
                  resize: 'none', fontSize: '.85rem', fontFamily: 'inherit', lineHeight: 1.4,
                  maxHeight: 100, overflowY: 'auto', outline: 'none',
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />
              <button onClick={sendMessage} disabled={streaming || !input.trim()}
                style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
                  background: streaming || !input.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: streaming || !input.trim() ? '#94a3b8' : '#fff',
                  cursor: streaming || !input.trim() ? 'default' : 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {streaming ? '⏳' : '➤'}
              </button>
            </div>
            <div style={{ fontSize: '.68rem', color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
              Enter per inviare · Shift+Enter per andare a capo
            </div>
          </div>
        </div>
      )}
    </>
  );
}
