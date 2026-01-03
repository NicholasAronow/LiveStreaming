import type { AppSession } from '@mentra/sdk';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';
import { STREAM_RECONNECT_TIMEOUT_MS, STREAM_RECONNECT_RETRY_INTERVAL_MS } from '../utils/constants';

// Track retry state per user
const retryState = new Map<string, {
  reconnectStartTime: number; // When reconnection started
  isRetrying: boolean;
  abortController: AbortController | null; // To cancel ongoing reconnection
}>();

// Errors that should NOT trigger auto-retry (permanent failures)
const NON_RECOVERABLE_ERRORS = [
  'authentication',
  'unauthorized',
  'forbidden',
  'invalid key',
  'invalid stream key',
  'quota exceeded',
  'billing',
  'subscription',
];

/**
 * Checks if an error is recoverable (worth retrying)
 */
function isRecoverableError(errorMessage: string): boolean {
  const lowerMessage = errorMessage.toLowerCase();
  return !NON_RECOVERABLE_ERRORS.some(term => lowerMessage.includes(term));
}

/**
 * Gets or creates retry state for a user
 */
function getRetryState(userId: string) {
  if (!retryState.has(userId)) {
    retryState.set(userId, {
      reconnectStartTime: 0,
      isRetrying: false,
      abortController: null,
    });
  }
  return retryState.get(userId)!;
}

/**
 * Resets retry state for a user (call on successful stream start or when giving up)
 */
export function resetRetryState(userId: string): void {
  const state = retryState.get(userId);
  if (state?.abortController) {
    state.abortController.abort();
  }
  retryState.delete(userId);
  console.log(`[stream-recovery] Reset retry state for ${userId}`);
}

/**
 * Handles stream errors with auto-stop and status broadcasting
 * Does NOT broadcast multiple states - just prepares for reconnection
 * @param session The active session
 * @param userId The user ID
 * @param errorData The error data from stream status
 * @returns true if error was handled and retry should be attempted
 */
export async function handleStreamError(
  session: AppSession,
  userId: string,
  errorData: any
): Promise<boolean> {
  const errorMessage = errorData.message || errorData.status || 'Unknown error';

  console.error(`❌ [${userId}] Stream entered error state: ${errorData.status}`);
  console.error(`❌ [${userId}] Error message:`, errorMessage);
  console.error(`❌ [${userId}] Full error data:`, JSON.stringify(errorData, null, 2));

  // Check if this is a recoverable error
  const recoverable = isRecoverableError(errorMessage);
  console.log(`[${userId}] Error recoverable: ${recoverable}`);

  // Try to stop the stream silently
  console.log(`[${userId}] Auto-stopping managed stream...`);
  try {
    await session.camera.stopManagedStream();
    console.log(`[${userId}] Auto-stop completed successfully`);
  } catch (stopErr) {
    console.error(`[${userId}] Failed to auto-stop errored stream:`, stopErr);
  }

  // If not recoverable, broadcast error and reset state
  if (!recoverable) {
    const sess = session as any;
    sess.streamType = 'managed';
    sess.streamStatus = 'error';
    sess.error = errorMessage;
    sess.streamId = null;
    sess.previewUrl = null;
    sess.hlsUrl = null;
    sess.dashUrl = null;
    broadcastStreamStatus(userId, formatStreamStatus(session));
  }

  return recoverable;
}

/**
 * Attempts to restart a stream using time-based reconnection.
 * Will keep trying for STREAM_RECONNECT_TIMEOUT_MS milliseconds.
 * Broadcasts a single "reconnecting" status during the entire process.
 * @param session The active session
 * @param userId The user ID
 * @returns true if restart was successful
 */
