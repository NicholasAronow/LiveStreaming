import type { AppSession } from '@mentra/sdk';
import type { Response } from 'express';
import '../streamSession'; // Import to extend AppSession type

/**
 * JSON payload that describes the current stream status for the control panel
 */
export type StreamStatusPayload = {
  streamType: 'managed' | 'unmanaged' | null;
  streamStatus?: string;
  hlsUrl?: string | null;
  dashUrl?: string | null;
  streamId?: string | null;
  directRtmpUrl?: string | null;
  mangedRtmpRestreamUrls?: string[] | null;
  previewUrl?: string | null;
  error?: string | null;
  glassesBatteryPercent?: number | null;
  hasActiveSession?: boolean;
  streamPlatform?: string | null;
};

/**
 * In-memory registry of SSE clients keyed by userId
 */
const sseClientsByUser = new Map<string, Set<Response>>();

/**
 * Builds a serializable status payload from an AppSession
 * @param session The AppSession to format
 * @returns The stream status payload
 */
export function formatStreamStatus(session?: AppSession): StreamStatusPayload {
  return {
    streamType: session?.streamType ?? null,
    streamStatus: session?.streamStatus,
    hlsUrl: session?.hlsUrl ?? null,
    dashUrl: session?.dashUrl ?? null,
    streamId: session?.streamId ?? null,
    directRtmpUrl: session?.directRtmpUrl ?? null,
    mangedRtmpRestreamUrls: session?.mangedRtmpRestreamUrls ?? null,
    previewUrl: session?.previewUrl ?? null,
    error: session?.error ?? null,
    glassesBatteryPercent: session?.glassesBatteryPercent ?? null,
    hasActiveSession: !!session,
    streamPlatform: session?.streamPlatform ?? null,
  };
}

/**
 * Broadcasts a status update to all active SSE clients for a user
 * @param userId The user ID
 * @param status The stream status payload to broadcast
 */
export function broadcastStreamStatus(userId: string, status: StreamStatusPayload): void {
  const clients = sseClientsByUser.get(userId);
  if (!clients || clients.size === 0) return;

  for (const res of clients) {
    writeSseEvent(res, 'status', status);
  }
}

/**
 * Writes a single SSE event to the given response
 * @param res The Express response object
 * @param event The event name
 * @param data The event data (will be JSON stringified)
 */
export function writeSseEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Registers an SSE client for a user
 * @param userId The user ID
 * @param res The Express response object
 */
export function registerSseClient(userId: string, res: Response): void {
  let clientSet = sseClientsByUser.get(userId);
  if (!clientSet) {
    clientSet = new Set<Response>();
    sseClientsByUser.set(userId, clientSet);
  }
  clientSet.add(res);
}

/**
 * Unregisters an SSE client for a user
 * @param userId The user ID
 * @param res The Express response object
 */
export function unregisterSseClient(userId: string, res: Response): void {
  const set = sseClientsByUser.get(userId);
  if (set) {
    set.delete(res);
    if (set.size === 0) {
      sseClientsByUser.delete(userId);
    }
  }
}

/**
 * Closes all SSE connections (used during graceful shutdown)
 * @returns The number of connections closed
 */
export function closeAllSseConnections(): number {
  let count = 0;
  for (const [userId, clients] of sseClientsByUser.entries()) {
    for (const res of clients) {
      try {
        res.end();
        count++;
      } catch (error) {
        console.error(`[sse.service] Error closing SSE connection for ${userId}:`, error);
      }
    }
  }
  sseClientsByUser.clear();
  console.log(`[sse.service] Closed ${count} SSE connections`);
  return count;
}

/**
 * Gets the count of active SSE connections
 * @returns The total number of active connections
 */
export function getActiveSseConnectionCount(): number {
  let count = 0;
  for (const clients of sseClientsByUser.values()) {
    count += clients.size;
  }
  return count;
}

/**
 * Checks if a specific user has active SSE connections (frontend is connected)
 * @param userId The user ID
 * @returns True if the user has at least one active SSE connection
 */
export function hasActiveSseConnection(userId: string): boolean {
  const clients = sseClientsByUser.get(userId);
  return clients !== undefined && clients.size > 0;
}
