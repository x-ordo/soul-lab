import React, { useEffect, useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { preloadRewardedAd, showRewardedAd } from '../lib/toss';
import { todayKey } from '../lib/seed';
import { markRewardEarned } from '../lib/reward';
import { track } from '../lib/analytics';
import MeditationScreen from './MeditationScreen';

export default function AdRewardButton({
  adGroupId,
  userKey,
  scope,
  onUnlocked,
}: {
  adGroupId: string;
  userKey: string;
  scope: string;
  onUnlocked: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await preloadRewardedAd(adGroupId);
        if (mounted) setReady(true);
      } catch (e) {
        console.error(e);
        if (mounted) setReady(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [adGroupId]);

  const onClick = () => {
    if (loading) return;
    track('meditation_start');
    setShowMeditation(true);
  };

  const onMeditationComplete = () => {
    setShowMeditation(false);
    setLoading(true);
    track('meditation_complete');

    const onReward = () => {
      try {
        markRewardEarned(todayKey(), scope || 'detail');
      } catch {}
      setLoading(false);
      onUnlocked();
    };

    const onFallback = () => {
      // UX 우선: 광고 실패해도 완전 막지 않는다. (Soft-Gate)
      setLoading(false);
      onUnlocked();
    };

    showRewardedAd(adGroupId, onReward, onFallback);
  };

  const buttonText = loading
    ? '기운을 불러오는 중...'
    : ready
    ? '✨ 오늘의 운명 열어보기'
    : '기운을 모으는 중...';

  return (
    <>
      {showMeditation && (
        <MeditationScreen onComplete={onMeditationComplete} duration={5} />
      )}
      <Button
        size="large"
        color="primary"
        variant="fill"
        display="full"
        loading={loading}
        disabled={loading}
        onClick={onClick}
      >
        {buttonText}
      </Button>
    </>
  );
}
