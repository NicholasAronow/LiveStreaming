import type { AppSession } from '@mentra/sdk';
import type { User } from '../../shared/class/User';
import { broadcastStreamStatus, formatStreamStatus, getActiveSseConnectionCount } from './sse.service';
import { clearStreamState } from './stream.service';
import { clearStreamStartTimes } from './cleanup.service';

// Configuration
const ORPHAN_CHECK_INTERVAL_MS = 60000; // Check every 1 minute
const ORPHAN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes without client = orphaned

// Track when each user last had an active SSE connection
const lastClientActivity = new Map<string, number>();

// Reference to the interval
let monitorInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Records client activity for a user (call when SSE client connects)
 */
export function recordClientActivity(userId: string): void {
  lastClientActivity.set(userId, Date.now());
}

/**
 * Clears client activity tracking for a user (call when user session ends)
 */
export function clearClientActivity(userId: string): void {
  lastClientActivity.delete(userId);
}

/**
 * Checks if a user's stream is orphaned (streaming without connected client)
 */
function isStreamOrphaned(userId: string, session: AppSession): boolean {
  const sess = session as any;

  // No active stream = not orphaned
  if (!sess.streamType) {
    return false;
  }

  // Check if user has any active SSE connections
  // Note: getActiveSseConnectionCount returns total count, we'd need per-user check
  // For now, check the lastClientActivity timestamp
  const lastActivity = lastClientActivity.get(userId);

  if (!lastActivity) {
    // No recorded activity and has active stream = potentially orphaned
    // Give some grace period (the timeout)
    return false; // Will be caught on next check if no activity recorded
  }

  const timeSinceActivity = Date.now() - lastActivity;
  return timeSinceActivity > ORPHAN_TIMEOUT_MS;
}

/**
 * Stops an orphaned stream and cleans up
 */
async function stopOrphanedStream(
  userId: string,
  user: User,
  userSessionsMap: Map<string, User>
): Promise<void> {
  const session = user.getUserSession();
  if (!session) return;

  const sess = session as any;
  console.log(`⏰ [${userId}] Orphaned stream detected (no client for ${ORPHAN_TIMEOUT_MS / 1000}s)`);
  console.log(`⏰ [${userId}] Stopping orphaned ${sess.streamType} stream...`);

  try {
    if (sess.streamType === 'managed') {
      await session.camera.stopManagedStream();
    } else if (sess.streamType === 'unmanaged') {
      await session.camera.stopStream();
    }
    console.log(`✓ [${userId}] Orphaned stream stopped successfully`);
  } catch (error) {
    console.error(`[${userId}] Failed to stop orphaned stream:`, error);
  }

  // Clear session state
  clearStreamState(sess);

  // Clear database records
  await clearStreamStartTimes(userId);

  // Broadcast status (even though no clients are connected, this ensures consistency)
  broadcastStreamStatus(userId, formatStreamStatus(session));

  // Clear activity tracking
  clearClientActivity(userId);

  console.log(`⏰ [${userId}] Orphaned stream cleanup complete`);
}

/**
 * Runs a single check for orphaned streams
 */
async function checkForOrphanedStreams(userSessionsMap: Map<string, User>): Promise<void> {
  const orphanedUsers: Array<{ userId: string; user: User }> = [];

  for (const [userId, user] of userSessionsMap.entries()) {
    const session = user.getUserSession();
    if (session && isStreamOrphaned(userId, session)) {
      orphanedUsers.push({ userId, user });
    }
  }

  if (orphanedUsers.length > 0) {
    console.log(`⏰ [orphan-monitor] Found ${orphanedUsers.length} orphaned stream(s)`);

    for (const { userId, user } of orphanedUsers) {
      await stopOrphanedStream(userId, user, userSessionsMap);
    }
  }
}

/**
 * Starts the orphan stream monitor
 */
export function startOrphanStreamMonitor(userSessionsMap: Map<string, User>): void {
  if (monitorInterval) {
    console.warn('[orphan-monitor] Monitor already running');
    return;
  }

  console.log(`[orphan-monitor] Starting orphan stream monitor (check every ${ORPHAN_CHECK_INTERVAL_MS / 1000}s, timeout ${ORPHAN_TIMEOUT_MS / 1000}s)`);

  monitorInterval = setInterval(async () => {
    try {
      await checkForOrphanedStreams(userSessionsMap);
    } catch (error) {
      console.error('[orphan-monitor] Error during orphan check:', error);
    }
  }, ORPHAN_CHECK_INTERVAL_MS);
}

/**
 * Stops the orphan stream monitor
 */
export function stopOrphanStreamMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[orphan-monitor] Monitor stopped');
  }
}

/**
 * Gets monitor status for debugging
 */
export function getMonitorStatus(): {
  isRunning: boolean;
  trackedUsers: number;
  checkIntervalMs: number;
  timeoutMs: number;
} {
  return {
    isRunning: monitorInterval !== null,
    trackedUsers: lastClientActivity.size,
    checkIntervalMs: ORPHAN_CHECK_INTERVAL_MS,
    timeoutMs: ORPHAN_TIMEOUT_MS,
  };
}
