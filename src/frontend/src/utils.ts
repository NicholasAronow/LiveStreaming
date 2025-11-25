import { StreamConfig } from './types';

export const PLATFORM_URLS: Record<string, string> = {
  youtube: 'rtmps://a.rtmps.youtube.com/live2',
  twitch: 'rtmps://live.twitch.tv/app',
  instagram: 'rtmps://live-upload.instagram.com:443/rtmp',
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
    // Use relative URL (will be proxied by Vite in dev)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add X-User-Id header if userId is provided
    if (userId) {
      headers['X-User-Id'] = userId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(body || {}),
    });
    return await response.json().catch(() => ({ ok: response.ok }));
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
