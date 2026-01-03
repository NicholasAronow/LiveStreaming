import type { AppSession } from '@mentra/sdk';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';
import { handleStreamError, attemptStreamRestart } from '../services/stream-recovery.service';
import { clearStreamStartTimes } from '../services/cleanup.service';
import { clearStreamState } from '../services/stream.service';
import { hasActiveSseConnection } from '../services/sse.service';
import { detectExistingStream } from '../services/session-setup.service';
import type { User } from '../../shared/class/User';
import { hasPendingStreamRestart } from './device-state.handler';

/**
 * Cleanup function type
 */
type CleanupFunction = () => void;

// Track stream stability per user - detect oscillation between states
const streamStabilityState = new Map<string, {
  lastStatus: string;
  lastStatusTime: number;
  oscillationCount: number;
  isUnstable: boolean;
  refreshTimeout: NodeJS.Timeout | null;
}>();

// Constants for stability detection
const OSCILLATION_WINDOW_MS = 10000; // 10 seconds window to detect oscillation
const OSCILLATION_THRESHOLD = 3; // Number of status changes to consider unstable
const STABILITY_DELAY_MS = 3000; // Wait 3 seconds of stability before refreshing

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

    // Get or create stability state for this user
    if (!streamStabilityState.has(userId)) {
      streamStabilityState.set(userId, {
        lastStatus: '',
        lastStatusTime: 0,
        oscillationCount: 0,
        isUnstable: false,
        refreshTimeout: null,
      });
    }
    const stability = streamStabilityState.get(userId)!;

    // Check if this is a fresh stream after WiFi reconnection
    // If so, reset stability state to ensure we don't interfere with fresh stream updates
    if (sess._freshStreamAfterReconnect) {
      console.log(`[${userId}] Fresh stream after reconnection - resetting stability state`);
      stability.lastStatus = '';
      stability.lastStatusTime = 0;
      stability.oscillationCount = 0;
      stability.isUnstable = false;
      if (stability.refreshTimeout) {
        clearTimeout(stability.refreshTimeout);
        stability.refreshTimeout = null;
      }
      delete sess._freshStreamAfterReconnect;
    }

    const currentStatus = data.status?.toLowerCase() || '';
    const now = Date.now();

    // Detect oscillation (rapid status changes)
    if (stability.lastStatus && stability.lastStatus !== currentStatus) {
      const timeSinceLastChange = now - stability.lastStatusTime;

      if (timeSinceLastChange < OSCILLATION_WINDOW_MS) {
        stability.oscillationCount++;
        console.log(`[${userId}] Status oscillation detected: ${stability.lastStatus} -> ${currentStatus} (count: ${stability.oscillationCount})`);

        if (stability.oscillationCount >= OSCILLATION_THRESHOLD && !stability.isUnstable) {
          // Only mark as unstable/reconnecting if WiFi is actually disconnected
          // This prevents showing "reconnecting" during manual stop/start
          const wifiConnected = session.glassesWifiConnected;

          if (wifiConnected === false) {
            stability.isUnstable = true;
            console.log(`🔄 [${userId}] Stream became UNSTABLE (WiFi disconnected) - will refresh preview when stable`);

            // Broadcast "reconnecting" status to frontend
            sess.streamType = 'managed';
            sess.streamStatus = 'reconnecting';
            sess.error = null;
            broadcastStreamStatus(userId, formatStreamStatus(session));
          } else {
            console.log(`[${userId}] Status oscillation detected but WiFi is connected (${wifiConnected}) - not marking as reconnecting`);
            // Reset oscillation count since this isn't a true WiFi disconnection
            stability.oscillationCount = 0;
          }
        }
      } else {
        // Reset oscillation count if enough time has passed
        stability.oscillationCount = 1;
      }
    }

    stability.lastStatus = currentStatus;
    stability.lastStatusTime = now;

    // Clear any pending refresh timeout
    if (stability.refreshTimeout) {
      clearTimeout(stability.refreshTimeout);
      stability.refreshTimeout = null;
    }

    // If stream was unstable and is now active, schedule a refresh
    if (stability.isUnstable && currentStatus === 'active') {
      console.log(`[${userId}] Stream is active again after instability - scheduling preview refresh in ${STABILITY_DELAY_MS}ms`);

      stability.refreshTimeout = setTimeout(async () => {
        console.log(`🔄 [${userId}] Refreshing stream info after stability...`);
        try {
          // Call checkExistingStream to get fresh preview URL
          await detectExistingStream(session, userId);
          console.log(`✅ [${userId}] Stream info refreshed successfully`);

          // Reset stability state
          stability.isUnstable = false;
          stability.oscillationCount = 0;
        } catch (error) {
          console.error(`[${userId}] Failed to refresh stream info:`, error);
        }
      }, STABILITY_DELAY_MS);

      // Don't broadcast regular status update while waiting for refresh
      return;
    }

    // Normal status update - preserve existing values if not provided
    sess.streamType = 'managed';

    // Protect 'reconnecting' status from being overwritten by SDK status updates
    // This happens when we intentionally stop the stream for reconnection
    const existingStatus = sess.streamStatus?.toLowerCase();
    const incomingStatus = data.status?.toLowerCase();

    // Don't overwrite 'reconnecting' with 'stopped' - but ONLY if we have a pending restart
    // If there's no pending restart, it means the user manually stopped, so allow 'stopped' through
    if (existingStatus === 'reconnecting' && incomingStatus === 'stopped') {
      if (hasPendingStreamRestart(userId)) {
        console.log(`[${userId}] Ignoring 'stopped' status - currently reconnecting with pending restart`);
        return; // Don't update status, don't broadcast
      } else {
        console.log(`[${userId}] Allowing 'stopped' status through - no pending restart (manual stop)`);
        // Fall through to update status normally
      }
    }

    // If status is downgrading from 'active' to 'initializing', treat it as reconnecting
    // This happens when WiFi drops and the stream is struggling
    const isDowngradeToInitializing = existingStatus === 'active' && incomingStatus === 'initializing';

    if (stability.isUnstable || isDowngradeToInitializing) {
      sess.streamStatus = 'reconnecting';
      if (isDowngradeToInitializing) {
        console.log(`[${userId}] Status downgrade from 'active' to 'initializing' detected - setting to 'reconnecting'`);
      }
    } else {
      sess.streamStatus = data.status;
    }
    sess.hlsUrl = data.hlsUrl ?? sess.hlsUrl ?? null;
    sess.dashUrl = data.dashUrl ?? sess.dashUrl ?? null;
    sess.directRtmpUrl = null;
    sess.streamId = data.streamId ?? sess.streamId ?? null;
    sess.error = null;
    // Preserve previewUrl if not provided (SDK doesn't always send it)
    sess.previewUrl = data.previewUrl ?? sess.previewUrl ?? null;
    sess.thumbnailUrl = data.thumbnailUrl ?? sess.thumbnailUrl ?? null;

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

      // Clean up stability state
      const stability = streamStabilityState.get(userId);
      if (stability?.refreshTimeout) {
        clearTimeout(stability.refreshTimeout);
      }
      streamStabilityState.delete(userId);

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
