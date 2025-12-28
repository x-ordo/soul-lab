import React, { useEffect, useMemo, useState } from 'react';

export default function BadgeStepper({ steps, intervalMs = 900 }: { steps: string[]; intervalMs?: number }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((x) => (x + 1) % steps.length), intervalMs);
    return () => clearInterval(t);
  }, [steps.length, intervalMs]);

  const text = useMemo(() => steps[idx] ?? steps[0], [idx, steps]);

  return (
    <div className="badge" aria-live="polite">
      <span style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(59,130,246,0.9)' }} />
      <span>{text}</span>
    </div>
  );
}
