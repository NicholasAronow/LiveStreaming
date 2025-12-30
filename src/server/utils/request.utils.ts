/**
 * Helper functions for extracting information from Express requests
 */

/**
 * Helper function to get userId from request
 * Checks multiple sources: query parameter, X-User-Id header, or req.authUserId
 *
 * @param req The Express request object
 * @returns The userId if found, or null
 */
export function getUserIdFromRequest(req: any): string | null {
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
