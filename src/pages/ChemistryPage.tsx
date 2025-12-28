import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import Header from '../components/Header';
import LockedBlur from '../components/LockedBlur';
import AdRewardButton from '../components/AdRewardButton';
import ViralHookModal from '../components/ViralHookModal';
import { getEffectiveUserKey, getUnlockedDate, setUnlockedDate, setViralUnlockedDate } from '../lib/storage';
import { makeChemistryReport } from '../lib/report';
import { todayKey } from '../lib/seed';
import { makeShareLink, shareMessage } from '../lib/toss';
import { buildInviteDeepLink, buildResponseDeepLink, parseHandshake } from '../lib/handshake';
import { track } from '../lib/analytics';

export default function ChemistryPage() {
  React.useEffect(() => { track('chemistry_view'); }, []);

  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [showModal, setShowModal] = useState(true);

  const myKey = getEffectiveUserKey();
  const dk = todayKey();

  const hs = React.useMemo(() => parseHandshake(sp), [sp]);

  const status = React.useMemo(() => {
    if (!hs.from || !hs.d || !hs.sig) return { mode: 'invalid' as const, message: '초대 링크가 유효하지 않습니다.' };
    if (!hs.sigValid) return { mode: 'invalid' as const, message: '링크 서명이 맞지 않습니다.' };
    if (hs.d !== dk) return { mode: 'expired' as const, message: '이 초대는 만료되었습니다. (오늘 날짜만 유효)' };

    if (hs.kind === 'invite') {
      if (hs.from === myKey) return { mode: 'selfInvite' as const, message: '내가 만든 초대 링크입니다. 친구에게 보내세요.' };
      return { mode: 'needResponse' as const, inviterKey: hs.from, dateKey: hs.d };
    }

    if (hs.kind === 'paired') {
      const from = hs.from!;
      const to = hs.to!;
      if (myKey !== from && myKey !== to) return { mode: 'outsider' as const, message: '이 결과는 당사자만 열 수 있습니다.' };
      const partnerKey = myKey === from ? to : from;
      return { mode: 'paired' as const, partnerKey, from, to, dateKey: hs.d };
    }

    return { mode: 'invalid' as const, message: '초대 링크가 유효하지 않습니다.' };
  }, [hs, myKey, dk]);

  const unlocked = getUnlockedDate() === dk;

  const report = React.useMemo(() => {
    if (status.mode !== 'paired') return null;
    return makeChemistryReport(myKey, status.partnerKey);
  }, [status, myKey]);

  // paired 순간: 바이럴 언락 기록(오늘)
  React.useEffect(() => {
    if (status.mode === 'paired') { setViralUnlockedDate(dk); track('chemistry_paired'); }
  }, [status, dk]);

  const unlockToday = () => setUnlockedDate(dk);


  const onCopyInviteLink = async () => {
    track('chem_invite_copy');
    // inviter selfInvite: 내 초대 링크를 다시 복사/공유
    try {
      const deepLink = buildInviteDeepLink(myKey, dk);
      const shareLink = await makeShareLink(deepLink);
      try {
        await navigator.clipboard.writeText(shareLink);
      } catch {}
      await shareMessage(`초대 링크를 복사했습니다.
${shareLink}`);
    } catch (e) {
      console.error(e);
      alert('초대 링크 생성 실패');
    }
  };

const onMakeResponseLink = async () => {
    track('chem_response_make');
    if (status.mode !== 'needResponse') return;
    try {
      // invitee -> inviter
      const deepLink = buildResponseDeepLink(status.inviterKey, myKey, status.dateKey);
      const shareLink = await makeShareLink(deepLink);

      try {
        await navigator.clipboard.writeText(shareLink);
      } catch {}

      await shareMessage(`응답 링크를 보냈습니다! (링크는 이미 복사됨)\n${shareLink}`);

      // invitee도 즉시 결과 보기: paired view로 replace
      const qs = deepLink.split('?')[1] ?? '';
      nav(`/chemistry?${qs}`, { replace: true });
    } catch (e) {
      console.error(e);
      alert('응답 링크 생성 실패');
    }
  };

  const onSharePaired = async () => {
    if (status.mode !== 'paired') return;
    try {
      const deepLink = buildResponseDeepLink(status.from, status.to, status.dateKey);
      const shareLink = await makeShareLink(deepLink);
      await navigator.clipboard.writeText(shareLink).catch(() => {});
      await shareMessage(`우리 케미 결과 링크: ${shareLink}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="container">
      <Header title="궁합 분석" subtitle="둘 다 접속해야 결과가 열립니다." />

      {status.mode === 'invalid' && (
        <div className="card">
          <div className="h2">오류</div>
          <p className="p" style={{ marginTop: 8 }}>{status.message}</p>
          <div style={{ marginTop: 12 }}>
            <Button size="large" color="dark" variant="weak" display="full" onClick={() => nav('/')}>
              홈으로
            </Button>
          </div>
        </div>
      )}

      {status.mode === 'expired' && (
        <div className="card">
          <div className="h2">만료</div>
          <p className="p" style={{ marginTop: 8 }}>{status.message}</p>
          <div style={{ marginTop: 12 }}>
            <Button size="large" color="dark" variant="weak" display="full" onClick={() => nav('/')}>
              홈으로
            </Button>
          </div>
        </div>
      )}

      {status.mode === 'outsider' && (
        <div className="card">
          <div className="h2">접근 제한</div>
          <p className="p" style={{ marginTop: 8 }}>{status.message}</p>
          <div style={{ marginTop: 12 }}>
            <Button size="large" color="dark" variant="weak" display="full" onClick={() => nav('/')}>
              홈으로
            </Button>
          </div>
        </div>
      )}

      {status.mode === 'selfInvite' && (
        <div className="card">
          <div className="h2">초대 대기</div>
          <p className="p" style={{ marginTop: 8 }}>{status.message}</p>
          <div style={{ marginTop: 12 }}>
            <Button size="large" color="dark" variant="weak" display="full" onClick={() => nav('/')}>
              홈으로
            </Button>
          </div>
        </div>
      )}

      {status.mode === 'needResponse' && (
        <>
          {showModal && (
            <ViralHookModal
              inviterKey={status.inviterKey}
              onAccept={() => {
                track('viral_modal_accept');
                setShowModal(false);
              }}
              onClose={() => {
                track('viral_modal_close');
                setShowModal(false);
              }}
            />
          )}
          <div className="card">
            <div className="h2">초대장이 도착했습니다</div>
            <p className="p" style={{ marginTop: 8 }}>
              응답 링크를 만들어 상대에게 보내면 궁합이 열립니다.
            </p>
            <div style={{ marginTop: 12 }}>
              <Button size="large" color="primary" variant="fill" display="full" onClick={onMakeResponseLink}>
                궁합 확인하고 응답 보내기
              </Button>
            </div>
          </div>
        </>
      )}

      {status.mode === 'paired' && report && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="h2">궁합 점수</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 8 }}>{report.score}점</div>
            <div className="small">{report.label}</div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="h2">요약</div>
            <p className="p" style={{ marginTop: 8 }}>{report.summary}</p>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="h2">상세</div>

            {unlocked ? (
              <div style={{ marginTop: 10 }}>
                <p className="p"><b>요약</b>: {report.summary}</p>
                <p className="p"><b>마찰 포인트</b>: {report.friction}</p>
                <p className="p"><b>관계 부스터</b>: {report.booster}</p>
              </div>
            ) : (
              <>
                <LockedBlur
                  title="상세 분석 잠김"
                  subtitle="광고 시청으로 강점/마찰/부스터를 확인하세요"
                  onUnlock={unlockToday}
                  sections={[
                    { label: '강점' },
                    { label: '마찰' },
                    { label: '부스터' },
                  ]}
                />
                <div style={{ marginTop: 12 }}>
                  <AdRewardButton
                    adGroupId={(import.meta.env.VITE_REWARDED_AD_GROUP_ID as string) || 'ait-ad-test-rewarded-id'}
                    userKey={myKey}
                    scope="chem_detail"
                    onUnlocked={unlockToday}
                  />
                </div>
              </>
            )}

            <div style={{ marginTop: 10 }}>
              <Button size="large" color="dark" variant="weak" display="full" onClick={onSharePaired}>
                결과 링크 공유
              </Button>
            </div>
          </div>

          <div className="card">
            <div className="h2">다음</div>
            <div style={{ marginTop: 12 }}>
              <Button size="large" color="primary" variant="fill" display="full" onClick={() => nav('/')}>
                오늘 운세로 돌아가기
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
