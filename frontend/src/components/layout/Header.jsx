import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';
import { setAnno } from '../../store/slices/uiSlice';

export default function Header({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { utente } = useSelector(s => s.auth);
  const { annoCorrente } = useSelector(s => s.ui);

  const anni = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <header style={{
      background: '#fff', borderBottom: '1px solid #e2e8f0',
      padding: '.75rem 1.5rem', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: '1rem', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onMenuClick} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>☰</button>
        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '.9rem' }}>
          {process.env.REACT_APP_COMUNE || 'Comune – Gestione Tributi'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ fontSize: '.8rem', color: '#64748b' }}>
          Anno:&nbsp;
          <select value={annoCorrente} onChange={e => dispatch(setAnno(Number(e.target.value)))}
            style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: '.85rem' }}>
            {anni.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>

        {utente && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#3b82f6',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.8rem', fontWeight: 700,
            }}>
              {utente.nome?.[0]}{utente.cognome?.[0]}
            </div>
            <div style={{ fontSize: '.8rem', color: '#374151' }}>
              <div style={{ fontWeight: 600 }}>{utente.nome} {utente.cognome}</div>
              <div style={{ color: '#9ca3af', textTransform: 'capitalize' }}>{utente.ruolo}</div>
            </div>
            <button onClick={() => { dispatch(logout()); navigate('/login'); }}
              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '.8rem', color: '#ef4444' }}>
              Esci
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
