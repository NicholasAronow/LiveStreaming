import React from 'react';

interface StatusBarProps {
  status: string;
  batteryPercent: number | null;
  isStreaming: boolean;
  onToggleStream: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status,
  batteryPercent,
  isStreaming,
  onToggleStream,
}) => {
  const getStatusClass = () => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'active' || statusLower === 'streaming' || statusLower === 'connected') {
      return 'online';
    } else if (statusLower === 'connecting' || statusLower === 'starting' || statusLower === 'pending') {
      return 'connecting';
    } else if (statusLower === 'stopping' || statusLower === 'disconnecting') {
      return 'connecting';
    }
    return '';
  };

  const getStatusText = () => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'active' || statusLower === 'streaming' || statusLower === 'connected') {
      return 'Live';
    } else if (statusLower === 'connecting' || statusLower === 'starting' || statusLower === 'pending') {
      return 'Connecting';
    } else if (statusLower === 'stopping' || statusLower === 'disconnecting') {
      return 'Stopping';
    } else if (statusLower === 'error' || statusLower === 'failed') {
      return 'Error';
    } else if (statusLower === 'idle' || statusLower === 'ready') {
      return 'Ready';
    } else if (status) {
      return status;
    }
    return 'Offline';
  };

  const getBatteryClass = () => {
    if (batteryPercent === null || batteryPercent === undefined) return '';
    if (batteryPercent <= 20) return 'low';
    if (batteryPercent <= 50) return 'medium';
    return '';
  };

  return (
    <div className="status-bar">
      <div className={`status-indicator ${getStatusClass()}`}>
        <span className="status-dot"></span>
        <span className="status-text">{getStatusText()}</span>
      </div>
      <div className={`battery-indicator ${getBatteryClass()}`}>
        <svg className="battery-icon" viewBox="0 0 24 12" fill="currentColor">
          <rect x="1" y="2" width="18" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="19.5" y="4.5" width="2.5" height="3" rx="0.5"/>
          <rect
            x="2"
            y="3"
            width={batteryPercent !== null ? Math.max(0, Math.min(16, (batteryPercent / 100) * 16)) : 0}
            height="6"
            className="battery-fill"
          />
        </svg>
        <span className="battery-percent">{batteryPercent !== null ? `${batteryPercent}%` : '--'}</span>
      </div>
      <button className={`stream-toggle ${isStreaming ? 'streaming' : ''}`} onClick={onToggleStream}>
        <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor" style={{ display: isStreaming ? 'none' : 'block' }}>
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg className="stop-icon" viewBox="0 0 24 24" fill="currentColor" style={{ display: isStreaming ? 'block' : 'none' }}>
          <rect x="6" y="6" width="12" height="12"/>
        </svg>
      </button>
    </div>
  );
};
