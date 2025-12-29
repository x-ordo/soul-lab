import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Badge } from '@toss/tds-mobile';
import Header from '../components/Header';
import ViralHookModal from '../components/ViralHookModal';
import { hasRequiredAgreement, hasBirthDate, getPublicKey, getUserSeed } from '../lib/storage';
import { getStreak, wasGraceUsed, clearGraceFlag } from '../lib/streak';
import { getStreakLevel, getStreakReward } from '../lib/streakBonus';
import { copyFor } from '../lib/copyVariants';
import { getVariant } from '../lib/variant';
import { getAttribution } from '../lib/attribution';
import { track } from '../lib/analytics';

export default function LandingPage() {
  React.useEffect(() => { track('landing_view'); }, []);

  const nav = useNavigate();
  const loc = useLocation();

  const seed = getUserSeed() ?? 'anon';
  const myKey = getPublicKey() ?? seed;

  const v = useMemo(() => getVariant(myKey), [myKey]);
  const cp = useMemo(() => copyFor(v), [v]);

  const streak = getStreak();
  const streakLevel = getStreakLevel(streak);
  const streakReward = getStreakReward(streak);
  const graceUsed = wasGraceUsed();
  const attr = getAttribution();

  const referrerInfo = useMemo(() => {
    const sp = new URLSearchParams(loc.search);
    const from = sp.get('from') || sp.get('referrer_id') || attr?.referrerId || '';
    const type = sp.get('type') || attr?.entryType || '';
    if (!from || type !== 'chemistry') return null;
    return { from, search: loc.search };
  }, [loc.search, attr?.referrerId, attr?.entryType]);

  const [showModal, setShowModal] = useState(!!referrerInfo);

  React.useEffect(() => { if (referrerInfo) track('entry_chemistry'); }, [referrerInfo]);

  const onStart = () => {
    track('cta_start', { hasReferrer: !!referrerInfo });
    if (!hasRequiredAgreement() || !hasBirthDate()) {
      track('cta_needs_agreement');
      nav('/agreement');
      return;
    }
    track('cta_to_loading');
    nav('/loading');
  };

  const onGoToChemistry = () => {
    track('viral_modal_accept_landing');
    setShowModal(false);
    if (referrerInfo) {
      nav(`/chemistry${referrerInfo.search}`);
    }
  };

  return (
    <div className="container">
      {/* 바이럴 훅 모달: 초대 링크로 진입 시 */}
      {showModal && referrerInfo && (
        <ViralHookModal
          inviterKey={referrerInfo.from}
          onAccept={onGoToChemistry}
          onClose={() => {
            track('viral_modal_close_landing');
            setShowModal(false);
          }}
        />
      )}

      <Header title="SOUL LAB" subtitle="오늘, 당신의 운명이 속삭입니다" />

      {referrerInfo && !showModal ? (
        <div className="card" style={{ marginBottom: 12, border: '1px solid rgba(147, 112, 219, 0.4)' }}>
          <Badge size="small" color="blue" variant="weak" style={{ background: 'rgba(147, 112, 219, 0.25)' }}>
            ✨ 인연의 실이 연결되었습니다
          </Badge>
          <div className="small" style={{ marginTop: 8 }}>
            둘의 기운이 만나면 운명이 드러납니다.
          </div>
          <div style={{ height: 10 }} />
          <Button size="large" color="primary" variant="fill" display="full" onClick={onGoToChemistry}>
            운명의 인연 확인하기
          </Button>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <div className="h2 glow-text">오늘의 기운</div>
          {streak > 1 ? (
            <Badge
              size="small"
              color="blue"
              variant="fill"
              style={{ background: streakLevel.color }}
            >
              {streakLevel.icon} {streak}일째 교감 중
            </Badge>
          ) : (
            <Badge size="small" color="gray" variant="weak">
              {streakLevel.icon} 첫 만남
            </Badge>
          )}
        </div>

        {/* 그레이스 데이 사용 시 메시지 */}
        {graceUsed && (
          <div
            className="small"
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'rgba(147, 112, 219, 0.15)',
              borderRadius: 8,
              color: '#ffd700',
            }}
          >
            ✨ 다행이에요! 인연의 끈이 유지되었습니다
          </div>
        )}

        {/* 마일스톤 보상 메시지 */}
        {streakReward && (
          <div
            className="small"
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(147, 112, 219, 0.2))',
              borderRadius: 8,
              color: '#ffd700',
            }}
          >
            {streakReward}
          </div>
        )}

        <div className="small" style={{ marginTop: 8 }}>
          별들이 당신에게 전하는 메시지를 확인하세요.
        </div>
      </div>

      <Button size="large" color="primary" variant="fill" display="full" onClick={onStart}>
        ✨ 운명의 문 열기
      </Button>
    </div>
  );
}
