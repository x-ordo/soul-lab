import React from 'react';

const MASKED_PLACEHOLDER = '●●●●●●●●●●●●●●●●●●●●';

export default function LockedBlur({
  title,
  subtitle,
  onUnlock,
  sections,
}: {
  title: string;
  subtitle: string;
  onUnlock: () => void;
  sections: { label: string }[];
}) {
  return (
    <div className="lockWrap">
      <div className="lockContent">
        <div className="card">
          {sections.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <hr className="hr" />}
              <div className="h2">{s.label}</div>
              <p className="p" style={{ marginTop: 8 }}>{MASKED_PLACEHOLDER}</p>
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="lockOverlay">
        <div style={{ width: '100%' }}>
          <div className="lockTitle">{title}</div>
          <div className="small" style={{ marginBottom: 12 }}>
            {subtitle}
          </div>
          <button className="btn btnPrimary" onClick={onUnlock}>
            광고 보고 상세 풀이 무료 확인
          </button>
        </div>
      </div>
    </div>
  );
}
