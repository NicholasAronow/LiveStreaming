import type { AppSession, AppServer } from '@mentra/sdk';
import type { Application } from 'express';
import { getUserIdFromRequest } from '../middleware/auth.middleware';
import {
  formatStreamStatus,
  registerSseClient,
  unregisterSseClient,
  writeSseEvent
} from '../services/sse.service';
import { SSE_HEARTBEAT_INTERVAL, SSE_STATUS_PING_INTERVAL } from '../utils/constants';

/**
 * Registers Server-Sent Events routes
 * @param app The Express application
 * @param getUserSession Function to get a user's active session
 */
export function registerSseRoutes(
  app: Application,
  getUserSession?: (userId: string) => AppSession | undefined
): void {
  // Server-Sent Events endpoint for real-time stream status updates
  app.get('/stream-status', (req: any, res: any) => {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      console.log('[/stream-status] No userId - returning 401');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get the active session for this user
    let activeSession: AppSession | undefined = req.activeSession;
    if (!activeSession && getUserSession) {
      activeSession = getUserSession(userId);
    }

    // Get CORS origins for SSE headers
    const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');

    // Prepare SSE headers with CORS support
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': req.headers.origin || corsOrigins[0],
      'Access-Control-Allow-Credentials': 'true',
    });

    // Let the client know how long to wait before retrying
    res.write('retry: 3000\n\n');

    // Send initial status immediately
    const initial = formatStreamStatus(activeSession ?? undefined);
    writeSseEvent(res, 'status', initial);

    // Track the connection for this user
    registerSseClient(userId, res);

    // Heartbeat to keep proxies from closing the connection
    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        // No-op; close will clean up
      }
    }, SSE_HEARTBEAT_INTERVAL);

    // Periodic status pings so clients can reflect session availability
    const statusPing = setInterval(() => {
      try {
        const currentSession = getUserSession ? getUserSession(userId) : req.activeSession;
        const snapshot = formatStreamStatus(currentSession ?? undefined);
        writeSseEvent(res, 'status', snapshot);
      } catch {
        // Ignore write errors; close will clean up
      }
    }, SSE_STATUS_PING_INTERVAL);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      clearInterval(statusPing);
      unregisterSseClient(userId, res);
    });
  });
}
