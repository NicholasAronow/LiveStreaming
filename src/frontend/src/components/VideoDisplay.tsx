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
    ? 'Stream preview will appedasdasar here'
    : 'Status logs will appear here';

  return (
    <div className="video-container">
      <iframe
        id="livePlayer"
        src={previewUrl || ''}
        style={{ border: 0 }}
        allowFullScreen
        className={showPreview ? 'visible' : ''}
      />
      <div className={`video-overlay ${showOverlay ? '' : 'hidden'}`}>
        <div className="overlay-message">{overlayMessage}</div>
      </div>
    </div>
  );
};
