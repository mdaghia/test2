import React from 'react';

export default function StatusBadge({ label, color = '#94a3b8' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontSize: '.75rem', fontWeight: 600, color: '#fff',
      background: color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
