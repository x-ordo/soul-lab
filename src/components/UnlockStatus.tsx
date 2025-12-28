import React from 'react';
import { Badge } from '@toss/tds-mobile';

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
        {locked ? (
          <Badge size="small" color="red" variant="weak">잠김</Badge>
        ) : (
          <Badge size="small" color="green" variant="fill">해제됨</Badge>
        )}
      </div>
      <div className="small" style={{ marginTop: 8 }}>{reason}</div>
    </div>
  );
}
