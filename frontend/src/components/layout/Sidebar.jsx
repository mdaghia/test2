import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/',               icon: '📊', label: 'Dashboard' },
  { to: '/contribuenti',   icon: '👤', label: 'Contribuenti' },
  { to: '/immobili',       icon: '🏠', label: 'Immobili' },
  { to: '/dichiarazioni',  icon: '📋', label: 'Dichiarazioni IMU' },
  { to: '/versamenti',     icon: '💰', label: 'Versamenti IMU' },
  { to: '/atti',           icon: '📄', label: 'Atti/Provvedimenti' },
  { to: '/elaborazioni',   icon: '⚙️',  label: 'Elaborazioni Massive' },
  { to: '/configurazione', icon: '🔧', label: 'Aliquote IMU' },
  { sep: 'TARI' },
  { to: '/tari/utenze',        icon: '🗑', label: 'Utenze TARI' },
  { to: '/tari/dichiarazioni', icon: '📋', label: 'Dichiarazioni TARI' },
  { to: '/tari/versamenti',    icon: '💳', label: 'Versamenti TARI' },
  { to: '/tari/configurazione',icon: '⚙️',  label: 'Tariffe TARI' },
  { sep: 'Assistente IA' },
  { to: '/rag/documenti',      icon: '📚', label: 'Knowledge Base' },
];

const style = {
  sidebar: open => ({
    width: open ? 240 : 64,
    background: '#1e293b',
    color: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width .2s ease',
    overflow: 'hidden',
    flexShrink: 0,
  }),
  logo: { padding: '1.2rem 1rem', borderBottom: '1px solid #334155', whiteSpace: 'nowrap', fontWeight: 700, fontSize: '1rem', color: '#38bdf8' },
  nav: { flex: 1, paddingTop: '.5rem' },
  link: (active) => ({
    display: 'flex', alignItems: 'center', gap: '.75rem',
    padding: '.65rem 1rem', textDecoration: 'none', whiteSpace: 'nowrap',
    color: active ? '#38bdf8' : '#cbd5e1',
    background: active ? 'rgba(56,189,248,.1)' : 'transparent',
    borderLeft: active ? '3px solid #38bdf8' : '3px solid transparent',
    transition: 'all .15s',
    fontSize: '.875rem',
  }),
};

export default function Sidebar({ open }) {
  return (
    <aside style={style.sidebar(open)}>
      <div style={style.logo}>
        {open ? '🏛 Tributi Comunali' : '🏛'}
      </div>
      <nav style={style.nav}>
        {NAV.map((n, i) => n.sep !== undefined
          ? open && <div key={`sep-${i}`} style={{ margin: '.5rem 1rem', borderTop: '1px solid #334155', fontSize: '.65rem', color: '#64748b', paddingTop: '.5rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>{n.sep}</div>
          : <NavLink key={n.to} to={n.to} end={n.to === '/'} style={({ isActive }) => style.link(isActive)}>
              <span style={{ fontSize: '1.1rem' }}>{n.icon}</span>
              {open && <span>{n.label}</span>}
            </NavLink>
        )}
      </nav>
      {open && <div style={{ padding: '.75rem 1rem', fontSize: '.7rem', color: '#475569', borderTop: '1px solid #334155' }}>
        Sistema Gestione Tributaria v1.0
      </div>}
    </aside>
  );
}
