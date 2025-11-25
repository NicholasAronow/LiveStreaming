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
    <div className="mb-5">
      <label className="block text-xs uppercase tracking-wider text-text-secondary mb-3 font-semibold">Stream To</label>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(70px,1fr))] gap-2">
        {platforms.map((platform) => (
          <button
            key={platform.value}
            className={`py-2.5 px-2 border rounded-lg text-[13px] font-medium transition-all duration-200 ${
              selectedPlatform === platform.value
                ? 'bg-primary text-white border-primary'
                : 'bg-bg-tertiary text-text-secondary border-border hover:bg-bg-primary hover:text-text-primary'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            data-platform={platform.value}
            onClick={() => onPlatformChange(platform.value)}
            disabled={disabled}
          >
            {platform.label}
          </button>
        ))}
      </div>
    </div>
  );
};
