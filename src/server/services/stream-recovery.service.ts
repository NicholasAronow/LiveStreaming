import type { AppSession } from '@mentra/sdk';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';

/**
 * Handles stream errors with auto-stop and status broadcasting
 * @param session The active session
 * @param userId The user ID
 * @param errorData The error data from stream status
 */
export async function handleStreamError(
  session: AppSession,
  userId: string,
  errorData: any
): Promise<void> {
  console.error(`❌ [${userId}] Stream entered error state: ${errorData.status}`);
  console.error(`❌ [${userId}] Error message:`, errorData.message || 'No message provided');
  console.error(`❌ [${userId}] Full error data:`, JSON.stringify(errorData, null, 2));
  console.log(`[${userId}] Auto-stopping managed stream...`);

  const sess = session as any;

  // First broadcast the error status
  sess.streamType = 'managed';
  sess.streamStatus = errorData.status;
  sess.error = errorData.message ?? 'Stream error';
  broadcastStreamStatus(userId, formatStreamStatus(session));

  // Then cleanup
  try {
    await session.camera.stopManagedStream();
    console.log(`[${userId}] Auto-stop completed successfully`);
  } catch (stopErr) {
    console.error(`[${userId}] Failed to auto-stop errored stream:`, stopErr);
  }

  // Reset session state after stop completes
  sess.streamStatus = 'offline';
  sess.streamType = null;
  sess.streamId = null;
  sess.previewUrl = null;
  sess.hlsUrl = null;
  sess.dashUrl = null;
  sess.error = null;

  // Broadcast offline status
  broadcastStreamStatus(userId, formatStreamStatus(session));
}

/**
 * Attempts to restart a stream with saved configuration
 * @param session The active session
 * @param userId The user ID
 */
export async function attemptStreamRestart(
  session: AppSession,
  userId: string
): Promise<void> {
  // Wait 2 seconds before auto-restart
  console.log(`[${userId}] Waiting 2 seconds before auto-restart...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const sess = session as any;

  try {
    // Check if we have restream config
    if (sess.restreamDestinations && sess.restreamDestinations.length > 0) {
      console.log(`[${userId}] Auto-restarting stream with restream configuration...`);
      const options = {
        restreamDestinations: sess.restreamDestinations,
      };
      await session.camera.startManagedStream(options);
    } else {
      // No restream destinations - just restart the basic managed stream
      console.log(`[${userId}] Auto-restarting basic managed stream (no restream)...`);
      await session.camera.startManagedStream();
    }
    console.log(`✅ [${userId}] Auto-restart initiated successfully`);
  } catch (restartErr) {
    console.error(`❌ [${userId}] Failed to auto-restart stream:`, restartErr);
    sess.error = 'Auto-restart failed: ' + String(restartErr);
    broadcastStreamStatus(userId, formatStreamStatus(session));
  }
}
