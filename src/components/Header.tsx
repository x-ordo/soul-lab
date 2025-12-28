import React from 'react';

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="h1">{title}</div>
      {subtitle ? <p className="p">{subtitle}</p> : null}
    </div>
  );
}
