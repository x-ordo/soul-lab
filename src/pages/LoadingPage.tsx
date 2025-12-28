import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { preloadRewardedAd } from '../lib/toss';
import { hasRequiredAgreement, hasBirthDate, getBirthDate } from '../lib/storage';
import { track } from '../lib/analytics';

const RITUAL_DURATION_MS = 3500;

const ritualPhases = [
  { text: '우주 에너지 채널 연결 중...', sub: '당신의 고유 파장을 탐색합니다' },
  { text: '생년월일 기반 운명선 추적 중...', sub: '수비학 알고리즘 가동' },
  { text: '최근 48시간 행동 패턴 분석 중...', sub: '무의식적 선택들을 읽고 있습니다' },
  { text: '금융 리듬과 감정 주기 대조 중...', sub: '숨겨진 상관관계 발견' },
  { text: '오늘의 행운 좌표 계산 중...', sub: '시간대별 에너지 흐름 매핑' },
  { text: '귀인(貴人) 시그니처 탐색 중...', sub: '당신과 공명하는 기운 감지' },
  { text: '최종 운세 리포트 생성 중...', sub: '결과가 거의 완성되었습니다' },
];

export default function LoadingPage() {
  useEffect(() => { track('loading_start'); }, []);

  const nav = useNavigate();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const birthYear = getBirthDate()?.slice(0, 4) || '????';

  useEffect(() => {
    if (!hasRequiredAgreement() || !hasBirthDate()) {
      nav('/agreement', { replace: true });
      return;
    }

    const adGroupId = (import.meta.env.VITE_REWARDED_AD_GROUP_ID as string) || 'ait-ad-test-rewarded-id';
    preloadRewardedAd(adGroupId);

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        (navigator as any).vibrate([30, 50, 30, 50, 30]);
      }
    } catch {}

    const phaseInterval = RITUAL_DURATION_MS / ritualPhases.length;
    const progressInterval = 50;
    const progressStep = 100 / (RITUAL_DURATION_MS / progressInterval);

    const t1 = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, ritualPhases.length - 1));
    }, phaseInterval);

    const t2 = setInterval(() => {
      setProgress((prev) => Math.min(prev + progressStep, 100));
    }, progressInterval);

    const t3 = setTimeout(() => {
      track('loading_complete');
      nav('/result', { replace: true });
    }, RITUAL_DURATION_MS);

    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearTimeout(t3);
    };
  }, [nav]);

  const phase = ritualPhases[phaseIndex];

  return (
    <div className="container">
      <Header title="운명 분석 중" subtitle={`${birthYear}년생의 오늘을 읽고 있습니다`} />

      <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div style={{
          width: 64,
          height: 64,
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, rgba(59,130,246,0.8), rgba(139,92,246,0.8), rgba(236,72,153,0.8), rgba(59,130,246,0.8))',
          animation: 'spin 2s linear infinite',
        }} />

        <div className="badge" style={{ marginBottom: 12 }}>
          {phase.text}
        </div>

        <div className="small" style={{ marginBottom: 16, minHeight: 18 }}>
          {phase.sub}
        </div>

        <div style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: 3,
            background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
            transition: 'width 0.1s linear',
          }} />
        </div>

        <div className="small" style={{ marginTop: 12, opacity: 0.6 }}>
          {Math.round(progress)}% 완료
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
