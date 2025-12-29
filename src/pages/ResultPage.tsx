import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import Header from '../components/Header';
import UnlockStatus from '../components/UnlockStatus';
import { copyFor } from '../lib/copyVariants';
import { getVariant } from '../lib/variant';
import { ogImageUrl } from '../lib/og';
import LockedBlur from '../components/LockedBlur';
import AdRewardButton from '../components/AdRewardButton';
import { makeTodayReport } from '../lib/report';
import {
  getPublicKey,
  getUnlockedDate,
  getUserSeed,
  setUnlockedDate,
  getViralUnlockedDate,
  hasRequiredAgreement,
  hasBirthDate,
  hasThirdPartyConsent,
  getBirthDate,
} from '../lib/storage';
import { todayKey } from '../lib/seed';
import { makeShareLink, runContactsViral, shareMessage } from '../lib/toss';
import { buildInviteDeepLink } from '../lib/handshake';
import { track } from '../lib/analytics';
import { tomorrowHint } from '../utils/engine';

export default function ResultPage() {
  React.useEffect(() => { track('result_view'); }, []);

  const nav = useNavigate();

  const seed = getUserSeed() ?? 'anon';
  const myKey = getPublicKey() ?? seed;

  const dk = todayKey();
  const adUnlocked = getUnlockedDate() === dk;
  const viralUnlocked = getViralUnlockedDate() === dk;
  const thirdOk = hasThirdPartyConsent();

  const report = useMemo(() => makeTodayReport(myKey), [myKey]);
  const v = getVariant(myKey);
  const cp = copyFor(v);
  const birthDate = getBirthDate() ?? '';
  const hint = useMemo(() => tomorrowHint(myKey, birthDate), [myKey, birthDate]);


  const [isLocked, setIsLocked] = useState(!(adUnlocked || viralUnlocked));

  useEffect(() => {
    if (!hasRequiredAgreement() || !hasBirthDate()) {
      nav('/agreement', { replace: true });
      return;
    }
    setIsLocked(!(adUnlocked || viralUnlocked));
  }, [adUnlocked, viralUnlocked, nav]);

  const adGroupId = (import.meta.env.VITE_REWARDED_AD_GROUP_ID as string) || 'ait-ad-test-rewarded-id';
  const moduleId = (import.meta.env.VITE_CONTACTS_MODULE_ID as string) || '';

  const unlock = () => {
    setUnlockedDate(dk);
    setIsLocked(false);
  };

  const onShareResult = async () => {
    track('share_click_daily');
  try {
    const link = await makeShareLink(`intoss://soul-lab/result`, ogImageUrl('daily'));
    const ok = await shareMessage(cp.shareDaily(link));
    if (!ok) {
      await navigator.clipboard.writeText(link);
      alert('공유 실패 → 링크를 복사했습니다.');
    }
  } catch (e) {
    console.error(e);
    alert('공유 실패. 권한/환경을 확인하세요.');
  }
};

  const makeInviteLink = async () => {
    // 서버 없이: inviter 링크 생성
    const deepLink = buildInviteDeepLink(myKey, dk);
    const shareLink = await makeShareLink(deepLink, ogImageUrl('chemistry'));
    const qs = deepLink.split('?')[1] ?? '';
    return { deepLink, shareLink, qs };
  };

  const onInviteChemistryContacts = async () => {
    track('invite_click_contacts');
  if (!thirdOk) {
    alert('친구 초대 기능은 "제3자 정보 제공 동의" 후에만 활성화됩니다.');
    nav('/agreement');
    return;
  }

  if (!moduleId.trim()) {
    alert('연락처 모듈 ID(VITE_CONTACTS_MODULE_ID)가 비어있습니다. 링크 공유(대체)로 진행하세요.');
    return;
  }

  try {
    const { shareLink, qs } = await makeInviteLink();

    // 실전: 링크 자동 주입이 불확실 → 먼저 복사해두고 유저가 붙여넣게 한다.
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {}

    runContactsViral(
      moduleId,
      () => {
        alert('연락처 초대 UI가 열렸습니다. 메시지 입력칸에 "붙여넣기"로 링크를 보내세요. (링크는 이미 복사됨)');
      },
      () => {}
    );

    // 초대 대기 화면으로 이동(내가 만든 초대 링크 상태)
    nav(`/chemistry?${qs}`);
  } catch (e) {
    console.error(e);
    alert('초대 생성 실패. 설정 또는 권한을 확인하세요.');
  }
};

  const onInviteChemistryLink = async () => {
    track('invite_click_link');
  if (!thirdOk) {
    alert('친구 초대 기능은 "제3자 정보 제공 동의" 후에만 활성화됩니다.');
    nav('/agreement');
    return;
  }

  try {
    const { shareLink, qs } = await makeInviteLink();
    const ok = await shareMessage(cp.shareChemistry(shareLink));
    if (!ok) {
      try {
        await navigator.clipboard.writeText(shareLink);
      } catch {}
      alert('공유 실패 → 링크를 복사했습니다.');
    }
    alert('상대가 링크로 접속하면 궁합이 열립니다.');
    nav(`/chemistry?${qs}`);
  } catch (e) {
    console.error(e);
    alert('초대 링크 생성 실패.');
  }
};

  return (
    <div className="container">
      <Header title="오늘의 운명" subtitle="별들이 당신에게 전하는 메시지" />

      <UnlockStatus
        locked={isLocked}
        reason={isLocked ? cp.lockReason : cp.unlockedReason}
      />

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <div className="h2 glow-text">오늘의 기운</div>
          <div className="score-display">{report.score}</div>
        </div>
        <div className="small" style={{ color: 'var(--accent)' }}>{report.rankText}</div>
        <div style={{ marginTop: 10 }} className="p">
          {report.oneLiner}
        </div>
      </div>

      {isLocked ? (
        <>
          <LockedBlur
            title="✨ 운명의 봉인"
            subtitle="기운을 모아 행운의 시간, 귀인, 주의점을 열어보세요"
            onUnlock={unlock}
            sections={[
              { label: '행운의 시간' },
              { label: '귀인' },
              { label: '주의할 것' },
            ]}
          />

          <div style={{ height: 12 }} />
          <AdRewardButton adGroupId={adGroupId} userKey={myKey} scope="daily" onUnlocked={unlock} />

          <div style={{ height: 12 }} />
          <Button size="large" color="dark" variant="weak" display="full" onClick={onShareResult}>
            오늘의 운명 공유하기
          </Button>

          <div style={{ height: 12 }} />
          <div className="card" style={{ border: '1px solid rgba(147, 112, 219, 0.3)' }}>
            <div className="h2 mystical-title">인연의 실로 봉인 해제</div>
            {!thirdOk ? (
              <>
                <div className="small">인연을 맺으려면 동의가 필요합니다.</div>
                <div style={{ height: 10 }} />
                <Button size="large" color="primary" variant="fill" display="full" onClick={() => nav('/agreement')}>
                  동의하고 인연 맺기
                </Button>
              </>
            ) : (
              <>
                <div className="small">둘의 기운이 만나면 봉인이 풀립니다.</div>
                <div style={{ height: 10 }} />
                <Button size="large" color="primary" variant="fill" display="full" onClick={onInviteChemistryContacts}>
                  ✨ 인연 초대하기
                </Button>
                <div style={{ height: 10 }} />
                <Button size="large" color="dark" variant="weak" display="full" onClick={onInviteChemistryLink}>
                  초대 링크 보내기
                </Button>
              </>
            )}
          </div>

          {/* AI 상담 & 크레딧 섹션 (잠금 상태에서도 접근 가능) */}
          <div style={{ height: 12 }} />
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(147, 112, 219, 0.15) 0%, rgba(255, 215, 0, 0.1) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
          }}>
            <div className="h2 glow-text">🔮 AI 운명 상담</div>
            <div className="small" style={{ marginTop: 4, color: 'rgba(255,255,255,0.7)' }}>
              점성술 전문가 AI와 1:1 심층 상담
            </div>
            <div style={{ height: 12 }} />
            <Button size="large" color="primary" variant="fill" display="full" onClick={() => nav('/consult')}>
              ✨ AI 상담 시작하기
            </Button>
            <div style={{ height: 10 }} />
            <Button size="large" color="dark" variant="weak" display="full" onClick={() => nav('/credits')}>
              💎 크레딧 충전하기
            </Button>
          </div>

          {/* 타로 버튼 */}
          <div style={{ height: 12 }} />
          <Button size="large" color="dark" variant="weak" display="full" onClick={() => nav('/tarot')}>
            🃏 타로 카드 뽑기
          </Button>
        </>
      ) : (
        <>
          <div className="card">
            <div className="h2 glow-text">🌟 행운의 시간</div>
            <p className="p" style={{ marginTop: 8 }}>{report.luckyTime}</p>
            <hr className="hr" />
            <div className="h2 glow-text">👤 오늘의 귀인</div>
            <p className="p" style={{ marginTop: 8 }}>{report.helper}</p>
            <hr className="hr" />
            <div className="h2 glow-text">⚠️ 주의할 기운</div>
            <p className="p" style={{ marginTop: 8 }}>{report.caution}</p>
          </div>

          {/* 내일 운세 티저 */}
          <div
            className="card"
            style={{
              marginTop: 12,
              border: '1px solid rgba(147, 112, 219, 0.2)',
              background: 'linear-gradient(135deg, rgba(20,20,30,0.9), rgba(30,20,40,0.9))',
            }}
          >
            <div className="h2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              🌅 내일의 기운 미리보기
            </div>
            <div
              style={{
                filter: 'blur(6px)',
                color: 'rgba(255,255,255,0.3)',
                userSelect: 'none',
                marginTop: 8,
                fontSize: 14,
              }}
            >
              {hint}
            </div>
            <div className="small" style={{ marginTop: 12, color: '#ffd700' }}>
              ✨ 내일 다시 방문하면 상세 운세가 열립니다
            </div>
          </div>

          <div style={{ height: 12 }} />
          <Button size="large" color="primary" variant="fill" display="full" onClick={() => nav('/detail')}>
            더 깊은 운명 보기
          </Button>

          <div style={{ height: 12 }} />
          <Button size="large" color="dark" variant="weak" display="full" onClick={onShareResult}>
            오늘의 운명 공유하기
          </Button>

          <div style={{ height: 12 }} />
          <div className="card" style={{ border: '1px solid rgba(147, 112, 219, 0.3)' }}>
            <div className="h2 mystical-title">✨ 인연의 궁합 보기</div>
            {!thirdOk ? (
              <>
                <div className="small">인연을 맺으려면 동의가 필요합니다.</div>
                <div style={{ height: 10 }} />
                <Button size="large" color="primary" variant="fill" display="full" onClick={() => nav('/agreement')}>
                  동의하고 인연 맺기
                </Button>
              </>
            ) : (
              <>
                <div className="small">둘의 기운이 만나야 운명이 드러납니다.</div>
                <div style={{ height: 10 }} />
                <Button size="large" color="primary" variant="fill" display="full" onClick={onInviteChemistryContacts}>
                  ✨ 인연 초대하기
                </Button>
                <div style={{ height: 10 }} />
                <Button size="large" color="dark" variant="weak" display="full" onClick={onInviteChemistryLink}>
                  초대 링크 보내기
                </Button>
              </>
            )}
          </div>

          {/* AI 상담 & 크레딧 섹션 */}
          <div style={{ height: 12 }} />
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(147, 112, 219, 0.15) 0%, rgba(255, 215, 0, 0.1) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
          }}>
            <div className="h2 glow-text">🔮 AI 운명 상담</div>
            <div className="small" style={{ marginTop: 4, color: 'rgba(255,255,255,0.7)' }}>
              점성술 전문가 AI와 1:1 심층 상담
            </div>
            <div style={{ height: 12 }} />
            <Button size="large" color="primary" variant="fill" display="full" onClick={() => nav('/consult')}>
              ✨ AI 상담 시작하기
            </Button>
            <div style={{ height: 10 }} />
            <Button size="large" color="dark" variant="weak" display="full" onClick={() => nav('/credits')}>
              💎 크레딧 충전하기
            </Button>
          </div>

          {/* 타로 버튼 */}
          <div style={{ height: 12 }} />
          <Button size="large" color="dark" variant="weak" display="full" onClick={() => nav('/tarot')}>
            🃏 타로 카드 뽑기
          </Button>
        </>
      )}
    </div>
  );
}
