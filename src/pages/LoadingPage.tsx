import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { preloadRewardedAd } from '../lib/toss';
import { hasRequiredAgreement, hasBirthDate } from '../lib/storage';
import { track } from '../lib/analytics';

const steps = ['데이터 수신 중...', '패턴 분석 중...', '결과 도출 완료'];

export default function LoadingPage() {
  React.useEffect(() => { track('loading_start'); }, []);

  const nav = useNavigate();
  const [i, setI] = useState(0);

  useEffect(() => {
    // 개인 분석 진입 최소 조건: 약관 + 생년월일
    if (!hasRequiredAgreement() || !hasBirthDate()) {
      nav('/agreement', { replace: true });
      return;
    }

// 광고는 로딩(의식) 동안 미리 로드한다. (완료율+UX)
const adGroupId = (import.meta.env.VITE_REWARDED_AD_GROUP_ID as string) || 'ait-ad-test-rewarded-id';
preloadRewardedAd(adGroupId);

try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        // @ts-ignore
        navigator.vibrate([20, 40, 20]);
      }
    } catch {}

    const t1 = setInterval(() => setI((x) => (x + 1) % steps.length), 900);
    const t2 = setTimeout(() => nav('/result', { replace: true }), 3000);
    return () => {
      clearInterval(t1);
      clearTimeout(t2);
    };
  }, [nav]);

  return (
    <div className="container">
      <Header title="분석 중" subtitle="가짜 의식. 하지만 이탈을 막는 진짜 장치." />

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="badge">{steps[i]}</div>
        <div style={{ height: 14 }} />
        <div className="small">생체 리듬을 금융 패턴과 대조 중...</div>
        <div style={{ height: 10 }} />
        <div className="small">3초 후 결과가 자동으로 열립니다.</div>
      </div>
    </div>
  );
}
