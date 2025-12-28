import React from 'react';

function maskId(id: string) {
  if (!id) return '???';
  if (id.length <= 6) return id.slice(0, 3) + '**';
  return `${id.slice(0, 4)}***`;
}

export default function ViralHookModal({
  inviterKey,
  onAccept,
  onClose,
}: {
  inviterKey: string;
  onAccept: () => void;
  onClose: () => void;
}) {
  const masked = maskId(inviterKey);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      padding: 16,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 20,
        border: '1px solid rgba(139, 92, 246, 0.3)',
        padding: 24,
        textAlign: 'center',
        boxShadow: '0 0 60px rgba(139, 92, 246, 0.2)',
      }}>
        {/* 이모지 아이콘 */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>💜</div>

        {/* 헤드라인 */}
        <div style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 8,
          background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          누군가 당신을 궁금해합니다
        </div>

        {/* 서브헤드 */}
        <div style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: 20,
          lineHeight: 1.5,
        }}>
          <strong style={{ color: '#A78BFA' }}>{masked}</strong>님이
          <br />
          당신과의 <strong style={{ color: '#EC4899' }}>오늘의 궁합</strong>을 보고 싶어합니다
        </div>

        {/* 티저 박스 */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.15)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            응답하면 볼 수 있는 것
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
            ✨ 둘 사이의 케미 점수<br />
            🔥 강점과 마찰 포인트<br />
            💡 관계 부스터 힌트
          </div>
        </div>

        {/* 긴급성 */}
        <div style={{
          fontSize: 12,
          color: '#F59E0B',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}>
          <span>⏰</span>
          <span>이 초대는 <strong>오늘만</strong> 유효합니다</span>
        </div>

        {/* CTA 버튼 */}
        <button
          onClick={onAccept}
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          궁합 확인하기 →
        </button>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          나중에 할게요
        </button>

        {/* 사회적 증거 */}
        <div style={{
          marginTop: 16,
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
        }}>
          오늘 <strong style={{ color: 'rgba(255,255,255,0.6)' }}>2,847쌍</strong>이 궁합을 확인했습니다
        </div>
      </div>
    </div>
  );
}
