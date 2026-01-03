export type StreamType = 'managed' | 'unmanaged' | null;

export type Platform = 'here' | 'youtube' | 'twitch' | 'instagram' | 'x' | 'other' | 'streamer';

export interface StreamStatus {
  streamType: StreamType;
  streamStatus?: string;
  hlsUrl?: string | null;
  dashUrl?: string | null;
  streamId?: string | null;
  directRtmpUrl?: string | null;
  mangedRtmpRestreamUrls?: string[] | null;
  previewUrl?: string | null;
  error?: string | null;
  glassesBatteryPercent?: number | null;
  hasActiveSession?: boolean;
  streamPlatform?: string | null;
  glassesWifiConnected?: boolean | null;
}

export interface StreamConfig {
  platform: Platform;
  streamKey: string;
  customRtmpUrl: string;
  useCloudflareManaged: boolean;
}

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface StreamConnection {
  id: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'instagram' | 'tiktok' | 'x' | 'other' | 'streamer';
  platformName: string;
  platformLogoIcon: string;
  maskedStreamKey: string;
  fullStreamKey: string;
  rtmpUrl?: string;
  createdAt: string;
  isActive?: boolean;
  streamStartTime?: number; // Unix timestamp (ms) when stream started
}
