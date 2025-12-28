import React from 'react';

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16, textAlign: 'center' }}>
      <div className="h1 mystical-title" style={{ fontSize: 26 }}>{title}</div>
      {subtitle ? <p className="p" style={{ marginTop: 6 }}>{subtitle}</p> : null}
    </div>
  );
}
