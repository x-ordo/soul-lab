import React from 'react';
import { Button } from '@toss/tds-mobile';

interface PartialChemistryCardProps {
  score: number;
  label: string;
  mode: 'needResponse' | 'selfInvite';
  onAction: () => void;
}

const BLUR_PLACEHOLDER = '✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦';

export default function PartialChemistryCard({
  score,
  label,
  mode,
  onAction,
}: PartialChemistryCardProps) {
  const isNeedResponse = mode === 'needResponse';

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Score + Label Card */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <div className="h2 glow-text">인연의 기운</div>
          <div className="score-display">{score}</div>
        </div>
        <div className="small" style={{ color: 'var(--accent)' }}>{label}</div>
      </div>

      {/* Blurred Message Card */}
      <div className="card" style={{ marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div className="h2 glow-text">🌟 운명의 메시지</div>

        {/* Blurred content */}
        <div style={{ marginTop: 10, position: 'relative' }}>
          <p
            className="p"
            style={{
              filter: 'blur(6px)',
              color: 'rgba(147, 112, 219, 0.4)',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {BLUR_PLACEHOLDER}
          </p>

          {/* Overlay with CTA */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, rgba(147, 112, 219, 0.1) 0%, rgba(10, 6, 18, 0.9) 70%)',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
                background: 'linear-gradient(135deg, #9370db 0%, #ffd700 50%, #9370db 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {isNeedResponse ? '50%의 운명을 읽었습니다' : '당신의 기운이 감지되었습니다'}
            </div>
            <div className="small" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {isNeedResponse ? '응답하면 나머지가 열립니다' : '상대방의 응답을 기다리는 중...'}
            </div>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      {isNeedResponse && (
        <div className="card" style={{ border: '1px solid rgba(147, 112, 219, 0.4)' }}>
          <div className="h2 mystical-title">✨ 인연의 부름</div>
          <p className="p" style={{ marginTop: 8 }}>
            누군가 당신과의 운명을 알고 싶어합니다. 응답하면 둘의 궁합이 완성됩니다.
          </p>
          <div style={{ marginTop: 12 }}>
            <Button size="large" color="primary" variant="fill" display="full" onClick={onAction}>
              ✨ 인연에 응답하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
