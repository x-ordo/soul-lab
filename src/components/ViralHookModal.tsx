import React from 'react';
import { BottomSheet, Button } from '@toss/tds-mobile';

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
    <BottomSheet
      open={true}
      onClose={onClose}
      header={
        <BottomSheet.Header>
          누군가 당신을 궁금해합니다
        </BottomSheet.Header>
      }
      headerDescription={
        <BottomSheet.HeaderDescription>
          <span style={{ color: '#A78BFA' }}>{masked}</span>님이 당신과의 <span style={{ color: '#EC4899' }}>오늘의 궁합</span>을 보고 싶어합니다
        </BottomSheet.HeaderDescription>
      }
      cta={
        <BottomSheet.DoubleCTA
          primaryLabel="궁합 확인하기 →"
          secondaryLabel="나중에 할게요"
          onPrimaryClick={onAccept}
          onSecondaryClick={onClose}
        />
      }
    >
      {/* 티저 박스 */}
      <div style={{
        background: 'rgba(139, 92, 246, 0.15)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
          응답하면 볼 수 있는 것
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
          ✨ 둘 사이의 케미 점수<br />
          🔥 강점과 마찰 포인트<br />
          💡 관계 부스터 힌트
        </div>
      </div>

      {/* 긴급성 */}
      <div style={{
        fontSize: 12,
        color: '#F59E0B',
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}>
        <span>⏰</span>
        <span>이 초대는 <strong>오늘만</strong> 유효합니다</span>
      </div>

      {/* 사회적 증거 */}
      <div style={{
        marginTop: 12,
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
      }}>
        오늘 <strong style={{ color: 'rgba(255,255,255,0.6)' }}>2,847쌍</strong>이 궁합을 확인했습니다
      </div>
    </BottomSheet>
  );
}
