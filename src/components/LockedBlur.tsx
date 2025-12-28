import React from 'react';

export default function LockedBlur({
  title,
  subtitle,
  onUnlock,
  children,
}: {
  title: string;
  subtitle: string;
  onUnlock: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="lockWrap">
      <div className="lockContent">{children}</div>
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
