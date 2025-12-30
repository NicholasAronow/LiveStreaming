import type { AppSession } from '@mentra/sdk';
import { broadcastStreamStatus, formatStreamStatus } from '../setup';

// Retry configuration
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 2000; // 2 seconds
const MAX_RETRY_DELAY_MS = 30000; // 30 seconds
const BACKOFF_MULTIPLIER = 2;

// Track retry state per user
const retryState = new Map<string, {
  attempts: number;
  lastAttemptTime: number;
  isRetrying: boolean;
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
 * Calculates delay for exponential backoff
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

/**
 * Gets or creates retry state for a user
 */
function getRetryState(userId: string) {
  if (!retryState.has(userId)) {
    retryState.set(userId, {
      attempts: 0,
      lastAttemptTime: 0,
      isRetrying: false,
    });
  }
  return retryState.get(userId)!;
}

/**
 * Resets retry state for a user (call on successful stream start)
 */
export function resetRetryState(userId: string): void {
  retryState.delete(userId);
  console.log(`[stream-recovery] Reset retry state for ${userId}`);
}

/**
 * Handles stream errors with auto-stop and status broadcasting
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

  const sess = session as any;

  // Check if this is a recoverable error
  const recoverable = isRecoverableError(errorMessage);
  console.log(`[${userId}] Error recoverable: ${recoverable}`);

  // First broadcast the error status
  sess.streamType = 'managed';
  sess.streamStatus = errorData.status;
  sess.error = errorMessage;
  broadcastStreamStatus(userId, formatStreamStatus(session));

  // Then cleanup - try to stop the stream
  console.log(`[${userId}] Auto-stopping managed stream...`);
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

  // Broadcast offline status (keep error message for user visibility)
  broadcastStreamStatus(userId, formatStreamStatus(session));

  return recoverable;
}

/**
 * Attempts to restart a stream with exponential backoff
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
    console.log(`[${userId}] Retry already in progress, skipping...`);
    return false;
  }

  // Check if we've exceeded max attempts
  if (state.attempts >= MAX_RETRY_ATTEMPTS) {
    console.error(`❌ [${userId}] Max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Giving up.`);
    sess.error = `Stream failed after ${MAX_RETRY_ATTEMPTS} retry attempts. Please try starting manually.`;
    broadcastStreamStatus(userId, formatStreamStatus(session));
    resetRetryState(userId);
    return false;
  }

  state.isRetrying = true;
  state.attempts++;

  // Calculate backoff delay
  const delay = calculateBackoffDelay(state.attempts - 1);
  console.log(`[${userId}] Retry attempt ${state.attempts}/${MAX_RETRY_ATTEMPTS} in ${delay}ms...`);

  // Broadcast retry status to user
  sess.error = `Reconnecting... (attempt ${state.attempts}/${MAX_RETRY_ATTEMPTS})`;
  broadcastStreamStatus(userId, formatStreamStatus(session));

  // Wait with exponential backoff
  await new Promise((resolve) => setTimeout(resolve, delay));

  try {
    // Build options from saved config
    let options: any = undefined;
    if (sess.restreamDestinations && sess.restreamDestinations.length > 0) {
      console.log(`[${userId}] Auto-restarting stream with restream configuration...`);
      options = { restreamDestinations: sess.restreamDestinations };
    } else {
      console.log(`[${userId}] Auto-restarting basic managed stream (no restream)...`);
    }

    await session.camera.startManagedStream(options);

    console.log(`✅ [${userId}] Auto-restart successful on attempt ${state.attempts}`);
    state.isRetrying = false;
    state.lastAttemptTime = Date.now();

    // Clear error on success
    sess.error = null;
    broadcastStreamStatus(userId, formatStreamStatus(session));

    // Reset retry count on success
    resetRetryState(userId);
    return true;

  } catch (restartErr) {
    const errorMessage = String(restartErr);
    console.error(`❌ [${userId}] Retry attempt ${state.attempts} failed:`, errorMessage);

    state.isRetrying = false;
    state.lastAttemptTime = Date.now();

    // Check if this error is non-recoverable
    if (!isRecoverableError(errorMessage)) {
      console.error(`❌ [${userId}] Non-recoverable error detected, stopping retries`);
      sess.error = `Stream failed: ${errorMessage}`;
      broadcastStreamStatus(userId, formatStreamStatus(session));
      resetRetryState(userId);
      return false;
    }

    // Update error message with retry info
    sess.error = `Retry ${state.attempts}/${MAX_RETRY_ATTEMPTS} failed: ${errorMessage}`;
    broadcastStreamStatus(userId, formatStreamStatus(session));

    // Recursively try again if we haven't exceeded max attempts
    if (state.attempts < MAX_RETRY_ATTEMPTS) {
      return attemptStreamRestart(session, userId);
    }

    // Max attempts reached
    sess.error = `Stream failed after ${MAX_RETRY_ATTEMPTS} retry attempts. Please try starting manually.`;
    broadcastStreamStatus(userId, formatStreamStatus(session));
    resetRetryState(userId);
    return false;
  }
}

/**
 * Gets current retry state for a user (for monitoring/debugging)
 */
export function getRetryStatus(userId: string): { attempts: number; isRetrying: boolean; maxAttempts: number } | null {
  const state = retryState.get(userId);
  if (!state) return null;
  return {
    attempts: state.attempts,
    isRetrying: state.isRetrying,
    maxAttempts: MAX_RETRY_ATTEMPTS,
  };
}
