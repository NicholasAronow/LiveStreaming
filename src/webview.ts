import { AuthenticatedRequest, AppServer } from '@mentra/sdk';
import type { AppSession } from '@mentra/sdk';
import express, { Response } from 'express';
import path from 'path';
import cors from 'cors';
import StreamConfig from './model/StreamConfig';

/**
 * Helper function to get userId from request
 * Checks multiple sources: query parameter, X-User-Id header, or req.authUserId
 */
function getUserIdFromRequest(req: any): string | null {
  // Check query parameter (for SSE connections that can't send custom headers)
  if (req.query?.userId && typeof req.query.userId === 'string') {
    return req.query.userId;
  }

  // Check X-User-Id header (sent from frontend POST/GET requests)
  const headerUserId = req.headers['x-user-id'];
  if (headerUserId && typeof headerUserId === 'string') {
    return headerUserId;
  }

  // Fallback to session-based auth (for backend-rendered pages)
  return req.authUserId || null;
}

/**
 * Sets up all Express routes and middleware for the server
 * @param server The server instance
 * @param getUserSession Function to get a user's active session by userId
 */
export function setupExpressRoutes(
  server: AppServer,
  getUserSession?: (userId: string) => AppSession | undefined
): void {
  // Get the Express app instance
  const app = server.getExpressApp();
  // JSON parser for API routes
  app.use(express.json());

  // CORS configuration for cross-origin requests from frontend
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
  app.use(cors({
    origin: corsOrigins,
    credentials: true, // Allow cookies and session authentication
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  }));

  // Set up EJS as the view engine
  app.set('view engine', 'ejs');
  app.engine('ejs', require('ejs').__express);
  app.set('views', path.join(__dirname, 'views'));

  // Register a route for handling webview requests (EJS version)
  app.get('/webview', (req: AuthenticatedRequest, res: any) => {
    if (req.authUserId) {
      // Render the webview template
      res.render('webview', {
        userId: req.authUserId,
        hasActiveSession: req.activeSession !== null,
        streamType: req.activeSession?.streamType,
        streamStatus: req.activeSession?.streamStatus,
        hlsUrl: req.activeSession?.hlsUrl,
        dashUrl: req.activeSession?.dashUrl,
        streamId: req.activeSession?.streamId,
        directRtmpUrl: req.activeSession?.directRtmpUrl,
        mangedRtmpRestreamUrls: req.activeSession?.mangedRtmpRestreamUrls,
        previewUrl: req.activeSession?.previewUrl,
        error: req.activeSession?.error,
        // Pass saved configuration
        streamPlatform: req.activeSession?.streamPlatform ?? 'here',
        streamKey: req.activeSession?.streamKey ?? '',
        customRtmpUrl: req.activeSession?.customRtmpUrl ?? '',
        useCloudflareManaged: req.activeSession?.useCloudflareManaged ?? false,
      });
    } else {
      res.redirect('/mentra-auth');
    }
  });

  // Register a route for handling React webview (new version)
  // Since frontend runs separately, redirect to frontend URL
  app.get('/webview-react', (req: AuthenticatedRequest, res: any) => {
    if (req.authUserId) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(frontendUrl);
    } else {
      res.redirect('/mentra-auth');
    }
  });

  // Server-Sent Events endpoint for real-time stream status updates
  app.get('/stream-status', (req: any, res: any) => {
    // console.log('[/stream-status] Request received');

    const userId = getUserIdFromRequest(req);
    // console.log('[/stream-status] userId from header/query/session:', userId);
    // console.log('[/stream-status] X-User-Id header:', req.headers['x-user-id']);
    // console.log('[/stream-status] userId query param:', req.query?.userId);
    // console.log('[/stream-status] req.authUserId (session):', req.authUserId);

    if (!userId) {
      console.log('[/stream-status] No userId - returning 401');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // console.log('[/stream-status] Authenticated as:', userId);

    // Get the active session for this user
    // If userId came from header/query, look up the session using getUserSession
    // If userId came from req.authUserId, use req.activeSession
    let activeSession: AppSession | undefined = req.activeSession;
    if (!activeSession && getUserSession) {
      activeSession = getUserSession(userId);
      // console.log('[/stream-status] Looked up session by userId:', activeSession ? 'found' : 'not found');
    }

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
    let clientSet = sseClientsByUser.get(userId);
    if (!clientSet) {
      clientSet = new Set<Response>();
      sseClientsByUser.set(userId, clientSet);
    }
    clientSet.add(res);

    // Heartbeat to keep proxies from closing the connection
    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        // No-op; close will clean up
      }
    }, 15000);

    // Periodic status pings so clients can reflect session availability even without stream events
    const statusPing = setInterval(() => {
      try {
        // Get the current session state (may have changed since connection opened)
        const currentSession = getUserSession ? getUserSession(userId) : req.activeSession;
        const snapshot = formatStreamStatus(currentSession ?? undefined);
        // Avoid flicker: if there was a recent successful heartbeat write, do not force a snapshot too frequently
        writeSseEvent(res, 'status', snapshot);
      } catch {
        // Ignore write errors; close will clean up
      }
    }, 20000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      clearInterval(statusPing);
      const set = sseClientsByUser.get(userId);
      if (set) {
        set.delete(res);
        if (set.size === 0) {
          sseClientsByUser.delete(userId);
        }
      }
    });
  });

  // API: Start managed stream ("Stream to here")
  app.post('/api/stream/managed/start', async (req: AuthenticatedRequest, res: any) => {
    try {
      console.log('[/api/stream/managed/start] Request received');

      const userId = getUserIdFromRequest(req);
      console.log('[/api/stream/managed/start] userId:', userId);
      console.log('[/api/stream/managed/start] X-User-Id header:', req.headers['x-user-id']);
      console.log('[/api/stream/managed/start] req.authUserId:', req.authUserId);

      if (!userId) {
        console.log('[/api/stream/managed/start] No userId - returning 401');
        res.status(401).json({ error: 'Unauthorized - no userId' });
        return;
      }

      // Get the active session
      let activeSession: AppSession | undefined = req.activeSession;
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

      // Cast to any to access custom properties added to the session
      const session = activeSession as any;

      // Save configuration
      if (req.body?.platform) session.streamPlatform = req.body.platform;
      if (req.body?.streamKey !== undefined) session.streamKey = req.body.streamKey;
      if (req.body?.customRtmpUrl !== undefined) session.customRtmpUrl = req.body.customRtmpUrl;
      if (req.body?.useCloudflareManaged !== undefined) session.useCloudflareManaged = req.body.useCloudflareManaged;

      // Build ManagedStreamOptions with restream destinations if platform is not 'here'
      let options: any = undefined;
      if (session.streamPlatform && session.streamPlatform !== 'here') {
        let restreamUrl: string | undefined;

        // Determine the RTMP URL based on platform
        if (session.streamPlatform === 'other') {
          restreamUrl = session.customRtmpUrl || undefined;
        } else {
          const platformUrls: Record<string, string> = {
            youtube: 'rtmps://a.rtmps.youtube.com/live2',
            twitch: 'rtmps://live.twitch.tv/app',
            instagram: 'rtmps://live-upload.instagram.com:443/rtmp',
            x: 'rtmp://ca.pscp.tv:80/x'
          };
          const baseUrl = platformUrls[session.streamPlatform];
          if (baseUrl && session.streamKey) {
            restreamUrl = `${baseUrl}/${session.streamKey}`;
          }
        }

        if (restreamUrl) {
          options = {
            restreamDestinations: [{
              url: restreamUrl,
              name: session.streamPlatform
            }]
          };
          // Store the restream destinations in the session
          session.restreamDestinations = options.restreamDestinations;
        }
      }

      try {
        // Wrap with timeout and disconnect handler to prevent hanging requests
        const streamPromise = activeSession.camera.startManagedStream(options);

        // Create a promise that rejects on disconnect
        let disconnectHandler: (() => void) | null = null;
        const disconnectPromise = new Promise<never>((_, reject) => {
          disconnectHandler = () => {
            reject(new Error('Cannot process request - smart glasses must be connected to WiFi for this operation'));
          };
          activeSession.events.onDisconnected(disconnectHandler);
        });

        // Timeout after 10 seconds
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Stream start timeout - request took too long')), 10000)
        );

        await Promise.race([streamPromise, disconnectPromise, timeoutPromise]);

        // Clean up disconnect handler if we succeeded
        if (disconnectHandler) {
          // Note: The SDK doesn't provide a way to remove event listeners, so we just let it stay
        }

        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
        res.json({ ok: true });
      } catch (streamError: any) {
        const streamErrorMessage = String(streamError?.message ?? streamError);
        console.error(`[/api/stream/managed/start] Stream start error for ${userId}:`, streamErrorMessage);

        // Check if this is a WiFi connection error
        if (streamErrorMessage.includes('must be connected to WiFi')) {
          console.error(`❌ [${userId}] WiFi Error: Glasses are not connected to WiFi network`);
          res.status(400).json({
            ok: false,
            error: 'Your glasses must be connected to WiFi to start streaming. Please connect your glasses to a WiFi network and try again.'
          });
        } else {
          res.status(400).json({ ok: false, error: streamErrorMessage });
        }
      }
    } catch (err: any) {
      const errorMessage = String(err?.message ?? err);
      const userId = getUserIdFromRequest(req);
      console.error(`[/api/stream/managed/start] Unexpected error for ${userId}:`, errorMessage);
      res.status(500).json({ ok: false, error: errorMessage });
    }
  });

  // API: Stop managed stream
  app.post('/api/stream/managed/stop', async (req: any, res: any) => {
    try {
      console.log('[/api/stream/managed/stop] Request received');

      const userId = getUserIdFromRequest(req);
      console.log('[/api/stream/managed/stop] userId:', userId);
      console.log('[/api/stream/managed/stop] X-User-Id header:', req.headers['x-user-id']);

      if (!userId) {
        console.log('[/api/stream/managed/stop] No userId - returning 401');
        res.status(401).json({ error: 'Unauthorized - no userId' });
        return;
      }

      // Get the active session
      let activeSession: AppSession | undefined = req.activeSession;
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

      // First check if there's an existing stream to stop
      const streamInfo = await activeSession.camera.checkExistingStream();

      if (streamInfo.hasActiveStream && streamInfo.streamInfo?.type === 'managed') {
        // There is a managed stream, try to stop it
        await activeSession.camera.stopManagedStream();
        session.streamType = null;
        session.streamStatus = 'idle';
        session.hlsUrl = null;
        session.dashUrl = null;
        session.streamId = null;
        session.previewUrl = null;
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
        res.json({ ok: true });
      } else {
        // No managed stream found
        console.log('No managed stream found to stop');
        session.streamType = null;
        session.streamStatus = 'idle';
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
        res.json({ ok: true, message: 'No stream to stop' });
      }
    } catch (err: any) {
      console.error('Error stopping managed stream:', err);
      // Even if stop fails, update UI to reflect no stream
      const userId = getUserIdFromRequest(req);
      let activeSession: AppSession | undefined = req.activeSession;
      if (!activeSession && getUserSession && userId) {
        activeSession = getUserSession(userId);
      }
      if (activeSession && userId) {
        const session = activeSession as any;
        session.streamType = null;
        session.streamStatus = 'idle';
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
      }
      res.status(400).json({ ok: false, error: String(err?.message ?? err) });
    }
  });

  // API: Start unmanaged RTMP stream to a given endpoint
  // Docs reference: https://mentra-new-docs.mintlify.app/camera/rtmp-streaming.md
  app.post('/api/stream/unmanaged/start', async (req: any, res: any) => {
    try {
      console.log('[/api/stream/unmanaged/start] Request received');

      const userId = getUserIdFromRequest(req);
      console.log('[/api/stream/unmanaged/start] userId:', userId);

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - no userId' });
        return;
      }

      // Get the active session
      let activeSession: AppSession | undefined = req.activeSession;
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

      // Build RTMP URL from platform and stream key
      let rtmpUrl: string | undefined = req.body?.rtmpUrl;

      if (!rtmpUrl) {
        // Build URL from platform configuration
        const platform = session.streamPlatform;
        const streamKey = session.streamKey;

        if (platform === 'other') {
          rtmpUrl = session.customRtmpUrl;
        } else if (platform) {
          const platformUrls: Record<string, string> = {
            youtube: 'rtmps://a.rtmps.youtube.com/live2',
            twitch: 'rtmps://live.twitch.tv/app',
            instagram: 'rtmps://live-upload.instagram.com:443/rtmp',
            x: 'rtmp://ca.pscp.tv:80/x'
          };
          const baseUrl = platformUrls[platform];
          if (baseUrl && streamKey) {
            rtmpUrl = `${baseUrl}/${streamKey}`;
          }
        }
      }

      if (!rtmpUrl) {
        res.status(400).json({ ok: false, error: 'Missing rtmpUrl - could not build URL from platform config' });
        return;
      }

      console.log('[/api/stream/unmanaged/start] Starting stream to:', rtmpUrl.replace(/\/[^/]*$/, '/****'));

      await activeSession.camera.startStream({ rtmpUrl });
      broadcastStreamStatus(userId, formatStreamStatus(activeSession));
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[/api/stream/unmanaged/start] Error:', err);
      res.status(400).json({ ok: false, error: String(err?.message ?? err) });
    }
  });

  // API: Stop unmanaged RTMP stream
  app.post('/api/stream/unmanaged/stop', async (req: any, res: any) => {
    try {
      console.log('[/api/stream/unmanaged/stop] Request received');

      const userId = getUserIdFromRequest(req);
      console.log('[/api/stream/unmanaged/stop] userId:', userId);

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - no userId' });
        return;
      }

      // Get the active session
      let activeSession: AppSession | undefined = req.activeSession;
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

      // First check if there's an existing stream to stop
      const streamInfo = await activeSession.camera.checkExistingStream();

      if (streamInfo.hasActiveStream && streamInfo.streamInfo?.type === 'unmanaged') {
        // There is an unmanaged stream, try to stop it
        await activeSession.camera.stopStream();
        session.streamType = null;
        session.streamStatus = 'idle';
        session.directRtmpUrl = null;
        session.streamId = null;
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
        res.json({ ok: true });
      } else {
        // No unmanaged stream found
        console.log('[/api/stream/unmanaged/stop] No unmanaged stream found to stop');
        session.streamType = null;
        session.streamStatus = 'idle';
        broadcastStreamStatus(userId, formatStreamStatus(activeSession));
        res.json({ ok: true, message: 'No stream to stop' });
      }
    } catch (err: any) {
      console.error('[/api/stream/unmanaged/stop] Error:', err);
      // Even if stop fails, update UI to reflect no stream
      const userId = getUserIdFromRequest(req);
      let activeSession: AppSession | undefined = req.activeSession;
      if (!activeSession && getUserSession && userId) {
        activeSession = getUserSession(userId);
      }
      if (activeSession && userId) {
        const session = activeSession as any;
        session.streamType = null;
        session.streamStatus = 'idle';
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

  // API: Start managed stream with RTMP restream targets (may not be supported yet)
  // Cloudflare Stream Live restreaming: https://developers.cloudflare.com/stream/stream-live/watch-live-stream/
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

      // Build ManagedStreamOptions with restream destinations
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

  // API: Get all stream configs for a user
  app.get('/api/stream-configs', async (req: any, res: any) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - no userId' });
        return;
      }

      const configs = await StreamConfig.find({ userId }).sort({ updatedAt: -1 });
      res.json({ ok: true, configs });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: String(err?.message ?? err) });
    }
  });

  // API: Save or update a stream config
  app.post('/api/stream-configs', async (req: any, res: any) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - no userId' });
        return;
      }

      const { platform, streamKey, rtmpUrl, platformName, platformLogoIcon, maskedStreamKey, createdAt } = req.body;

      if (!platform || !streamKey || !platformName || !platformLogoIcon || !maskedStreamKey) {
        res.status(400).json({ ok: false, error: 'Missing required fields' });
        return;
      }

      // Upsert: update if exists, create if not (based on userId + platform)
      const config = await StreamConfig.findOneAndUpdate(
        { userId, platform },
        {
          userId,
          streamKey,
          rtmpUrl: rtmpUrl || '',
          platform,
          platformName,
          platformLogoIcon,
          maskedStreamKey,
          createdAt: createdAt || new Date().toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
          }),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      res.json({ ok: true, config });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: String(err?.message ?? err) });
    }
  });

  // API: Delete a stream config
  app.delete('/api/stream-configs/:platform', async (req: any, res: any) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - no userId' });
        return;
      }

      const { platform } = req.params;
      await StreamConfig.findOneAndDelete({ userId, platform });

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: String(err?.message ?? err) });
    }
  });

  // Serve static files from the built frontend (in production)
  if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../dist/frontend');
    app.use(express.static(staticPath));

    // Catch-all route for React app - must be registered after all API routes
    app.get('*', (req: any, res: any, next: any) => {
      // Skip API routes and specific backend routes
      if (req.path.startsWith('/api') ||
          req.path.startsWith('/webview') ||
          req.path.startsWith('/stream-status') ||
          req.path.startsWith('/mentra-auth') ||
          req.path.startsWith('/__mentra') ||
          req.path.startsWith('/webhook')) {
        return next();
      }
      res.sendFile(path.join(__dirname, '../dist/frontend/index.html'));
    });
  }
}

/**
 * JSON payload that describes the current stream status for the control panel.
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
};

/**
 * Builds a serializable status payload from an AppSession.
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
  };
}

/**
 * Broadcasts a status update to all active SSE clients for a user.
 */
export function broadcastStreamStatus(userId: string, status: StreamStatusPayload): void {
  const clients = sseClientsByUser.get(userId);
  if (!clients || clients.size === 0) return;
  for (const res of clients) {
    writeSseEvent(res, 'status', status);
  }
}

/**
 * Writes a single SSE event to the given response.
 */
function writeSseEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// In-memory registry of SSE clients keyed by userId
const sseClientsByUser = new Map<string, Set<Response>>();
