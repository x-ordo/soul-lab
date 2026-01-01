import React from 'react';
import { Button } from '@toss/tds-mobile';
import LockedBlur from './LockedBlur';
import AdRewardButton from './AdRewardButton';
import MoreActionsSection from './MoreActionsSection';
import { UnlockActions, UnlockState, ReportData } from '../hooks/useUnlockLogic';
import { getStreak } from '../lib/streak';
import { qualifiesForFreeUnlock, getFreeUnlockMessage } from '../lib/streakBonus';
import { getDaysSinceFirstVisit } from '../lib/storage';
import { track } from '../lib/analytics';

// 광고 노출 시작일 (첫 방문 후 N일차부터)
const AD_DELAY_DAYS = 3;

interface LockedResultViewProps {
  state: UnlockState;
  actions: UnlockActions;
  reportData: ReportData;
}

// Extract preview (first N characters) from a string
function getPreview(text: string | undefined, maxLen = 12): string {
  if (!text) return '???';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen);
}

export default function LockedResultView({ state, actions, reportData }: LockedResultViewProps) {
  const adGroupId = (import.meta.env.VITE_REWARDED_AD_GROUP_ID as string) || 'ait-ad-test-rewarded-id';
  const { report } = reportData;

  const streak = getStreak();
  const hasFreeUnlock = qualifiesForFreeUnlock(streak);
  const freeUnlockMessage = getFreeUnlockMessage(streak);

  // 광고는 3일차부터 노출 (신규 유저 친화적)
  const daysSinceFirstVisit = getDaysSinceFirstVisit();
  const showAds = daysSinceFirstVisit >= AD_DELAY_DAYS;

  const handleFreeUnlock = () => {
    track('streak_free_unlock', { streak });
    actions.unlock();
  };

  return (
    <>
      <LockedBlur
        title="✨ 운명의 봉인"
        subtitle="기운을 모아 행운의 시간, 귀인, 주의점을 열어보세요"
        onUnlock={actions.unlock}
        sections={[
          { label: '🌟 행운의 시간', preview: getPreview(report.luckyTime) },
          { label: '👤 오늘의 귀인', preview: getPreview(report.helper) },
          { label: '⚠️ 주의할 기운', preview: getPreview(report.caution) },
        ]}
      />

      {/* 3일 연속 방문 무료 해제 보너스 */}
      {hasFreeUnlock && (
        <div style={{ marginTop: 12 }}>
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(147, 112, 219, 0.2))',
              border: '2px solid rgba(255, 215, 0, 0.5)',
              textAlign: 'center',
              animation: 'streak-bonus-glow 2s ease-in-out infinite',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎁</div>
            <div className="h2" style={{ color: '#ffd700', marginBottom: 4 }}>
              연속 방문 보너스!
            </div>
            <div className="small" style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: 12 }}>
              {freeUnlockMessage}
            </div>
            <Button size="large" color="primary" variant="fill" display="full" onClick={handleFreeUnlock}>
              🔓 무료로 봉인 해제하기
            </Button>
          </div>
          <style>{`
            @keyframes streak-bonus-glow {
              0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
              50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
            }
          `}</style>
        </div>
      )}

      {/* Primary: 광고 해제 (3일차부터) */}
      {showAds && !hasFreeUnlock && (
        <>
          <div style={{ height: 12 }} />
          <AdRewardButton
            adGroupId={adGroupId}
            userKey={state.myKey}
            scope="daily"
            onUnlocked={actions.unlock}
          />
        </>
      )}

      {/* 광고 미노출 시 안내 */}
      {!showAds && !hasFreeUnlock && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 16px',
            background: 'rgba(147, 112, 219, 0.1)',
            borderRadius: 10,
            textAlign: 'center',
          }}
        >
          <span className="small" style={{ color: 'rgba(255,255,255,0.6)' }}>
            🌙 {AD_DELAY_DAYS - daysSinceFirstVisit}일 후 추가 해제 방법 오픈
          </span>
        </div>
      )}

      {/* 스크롤 하단: 더보기 영역 */}
      <MoreActionsSection
        onChemistry={actions.onInviteChemistryContacts}
        onShare={actions.onShareResult}
        chemistryLabel="💕 친구 초대"
      />
    </>
  );
}

