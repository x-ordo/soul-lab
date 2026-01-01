import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { hasEarnedReward, markRewardEarned, markRewardEarnedLocalOnly } from './reward';
import { earnRewardServer } from './reward-api';

// Mock the reward API module
vi.mock('./reward-api', () => ({
  earnRewardServer: vi.fn(),
}));

const mockEarnRewardServer = earnRewardServer as MockedFunction<typeof earnRewardServer>;

describe('hasEarnedReward', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns false when no rewards earned', () => {
    expect(hasEarnedReward('20250115', 'daily')).toBe(false);
  });

  it('returns false for different dateKey', () => {
    markRewardEarnedLocalOnly('20250114', 'daily');
    expect(hasEarnedReward('20250115', 'daily')).toBe(false);
  });

  it('returns false for different scope', () => {
    markRewardEarnedLocalOnly('20250115', 'daily');
    expect(hasEarnedReward('20250115', 'bonus')).toBe(false);
  });

  it('returns true after marking reward', () => {
    markRewardEarnedLocalOnly('20250115', 'daily');
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
  });

  it('handles corrupted JSON', () => {
    localStorage.setItem('soul_lab:reward_ledger_v1', '{invalid}');
    expect(hasEarnedReward('20250115', 'daily')).toBe(false);
  });
});

describe('markRewardEarned (async with server validation)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('marks reward as earned when server confirms', async () => {
    mockEarnRewardServer.mockResolvedValue({ ok: true, already: false });

    const result = await markRewardEarned('user123', '20250115', 'daily');

    expect(result.success).toBe(true);
    expect(result.already).toBe(false);
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
    expect(mockEarnRewardServer).toHaveBeenCalledWith({
      userKey: 'user123',
      dateKey: '20250115',
      scope: 'daily',
    });
  });

  it('returns already=true when reward was already earned', async () => {
    mockEarnRewardServer.mockResolvedValue({ ok: false, already: true });

    const result = await markRewardEarned('user123', '20250115', 'daily');

    expect(result.success).toBe(true);
    expect(result.already).toBe(true);
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
  });

  it('does not cache locally when server rejects', async () => {
    mockEarnRewardServer.mockResolvedValue({ ok: false, already: false, error: 'rate_limited' });

    const result = await markRewardEarned('user123', '20250115', 'daily');

    expect(result.success).toBe(false);
    expect(result.error).toBe('rate_limited');
    expect(hasEarnedReward('20250115', 'daily')).toBe(false);
  });

  it('handles network errors', async () => {
    mockEarnRewardServer.mockRejectedValue(new Error('Network error'));

    const result = await markRewardEarned('user123', '20250115', 'daily');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
    expect(hasEarnedReward('20250115', 'daily')).toBe(false);
  });

  it('stores timestamp when server confirms', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    mockEarnRewardServer.mockResolvedValue({ ok: true, already: false });

    await markRewardEarned('user123', '20250115', 'daily');

    const raw = localStorage.getItem('soul_lab:reward_ledger_v1');
    const ledger = JSON.parse(raw!);
    expect(ledger['20250115']['daily']).toBe(Date.now());

    vi.useRealTimers();
  });

  it('allows multiple scopes on same date', async () => {
    mockEarnRewardServer.mockResolvedValue({ ok: true, already: false });

    await markRewardEarned('user123', '20250115', 'daily');
    await markRewardEarned('user123', '20250115', 'bonus');
    await markRewardEarned('user123', '20250115', 'referral');

    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
    expect(hasEarnedReward('20250115', 'bonus')).toBe(true);
    expect(hasEarnedReward('20250115', 'referral')).toBe(true);
  });

  it('allows same scope on different dates', async () => {
    mockEarnRewardServer.mockResolvedValue({ ok: true, already: false });

    await markRewardEarned('user123', '20250114', 'daily');
    await markRewardEarned('user123', '20250115', 'daily');
    await markRewardEarned('user123', '20250116', 'daily');

    expect(hasEarnedReward('20250114', 'daily')).toBe(true);
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
    expect(hasEarnedReward('20250116', 'daily')).toBe(true);
  });

  it('is idempotent - marking twice does not error', async () => {
    mockEarnRewardServer.mockResolvedValue({ ok: true, already: false });

    await markRewardEarned('user123', '20250115', 'daily');

    mockEarnRewardServer.mockResolvedValue({ ok: false, already: true });

    const result = await markRewardEarned('user123', '20250115', 'daily');
    expect(result.success).toBe(true);
    expect(result.already).toBe(true);
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
  });

  it('preserves existing rewards when adding new one', async () => {
    mockEarnRewardServer.mockResolvedValue({ ok: true, already: false });

    await markRewardEarned('user123', '20250114', 'daily');
    await markRewardEarned('user123', '20250115', 'bonus');

    expect(hasEarnedReward('20250114', 'daily')).toBe(true);
    expect(hasEarnedReward('20250115', 'bonus')).toBe(true);
  });
});

describe('markRewardEarnedLocalOnly (deprecated)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('marks reward without server call (for migration)', () => {
    markRewardEarnedLocalOnly('20250115', 'daily');
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
  });

  it('stores timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

    markRewardEarnedLocalOnly('20250115', 'daily');

    const raw = localStorage.getItem('soul_lab:reward_ledger_v1');
    const ledger = JSON.parse(raw!);
    expect(ledger['20250115']['daily']).toBe(Date.now());

    vi.useRealTimers();
  });
});
