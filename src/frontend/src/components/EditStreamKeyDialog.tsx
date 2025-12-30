import React, { useState, useEffect } from "react";

interface EditStreamKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  platformName: string;
  platformIcon?: string;
  currentStreamKey: string;
  currentRtmpUrl?: string;
  onSave: (newKey: string, newRtmpUrl?: string) => void;
  isStreaming?: boolean;
  onFetchStreamKey?: () => Promise<string>;
}

function EditStreamKeyDialog({
  isOpen,
  onClose,
  platformName,
  platformIcon,
  currentStreamKey,
  currentRtmpUrl = '',
  onSave,
  isStreaming = false,
  onFetchStreamKey,
}: EditStreamKeyDialogProps) {
  const [streamKey, setStreamKey] = useState(currentStreamKey);
  const [rtmpUrl, setRtmpUrl] = useState(currentRtmpUrl);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch actual stream key when dialog opens
  useEffect(() => {
    if (isOpen && onFetchStreamKey) {
      setIsLoading(true);
      onFetchStreamKey()
        .then((key) => {
          setStreamKey(key);
          setIsLoading(false);
        })
        .catch(() => {
          setStreamKey(currentStreamKey);
          setIsLoading(false);
        });
    } else if (isOpen) {
      setStreamKey(currentStreamKey);
      setRtmpUrl(currentRtmpUrl);
    }
  }, [isOpen, currentStreamKey, currentRtmpUrl, onFetchStreamKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!streamKey.trim()) {
      alert("Stream key cannot be empty");
      return;
    }

    const hasChanges = streamKey !== currentStreamKey || rtmpUrl.trim() !== currentRtmpUrl;

    if (hasChanges) {
      onSave(streamKey.trim(), rtmpUrl.trim());
      onClose();
    } else {
      onClose(); // No changes, just close
    }
  };

  const handleCancel = () => {
    setStreamKey(currentStreamKey); // Reset to original
    setRtmpUrl(currentRtmpUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-[24px]">
      <div className="bg-white rounded-[24px] p-[24px] w-full max-w-[400px] shadow-xl min-h-[240px]">
        <div className="flex items-center gap-[8px] mb-[24px]">
          {platformIcon && (
            <div className="w-[52px] flex items-center justify-center">
              <img
                src={platformIcon}
                alt={platformName}
                className="w-[52px] h-full object-contain"
              />
            </div>
          )}
          <h2 className="text-[16px] font-semibold text-[var(--secondary-background)]">
            {platformName}
          </h2>

          <div className="flex-1 self-stretch flex justify-end">
            <div
              className="rounded-full flex justify-center items-center h-[24px] px-[8px] text-white text-[12px] font-medium"
              style={{ backgroundColor: isStreaming ? 'var(--char_T)' : '#9ca3af' }}
            >
              {isStreaming ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>

        <div className="space-y-[16px] mb-[24px]">
          <div>
            <label className="block text-[14px] font-medium text-[var(--secondary-background)] mb-[12px]">
              Stream Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={isLoading ? "Loading..." : streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                className="w-full px-[16px] pr-[48px] h-[36px] border border-[var(--border)] rounded-[12px]  focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[--muted-forground] text-[14px]"
                placeholder="Enter stream key"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-[12px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={isLoading}
              >
                {showKey ? (
                  // Eye slash icon (hide)
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // Eye icon (show)
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[var(--secondary-background)] mb-[12px]">
              RTMP URL <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={rtmpUrl}
              onChange={(e) => setRtmpUrl(e.target.value)}
              className="w-full px-[16px] h-[36px] border border-[var(--border)] rounded-[12px]  focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[--muted-forground] text-[14px]"
              placeholder="rtmp://a.rtmp.youtube.com/live2"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex flex-row gap-[8px]">
          <button
            onClick={handleCancel}
            className="w-full h-[44px] border border-[var(--border)] rounded-[16px]  font-medium text-[var(--secondary-background)] hover:bg-gray-50 transition-colors text-[14px]"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="w-full h-[44px] bg-[#0A0A0A] text-white rounded-[16px] text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditStreamKeyDialog;
