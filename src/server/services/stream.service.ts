import type { AppSession } from '@mentra/sdk';
import { buildRtmpUrl } from '../utils/platform-urls';
import { STREAM_STOP_DELAY } from '../utils/constants';
import StreamConfig from '../../shared/model/StreamConfig';

/**
 * Options for starting a stream
 */
export type StreamOptions = {
  platform?: string;
  streamKey?: string;
  customRtmpUrl?: string;
  useCloudflareManaged?: boolean;
};

/**
 * Checks if there's an existing stream and stops it if necessary
 * @param activeSession The active session
 * @returns True if an existing stream was stopped
 */
export async function stopExistingStreamIfNeeded(activeSession: AppSession): Promise<boolean> {
  try {
    const existingStreamInfo = await activeSession.camera.checkExistingStream();

    if (existingStreamInfo.hasActiveStream && existingStreamInfo.streamInfo?.type === 'managed') {
      console.log('[stream.service] Found existing managed stream, stopping it first...');
      await activeSession.camera.stopManagedStream();

      // Wait for the stream to fully stop
      await new Promise(resolve => setTimeout(resolve, STREAM_STOP_DELAY));

      // Verify the stream has actually stopped
      const checkAgain = await activeSession.camera.checkExistingStream();
      if (checkAgain.hasActiveStream) {
        console.log('[stream.service] Stream still active after stop, waiting another 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, STREAM_STOP_DELAY));
      }

      console.log('[stream.service] Existing stream stopped successfully');
      return true;
    }

    return false;
  } catch (error: any) {
    const errorMsg = String(error?.message ?? error);
    console.error('[stream.service] Error checking/stopping existing stream:', error);

    // Check if this is a WebSocket disconnection error
    if (errorMsg.includes('WebSocket not connected') || errorMsg.includes('CLOSED')) {
      throw new Error('Connection to your glasses was lost. Please ensure your glasses are connected to WiFi and try again.');
    }

    // For other errors, continue anyway
    return false;
  }
}

/**
 * Builds restream options for managed streams
 * @param session The session with stream configuration
 * @returns Restream options if applicable, or undefined
 */
export function buildRestreamOptions(session: any): any | undefined {
  if (!session.streamPlatform || session.streamPlatform === 'here') {
    return undefined;
  }

  const restreamUrl = buildRtmpUrl(
    session.streamPlatform,
    session.streamKey,
    session.customRtmpUrl
  );

  if (!restreamUrl) {
    return undefined;
  }

  const options = {
    restreamDestinations: [{
      url: restreamUrl,
      name: session.streamPlatform
    }]
  };

  // Store the restream destinations in the session
  session.restreamDestinations = options.restreamDestinations;

  return options;
}

/**
 * Saves stream start time to database
 * @param userId The user ID
 * @param platform The streaming platform
 */
export async function saveStreamStartTime(userId: string, platform: string): Promise<void> {
  try {
    await StreamConfig.findOneAndUpdate(
      { userId, platform },
      { streamStartTime: Date.now() },
      { new: true }
    );
    console.log(`[stream.service] Saved stream start time for platform: ${platform}`);
  } catch (dbError) {
    console.error('[stream.service] Failed to save start time:', dbError);
    // Don't fail the request if DB update fails
  }
}

/**
 * Starts a managed stream with the given options
 * @param activeSession The active session
 * @param options Stream options
 * @param userId The user ID
 * @returns Promise that resolves when stream starts
 */
export async function startManagedStream(
  activeSession: AppSession,
  options: any | undefined,
  userId: string
): Promise<void> {
  const streamPromise = activeSession.camera.startManagedStream(options);

  // Track cleanup functions
  const cleanup: { disconnectUnsubscribe?: () => void; timeoutId?: ReturnType<typeof setTimeout> } = {};

  // Create a promise that rejects on disconnect
  const disconnectPromise = new Promise<never>((_, reject) => {
    const handler = () => {
      reject(new Error('Cannot process request - smart glasses must be connected to WiFi for this operation'));
    };
    // Store the unsubscribe function returned by onDisconnected
    cleanup.disconnectUnsubscribe = activeSession.events.onDisconnected(handler);
  });

  // Timeout after 45 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    cleanup.timeoutId = setTimeout(() => reject(new Error('Stream start timeout - request took too long')), 45000);
  });

  try {
    await Promise.race([streamPromise, disconnectPromise, timeoutPromise]);
  } finally {
    // Always clean up resources
    if (cleanup.disconnectUnsubscribe) {
      cleanup.disconnectUnsubscribe();
      console.log(`[stream.service] Cleaned up disconnect handler for ${userId}`);
    }
    if (cleanup.timeoutId) {
      clearTimeout(cleanup.timeoutId);
      console.log(`[stream.service] Cleared timeout for ${userId}`);
    }
  }
}

/**
 * Starts an unmanaged RTMP stream
 * @param activeSession The active session
 * @param rtmpUrl The RTMP URL to stream to
 */
export async function startUnmanagedStream(
  activeSession: AppSession,
  rtmpUrl: string
): Promise<void> {
  await activeSession.camera.startStream({ rtmpUrl });
}

/**
 * Stops a managed stream
 * @param activeSession The active session
 * @returns True if a stream was stopped
 */
export async function stopManagedStream(activeSession: AppSession): Promise<boolean> {
  try {
    const streamInfo = await activeSession.camera.checkExistingStream();

    if (streamInfo.hasActiveStream && streamInfo.streamInfo?.type === 'managed') {
      console.log('[stream.service] Stopping active managed stream');
      await activeSession.camera.stopManagedStream();
      return true;
    } else {
      console.log('[stream.service] No managed stream found to stop');
      return false;
    }
  } catch (stopError) {
    console.error('[stream.service] Error during stop operation:', stopError);
    return false;
  }
}

/**
 * Stops an unmanaged stream
 * @param activeSession The active session
 * @returns True if a stream was stopped
 */
export async function stopUnmanagedStream(activeSession: AppSession): Promise<boolean> {
  const streamInfo = await activeSession.camera.checkExistingStream();

  if (streamInfo.hasActiveStream && streamInfo.streamInfo?.type === 'unmanaged') {
    await activeSession.camera.stopStream();
    return true;
  } else {
    console.log('[stream.service] No unmanaged stream found to stop');
    return false;
  }
}

/**
 * Clears stream state from session
 * @param session The session to clear
 */
export function clearStreamState(session: any): void {
  session.streamType = null;
  session.streamStatus = 'idle';
  session.hlsUrl = null;
  session.dashUrl = null;
  session.streamId = null;
  session.previewUrl = null;
  session.directRtmpUrl = null;
  session.error = null;
}
