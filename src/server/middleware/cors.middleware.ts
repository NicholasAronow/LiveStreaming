import cors from 'cors';
import express from 'express';

/**
 * Configures and applies CORS middleware to the Express app
 * @param app The Express application
 */
export function applyCorsMiddleware(app: express.Application): void {
  // CORS configuration for cross-origin requests from frontend
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');

  app.use(cors({
    origin: corsOrigins,
    credentials: true, // Allow cookies and session authentication
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  }));
}
