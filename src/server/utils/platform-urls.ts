/**
 * RTMP URL mapping for various streaming platforms
 */

export type StreamPlatform = 'youtube' | 'twitch' | 'instagram' | 'x' | 'other' | 'here';

/**
 * Base RTMP URLs for supported streaming platforms
 */
export const PLATFORM_RTMP_URLS: Record<string, string> = {
  youtube: 'rtmps://a.rtmps.youtube.com/live2',
  twitch: 'rtmps://live.twitch.tv/app',
  instagram: 'rtmps://live-upload.instagram.com:443/rtmp',
  x: 'rtmp://ca.pscp.tv:80/x'
};

/**
 * Builds a complete RTMP URL for a given platform and stream key
 * @param platform The streaming platform
 * @param streamKey The stream key provided by the platform
 * @param customRtmpUrl Optional custom RTMP URL for 'other' platform
 * @returns The complete RTMP URL, or undefined if it cannot be built
 */
export function buildRtmpUrl(
  platform: string,
  streamKey?: string,
  customRtmpUrl?: string
): string | undefined {
  if (platform === 'other') {
    return customRtmpUrl;
  }

  const baseUrl = PLATFORM_RTMP_URLS[platform];
  if (!baseUrl) {
    return undefined;
  }

  if (!streamKey) {
    return undefined;
  }

  return `${baseUrl}/${streamKey}`;
}

/**
 * Masks a stream key for display (shows only first 4 and last 4 characters)
 * @param streamKey The stream key to mask
 * @returns The masked stream key
 */
export function maskStreamKey(streamKey: string): string {
  if (streamKey.length <= 8) {
    return '****';
  }
  const first4 = streamKey.substring(0, 4);
  const last4 = streamKey.substring(streamKey.length - 4);
  return `${first4}****${last4}`;
}
