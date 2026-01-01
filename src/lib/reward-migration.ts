/**
 * Migration utility for syncing existing localStorage rewards to server.
 * Run once on app initialization to migrate legacy users.
 */
import { hasEarnedReward } from './reward';
import { checkRewardServer, earnRewardServer } from './reward-api';
import { todayKey } from './seed';

const MIGRATION_KEY = 'soul_lab:reward_migration_v1';

/**
 * Check if migration was already attempted today.
 */
function wasMigrationAttempted(): boolean {
  try {
    const lastAttempt = localStorage.getItem(MIGRATION_KEY);
    if (!lastAttempt) return false;
    return lastAttempt === todayKey();
  } catch {
    return false;
  }
}

/**
 * Mark migration as attempted for today.
 */
function markMigrationAttempted() {
  try {
    localStorage.setItem(MIGRATION_KEY, todayKey());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Migrate local rewards to server.
 * Only syncs today's rewards (historical data is not critical).
 * Non-blocking, best-effort.
 *
 * @param userKey - User identifier from getEffectiveUserKey()
 */
export async function migrateLocalRewardsToServer(userKey: string): Promise<void> {
  // Skip if already attempted today
  if (wasMigrationAttempted()) {
    return;
  }

  markMigrationAttempted();

  const dateKey = todayKey();
  const scopes = ['detail', 'daily']; // Common reward scopes

  for (const scope of scopes) {
    // Check if local has reward but server doesn't
    const hasLocal = hasEarnedReward(dateKey, scope);
    if (!hasLocal) continue;

    try {
      // Check server status
      const serverStatus = await checkRewardServer(userKey, dateKey, scope);
      if (serverStatus.earned) {
        // Server already has it, no migration needed
        continue;
      }

      // Migrate to server
      await earnRewardServer({ userKey, dateKey, scope });
      console.log(`[Migration] Synced reward ${dateKey}:${scope} to server`);
    } catch (e) {
      console.warn(`[Migration] Failed to sync ${dateKey}:${scope}:`, e);
      // Don't throw - migration is best-effort
    }
  }
}
