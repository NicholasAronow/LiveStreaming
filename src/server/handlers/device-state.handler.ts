import type { AppSession } from '@mentra/sdk';
import type { User } from '../../shared/class/User';
import { broadcastStreamStatus, formatStreamStatus } from '../services/sse.service';
import { clearStreamState } from '../services/stream.service';
import { withStreamLock } from '../services/operation-lock.service';

// Track stream config for auto-restart after WiFi reconnection
interface PendingStreamRestart {
  restreamDestinations?: Array<{ url: string; name?: string }>;
  streamPlatform?: string;
  timestamp: number;
  timeoutId?: NodeJS.Timeout; // Timeout for reconnection failure
}

const pendingStreamRestarts = new Map<string, PendingStreamRestart>();

// Delay before auto-restarting stream after WiFi reconnects (let connection stabilize)
const WIFI_RECONNECT_DELAY_MS = 5000;

/**
 * Clears any pending stream restart for a user (e.g., when user manually stops)
 * @param userId The user ID
 * @returns True if a pending restart was cleared
 */
export function clearPendingStreamRestart(userId: string): boolean {
  const pending = pendingStreamRestarts.get(userId);
  if (pending) {
    // Clear the reconnection timeout
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
      console.log(`🛑 [${userId}] Cleared pending stream restart (user manually stopped)`);
    }
    pendingStreamRestarts.delete(userId);
    return true;
  }
  return false;
}

/**
 * Checks if a user has a pending stream restart
 * @param userId The user ID
 * @returns True if there's a pending restart
 */
export function hasPendingStreamRestart(userId: string): boolean {
  return pendingStreamRestarts.has(userId);
}

// Maximum time to wait for reconnection before giving up (50 seconds)
const RECONNECTION_TIMEOUT_MS = 50000;

/**
 * Sets up device state change listeners (WiFi, battery, model)
 * @param session The app session
 * @param userId The user ID
 * @param user The User instance
 */
