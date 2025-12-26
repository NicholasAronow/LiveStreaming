import type { AppSession } from '@mentra/sdk';
import { CONNECTION_HEALTH_TIMEOUT } from '../utils/constants';

/**
 * Result of a connection health check
 */
export type ConnectionHealthResult = {
  ok: boolean;
  connected: boolean;
  error?: string;
  suggestion?: string;
  message?: string;
};

/**
 * Checks if the connection to the glasses is healthy
 * @param activeSession The active session to check
 * @returns Connection health result
 */
export async function checkConnectionHealth(
  activeSession?: AppSession
): Promise<ConnectionHealthResult> {
  if (!activeSession) {
    return {
      ok: false,
      connected: false,
      error: 'No active session - glasses may be disconnected'
    };
  }

  try {
    // Try to ping the connection with a quick check
    await Promise.race([
      activeSession.camera.checkExistingStream(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), CONNECTION_HEALTH_TIMEOUT)
      )
    ]);

    // Connection is healthy
    return {
      ok: true,
      connected: true,
      message: 'Connection is healthy'
    };
  } catch (healthError: any) {
    const errorMsg = String(healthError?.message ?? healthError);

    if (errorMsg.includes('WebSocket not connected') || errorMsg.includes('CLOSED')) {
      return {
        ok: false,
        connected: false,
        error: 'WebSocket disconnected',
        suggestion: 'Please refresh the page to reconnect'
      };
    } else if (errorMsg.includes('timeout')) {
      return {
        ok: false,
        connected: false,
        error: 'Connection timeout',
        suggestion: 'Check your glasses WiFi connection'
      };
    }

    return {
      ok: false,
      connected: false,
      error: errorMsg
    };
  }
}

/**
 * Validates that a session is connected and ready for operations
 * @param activeSession The session to validate
 * @param timeout Timeout in milliseconds
 * @returns True if connection is valid, throws error otherwise
 */
export async function validateConnection(
  activeSession: AppSession,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await Promise.race([
      activeSession.camera.checkExistingStream(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection check timeout')), timeout)
      )
    ]);
    return true;
  } catch (connectionError: any) {
    const errorMsg = String(connectionError?.message ?? connectionError);

    if (errorMsg.includes('WebSocket not connected') || errorMsg.includes('CLOSED')) {
      throw new Error('Connection to your glasses was lost. Please refresh the page to reconnect, then try again.');
    } else if (errorMsg.includes('timeout')) {
      throw new Error('Connection to your glasses timed out. Please check your WiFi connection and try again.');
    }

    throw connectionError;
  }
}
