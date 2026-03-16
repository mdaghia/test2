import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../store/slices/authSlice';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(s => s.auth);
  const [form, setForm] = useState({ username: '', password: '' });

  const handleSubmit = async e => {
    e.preventDefault();
    const res = await dispatch(login(form));
    if (res.meta.requestStatus === 'fulfilled') navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem' }}>🏛</div>
          <h1 style={{ margin: '.5rem 0 .25rem', fontSize: '1.3rem', color: '#1e293b' }}>Gestione Tributaria</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '.85rem' }}>IMU / TARI / Atti Tributari</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '.85rem' }}>{error}</div>}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Username</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '.9rem', boxSizing: 'border-box' }}
              placeholder="Inserisci username" autoComplete="username" />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Password</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '.9rem', boxSizing: 'border-box' }}
              placeholder="Inserisci password" autoComplete="current-password" />
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: '.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1 }}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
}
