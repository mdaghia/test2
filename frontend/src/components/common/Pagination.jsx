import React from 'react';

export default function Pagination({ page, pages, total, limit, onChange }) {
  const btn = (label, pg, disabled) => (
    <button key={label} onClick={() => !disabled && onChange(pg)} disabled={disabled}
      style={{ padding: '4px 10px', margin: '0 2px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', background: pg === page ? '#3b82f6' : '#fff', color: pg === page ? '#fff' : '#374151', fontSize: '.8rem' }}>
      {label}
    </button>
  );

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 0', flexWrap: 'wrap', gap: '.5rem' }}>
      <span style={{ fontSize: '.8rem', color: '#64748b' }}>{from}–{to} di {total} elementi</span>
      <div>
        {btn('«', 1, page === 1)}
        {btn('‹', page - 1, page === 1)}
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const p = Math.max(1, Math.min(page - 2 + i, pages - 4 + i));
          return btn(p, p, false);
        })}
        {btn('›', page + 1, page === pages)}
        {btn('»', pages, page === pages)}
      </div>
    </div>
  );
}
