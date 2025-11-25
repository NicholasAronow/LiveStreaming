import { useState, useCallback } from 'react';
import { useMentraAuth } from '@mentra/react';
import { StatusBar } from './components/StatusBar';
import { PlatformSelector } from './components/PlatformSelector';
import { StreamConfig } from './components/StreamConfig';
import { VideoDisplay } from './components/VideoDisplay';
import { StatusLogs } from './components/StatusLogs';
import { useStreamStatus } from './hooks/useStreamStatus';
import { Platform, LogEntry, StreamConfig as StreamConfigType } from './types';
import { isStreamingStatus, postJson, formatTimestamp, getRtmpUrl } from './utils';

const MAX_LOGS = 100;

function App() {
  const { userId, isLoading, error, isAuthenticated } = useMentraAuth();

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="text-center">
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="text-center p-5">
          <h2 className="text-danger mb-2.5">Authentication Error</h2>
          <p className="text-red-400 mb-2.5">{error}</p>
          <p className="text-gray-500 text-sm">
            Please ensure you are opening this page from the MentraOS app.
          </p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated state
  // if (!isAuthenticated || !userId) {
  //   return (
  //     <div className="mobile-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
  //       <div style={{ textAlign: 'center', padding: '20px' }}>
  //         <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Not Authenticated</h2>
  //         <p style={{ color: '#6b7280' }}>Please open this page from the MentraOS manager app.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return <AuthenticatedApp userId={userId || ""} />;
}

