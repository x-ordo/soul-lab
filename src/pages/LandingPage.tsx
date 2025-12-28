import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { hasRequiredAgreement, hasBirthDate, getPublicKey, getUserSeed } from '../lib/storage';
import { getStreak } from '../lib/streak';
import { copyFor } from '../lib/copyVariants';
import { getVariant } from '../lib/variant';
import { getAttribution } from '../lib/attribution';
import { track } from '../lib/analytics';

function maskId(id: string) {
  if (!id) return '';
  if (id.length <= 6) return id;
  return `${id.slice(0, 3)}***${id.slice(-2)}`;
}

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

  const banner = useMemo(() => {
    // chemistry invite entry (from query)
    const sp = new URLSearchParams(loc.search);
    const from = sp.get('from') || sp.get('referrer_id') || attr?.referrerId || '';
    const type = sp.get('type') || attr?.entryType || '';
    if (!from || type !== 'chemistry') return null;
    return `친구(${maskId(from)})가 너랑 케미를 보고 싶어함`;
  }, [loc.search, attr?.referrerId, attr?.entryType]);

  
  React.useEffect(() => { if (banner) track('entry_chemistry'); }, [banner]);
const onStart = () => {
    track('cta_start', { banner: !!banner });
    if (!hasRequiredAgreement() || !hasBirthDate()) {
      track('cta_needs_agreement');
      nav('/agreement');
      return;
    }
    track('cta_to_loading');
    nav('/loading');
  };

  return (
    <div className="container">
      <Header title="SOUL LAB" subtitle={cp.landingSubtitle} />

      {banner ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="badge">{banner}</div>
          <div className="small" style={{ marginTop: 8 }}>
            들어오면 궁합 결과가 양쪽 모두 열립니다.
          </div>
          <div style={{ height: 10 }} />
          <button className="btn btnPrimary" onClick={() => nav(`/chemistry${loc.search}`)}>
            케미 분석으로 이동
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
