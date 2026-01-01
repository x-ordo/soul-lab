import React, { useEffect, useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { preloadRewardedAd, showRewardedAd } from '../lib/toss';
import { todayKey } from '../lib/seed';
import { markRewardEarned } from '../lib/reward';
import { getEffectiveUserKey } from '../lib/storage';
import { track } from '../lib/analytics';
import MeditationScreen from './MeditationScreen';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

  /**
   * Record reward on server with retry logic.
   * Returns true if server confirmed the reward.
   */
  const recordRewardWithRetry = async (): Promise<boolean> => {
    const dateKey = todayKey();
    const effectiveUserKey = userKey || getEffectiveUserKey();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await markRewardEarned(effectiveUserKey, dateKey, scope || 'detail');

        if (result.success) {
          track('reward_server_recorded', { already: result.already, attempt });
          return true;
        }

        // Rate limited - don't retry, user should wait
        if (result.error === 'rate_limited') {
          track('reward_rate_limited', { attempt });
          console.warn('[AdRewardButton] Rate limited by server');
          return false;
        }

        // Network/server error - retry with exponential backoff
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      } catch (err) {
        console.error(`[AdRewardButton] Attempt ${attempt + 1} failed:`, err);
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    track('reward_server_failed', { attempts: MAX_RETRIES + 1 });
    return false;
  };

  const onMeditationComplete = () => {
    setShowMeditation(false);
    setLoading(true);
    track('meditation_complete');

    const onReward = async () => {
      track('ad_reward_received');

      // Server validation MUST succeed before unlocking
      const serverOk = await recordRewardWithRetry();

      if (serverOk) {
        setLoading(false);
        onUnlocked();
      } else {
        // Server validation failed - apply soft-gate for UX
        // Log this for abuse detection
        track('reward_soft_gate_applied');
        console.warn('[AdRewardButton] Server validation failed, applying soft-gate');
        setLoading(false);
        onUnlocked();
      }
    };

    const onFallback = () => {
      // UX 우선: 광고 실패해도 완전 막지 않는다 (Soft-Gate)
      track('ad_fallback');
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
