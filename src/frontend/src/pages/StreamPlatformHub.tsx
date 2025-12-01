import React, { useState, useEffect } from 'react'
import trashIcon from '../../../public/assets/trash.svg'
import cameraStreamIcon from '../../../public/assets/cameraStreamIcon.svg'
import { LogEntry } from '../types'
import EditStreamKeyDialog from '../components/EditStreamKeyDialog'
import DeleteStreamDialog from '../components/DeleteStreamDialog'

interface StreamPlatformHubProps {
  platformName?: string;
  platformLogoIcon?: string;
  isStreaming?: boolean;
  streamStatus?: string;
  onStartStream?: () => void;
  onStopStream?: () => void;
  onGoBack?: () => void;
  onDelete?: () => void;
  onSaveEdit?: (newKey: string) => void;
  onFetchStreamKey?: () => Promise<string>;
  isDeleting?: boolean;
  currentStreamKey?: string;
  logs?: LogEntry[];
  maskedStreamKey?: string;
  previewUrl?: string | null;
  showPreview?: boolean;
}

function StreamPlatformHub({
  platformName = "YouTube",
  platformLogoIcon,
  isStreaming = false,
  streamStatus = 'offline',
  onStartStream,
  onStopStream,
  onGoBack,
  onDelete,
  onSaveEdit,
  onFetchStreamKey,
  isDeleting = false,
  currentStreamKey = '',
  logs = [],
  maskedStreamKey,
  previewUrl = null,
  showPreview = false
}: StreamPlatformHubProps) {
  const [duration, setDuration] = useState(0);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Update duration when streaming
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const status = streamStatus.toLowerCase();
    const isActuallyStreaming = isStreaming && (status === 'streaming' || status === 'active' || status === 'connected');

    if (isActuallyStreaming) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, streamStatus]);

  // Refresh iframe preview every 30 seconds to prevent pausing
  useEffect(() => {
    if (!showPreview || !previewUrl) return;

    const refreshInterval = setInterval(() => {
      console.log('Refreshing preview iframe to prevent pause');
      setIframeKey(prev => prev + 1);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [showPreview, previewUrl]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleStream = () => {
    if (isStreaming) {
      onStopStream?.();
    } else {
      onStartStream?.();
    }
  };

  const getStatusColor = () => {
    const status = streamStatus.toLowerCase();
    if (status === 'streaming' || status === 'active' || status === 'connected') {
      return '#10B981'; // green
    } else if (status === 'connecting' || status === 'starting') {
      return '#F59E0B'; // orange
    } else if (status === 'error' || status === 'failed') {
      return '#EF4444'; // red
    }
    return '#6B7280'; // gray
  };

  const getStatusLabel = () => {
    const status = streamStatus.toLowerCase();
    if (status === 'streaming' || status === 'active' || status === 'connected') {
      return 'Live';
    } else if (status === 'connecting' || status === 'starting' || status === 'initializing') {
      return 'Starting';
    } else if (status === 'stopping' || status === 'disconnecting') {
      return 'Stopping';
    } else if (status === 'error' || status === 'failed') {
      return 'Error';
    }
    return 'Off';
  };

  return (
    <>
      {/* Edit Stream Key Dialog */}
      <EditStreamKeyDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        platformIcon={platformLogoIcon}
        platformName={platformName}
        currentStreamKey={currentStreamKey}
        onSave={onSaveEdit || (() => {})}
        onFetchStreamKey={onFetchStreamKey}
        isStreaming={isStreaming}
      />

      {/* Delete Stream Dialog */}
      <DeleteStreamDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        platformName={platformName}
        onDelete={onDelete || (() => {})}
        isDeleting={isDeleting}
      />

      <div className="w-full h-full overflow-y-auto px-[24px] pt-[24px] pb-[100px] bg-white">
        <div className="flex flex-col gap-[12px]">
        {/* Stream Preview */}
        <div className="relative w-full aspect-video rounded-[16px] overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E2939 0%, #101828 100%)' }}>
          {/* Status Toggle */}
          <div className="absolute top-[19px] left-[19px] z-10">
            <div className="flex rounded-full px-[12px] h-[24px] justify-center items-center gap-[4px]" style={{ backgroundColor: getStatusColor() }}>
              <div className="w-[8px] h-[8px] rounded-full bg-white"></div>
              <span className="text-white text-[12px] font-medium">{getStatusLabel()}</span>
            </div>
          </div>

          {/* Video Preview iframe */}
          {showPreview && previewUrl && (
            <iframe
              key={iframeKey}
              src={previewUrl}
              className="absolute inset-0 w-full h-full border-none"
              allowFullScreen
              allow="autoplay; fullscreen"
            />
          )}

          {/* Placeholder when not streaming */}
          {!showPreview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <img src={cameraStreamIcon} alt="Camera" className="mb-[16px] w-[64px] h-[64px]" />
              <p className="text-[#94A3B8] text-[16px] font-normal">
                {isStreaming ? 'Initializing stream...' : 'Stream preview will appear here'}
              </p>
            </div>
          )}
        </div>

        {/* Go Live / Stop Button */}
        <button
          onClick={handleToggleStream}
          className={`w-full h-[44px] text-white rounded-[16px] flex items-center justify-center gap-[6px] hover:opacity-90 transition-all ${
            isStreaming ? 'bg-red-600' : 'bg-[#0A0A0A]'
          }`}
          disabled={streamStatus.toLowerCase() === 'connecting' || streamStatus.toLowerCase() === 'stopping'}
        >
          {isStreaming ? (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              <span className="text-[14px] font-medium">Stop Stream</span>
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="text-[14px] font-medium">Go Live</span>
            </>
          )}
        </button>

        {/* Platform Info */}
        <div className="flex items-center justify-between mt-[10px] mb-[10px]">
          <div className="flex items-center gap-[8px]">
            {platformLogoIcon && (
              <img
                src={platformLogoIcon}
                alt={platformName}
                className="w-[48px] h-[48px] object-contain"
              />
            )}
            <span className="text-[16px] font-semibold text-[var(--secondary-background)]">
              {platformName}
            </span>
          </div>

          <div className="flex items-center gap-[9px]">
            {/* Edit Button - Opens Edit Dialog */}
            <button
              onClick={() => setIsEditDialogOpen(true)}
              className="text-[14px] w-[60px] h-[30px] border border-[var(--border)] rounded-[12px] text-[var(--secondary-background)] hover:bg-gray-50 transition-colors font-semibold"
            >
              Edit
            </button>

            {/* Delete Button - Opens Delete Dialog */}
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="w-[33px] h-[33px] border border-[var(--border)] rounded-[12px] flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              <img src={trashIcon} alt="Delete" className="w-[20px] h-[20px]" />
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-[#F5F5F5] rounded-[16px] p-[16px]">
          <h3 className="text-[16px] text-[var(--secondary-background)] mb-[24px] font-normal">
            Info
          </h3>

          <div className="flex flex-col gap-[12px]">
            {/* Duration */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--secondary-background)]">Duration</span>
              <span className="text-[14px] font-medium text-[var(--secondary-background)]">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--secondary-background)]">Status</span>
              <span className="text-[14px] font-medium text-[var(--secondary-background)]">
                {getStatusLabel()}
              </span>
            </div>

            {/* Stream Key - Only show if available */}
            {maskedStreamKey && (
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[var(--secondary-background)]">Stream Key</span>
                <span className="text-[14px] font-medium text-[var(--secondary-background)] font-mono">
                  {maskedStreamKey}
                </span>
              </div>
            )}

            {/* Quality */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--secondary-background)]">Quality</span>
              <span className="text-[14px] font-medium text-[var(--secondary-background)]">720p 30fps</span>
            </div>
          </div>
        </div>

        {/* Logs Section - Only show if there are logs */}
        {logs.length > 0 && (
          <div className="bg-[#F5F5F5] rounded-[16px] overflow-hidden">
            {/* Logs Header - Clickable to expand/collapse */}
            <button
              onClick={() => setLogsExpanded(!logsExpanded)}
              className="w-full p-[16px] flex items-center justify-between hover:bg-[#ECECEC] transition-colors"
            >
              <h3 className="text-[16px] text-[var(--secondary-background)] font-normal">
                Stream Logs {logs.length > 0 && <span className="text-[14px] text-[var(--muted-forground)]">({logs.length})</span>}
              </h3>
              <svg
                className={`w-[20px] h-[20px] text-[var(--secondary-background)] transition-transform duration-200 ${
                  logsExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Logs Content - Collapsible */}
            {logsExpanded && (
              <div className="px-[16px] pt-[16px] pb-[16px] flex flex-col gap-[8px] max-h-[300px] overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-[12px] font-mono">
                    <span className="text-[var(--muted-forground)]">{log.timestamp}</span>{' '}
                    <span className={
                      log.type === 'error' ? 'text-red-600' :
                      log.type === 'success' ? 'text-green-600' :
                      log.type === 'warning' ? 'text-yellow-600' :
                      'text-[var(--secondary-background)]'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Go Back Button */}
        <button
          onClick={onGoBack}
          className="text-[14px] w-full h-[44px] border border-[var(--border)] rounded-[16px] font-semibold text-[var(--secondary-background)] hover:bg-gray-50 transition-colors"
        >
          Go back to Streams
        </button>
      </div>
    </div>
    </>
  )
}

export default StreamPlatformHub