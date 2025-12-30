import React from 'react';

interface VideoDisplayProps {
  previewUrl: string | null;
  showPreview: boolean;
  showLogs: boolean;
  useManaged: boolean;
}

export const VideoDisplay: React.FC<VideoDisplayProps> = ({
  previewUrl,
  showPreview,
  showLogs,
  useManaged,
}) => {
  const showOverlay = !showPreview && !showLogs;
  const overlayMessage = useManaged
    ? 'Stream preview will appsddsedasdasar here'
    : 'Status logs will appear here';

  return (
    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
      <iframe
        id="livePlayer"
        src={previewUrl || ''}
        style={{ border: 0 }}
        allowFullScreen
        className={`w-full h-full border-none bg-black ${showPreview ? 'block' : 'hidden'}`}
      />
      <div className={`absolute inset-0 flex items-center justify-center bg-black/70 transition-opacity duration-300 ${
        showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="text-base text-text-secondary text-center p-5">{overlayMessage}</div>
      </div>
    </div>
  );
};
