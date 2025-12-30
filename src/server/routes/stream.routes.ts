import type { AuthenticatedRequest } from '@mentra/sdk';
import type { AppSession } from '@mentra/sdk';
import type { Application } from 'express';
import { getUserIdFromRequest } from '../middleware/auth.middleware';
import { validateConnection } from '../services/connection.service';
import {
  stopExistingStreamIfNeeded,
  buildRestreamOptions,
  saveStreamStartTime,
  startManagedStream,
  startUnmanagedStream,
  stopManagedStream,
  stopUnmanagedStream,
  clearStreamState
} from '../services/stream.service';
import { broadcastStreamStatus, formatStreamStatus } from '../services/sse.service';
import { buildRtmpUrl } from '../utils/platform-urls';
import { withStreamLock, hasActiveLock } from '../services/operation-lock.service';
import { resetRetryState } from '../services/stream-recovery.service';

/**
 * Registers stream control routes
 * @param app The Express application
 * @param getUserSession Function to get a user's active session
 */
export function registerStreamRoutes(
  app: Application,
  getUserSession?: (userId: string) => AppSession | undefined
): void {
  // API: Start managed stream ("Stream to here")
  app.post('/api/stream/managed/start', async (req: AuthenticatedRequest, res: any) => {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      console.log('[/api/stream/managed/start] No userId - returning 401');
      res.status(401).json({ error: 'Unauthorized - no userId' });
      return;
    }

    // Check if an operation is already in progress
    const activeLock = hasActiveLock(userId);
    if (activeLock) {
      console.log(`[/api/stream/managed/start] Operation ${activeLock.operation} already in progress for ${userId}`);
      res.status(409).json({
        ok: false,
        error: `A ${activeLock.operation} operation is already in progress. Please wait for it to complete.`
      });
      return;
    }

    try {
      await withStreamLock(userId, 'start', async () => {
        console.log('[/api/stream/managed/start] Request received');
        console.log('[/api/stream/managed/start] userId:', userId);

        // Get the active session
        let activeSession: AppSession | undefined = req.activeSession ?? undefined;
        if (!activeSession && getUserSession) {
          activeSession = getUserSession(userId);
          console.log('[/api/stream/managed/start] Looked up session by userId:', activeSession ? 'found' : 'not found');
        }

        if (!activeSession) {
          console.log('[/api/stream/managed/start] No active session - returning 401');
          res.status(401).json({ error: 'Unauthorized - no active session' });
          return;
        }

        console.log('[/api/stream/managed/start] Starting managed stream for user:', userId);

        const session = activeSession as any;

        // Validate connection
        try {
          await validateConnection(activeSession);
          console.log('[/api/stream/managed/start] Connection check passed');
        } catch (connectionError: any) {
          console.error('[/api/stream/managed/start] Connection check failed:', connectionError.message);
          res.status(400).json({
            ok: false,
            error: connectionError.message
          });
          return;
        }

        // Check and stop existing stream
        try {
          await stopExistingStreamIfNeeded(activeSession);
        } catch (stopError: any) {
          res.status(400).json({
            ok: false,
            error: stopError.message
          });
          return;
        }

        // Save configuration
        if (req.body?.platform) session.streamPlatform = req.body.platform;
        if (req.body?.streamKey !== undefined) session.streamKey = req.body.streamKey;
        if (req.body?.customRtmpUrl !== undefined) session.customRtmpUrl = req.body.customRtmpUrl;
        if (req.body?.useCloudflareManaged !== undefined) session.useCloudflareManaged = req.body.useCloudflareManaged;

        // Build restream options
        const options = buildRestreamOptions(session);

        try {
          await startManagedStream(activeSession, options, userId);

          // Save stream start time to database
          if (session.streamPlatform && userId) {
            await saveStreamStartTime(userId, session.streamPlatform);
          }

          broadcastStreamStatus(userId, formatStreamStatus(activeSession));
          res.json({ ok: true });
        } catch (streamError: any) {
          const streamErrorMessage = String(streamError?.message ?? streamError);
          console.error(`[/api/stream/managed/start] Stream start error for ${userId}:`, streamErrorMessage);

          // Handle specific error types
          if (streamErrorMessage.includes('must be connected to WiFi')) {
            console.error(`❌ [${userId}] WiFi Error`);
            res.status(400).json({
              ok: false,
              error: 'Your glasses must be connected to WiFi to start streaming. Please connect your glasses to a WiFi network and try again.'
            });
          } else if (streamErrorMessage.includes('WebSocket not connected') || streamErrorMessage.includes('CLOSED')) {
            console.error(`❌ [${userId}] WebSocket Error`);
            res.status(400).json({
              ok: false,
              error: 'Connection to your glasses was lost while starting the stream. Please ensure your glasses are connected to WiFi and try again.'
            });
          } else if (streamErrorMessage.includes('Already streaming')) {
            console.error(`❌ [${userId}] Stream Conflict`);
            res.status(400).json({
              ok: false,
              error: 'A stream is already active. Please stop the current stream first, or wait a moment and try again.'
            });
          } else {
            res.status(400).json({ ok: false, error: streamErrorMessage });
          }
        }
      });
    } catch (err: any) {
      const errorMessage = String(err?.message ?? err);
      console.error(`[/api/stream/managed/start] Unexpected error for ${userId}:`, errorMessage);
      res.status(500).json({ ok: false, error: errorMessage });
    }
  });

  // API: Stop managed stream
  app.post('/api/stream/managed/stop', async (req: any, res: any) => {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      console.log('[/api/stream/managed/stop] No userId - returning 401');
      res.status(401).json({ error: 'Unauthorized - no userId' });
      return;
    }

    // Check if an operation is already in progress
    const activeLock = hasActiveLock(userId);
    if (activeLock) {
      console.log(`[/api/stream/managed/stop] Operation ${activeLock.operation} already in progress for ${userId}`);
      res.status(409).json({
        ok: false,
        error: `A ${activeLock.operation} operation is already in progress. Please wait for it to complete.`
      });
      return;
    }

    try {
      await withStreamLock(userId, 'stop', async () => {
        console.log('[/api/stream/managed/stop] Request received');
        console.log('[/api/stream/managed/stop] userId:', userId);

        // Get the active session
        let activeSession: AppSession | undefined = req.activeSession ?? undefined;
        if (!activeSession && getUserSession) {
          activeSession = getUserSession(userId);
          console.log('[/api/stream/managed/stop] Looked up session by userId:', activeSession ? 'found' : 'not found');
        }

        if (!activeSession) {
          console.log('[/api/stream/managed/stop] No active session - returning 401');
          res.status(401).json({ error: 'Unauthorized - no active session' });
          return;
        }

        console.log('[/api/stream/managed/stop] Stopping managed stream for user:', userId);

        const session = activeSession as any;

        // Reset retry state to cancel any in-progress auto-recovery
        resetRetryState(userId);

        await stopManagedStream(activeSession);

        // Always clear session state (including error)
        clearStreamState(session);
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
        res.json({ ok: true });
      });
    } catch (err: any) {
      console.error('Error stopping managed stream:', err);

      // Reset retry state even on error
      resetRetryState(userId);

      // Even if stop fails, update UI to reflect no stream
      let activeSession: AppSession | undefined = req.activeSession ?? undefined;
      if (!activeSession && getUserSession && userId) {
        activeSession = getUserSession(userId);
      }
      if (activeSession && userId) {
        const session = activeSession as any;
        clearStreamState(session);
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
      }
      res.status(400).json({ ok: false, error: String(err?.message ?? err) });
    }
  });

  // API: Start unmanaged RTMP stream
  app.post('/api/stream/unmanaged/start', async (req: any, res: any) => {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no userId' });
      return;
    }

    // Check if an operation is already in progress
    const activeLock = hasActiveLock(userId);
    if (activeLock) {
      console.log(`[/api/stream/unmanaged/start] Operation ${activeLock.operation} already in progress for ${userId}`);
      res.status(409).json({
        ok: false,
        error: `A ${activeLock.operation} operation is already in progress. Please wait for it to complete.`
      });
      return;
    }

    try {
      await withStreamLock(userId, 'start', async () => {
        console.log('[/api/stream/unmanaged/start] Request received');
        console.log('[/api/stream/unmanaged/start] userId:', userId);

        // Get the active session
        let activeSession: AppSession | undefined = req.activeSession ?? undefined;
        if (!activeSession && getUserSession) {
          activeSession = getUserSession(userId);
          console.log('[/api/stream/unmanaged/start] Looked up session by userId:', activeSession ? 'found' : 'not found');
        }

        if (!activeSession) {
          res.status(401).json({ error: 'Unauthorized - no active session' });
          return;
        }

        // Save configuration
        const session = activeSession as any;
        if (req.body?.platform) session.streamPlatform = req.body.platform;
        if (req.body?.streamKey !== undefined) session.streamKey = req.body.streamKey;
        if (req.body?.customRtmpUrl !== undefined) session.customRtmpUrl = req.body.customRtmpUrl;
        if (req.body?.useCloudflareManaged !== undefined) session.useCloudflareManaged = req.body.useCloudflareManaged;

        // Build RTMP URL
        let rtmpUrl: string | undefined = req.body?.rtmpUrl;

        if (!rtmpUrl) {
          rtmpUrl = buildRtmpUrl(
            session.streamPlatform,
            session.streamKey,
            session.customRtmpUrl
          );
        }

        if (!rtmpUrl) {
          res.status(400).json({ ok: false, error: 'Missing rtmpUrl - could not build URL from platform config' });
          return;
        }

        console.log('[/api/stream/unmanaged/start] Starting stream to:', rtmpUrl.replace(/\/[^/]*$/, '/****'));

        await startUnmanagedStream(activeSession, rtmpUrl);
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
        res.json({ ok: true });
      });
    } catch (err: any) {
      console.error('[/api/stream/unmanaged/start] Error:', err);
      res.status(400).json({ ok: false, error: String(err?.message ?? err) });
    }
  });

  // API: Stop unmanaged RTMP stream
  app.post('/api/stream/unmanaged/stop', async (req: any, res: any) => {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no userId' });
      return;
    }

    // Check if an operation is already in progress
    const activeLock = hasActiveLock(userId);
    if (activeLock) {
      console.log(`[/api/stream/unmanaged/stop] Operation ${activeLock.operation} already in progress for ${userId}`);
      res.status(409).json({
        ok: false,
        error: `A ${activeLock.operation} operation is already in progress. Please wait for it to complete.`
      });
      return;
    }

    try {
      await withStreamLock(userId, 'stop', async () => {
        console.log('[/api/stream/unmanaged/stop] Request received');
        console.log('[/api/stream/unmanaged/stop] userId:', userId);

        // Get the active session
        let activeSession: AppSession | undefined = req.activeSession ?? undefined;
        if (!activeSession && getUserSession) {
          activeSession = getUserSession(userId);
          console.log('[/api/stream/unmanaged/stop] Looked up session by userId:', activeSession ? 'found' : 'not found');
        }

        if (!activeSession) {
          res.status(401).json({ error: 'Unauthorized - no active session' });
          return;
        }

        console.log('[/api/stream/unmanaged/stop] Stopping unmanaged stream for user:', userId);

        const session = activeSession as any;

        // Reset retry state to cancel any in-progress auto-recovery
        resetRetryState(userId);

        await stopUnmanagedStream(activeSession);

        clearStreamState(session);
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
        res.json({ ok: true });
      });
    } catch (err: any) {
      console.error('[/api/stream/unmanaged/stop] Error:', err);

      // Reset retry state even on error
      resetRetryState(userId);

      // Even if stop fails, update UI to reflect no stream
      let activeSession: AppSession | undefined = req.activeSession ?? undefined;
      if (!activeSession && getUserSession && userId) {
        activeSession = getUserSession(userId);
      }
      if (activeSession && userId) {
        const session = activeSession as any;
        clearStreamState(session);
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
      }
      res.status(400).json({ ok: false, error: String(err?.message ?? err) });
    }
  });

  // API: Check for existing streams
  app.get('/api/stream/check', async (req: AuthenticatedRequest, res: any) => {
    try {
      if (!req.authUserId || !req.activeSession) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const streamInfo = await (req.activeSession as AppSession).camera.checkExistingStream();

      if (streamInfo.hasActiveStream && streamInfo.streamInfo) {
        // Update session state with existing stream info
        const session = req.activeSession;

        if (streamInfo.streamInfo.type === 'managed') {
          session.streamType = 'managed';
          session.streamStatus = streamInfo.streamInfo.status || 'active';
          session.hlsUrl = streamInfo.streamInfo.hlsUrl || null;
          session.dashUrl = streamInfo.streamInfo.dashUrl || null;
          session.streamId = streamInfo.streamInfo.streamId || null;
          session.directRtmpUrl = null;
          session.error = null;
          session.previewUrl = streamInfo.streamInfo.previewUrl || streamInfo.streamInfo.webrtcUrl || null;
        } else {
          session.streamType = 'unmanaged';
          session.streamStatus = streamInfo.streamInfo.status || 'active';
          session.hlsUrl = null;
          session.dashUrl = null;
          session.streamId = streamInfo.streamInfo.streamId || null;
          session.directRtmpUrl = streamInfo.streamInfo.rtmpUrl || null;
          session.error = null;
        }

        // Broadcast updated status
        broadcastStreamStatus(req.authUserId, formatStreamStatus(session));
      }

      res.json({
        ok: true,
        hasActiveStream: streamInfo.hasActiveStream,
        streamInfo: streamInfo.streamInfo
      });
    } catch (err: any) {
      res.status(400).json({ ok: false, error: String(err?.message ?? err) });
    }
  });

  // API: Start managed stream with RTMP restream targets
  app.post('/api/stream/managed/restream/start', async (req: any, res: any) => {
    try {
      if (!req.authUserId || !req.activeSession) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const restreamUrls: string[] | undefined = req.body?.restreamUrls;
      if (!Array.isArray(restreamUrls) || restreamUrls.length === 0) {
        res.status(400).json({ ok: false, error: 'Provide restreamUrls: string[]' });
        return;
      }

      // Build options with restream destinations
      const options = {
        restreamDestinations: restreamUrls.map((url, index) => ({
          url: url,
          name: `destination-${index + 1}`
        }))
      };

      // Store the restream destinations in the session
      req.activeSession.restreamDestinations = options.restreamDestinations;

      await req.activeSession.camera.startManagedStream(options);
      broadcastStreamStatus(req.authUserId, formatStreamStatus(req.activeSession));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ ok: false, error: String(err?.message ?? err) });
    }
  });
}
