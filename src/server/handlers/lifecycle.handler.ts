import type { User } from '../../shared/class/User';
import { stopActiveStream, clearStreamStartTimes, cleanupUserSession } from '../services/cleanup.service';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';
import StreamConfig from '../../shared/model/StreamConfig';

/**
 * Handles session stop events
 * @param sessionId The session ID
 * @param userId The user ID
 * @param reason The stop reason
 * @param userSessionsMap The user sessions map
 */
export async function handleSessionStop(
  sessionId: string,
  userId: string,
  reason: string,
  userSessionsMap: Map<string, User>
): Promise<void> {
  try {
    // Get the user and session before cleanup
    const user = userSessionsMap.get(userId);
    const session = user?.getUserSession();

    // Stop active streams
    if (session) {
      await stopActiveStream(session);
    }

    // Clear database records
    await clearStreamStartTimes(userId);

    // Remove from session map
    userSessionsMap.delete(userId);
  } finally {
    // Always broadcast offline status
    broadcastStreamStatus(userId, formatStreamStatus(undefined));
  }
}

/**
 * Sets up graceful shutdown handlers for SIGINT, SIGTERM, and uncaught errors
 * @param userSessionsMap The user sessions map
 */
export function setupGracefulShutdown(
  userSessionsMap: Map<string, User>
): void {
  // Register signal handlers
  process.on('SIGINT', () => gracefulShutdown('SIGINT', userSessionsMap));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', userSessionsMap));

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await gracefulShutdown('UNCAUGHT_EXCEPTION', userSessionsMap);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await gracefulShutdown('UNHANDLED_REJECTION', userSessionsMap);
  });
}

/**
 * Performs graceful shutdown by stopping all active streams
 * @param signal The signal that triggered shutdown
 * @param userSessionsMap The user sessions map
 */
async function gracefulShutdown(
  signal: string,
  userSessionsMap: Map<string, User>
): Promise<void> {
  console.log(`\n${signal} received. Stopping all active streams...`);

  try {
    const stopPromises: Promise<void>[] = [];

    for (const [userId, user] of userSessionsMap.entries()) {
      const session = user.getUserSession();

      if (session && session.streamType) {
        console.log(`Stopping stream for user ${userId} (type: ${session.streamType})`);

        const stopPromise = (async () => {
          try {
            if (session.streamType === 'managed') {
              await session.camera.stopManagedStream();
              console.log(`✓ Managed stream stopped for user ${userId}`);
            } else if (session.streamType === 'unmanaged') {
              await session.camera.stopStream();
              console.log(`✓ Unmanaged stream stopped for user ${userId}`);
            }

            // Clear stream start times from database
            await StreamConfig.updateMany({ userId }, { streamStartTime: null });

            // Broadcast offline status
            broadcastStreamStatus(userId, formatStreamStatus(undefined));
          } catch (error) {
            console.error(`Failed to stop stream for user ${userId}:`, error);
          }
        })();

        stopPromises.push(stopPromise);
      }
    }

    // Wait for all streams to stop (with timeout)
    await Promise.race([
      Promise.all(stopPromises),
      new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
    ]);

    console.log('All streams stopped. Exiting...');
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  } finally {
    process.exit(0);
  }
}
