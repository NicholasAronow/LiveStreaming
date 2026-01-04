import type { AppSession, StreamType } from '@mentra/sdk';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';
import { consumePendingStreamStop, hasUserExplicitlyStopped } from '../handlers/device-state.handler';

/**
 * Initializes a session with subscriptions and WiFi setup
 * @param session The app session
 * @param userId The user ID
 */
export async function initializeSession(
  session: AppSession,
  userId: string
): Promise<void> {
  // Initialize WiFi state
  session.glassesSupportsWifi = null;
  session.glassesWifiConnected = null;
  session.glassesWifiSsid = null;

  // Check capabilities to see if glasses support WiFi
  if (session.capabilities) {
    session.glassesSupportsWifi = session.capabilities.hasWifi === true;
    console.log(`📶 [${userId}] Glasses WiFi support: ${session.glassesSupportsWifi}`);
  }

  // Subscribe to stream types
  session.subscribe('MANAGED_STREAM_STATUS' as StreamType);
  session.subscribe('RTMP_STREAM_STATUS' as StreamType);
  session.subscribe('GLASSES_CONNECTION_STATE' as StreamType);

  // Check for existing streams
  await detectExistingStream(session, userId);
}

/**
 * Detects and reconnects to existing streams
 * @param session The app session
 * @param userId The user ID
 */
export async function detectExistingStream(
  session: AppSession,
  userId: string
): Promise<void> {
  try {
    const streamInfo = await session.camera.checkExistingStream();

    if (streamInfo.hasActiveStream && streamInfo.streamInfo) {
      console.log('Found existing stream:', streamInfo.streamInfo.type);

      // Check if user explicitly stopped their stream - don't auto-reconnect
      // This covers: user pressed stop, then glasses disconnected/reconnected via Bluetooth
      if (hasUserExplicitlyStopped(userId) || consumePendingStreamStop(userId)) {
        console.log(`🛑 [${userId}] User explicitly stopped stream - stopping existing stream on glasses instead of reconnecting`);
        try {
          if (streamInfo.streamInfo.type === 'managed') {
            await session.camera.stopManagedStream();
          } else {
            await session.camera.stopStream();
          }
          console.log(`✅ [${userId}] Successfully stopped stream that user had explicitly stopped`);
        } catch (stopError) {
          console.error(`❌ [${userId}] Error stopping stream:`, stopError);
        }
        // Don't reconnect to the stream - user explicitly stopped it
        return;
      }

      if (streamInfo.streamInfo.type === 'managed') {
        // Managed stream is active - reconnect to it
        console.log('Reconnecting to existing managed stream...');

        session.streamType = 'managed';
        session.streamStatus = streamInfo.streamInfo.status || 'active';
        session.hlsUrl = streamInfo.streamInfo.hlsUrl || null;
        session.dashUrl = streamInfo.streamInfo.dashUrl || null;
        session.streamId = streamInfo.streamInfo.streamId || null;
        session.directRtmpUrl = null;
        session.error = null;
        session.previewUrl = streamInfo.streamInfo.previewUrl || null;

        broadcastStreamStatus(userId, formatStreamStatus(session));

        // Show notification in glasses
        session.layouts.showTextWall(
          `📺 Stream already active!\n\nHLS: ${
            streamInfo.streamInfo.hlsUrl || 'Generating...'
          }`
        );
      } else {
        // Unmanaged stream is active
        session.streamType = 'unmanaged';
        session.streamStatus = streamInfo.streamInfo.status || 'active';
        session.hlsUrl = null;
        session.dashUrl = null;
        session.streamId = streamInfo.streamInfo.streamId || null;
        session.directRtmpUrl = streamInfo.streamInfo.rtmpUrl || null;
        session.error = null;

        broadcastStreamStatus(userId, formatStreamStatus(session));

        // Show notification in glasses
        session.layouts.showTextWall(
          `⚠️ Another app is streaming to:\n${
            streamInfo.streamInfo.rtmpUrl || 'Unknown URL'
          }`
        );
      }
    }
  } catch (error) {
    console.error('Error checking existing stream:', error);
    // Continue with normal setup even if check fails
  }
}
