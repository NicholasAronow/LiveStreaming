import type { AppServer, AppSession } from '@mentra/sdk';
import express from 'express';
import { applyCorsMiddleware } from './middleware/cors.middleware';
import { registerSseRoutes } from './routes/sse.routes';
import { registerHealthRoutes } from './routes/health.routes';
import { registerStreamRoutes } from './routes/stream.routes';
import { registerConfigRoutes } from './routes/config.routes';
import { registerStaticRoutes } from './routes/static.routes';

// Export types for backwards compatibility
export type { StreamStatusPayload } from './services/sse.service';
export { formatStreamStatus, broadcastStreamStatus } from './services/sse.service';

/**
 * Sets up all Express routes and middleware for the server
 * @param server The server instance
 * @param getUserSession Function to get a user's active session by userId
 * @param getUser Function to get a user's User object by userId
 */
export function setupExpressRoutes(
  server: AppServer,
  getUserSession?: (userId: string) => AppSession | undefined,
  getUser?: (userId: string) => any | undefined
): void {
  // Get the Express app instance
  const app = server.getExpressApp();

  // Apply middleware
  app.use(express.json());
  applyCorsMiddleware(app);

  // Register routes
  registerSseRoutes(app, getUserSession);
  registerHealthRoutes(app, getUserSession, getUser);
  registerStreamRoutes(app, getUserSession);
  registerConfigRoutes(app);
  registerStaticRoutes(app);

  console.log('✓ Express routes configured successfully');
}
