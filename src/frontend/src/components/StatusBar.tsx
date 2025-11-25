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

  const statusClass = getStatusClass();
  const batteryClass = getBatteryClass();

  return (
    <div className="flex items-center justify-between px-5 py-4 bg-bg-secondary border-b border-border relative">
      <div className={`flex items-center gap-2.5 ${statusClass}`}>
        <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
          statusClass === 'online' ? 'bg-success shadow-[0_0_10px_rgba(59,165,92,1)] animate-pulse-custom' :
          statusClass === 'connecting' ? 'bg-warning animate-pulse' :
          'bg-text-secondary'
        }`}></span>
        <span className="text-sm font-semibold text-text-primary">{getStatusText()}</span>
      </div>
      <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-text-secondary ${batteryClass}`}>
        <svg className="w-6 h-3" viewBox="0 0 24 12" fill="currentColor">
          <rect x="1" y="2" width="18" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="19.5" y="4.5" width="2.5" height="3" rx="0.5"/>
          <rect
            x="2"
            y="3"
            width={batteryPercent !== null ? Math.max(0, Math.min(16, (batteryPercent / 100) * 16)) : 0}
            height="6"
            className={`transition-all duration-300 ${
              batteryClass === 'low' ? 'fill-danger' :
              batteryClass === 'medium' ? 'fill-warning' :
              'fill-success'
            }`}
          />
        </svg>
        <span className="font-medium min-w-[30px]">{batteryPercent !== null ? `${batteryPercent}%` : '--'}</span>
      </div>
      <button
        className={`w-14 h-14 rounded-full border-none flex items-center justify-center cursor-pointer transition-all duration-300 shadow-custom hover:scale-105 active:scale-95 ${
          isStreaming ? 'bg-danger' : 'bg-primary hover:bg-primary-hover'
        }`}
        onClick={onToggleStream}
      >
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" style={{ display: isStreaming ? 'none' : 'block' }}>
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" style={{ display: isStreaming ? 'block' : 'none' }}>
          <rect x="6" y="6" width="12" height="12"/>
        </svg>
      </button>
    </div>
  );
};