export async function attemptStreamRestart(
  session: AppSession,
  userId: string
): Promise<boolean> {
  const state = getRetryState(userId);
  const sess = session as any;

  // Check if we're already retrying
  if (state.isRetrying) {
    console.log(`[${userId}] Reconnection already in progress, skipping...`);
    return false;
  }

  // Start reconnection window
  state.isRetrying = true;
  state.reconnectStartTime = Date.now();
  state.abortController = new AbortController();

  const timeoutSeconds = Math.round(STREAM_RECONNECT_TIMEOUT_MS / 1000);
  console.log(`[${userId}] Starting ${timeoutSeconds}s reconnection window...`);

  // Broadcast "reconnecting" status once at the start
  sess.streamType = 'managed';
  sess.streamStatus = 'reconnecting';
  sess.error = null;
  broadcastStreamStatus(userId, formatStreamStatus(session));

  let attemptCount = 0;

  // Keep trying until timeout expires
  while (Date.now() - state.reconnectStartTime < STREAM_RECONNECT_TIMEOUT_MS) {
    // Check if aborted
    if (state.abortController?.signal.aborted) {
      console.log(`[${userId}] Reconnection aborted`);
      break;
    }

    attemptCount++;
    const elapsedMs = Date.now() - state.reconnectStartTime;
    const remainingMs = STREAM_RECONNECT_TIMEOUT_MS - elapsedMs;
    const remainingSeconds = Math.round(remainingMs / 1000);

    console.log(`[${userId}] Reconnection attempt ${attemptCount} (${remainingSeconds}s remaining)...`);

    try {
      // Build options from saved config
      let options: any = undefined;
      if (sess.restreamDestinations && sess.restreamDestinations.length > 0) {
        console.log(`[${userId}] Restarting with restream configuration...`);
        options = { restreamDestinations: sess.restreamDestinations };
      } else {
        console.log(`[${userId}] Restarting basic managed stream (no restream)...`);
      }

      await session.camera.startManagedStream(options);

      console.log(`✅ [${userId}] Reconnection successful on attempt ${attemptCount}`);

      // Clear error and let normal status updates take over
      sess.error = null;
      // Don't broadcast here - the SDK will send a status update that triggers normal flow

      resetRetryState(userId);
      return true;

    } catch (restartErr) {
      const errorMessage = String(restartErr);
      console.error(`❌ [${userId}] Reconnection attempt ${attemptCount} failed:`, errorMessage);

      // Check if this error is non-recoverable
      if (!isRecoverableError(errorMessage)) {
        console.error(`❌ [${userId}] Non-recoverable error detected, stopping reconnection`);
        sess.streamStatus = 'error';
        sess.error = `Stream failed: ${errorMessage}`;
        broadcastStreamStatus(userId, formatStreamStatus(session));
        resetRetryState(userId);
        return false;
      }

      // Check if we still have time remaining
      const timeRemaining = STREAM_RECONNECT_TIMEOUT_MS - (Date.now() - state.reconnectStartTime);
      if (timeRemaining <= 0) {
        break;
      }

      // Wait before next attempt (but don't wait longer than remaining time)
      const waitTime = Math.min(STREAM_RECONNECT_RETRY_INTERVAL_MS, timeRemaining);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // Timeout reached - give up
  const totalSeconds = Math.round(STREAM_RECONNECT_TIMEOUT_MS / 1000);
  console.error(`❌ [${userId}] Reconnection failed after ${totalSeconds} seconds (${attemptCount} attempts). Giving up.`);

  sess.streamStatus = 'offline';
  sess.streamType = null;
  sess.streamId = null;
  sess.previewUrl = null;
  sess.hlsUrl = null;
  sess.dashUrl = null;
  sess.error = `Stream disconnected. Reconnection failed after ${totalSeconds} seconds.`;
  broadcastStreamStatus(userId, formatStreamStatus(session));

  resetRetryState(userId);
  return false;
}

/**
 * Gets current retry state for a user (for monitoring/debugging)
 */
export function getRetryStatus(userId: string): {
  isRetrying: boolean;
  elapsedMs: number;
  timeoutMs: number;
} | null {
  const state = retryState.get(userId);
  if (!state) return null;
  return {
    isRetrying: state.isRetrying,
    elapsedMs: state.reconnectStartTime > 0 ? Date.now() - state.reconnectStartTime : 0,
    timeoutMs: STREAM_RECONNECT_TIMEOUT_MS,
  };
}
