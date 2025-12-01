import { StreamConfig } from './types';
import { BACKEND_URL } from './config/api';

export const PLATFORM_URLS: Record<string, string> = {
  youtube: 'rtmps://a.rtmps.youtube.com/live2',
  twitch: 'rtmps://live.twitch.tv/app',
  instagram: 'rtmps://live-upload.instagram.com:443/rtmp',
  x: 'rtmp://ca.pscp.tv:80/x',
};

export function getRtmpUrl(config: StreamConfig): string | null {
  if (config.platform === 'here') {
    return null;
  } else if (config.platform === 'other') {
    return config.customRtmpUrl.trim();
  } else {
    const baseUrl = PLATFORM_URLS[config.platform];
    const key = config.streamKey.trim();
    return key ? `${baseUrl}/${key}` : null;
  }
}

export function isStreamingStatus(status?: string): boolean {
  const statusLower = (status || '').toLowerCase();
  return (
    statusLower === 'active' ||
    statusLower === 'streaming' ||
    statusLower === 'connected' ||
    statusLower === 'connecting' ||
    statusLower === 'starting' ||
    statusLower === 'pending' ||
    statusLower === 'stopping' ||
    statusLower === 'disconnecting' ||
    statusLower === 'initializing'
  );
}

export async function postJson(url: string, body?: unknown, userId?: string) {
  try {
    // Convert relative URLs to absolute URLs using BACKEND_URL
    // This ensures API calls work through ngrok as well as localhost
    const fullUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
    console.log('postJson:', fullUrl, 'userId:', userId);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add X-User-Id header if userId is provided
    if (userId) {
      headers['X-User-Id'] = userId;
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(() => ({ ok: response.ok }));
    console.log('postJson response:', response.status, data);
    return data;
  } catch (error: any) {
    console.error('API error:', error);
    return { ok: false, error: error.message };
  }
}

export function formatTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