function AuthenticatedApp({ userId }: { userId: string }) {
  const [config, setConfig] = useState<StreamConfigType>({
    platform: 'here',
    streamKey: '',
    customRtmpUrl: '',
    useCloudflareManaged: true,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamStatus, setCurrentStreamStatus] = useState('offline');

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const timestamp = formatTimestamp();
    setLogs((prev) => {
      const newLogs = [...prev, { timestamp, type, message }];
      return newLogs.slice(-MAX_LOGS);
    });
  }, []);

  const { status } = useStreamStatus(userId, (newStatus) => {
    // Handle session status
    if (newStatus.hasActiveSession !== undefined && !newStatus.hasActiveSession) {
      setCurrentStreamStatus('offline');
      if (isStreaming) {
        setIsStreaming(false);
        addLog('error', 'Session lost');
      }
    }

    // Handle stream status updates
    if (newStatus.streamStatus !== undefined) {
      const oldStatus = currentStreamStatus;
      setCurrentStreamStatus(newStatus.streamStatus);

      // Log status changes for unmanaged streams
      if (newStatus.streamType === 'unmanaged' && oldStatus !== newStatus.streamStatus) {
        const statusLower = (newStatus.streamStatus || '').toLowerCase();
        let logType: LogEntry['type'] = 'info';
        if (statusLower === 'active' || statusLower === 'connected' || statusLower === 'streaming') {
          logType = 'success';
        } else if (statusLower === 'error' || statusLower === 'failed') {
          logType = 'error';
        } else if (statusLower === 'stopping' || statusLower === 'disconnecting') {
          logType = 'warning';
        }
        addLog(logType, 'Status: ' + newStatus.streamStatus);
      }

      // Update streaming state
      const shouldShowStop = isStreamingStatus(newStatus.streamStatus);
      if (shouldShowStop !== isStreaming) {
        setIsStreaming(shouldShowStop);
      }
    }

    // Handle errors
    if (newStatus.error) {
      console.error('Stream error:', newStatus.error);
      addLog('error', newStatus.error);
    }

    // Handle URLs for managed streams
    if (newStatus.streamType === 'managed') {
      if (newStatus.hlsUrl) {
        addLog('info', 'HLS URL available');
      }
    }
  });

  const handlePlatformChange = (platform: Platform) => {
    setConfig((prev) => ({
      ...prev,
      platform,
      useCloudflareManaged: platform === 'here' ? true : prev.useCloudflareManaged,
    }));
  };

  const handleStartStream = async () => {
    if (isStreamingStatus(currentStreamStatus)) return;

    const useManaged = config.useCloudflareManaged || config.platform === 'here';
    setCurrentStreamStatus('Connecting');
    setIsStreaming(true);

    if (useManaged) {
      addLog('info', 'Starting managed stream...');
      addLog('info', 'Requesting Cloudflare managed stream...');
    } else {
      addLog('info', '--- New stream session ---');
      addLog('info', 'Starting unmanaged RTMP stream...');
    }

    if (config.platform === 'here' || useManaged) {
      const result = await postJson('/api/stream/managed/start', config, userId);
      if (result.ok === false) {
        setCurrentStreamStatus('Error');
        setIsStreaming(false);
        addLog('error', 'Failed to start: ' + (result.error || 'Unknown error'));
        alert('Failed to start stream: ' + (result.error || 'Unknown error'));
      } else {
        addLog('success', 'Managed stream request sent');
      }
    } else {
      const rtmpUrl = getRtmpUrl(config);
      if (!rtmpUrl) {
        alert('Please enter a stream key or RTMP URL');
        setCurrentStreamStatus('Offline');
        setIsStreaming(false);
        addLog('error', 'No RTMP URL provided');
        return;
      }

      addLog('info', 'Connecting to: ' + rtmpUrl.replace(/\/[^/]*$/, '/****'));
      const result = await postJson('/api/stream/unmanaged/start', { rtmpUrl, ...config }, userId);
      if (result.ok === false) {
        setCurrentStreamStatus('Error');
        setIsStreaming(false);
        addLog('error', 'Failed to start: ' + (result.error || 'Unknown error'));
        alert('Failed to start stream: ' + (result.error || 'Unknown error'));
      } else {
        addLog('success', 'RTMP stream request sent');
      }
    }
  };

  const handleStopStream = async () => {
    if (!isStreamingStatus(currentStreamStatus)) return;

    setCurrentStreamStatus('Stopping');
    setIsStreaming(true);
    addLog('info', 'Stopping stream...');

    const streamType = config.useCloudflareManaged || config.platform === 'here' ? 'managed' : 'unmanaged';
    const endpoint = streamType === 'managed' ? '/api/stream/managed/stop' : '/api/stream/unmanaged/stop';

    await postJson(endpoint, {}, userId);
  };

  const handleToggleStream = () => {
    if (isStreaming) {
      handleStopStream();
    } else {
      handleStartStream();
    }
  };

  const useManaged = config.useCloudflareManaged || config.platform === 'here';
  const showPreview = status.streamType === 'managed' && !!status.previewUrl && isStreaming;
  const showLogs = status.streamType === 'unmanaged' && (logs.length > 0 || isStreaming);

  return (
    <div className="h-screen flex flex-col max-w-full mx-auto bg-bg-primary md:max-w-[500px] md:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      <StatusBar
        status={currentStreamStatus || status.streamStatus || 'offline'}
        batteryPercent={status.glassesBatteryPercent ?? null}
        isStreaming={isStreaming}
        onToggleStream={handleToggleStream}
      />

      <div className="bg-bg-secondary p-5 border-b border-border max-[600px]:p-3">
        <PlatformSelector
          selectedPlatform={config.platform}
          onPlatformChange={handlePlatformChange}
          disabled={isStreaming}
        />
        <StreamConfig
          platform={config.platform}
          streamKey={config.streamKey}
          rtmpUrl={config.customRtmpUrl}
          useCloudflare={config.useCloudflareManaged}
          onStreamKeyChange={(value) => setConfig((prev) => ({ ...prev, streamKey: value }))}
          onRtmpUrlChange={(value) => setConfig((prev) => ({ ...prev, customRtmpUrl: value }))}
          onCloudflareToggle={(checked) => setConfig((prev) => ({ ...prev, useCloudflareManaged: checked }))}
          disabled={isStreaming}
        />
      </div>

      <VideoDisplay
        previewUrl={status.previewUrl ?? null}
        showPreview={showPreview}
        showLogs={showLogs}
        useManaged={useManaged}
      />

      <StatusLogs logs={logs} visible={showLogs} />
    </div>
  );
}

export default App;
