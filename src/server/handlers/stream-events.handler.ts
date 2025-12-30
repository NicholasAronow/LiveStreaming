import type { AppSession } from '@mentra/sdk';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';
import { handleStreamError, attemptStreamRestart } from '../services/stream-recovery.service';
import { clearStreamStartTimes } from '../services/cleanup.service';
import { clearStreamState } from '../services/stream.service';
import { hasActiveSseConnection } from '../services/sse.service';
import type { User } from '../../shared/class/User';

/**
 * Cleanup function type
 */
type CleanupFunction = () => void;

/**
 * Sets up all stream event handlers for a session
 * @param session The app session
 * @param userId The user ID
 * @param userSessionsMap The user sessions map
 * @returns Array of cleanup functions
 */
export function setupStreamEventHandlers(
  session: AppSession,
  userId: string,
  userSessionsMap: Map<string, User>
): CleanupFunction[] {
  const cleanupFunctions: CleanupFunction[] = [];

  // Managed stream status handler
  const statusUnsubscribe = session.camera.onManagedStreamStatus(async (data) => {
    console.log(`[${userId}] Stream status update:`, JSON.stringify(data, null, 2));
    const sess = session as any;

    // Handle error/failed states with auto-recovery
    if (
      data.status?.toLowerCase() === 'error' ||
      data.status?.toLowerCase() === 'failed'
    ) {
      const shouldRetry = await handleStreamError(session, userId, data);
      if (shouldRetry) {
        await attemptStreamRestart(session, userId);
      }
      return;
    }

    // Normal status update
    sess.streamType = 'managed';
    sess.streamStatus = data.status;
    sess.hlsUrl = data.hlsUrl ?? null;
    sess.dashUrl = data.dashUrl ?? null;
    sess.directRtmpUrl = null;
    sess.streamId = data.streamId ?? null;
    sess.error = null;
    sess.previewUrl = data.previewUrl ?? null;
    sess.thumbnailUrl = data.thumbnailUrl ?? null;

    broadcastStreamStatus(userId, formatStreamStatus(session));
  });
  cleanupFunctions.push(statusUnsubscribe);

  // RTMP stream status handler
  const rtmpStatusUnsubscribe = session.camera.onStreamStatus((data) => {
    console.log(data);
    session.streamType = 'unmanaged';
    session.streamStatus = data.status;
    session.hlsUrl = null;
    session.dashUrl = null;
    session.streamId = data.streamId ?? null;
    session.mangedRtmpRestreamUrls = null;
    session.error = data.errorDetails ?? null;
    broadcastStreamStatus(userId, formatStreamStatus(session));
  });
  cleanupFunctions.push(rtmpStatusUnsubscribe);

  // Battery updates handler
  const batteryUnsubscribe = session.events?.onGlassesBattery?.((data: any) => {
    try {
      const pct =
        typeof data?.percent === 'number'
          ? data.percent
          : typeof data === 'number'
          ? data
          : null;
      session.glassesBatteryPercent = pct ?? null;
    } catch {
      session.glassesBatteryPercent = null;
    }
    broadcastStreamStatus(userId, formatStreamStatus(session));
  }) ?? (() => {});
  cleanupFunctions.push(batteryUnsubscribe);

  // Connection state handler
  const connectionStateUnsubscribe = session.onGlassesConnectionState((state: any) => {
    try {
      console.log(`📡 [${userId}] Glasses connection state update:`, state);
      // Update WiFi status if available
      if (state?.wifi) {
        session.glassesWifiConnected = state.wifi.connected === true;
        session.glassesWifiSsid = state.wifi.ssid || null;
        console.log(
          `📶 [${userId}] WiFi status - Connected: ${session.glassesWifiConnected}, SSID: ${session.glassesWifiSsid}`
        );
      }
      broadcastStreamStatus(userId, formatStreamStatus(session));
    } catch (error) {
      console.error(`[${userId}] Error processing connection state:`, error);
    }
  });
  cleanupFunctions.push(connectionStateUnsubscribe);

  // Disconnect handler
  const disconnectedUnsubscribe = session.events.onDisconnected(async (info: any) => {
    try {
      console.log(`🔌 [${userId}] Disconnect event received:`, JSON.stringify(info, null, 2));

      // Only handle permanent disconnections
      if (info && typeof info === 'object' && info.permanent === true) {
        console.log(`🔌 [${userId}] Permanent disconnect detected`);

        const sess = session as any;

        // Stop any active stream to prevent zombie streams
        if (sess.streamType) {
          console.log(`🔌 [${userId}] Stopping active ${sess.streamType} stream due to permanent disconnect...`);
          try {
            if (sess.streamType === 'managed') {
              await session.camera.stopManagedStream();
            } else if (sess.streamType === 'unmanaged') {
              await session.camera.stopStream();
            }
            console.log(`✓ [${userId}] Stream stopped successfully on disconnect`);
          } catch (stopErr) {
            // Stream stop may fail if connection is already lost - that's okay
            console.warn(`[${userId}] Could not stop stream on disconnect (may already be stopped):`, stopErr);
          }
        }

        // Clear database records
        await clearStreamStartTimes(userId);

        // Check if frontend is still connected via SSE
        const frontendConnected = hasActiveSseConnection(userId);

        if (frontendConnected) {
          // Frontend is still active - keep the session but clear stream state
          // This allows the user to reconnect their glasses without refreshing
          console.log(`🔌 [${userId}] Frontend still connected - keeping session alive, clearing stream state`);
          clearStreamState(sess);
          // Broadcast updated status (session exists but no active stream)
          broadcastStreamStatus(userId, formatStreamStatus(session));
        } else {
          // No frontend connected - full cleanup
          console.log(`🔌 [${userId}] No frontend connected - removing session`);
          userSessionsMap.delete(userId);
          broadcastStreamStatus(userId, formatStreamStatus(undefined));
        }

        console.log(`🔌 [${userId}] Disconnect handling complete`);
      }
      // For transient disconnects, allow SDK auto-reconnect without UI flicker
    } catch (error) {
      console.error(`[${userId}] Error handling disconnect:`, error);
    }
  });
  cleanupFunctions.push(disconnectedUnsubscribe);

  return cleanupFunctions;
}
