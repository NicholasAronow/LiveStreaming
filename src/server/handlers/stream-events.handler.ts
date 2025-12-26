import type { AppSession } from '@mentra/sdk';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';
import { handleStreamError, attemptStreamRestart } from '../services/stream-recovery.service';
import { clearStreamStartTimes } from '../services/cleanup.service';
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
      await handleStreamError(session, userId, data);
      await attemptStreamRestart(session, userId);
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
      // Only broadcast disconnected state if SDK marks it as permanent
      if (info && typeof info === 'object' && info.permanent === true) {
        await clearStreamStartTimes(userId);
        userSessionsMap.delete(userId);
        broadcastStreamStatus(userId, formatStreamStatus(undefined));
      }
      // Otherwise, allow auto-reconnect without UI flicker
    } catch {
      // No-op
    }
  });
  cleanupFunctions.push(disconnectedUnsubscribe);

  return cleanupFunctions;
}
