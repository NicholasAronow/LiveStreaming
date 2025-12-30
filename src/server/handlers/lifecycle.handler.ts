import type { User } from '../../shared/class/User';
import { stopActiveStream, clearStreamStartTimes, cleanupUserSession } from '../services/cleanup.service';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';
import StreamConfig from '../../shared/model/StreamConfig';
import { releaseAllLocks } from '../services/operation-lock.service';
import { closeAllSseConnections, hasActiveSseConnection } from '../services/sse.service';
import { stopOrphanStreamMonitor, startOrphanStreamMonitor } from '../services/orphan-stream-monitor.service';
import { clearStreamState } from '../services/stream.service';

/**
 * Handles session stop events from the SDK
 * This is called when the SDK determines the session should end
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
  console.log(`📴 [${userId}] Session stop received - reason: ${reason}`);

  try {
    // Get the user and session before cleanup
    const user = userSessionsMap.get(userId);
    const session = user?.getUserSession();

    // Stop active streams
    if (session) {
      console.log(`📴 [${userId}] Stopping active stream before session cleanup...`);
      await stopActiveStream(session);
    }

    // Clear database records
    await clearStreamStartTimes(userId);

    // Check if frontend is still connected
    const frontendConnected = hasActiveSseConnection(userId);

    if (frontendConnected && user && session) {
      // Frontend is still active - keep the User in the map but clear the session
      // This allows the session to be re-established when glasses reconnect
      console.log(`📴 [${userId}] Frontend still connected - keeping User, clearing session`);
      clearStreamState(session as any);
      user.setUserSession(null);  // Clear the session but keep the User
      // Broadcast that session is no longer available but frontend is connected
      broadcastStreamStatus(userId, formatStreamStatus(undefined));
    } else {
      // No frontend connected - full cleanup
      console.log(`📴 [${userId}] No frontend connected - removing User from map`);
      userSessionsMap.delete(userId);
      broadcastStreamStatus(userId, formatStreamStatus(undefined));
    }
  } catch (error) {
    console.error(`📴 [${userId}] Error during session stop:`, error);
    // On error, still try to clean up
    userSessionsMap.delete(userId);
    broadcastStreamStatus(userId, formatStreamStatus(undefined));
  }
}

/**
 * Sets up graceful shutdown handlers for SIGINT, SIGTERM, and uncaught errors
 * Also starts the orphan stream monitor
 * @param userSessionsMap The user sessions map
 */
export function setupGracefulShutdown(
  userSessionsMap: Map<string, User>
): void {
  // Start the orphan stream monitor
  startOrphanStreamMonitor(userSessionsMap);

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
    // Step 1: Stop the orphan stream monitor
    console.log('[shutdown] Stopping orphan stream monitor...');
    stopOrphanStreamMonitor();

    // Step 2: Release all operation locks to unblock any pending operations
    console.log('[shutdown] Releasing all operation locks...');
    releaseAllLocks();

    // Step 3: Stop all active streams
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

    console.log('[shutdown] All streams stopped.');

    // Step 4: Close all SSE connections
    console.log('[shutdown] Closing all SSE connections...');
    closeAllSseConnections();

    // Step 5: Clear user sessions map
    console.log('[shutdown] Clearing user sessions...');
    userSessionsMap.clear();

    console.log('[shutdown] Graceful shutdown complete. Exiting...');
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  } finally {
    process.exit(0);
  }
}
