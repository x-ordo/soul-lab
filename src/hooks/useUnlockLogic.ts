import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ogImageUrl } from '../lib/og';
import { copyFor } from '../lib/copyVariants';
import { getVariant } from '../lib/variant';
import { makeTodayReport } from '../lib/report';
import { tomorrowHint } from '../utils/engine';
import { track } from '../lib/analytics';

export interface UnlockState {
  isLocked: boolean;
  adUnlocked: boolean;
  viralUnlocked: boolean;
  thirdPartyConsent: boolean;
  dateKey: string;
  myKey: string;
  seed: string;
}

export interface UnlockActions {
  unlock: () => void;
  onShareResult: () => Promise<void>;
  onInviteChemistryContacts: () => Promise<void>;
  onInviteChemistryLink: () => Promise<void>;
}

export interface ReportData {
  report: ReturnType<typeof makeTodayReport>;
  hint: string;
  copyVariant: ReturnType<typeof copyFor>;
}

export function useUnlockLogic() {
  const nav = useNavigate();

  const seed = getUserSeed() ?? 'anon';
  const myKey = getPublicKey() ?? seed;
  const dk = todayKey();
  const adUnlocked = getUnlockedDate() === dk;
  const viralUnlocked = getViralUnlockedDate() === dk;
  const thirdOk = hasThirdPartyConsent();

  const [isLocked, setIsLocked] = useState(!(adUnlocked || viralUnlocked));

  const report = useMemo(() => makeTodayReport(myKey), [myKey]);
  const v = getVariant(myKey);
  const cp = copyFor(v);
  const birthDate = getBirthDate() ?? '';
  const hint = useMemo(() => tomorrowHint(myKey, birthDate), [myKey, birthDate]);

  useEffect(() => {
    if (!hasRequiredAgreement() || !hasBirthDate()) {
      nav('/agreement', { replace: true });
      return;
    }
    setIsLocked(!(adUnlocked || viralUnlocked));
  }, [adUnlocked, viralUnlocked, nav]);

  const unlock = useCallback(() => {
    setUnlockedDate(dk);
    setIsLocked(false);
  }, [dk]);

  const makeInviteLink = useCallback(async () => {
    const deepLink = buildInviteDeepLink(myKey, dk);
    const shareLink = await makeShareLink(deepLink, ogImageUrl('chemistry'));
    const qs = deepLink.split('?')[1] ?? '';
    return { deepLink, shareLink, qs };
  }, [myKey, dk]);

  const onShareResult = useCallback(async () => {
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
  }, [cp]);

  const moduleId = (import.meta.env.VITE_CONTACTS_MODULE_ID as string) || '';

  const onInviteChemistryContacts = useCallback(async () => {
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

      nav(`/chemistry?${qs}`);
    } catch (e) {
      console.error(e);
      alert('초대 생성 실패. 설정 또는 권한을 확인하세요.');
    }
  }, [thirdOk, moduleId, makeInviteLink, nav]);

  const onInviteChemistryLink = useCallback(async () => {
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
  }, [thirdOk, makeInviteLink, cp, nav]);

  const state: UnlockState = {
    isLocked,
    adUnlocked,
    viralUnlocked,
    thirdPartyConsent: thirdOk,
    dateKey: dk,
    myKey,
    seed,
  };

  const actions: UnlockActions = {
    unlock,
    onShareResult,
    onInviteChemistryContacts,
    onInviteChemistryLink,
  };

  const reportData: ReportData = {
    report,
    hint,
    copyVariant: cp,
  };

  return { state, actions, reportData };
}
