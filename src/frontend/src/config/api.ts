// Get backend URL from environment variable
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Helper to build absolute API URLs
export function getApiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${BACKEND_URL}/${cleanPath}`;
}

// Helper for SSE endpoint
export function getStreamStatusUrl(): string {
  return `${BACKEND_URL}/stream-status`;
}
