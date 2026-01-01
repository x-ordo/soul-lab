/**
 * Leaderboard Page
 *
 * Shows referral rankings with weekly/all-time tabs.
 * Gamifies viral sharing with anonymous display names.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEffectiveUserKey } from '../lib/storage';
import { track } from '../lib/analytics';
import './LeaderboardPage.css';

// ============================================
// Types
// ============================================

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  referrals: number;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
  weekStart?: string;
}

interface UserStats {
  displayName?: string;
  totalReferrals: number;
  weeklyReferrals: number;
  weeklyRank: number | null;
  allTimeRank: number | null;
}

// ============================================
// API
// ============================================

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function fetchLeaderboard(type: 'weekly' | 'alltime', userKey: string): Promise<LeaderboardResponse> {
  const response = await fetch(`${API_BASE}/api/leaderboard/${type}?userKey=${encodeURIComponent(userKey)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchMyStats(userKey: string): Promise<UserStats> {
  const response = await fetch(`${API_BASE}/api/leaderboard/me?userKey=${encodeURIComponent(userKey)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// ============================================
// Components
// ============================================

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="rank-badge gold">1</span>;
  if (rank === 2) return <span className="rank-badge silver">2</span>;
  if (rank === 3) return <span className="rank-badge bronze">3</span>;
  return <span className="rank-badge">{rank}</span>;
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className={`leaderboard-row ${entry.isCurrentUser ? 'current-user' : ''}`}>
      <RankBadge rank={entry.rank} />
      <span className="display-name">{entry.displayName}</span>
      <span className="referral-count">{entry.referrals}명</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <span className="empty-icon">🏆</span>
      <p>아직 리더보드에 참여자가 없어요</p>
      <p className="empty-hint">친구를 초대하면 리더보드에 올라갈 수 있어요!</p>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

type TabType = 'weekly' | 'alltime';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const userKey = getEffectiveUserKey();

  const [activeTab, setActiveTab] = useState<TabType>('weekly');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [myStats, setMyStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track('leaderboard_view', { tab: activeTab });
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [leaderboardData, statsData] = await Promise.all([
          fetchLeaderboard(activeTab, userKey),
          fetchMyStats(userKey),
        ]);

        if (!cancelled) {
          setData(leaderboardData);
          setMyStats(statsData);
        }
      } catch (e) {
        if (!cancelled) {
          setError('리더보드를 불러올 수 없어요');
          console.error('[leaderboard] fetch error:', e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activeTab, userKey]);

  function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    track('leaderboard_tab_change', { tab });
  }

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <button className="back-button" onClick={() => navigate(-1)} aria-label="뒤로가기">
          ←
        </button>
        <h1>초대 리더보드</h1>
      </header>

      {/* My Stats Card */}
      {myStats && (
        <div className="my-stats-card">
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">이번 주</span>
              <span className="stat-value">{myStats.weeklyReferrals}명</span>
              {myStats.weeklyRank && <span className="stat-rank">#{myStats.weeklyRank}</span>}
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-label">누적</span>
              <span className="stat-value">{myStats.totalReferrals}명</span>
              {myStats.allTimeRank && <span className="stat-rank">#{myStats.allTimeRank}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'weekly'}
          className={`tab ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => handleTabChange('weekly')}
        >
          이번 주
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'alltime'}
          className={`tab ${activeTab === 'alltime' ? 'active' : ''}`}
          onClick={() => handleTabChange('alltime')}
        >
          전체
        </button>
      </div>

      {/* Content */}
      <div className="leaderboard-content">
        {loading && (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" />
            로딩 중...
          </div>
        )}

        {error && <div className="error-state">{error}</div>}

        {!loading && !error && data && (
          <>
            {data.leaderboard.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="leaderboard-list">
                {data.leaderboard.map((entry) => (
                  <LeaderboardRow key={`${entry.rank}-${entry.displayName}`} entry={entry} />
                ))}

                {/* Show user rank if not in top 50 */}
                {data.userRank && (
                  <>
                    <div className="rank-separator">...</div>
                    <LeaderboardRow entry={data.userRank} />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA */}
      <div className="leaderboard-cta">
        <button className="invite-button" onClick={() => navigate('/chemistry')}>
          친구 초대하고 순위 올리기
        </button>
      </div>
    </div>
  );
}