export function setupDeviceStateListeners(
  session: AppSession,
  userId: string,
  user: User
): void {
  // WiFi connected status
  session.device.state.wifiConnected.onChange(async (connected) => {
    console.log(`[${userId}] WiFi status:`, connected);
    user.updateWifiConnected(connected);
    // Also update session state for stream reconnection detection
    session.glassesWifiConnected = connected;
    console.log(`[${userId}] Updated glass state:`, user.getGlassState());

    const sess = session as any;

    // Debug: Log all state when WiFi changes
    console.log(`📶 [${userId}] WiFi change detected:`, {
      connected,
      streamType: sess.streamType,
      streamStatus: sess.streamStatus,
      hasPendingRestart: pendingStreamRestarts.has(userId)
    });

    // WiFi DISCONNECTED - Stop the stream and save config for restart
    if (connected === false && sess.streamType === 'managed' &&
        sess.streamStatus && sess.streamStatus !== 'offline' &&
        sess.streamStatus !== 'reconnecting') {

      console.log(`📶 [${userId}] WiFi disconnected during active stream - stopping stream for clean restart`);

      // Start the 50-second timeout - if we don't reconnect in time, give up
      const timeoutId = setTimeout(() => {
        const pending = pendingStreamRestarts.get(userId);
        if (pending) {
          console.log(`⏰ [${userId}] Reconnection timeout (${RECONNECTION_TIMEOUT_MS / 1000}s) - giving up and resetting state`);
          pendingStreamRestarts.delete(userId);

          // Clear all stream state
          clearStreamState(sess);
          sess.streamStatus = 'offline';
          sess.error = 'Reconnection timed out after 50 seconds';

          broadcastStreamStatus(userId, formatStreamStatus(session));
        }
      }, RECONNECTION_TIMEOUT_MS);

      // Save the stream configuration for auto-restart
      pendingStreamRestarts.set(userId, {
        restreamDestinations: sess.restreamDestinations,
        streamPlatform: sess.streamPlatform,
        timestamp: Date.now(),
        timeoutId
      });

      // Broadcast reconnecting status to frontend
      sess.streamStatus = 'reconnecting';
      broadcastStreamStatus(userId, formatStreamStatus(session));

      // Stop the managed stream
      try {
        await session.camera.stopManagedStream();
        console.log(`📶 [${userId}] Managed stream stopped due to WiFi disconnect`);
      } catch (error) {
        console.error(`[${userId}] Error stopping stream on WiFi disconnect:`, error);
      }
    }

    // WiFi RECONNECTED - Auto-restart the stream if we have a pending restart
    if (connected === true) {
      const pendingRestart = pendingStreamRestarts.get(userId);

      if (pendingRestart) {
        // Clear the 50-second timeout since WiFi reconnected
        if (pendingRestart.timeoutId) {
          clearTimeout(pendingRestart.timeoutId);
          console.log(`📶 [${userId}] Cleared reconnection timeout - WiFi reconnected`);
        }

        // Check if the pending restart is not too old (max 5 minutes)
        const age = Date.now() - pendingRestart.timestamp;
        if (age > 5 * 60 * 1000) {
          console.log(`📶 [${userId}] Pending stream restart too old (${Math.round(age / 1000)}s), skipping auto-restart`);
          pendingStreamRestarts.delete(userId);
          sess.streamStatus = 'offline';
          broadcastStreamStatus(userId, formatStreamStatus(session));
          return;
        }

        console.log(`📶 [${userId}] WiFi reconnected - will auto-restart stream in ${WIFI_RECONNECT_DELAY_MS / 1000}s`);

        // Wait for WiFi connection to stabilize
        setTimeout(async () => {
          // Double-check WiFi is still connected and we still have the pending restart
          const stillPending = pendingStreamRestarts.get(userId);
          if (!stillPending || session.glassesWifiConnected !== true) {
            console.log(`📶 [${userId}] Conditions changed, skipping auto-restart`);
            // Clear timeout if conditions changed
            if (stillPending?.timeoutId) {
              clearTimeout(stillPending.timeoutId);
            }
            pendingStreamRestarts.delete(userId);
            return;
          }

          // Clear timeout and pending restart
          if (stillPending.timeoutId) {
            clearTimeout(stillPending.timeoutId);
          }
          pendingStreamRestarts.delete(userId);

          console.log(`📶 [${userId}] Starting fresh managed stream after WiFi reconnection`);

          // Use the stream lock to prevent conflicts with manual start/stop operations
          try {
            await withStreamLock(userId, 'start', async () => {
              // CRITICAL: Clear old stream URLs before starting fresh stream
              // This ensures we don't reuse stale HLS/preview URLs from the old stream
              sess.hlsUrl = null;
              sess.dashUrl = null;
              sess.previewUrl = null;
              sess.streamId = null;
              sess.streamStatus = 'connecting';  // Show connecting status while starting

              // Also reset any stability detection state since this is a fresh stream
              // This prevents the stability logic from interfering with fresh stream updates
              sess._freshStreamAfterReconnect = true;

              broadcastStreamStatus(userId, formatStreamStatus(session));

              // Build stream options with the saved restream destinations
              const options: any = {};
              if (stillPending.restreamDestinations && stillPending.restreamDestinations.length > 0) {
                options.restreamDestinations = stillPending.restreamDestinations;
                console.log(`📶 [${userId}] Restoring restream destinations:`, stillPending.restreamDestinations);
              }

              // Start a fresh managed stream
              await session.camera.startManagedStream(options);
              console.log(`✅ [${userId}] Stream auto-restarted successfully after WiFi reconnection`);
            });
          } catch (error) {
            console.error(`[${userId}] Failed to auto-restart stream after WiFi reconnection:`, error);
            sess.streamStatus = 'error';
            sess.error = 'Failed to restart stream after WiFi reconnection';
            broadcastStreamStatus(userId, formatStreamStatus(session));
          }
        }, WIFI_RECONNECT_DELAY_MS);
      }
    }
  });

  // Battery level
  session.device.state.batteryLevel.onChange((level) => {
    console.log(`[${userId}] Battery:`, level, "%");
    user.updateBatteryLevel(level);
    // Also update session state
    session.glassesBatteryPercent = level;
    console.log(`[${userId}] Updated glass state:`, user.getGlassState());
  });

  // Model name
  session.device.state.modelName.onChange((model) => {
    console.log(`[${userId}] Model:`, model);
    user.updateModelName(model);
    console.log(`[${userId}] Updated glass state:`, user.getGlassState());
  });

  // WiFi SSID
  session.device.state.wifiSsid.onChange((ssid) => {
    console.log(`[${userId}] WiFi SSID changed to:`, ssid);
    user.updateWifiSsid(ssid);
    // Also update session state
    session.glassesWifiSsid = ssid;
    console.log(`[${userId}] Updated glass state:`, user.getGlassState());
  });
}
