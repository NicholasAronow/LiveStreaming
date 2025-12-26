import type { Application } from 'express';
import { getUserIdFromRequest } from '../middleware/auth.middleware';
import { getStreamConfigs, saveStreamConfig, deleteStreamConfig } from '../services/config.service';

/**
 * Registers stream configuration management routes
 * @param app The Express application
 */
export function registerConfigRoutes(app: Application): void {
  // API: Get all stream configs for a user
  app.get('/api/stream-configs', async (req: any, res: any) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - no userId' });
        return;
      }

      const configs = await getStreamConfigs(userId);
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

      const config = await saveStreamConfig(userId, req.body);
      res.json({ ok: true, config });
    } catch (err: any) {
      if (err.message === 'Missing required fields') {
        res.status(400).json({ ok: false, error: err.message });
      } else {
        res.status(500).json({ ok: false, error: String(err?.message ?? err) });
      }
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
      await deleteStreamConfig(userId, platform);

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: String(err?.message ?? err) });
    }
  });
}
