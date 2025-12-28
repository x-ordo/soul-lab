import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getPublicKey, getUserSeed, hasThirdPartyConsent, getUnlockedDate, getViralUnlockedDate } from '../lib/storage';
import { makeDetailReport } from '../lib/report';
import { todayKey } from '../lib/seed';
import { makeShareLink, runContactsViral, shareMessage } from '../lib/toss';
import { buildInviteDeepLink } from '../lib/handshake';
import { ogImageUrl } from '../lib/og';
import { copyFor } from '../lib/copyVariants';
import { getVariant } from '../lib/variant';

export default function DetailPage() {
  React.useEffect(() => { track('detail_view'); }, []);

  const nav = useNavigate();

  const seed = getUserSeed() ?? 'anon';
  const myKey = getPublicKey() ?? seed;
  const moduleId = (import.meta.env.VITE_CONTACTS_MODULE_ID as string) || '';
  const thirdOk = hasThirdPartyConsent();
  const dk = todayKey();

  const unlockedToday = (getUnlockedDate() === dk) || (getViralUnlockedDate() === dk);
  if (!unlockedToday) {
    return (
      <div className="page">
        <Header title="상세 잠김" subtitle="오늘은 아직 상세가 잠겨 있습니다." />
        <div className="card">
          <div className="p">상세는 <b>광고 1회</b> 또는 <b>궁합 성사</b>로 열립니다.</div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btnPrimary" onClick={() => nav('/result')}>결과로 돌아가기</button>
          </div>
        </div>
      </div>
    );
  }


  const report = useMemo(() => makeDetailReport(myKey), [myKey]);
  const cp = copyFor(getVariant(myKey));


  const makeInviteLink = async () => {
  const deepLink = buildInviteDeepLink(myKey, dk);
  const shareLink = await makeShareLink(deepLink, ogImageUrl('chemistry'));
  const qs = deepLink.split('?')[1] ?? '';
  return { deepLink, shareLink, qs };
};

  const onInviteContacts = async () => {
  if (!thirdOk) {
    alert('친구 초대 기능은 “제3자 정보 제공 동의” 후에만 활성화됩니다.');
    nav('/agreement');
    return;
  }

  if (!moduleId.trim()) {
    alert('연락처 모듈 ID(VITE_CONTACTS_MODULE_ID)가 비어있습니다. 링크 공유(대체)로 진행하세요.');
    return;
  }

  try {
    const { shareLink, qs } = await makeInviteLink();
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {}

    runContactsViral(
      moduleId,
      () => alert('연락처 초대 UI가 열렸습니다. 메시지 입력칸에 “붙여넣기”로 링크를 보내세요. (링크는 이미 복사됨)'),
      () => {}
    );

    alert('상대가 링크로 접속하면 궁합이 열립니다.');
    nav(`/chemistry?${qs}`);
  } catch (e) {
    console.error(e);
    alert('초대 생성 실패. 설정/권한을 확인하세요.');
  }
};

  const onInviteShare = async () => {
  if (!thirdOk) {
    alert('친구 초대 기능은 “제3자 정보 제공 동의” 후에만 활성화됩니다.');
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
      <Header title="상세 결과" subtitle={report.subtitle} />

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h2">요약</div>
        <p className="p" style={{ marginTop: 8 }}>{report.summary}</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h2">재물운</div>
        <p className="p" style={{ marginTop: 8 }}>{report.money}</p>
        <hr className="hr" />
        <div className="h2">연애운</div>
        <p className="p" style={{ marginTop: 8 }}>{report.love}</p>
        <hr className="hr" />
        <div className="h2">컨디션</div>
        <p className="p" style={{ marginTop: 8 }}>{report.condition}</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h2">케미 분석(초대)</div>
        {!thirdOk ? (
          <>
            <div className="small">친구 초대 기능은 동의 후 활성화됩니다.</div>
            <div style={{ height: 10 }} />
            <button className="btn btnPrimary" onClick={() => nav('/agreement')}>
              동의 설정 열기
            </button>
          </>
        ) : (
          <>
            <div className="small">상대가 접속해야 결과가 열립니다. (오늘만 유효)</div>
            <div style={{ height: 10 }} />
            <button className="btn btnPrimary" onClick={onInviteContacts}>
              친구 초대(연락처)
            </button>
            <div style={{ height: 10 }} />
            <button className="btn btnGhost" onClick={onInviteShare}>
              초대 링크 공유(대체)
            </button>
          </>
        )}
      </div>

      <button className="btn btnGhost" onClick={() => nav('/result')}>
        결과 요약으로
      </button>

      <div className="footer">* 엔터테인먼트 목적의 “연출된 분석”입니다.</div>
    </div>
  );
}
