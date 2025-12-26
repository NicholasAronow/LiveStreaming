import type { Application } from 'express';
import express from 'express';
import path from 'path';

/**
 * Registers static file serving routes
 * @param app The Express application
 */
export function registerStaticRoutes(app: Application): void {
  // Serve static files from the built frontend (in production)
  if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../../dist/frontend');
    app.use(express.static(staticPath));

    // MentraOS expects /webview endpoint - serve React app
    app.get('/webview', (req: any, res: any) => {
      res.sendFile(path.join(__dirname, '../../dist/frontend/index.html'));
    });

    // Catch-all route for React app - must be registered after all API routes
    app.get('*', (req: any, res: any, next: any) => {
      // Skip API routes and specific backend routes
      if (req.path.startsWith('/api') ||
          req.path.startsWith('/stream-status') ||
          req.path.startsWith('/mentra-auth') ||
          req.path.startsWith('/__mentra') ||
          req.path.startsWith('/webhook')) {
        return next();
      }
      res.sendFile(path.join(__dirname, '../../dist/frontend/index.html'));
    });
  } else {
    // In development, redirect /webview to Vite dev server
    app.get('/webview', (req: any, res: any) => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(frontendUrl);
    });

    // In development, handle the preview route
    app.get('/main/streampage/preview', (req: any, res: any) => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/main/streampage/preview${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
    });
  }
}
