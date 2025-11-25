import React from 'react';
import { Platform } from '../types';

interface PlatformSelectorProps {
  selectedPlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
  disabled: boolean;
}

const platforms: { value: Platform; label: string }[] = [
  { value: 'here', label: 'Here' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'other', label: 'Other' },
];

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatform,
  onPlatformChange,
  disabled,
}) => {
  return (
    <div className="platform-selector">
      <label className="platform-label">Stream To</label>
      <div className="platform-buttons">
        {platforms.map((platform) => (
          <button
            key={platform.value}
            className={`platform-btn ${selectedPlatform === platform.value ? 'active' : ''}`}
            data-platform={platform.value}
            onClick={() => onPlatformChange(platform.value)}
            disabled={disabled}
            style={{
              opacity: disabled ? '0.5' : '1',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {platform.label}
          </button>
        ))}
      </div>
    </div>
  );
};
