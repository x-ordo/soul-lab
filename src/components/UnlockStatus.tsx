import React from 'react';

export default function UnlockStatus({
  locked,
  reason,
}: {
  locked: boolean;
  reason: string;
}) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row">
        <div className="h2">상태</div>
        <div className="badge" style={{ marginLeft: 8 }}>
          {locked ? '잠김' : '해제됨'}
        </div>
      </div>
      <div className="small" style={{ marginTop: 8 }}>{reason}</div>
    </div>
  );
}
