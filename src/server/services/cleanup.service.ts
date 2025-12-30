import type { AppSession } from '@mentra/sdk';
import StreamConfig from '../../shared/model/StreamConfig';
import { User } from '../../shared/class/User';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';

/**
 * Clears stream start times for all platforms for a user
 * @param userId The user ID
 */
export async function clearStreamStartTimes(userId: string): Promise<void> {
  try {
    await StreamConfig.updateMany(
      { userId },
      { streamStartTime: null }
    );
    console.log(`[cleanup] Cleared stream start times for user: ${userId}`);
  } catch (dbError) {
    console.error('[cleanup] Failed to clear stream start times:', dbError);
  }
}

/**
 * Stops an active stream (managed or unmanaged)
 * @param session The active session
 * @returns True if a stream was stopped
 */
export async function stopActiveStream(session: AppSession): Promise<boolean> {
  if (!session.streamType) {
    return false;
  }

  try {
    if (session.streamType === 'managed') {
      await session.camera.stopManagedStream();
      console.log('Managed stream terminated');
      return true;
    } else if (session.streamType === 'unmanaged') {
      await session.camera.stopStream();
      console.log('Unmanaged stream terminated');
      return true;
    }
  } catch (streamError) {
    console.error('Error terminating stream:', streamError);
  }

  return false;
}

/**
 * Performs complete cleanup for a user session
 * @param userId The user ID
 * @param userSessionsMap The user sessions map
 */
export async function cleanupUserSession(
  userId: string,
  userSessionsMap: Map<string, User>
): Promise<void> {
  // Clear database records
  await clearStreamStartTimes(userId);

  // Remove from session map
  userSessionsMap.delete(userId);

  // Broadcast offline status
  broadcastStreamStatus(userId, formatStreamStatus(undefined));
}
