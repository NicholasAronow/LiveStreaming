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
    <div className="mt-5">
      {showStreamKey && (
        <div>
          <label htmlFor="streamKey" className="block text-xs uppercase tracking-wider text-text-secondary mb-2 font-semibold">Stream Key</label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              id="streamKey"
              placeholder="Enter your stream key"
              value={streamKey}
              onChange={(e) => onStreamKeyChange(e.target.value)}
              disabled={disabled}
              className="w-full py-3 pr-[45px] pl-3 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm transition-all duration-200 placeholder:text-text-secondary placeholder:opacity-50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(88,101,242,0.1)]"
            />
            <button
              className="absolute right-2 bg-transparent border-none text-text-secondary cursor-pointer p-2 flex items-center justify-center transition-colors duration-200 hover:text-text-primary"
              onClick={() => setShowPassword(!showPassword)}
              style={{ display: disabled ? 'none' : 'flex' }}
            >
              {showPassword ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {showRtmpUrl && (
        <div>
          <label htmlFor="rtmpUrl" className="block text-xs uppercase tracking-wider text-text-secondary mb-2 font-semibold">RTMP URL</label>
          <input
            type="text"
            id="rtmpUrl"
            placeholder="rtmp://your-server/live/stream-key"
            value={rtmpUrl}
            onChange={(e) => onRtmpUrlChange(e.target.value)}
            disabled={disabled}
            className="w-full py-3 px-3 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm transition-all duration-200 placeholder:text-text-secondary placeholder:opacity-50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(88,101,242,0.1)]"
          />
        </div>
      )}

      {showCloudflare && (
        <div className="mt-4">
          <label className="flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useCloudflare}
              onChange={(e) => onCloudflareToggle(e.target.checked)}
              disabled={disabled}
              className="hidden"
            />
            <span className={`w-11 h-6 bg-bg-tertiary border border-border rounded-xl relative transition-all duration-300 mr-3 after:content-[''] after:absolute after:w-[18px] after:h-[18px] after:bg-text-secondary after:rounded-full after:top-0.5 after:left-0.5 after:transition-all after:duration-300 ${
              useCloudflare ? 'bg-primary border-primary after:translate-x-5 after:bg-white' : ''
            }`}></span>
            <span className="text-sm text-text-primary">Use Cloudflare Managed Streaming</span>
          </label>
        </div>
      )}
    </div>
  );
};
