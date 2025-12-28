import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import ViralHookModal from '../components/ViralHookModal';
import { hasRequiredAgreement, hasBirthDate, getPublicKey, getUserSeed } from '../lib/storage';
import { getStreak } from '../lib/streak';
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

      <Header title="SOUL LAB" subtitle={cp.landingSubtitle} />

      {referrerInfo && !showModal ? (
        <div className="card" style={{ marginBottom: 12, border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <div className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            💜 케미 초대가 도착했습니다
          </div>
          <div className="small" style={{ marginTop: 8 }}>
            들어오면 궁합 결과가 양쪽 모두 열립니다.
          </div>
          <div style={{ height: 10 }} />
          <button className="btn btnPrimary" onClick={onGoToChemistry}>
            궁합 확인하러 가기
          </button>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <div className="h2">오늘의 점수</div>
          {streak > 1 ? <div className="badge">연속 {streak}일</div> : <div className="badge">첫 방문</div>}
        </div>
        <div className="small" style={{ marginTop: 8 }}>
          점수는 즉시 공개. 디테일은 광고/케미로 해제.
        </div>
      </div>

      <button className="btn btnPrimary" onClick={onStart}>
        {cp.startCta}
      </button>

      <div className="footer">* 재미용 엔터테인먼트입니다.</div>
    </div>
  );
}
