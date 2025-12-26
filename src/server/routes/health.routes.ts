import type { AppSession } from '@mentra/sdk';
import type { Application } from 'express';
import { getUserIdFromRequest } from '../middleware/auth.middleware';
import { checkConnectionHealth } from '../services/connection.service';

/**
 * Registers health and glass state routes
 * @param app The Express application
 * @param getUserSession Function to get a user's active session
 * @param getUser Function to get a user's User object
 */
export function registerHealthRoutes(
  app: Application,
  getUserSession?: (userId: string) => AppSession | undefined,
  getUser?: (userId: string) => any | undefined
): void {
  // API: Get glass state for a user
  app.get('/api/glass-state', (req: any, res: any) => {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no userId' });
      return;
    }

    // Get the user object
    const user = getUser ? getUser(userId) : undefined;

    if (!user) {
      res.status(404).json({
        error: 'User not found or not connected',
        userId
      });
      return;
    }

    // Get the glass state
    const glassState = user.getGlassState();

    res.status(200).json({
      userId,
      glassState,
      timestamp: new Date().toISOString()
    });
  });

  // API: Request WiFi setup for a user
  app.post('/api/request-wifi-setup', async (req: any, res: any) => {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no userId' });
      return;
    }

    // Get the user object
    const user = getUser ? getUser(userId) : undefined;

    if (!user) {
      res.status(404).json({
        error: 'User not found or not connected',
        userId
      });
      return;
    }

    // Get the session
    const session = user.getUserSession();

    if (!session) {
      res.status(404).json({
        error: 'No active session for user',
        userId
      });
      return;
    }

    try {
      // Get custom message from request body, or use default
      const message = req.body?.message || 'Streaming requires your glasses to be connected to WiFi';

      // Request WiFi setup
      await session.requestWifiSetup(message);

      res.status(200).json({
        success: true,
        userId,
        message: 'WiFi setup request sent',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[${userId}] Error requesting WiFi setup:`, error);
      res.status(500).json({
        error: 'Failed to request WiFi setup',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // API: Check connection health
  app.get('/api/connection/health', async (req: any, res: any) => {
    try {
      const userId = getUserIdFromRequest(req);

      if (!userId) {
        return res.status(401).json({
          ok: false,
          connected: false,
          error: 'No userId provided'
        });
      }

      // Get the active session
      let activeSession: AppSession | undefined = req.activeSession;
      if (!activeSession && getUserSession) {
        activeSession = getUserSession(userId);
      }

      const result = await checkConnectionHealth(activeSession);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        connected: false,
        error: String(err?.message ?? err)
      });
    }
  });
}
