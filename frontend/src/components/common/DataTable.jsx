import React from 'react';

const th = { padding: '.6rem .75rem', textAlign: 'left', fontSize: '.75rem', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', whiteSpace: 'nowrap' };
const td = { padding: '.55rem .75rem', fontSize: '.82rem', borderBottom: '1px solid #f1f5f9', color: '#374151' };

export default function DataTable({ columns, data = [], loading, onRowClick, emptyText = 'Nessun dato' }) {
  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Caricamento...</div>;
  if (!data.length) return <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>{emptyText}</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{columns.map(c => <th key={c.key} style={{ ...th, width: c.width }}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row._id || i}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : 'default', ':hover': { background: '#f8fafc' } }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {columns.map(c => (
                <td key={c.key} style={td}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
