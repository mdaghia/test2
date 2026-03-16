import React from 'react';

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: '.875rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export function FormField({ label, error, children, required, style: s }) {
  return (
    <div style={{ marginBottom: '1rem', ...s }}>
      {label && <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>}
      {children}
      {error && <span style={{ fontSize: '.75rem', color: '#ef4444', marginTop: 2, display: 'block' }}>{error}</span>}
    </div>
  );
}

export function Input({ register, name, ...rest }) {
  return <input {...(register ? register(name) : {})} {...rest} style={inputStyle} />;
}

export function Select({ register, name, options = [], placeholder, ...rest }) {
  return (
    <select {...(register ? register(name) : {})} {...rest} style={inputStyle}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Textarea({ register, name, rows = 3, ...rest }) {
  return <textarea {...(register ? register(name) : {})} rows={rows} {...rest} style={{ ...inputStyle, resize: 'vertical' }} />;
}
