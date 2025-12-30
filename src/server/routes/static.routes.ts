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
    // Use absolute path from process.cwd() for Docker compatibility
    const staticPath = path.join(process.cwd(), 'dist/frontend');
    const indexPath = path.join(process.cwd(), 'dist/frontend/index.html');

    console.log('📁 Static files path:', staticPath);
    console.log('📄 Index.html path:', indexPath);

    // MentraOS expects /webview endpoint - MUST be registered before catch-all
    app.get('/webview', (_req: any, res: any) => {
      console.log('🎯 Serving /webview request');
      res.sendFile(indexPath);
    });

    // Serve static assets (JS, CSS, images)
    app.use(express.static(staticPath));

    // Catch-all route for React app - must be registered LAST
    app.get('*', (req: any, res: any, next: any) => {
      // Skip API routes and specific backend routes
      if (req.path.startsWith('/api') ||
          req.path.startsWith('/stream-status') ||
          req.path.startsWith('/mentra-auth') ||
          req.path.startsWith('/__mentra') ||
          req.path.startsWith('/webhook')) {
        return next();
      }
      console.log('🔀 Catch-all serving:', req.path);
      res.sendFile(indexPath);
    });
  } else {
    // In development, redirect /webview to Vite dev server
    app.get('/webview', (_req: any, res: any) => {
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
