import React, { useState } from 'react';
import { Platform } from '../types';

interface StreamConfigProps {
  platform: Platform;
  streamKey: string;
  rtmpUrl: string;
  useCloudflare: boolean;
  onStreamKeyChange: (value: string) => void;
  onRtmpUrlChange: (value: string) => void;
  onCloudflareToggle: (checked: boolean) => void;
  disabled: boolean;
}

export const StreamConfig: React.FC<StreamConfigProps> = ({
  platform,
  streamKey,
  rtmpUrl,
  useCloudflare,
  onStreamKeyChange,
  onRtmpUrlChange,
  onCloudflareToggle,
  disabled,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const showStreamKey = platform !== 'here' && platform !== 'other';
  const showRtmpUrl = platform === 'other';
  const showCloudflare = platform !== 'here';

  return (
    <div className="config-section">
      {showStreamKey && (
        <div className="stream-key-section">
          <label htmlFor="streamKey">Stream Key</label>
          <div className="input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="streamKey"
              placeholder="Enter your stream key"
              value={streamKey}
              onChange={(e) => onStreamKeyChange(e.target.value)}
              disabled={disabled}
            />
            <button
              className="toggle-visibility"
              onClick={() => setShowPassword(!showPassword)}
              style={{ display: disabled ? 'none' : 'flex' }}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {showRtmpUrl && (
        <div className="rtmp-url-section">
          <label htmlFor="rtmpUrl">RTMP URL</label>
          <input
            type="text"
            id="rtmpUrl"
            placeholder="rtmp://your-server/live/stream-key"
            value={rtmpUrl}
            onChange={(e) => onRtmpUrlChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      {showCloudflare && (
        <div className="cloudflare-section">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={useCloudflare}
              onChange={(e) => onCloudflareToggle(e.target.checked)}
              disabled={disabled}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Use Cloudflare Managed Streaming</span>
          </label>
        </div>
      )}
    </div>
  );
};
