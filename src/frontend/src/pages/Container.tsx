import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMentraAuth } from '@mentra/react';
import Splash from "./Splash";
import BottomNav from "../components/BottomNav";
import PickStreamingPlatform from "./PickStreamingPlatform";
import StreamSetup from "./StreamSetup";
import AddedKeyPage from "./AddedKeyPage";
import StreamPlatformHub from "./StreamPlatformHub";
import EstablishedStreamConnections from "./EstabllishedStreamConnections";
import { useStreamStatus } from '../hooks/useStreamStatus';
import { Platform, StreamConfig, LogEntry, StreamConnection } from '../types';
import { isStreamingStatus, postJson, formatTimestamp, getRtmpUrl } from '../utils';
import youtubeIcon from '../../../public/assets/youtube/YoutubePlaylogo.svg';
import twitchIcon from '../../../public/assets/Property 1=Twitch fill.svg';

const MAX_LOGS = 100;

function Container() {
  const { userId, isLoading, error, isAuthenticated } = useMentraAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('new');
  const [showAddedKeyPage, setShowAddedKeyPage] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<{
    id: string;
    name: string;
    icon: string;
    logoIcon: string;
  } | null>(null);
  const [connectedPlatform, setConnectedPlatform] = useState<{
    id: string;
    name: string;
    icon: string;
    logoIcon: string;
    streamKey?: string;
    streamUrl?: string;
  } | null>(null);

  // Stream connections management
  const [connections, setConnections] = useState<StreamConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<StreamConnection | null>(null);

  // Stream configuration state
  const [streamKey, setStreamKey] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamStatus, setCurrentStreamStatus] = useState('offline');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const skipSplashAnimation = true; // Set to true to skip splash

  // Add log entry
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const timestamp = formatTimestamp();
    setLogs((prev) => {
      const newLogs = [...prev, { timestamp, type, message }];
      return newLogs.slice(-MAX_LOGS);
    });
  }, []);

  // Stream status hook
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

      // Log status changes for managed streams
      if (newStatus.streamType === 'managed' && oldStatus !== newStatus.streamStatus) {
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

    // Handle preview URL for managed streams
    if (newStatus.streamType === 'managed' && newStatus.previewUrl) {
      addLog('info', 'Stream preview available');
    }
  });

  useEffect(() => {
    if (skipSplashAnimation) {
      setShowSplash(false);
    } else {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [skipSplashAnimation]);

  // Handle AddedKeyPage timer - show for 3 seconds then go to stream tab
  useEffect(() => {
    if (showAddedKeyPage) {
      const timer = setTimeout(() => {
        setShowAddedKeyPage(false);
        setActiveTab('stream');
        setSelectedPlatform(null);
      }, 1500); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [showAddedKeyPage]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedPlatform(null); // Reset selected platform when changing tabs
    setShowAddedKeyPage(false); // Reset added key page
    console.log('Active tab:', tab);
  };

  const handlePlatformSelect = (platformId: string, platformName: string, platformIcon: string, platformLogoIcon: string) => {
    setSelectedPlatform({
      id: platformId,
      name: platformName,
      icon: platformIcon,
      logoIcon: platformLogoIcon,
    });
  };

  const handleBackFromSetup = () => {
    setSelectedPlatform(null);
  };

  const handleConnect = (key: string, url: string) => {
    if (!selectedPlatform) return;

    // Store the stream configuration (use empty string if url is just whitespace)
    const cleanUrl = url.trim();
    setStreamKey(key);
    setStreamUrl(cleanUrl);

    // Build RTMP URL using the utility function to validate
    const platform = selectedPlatform.id as Platform;
    const config: StreamConfig = {
      platform,
      streamKey: key,
      customRtmpUrl: cleanUrl,
      useCloudflareManaged: true, // Use Cloudflare managed streaming
    };
    const rtmpUrl = getRtmpUrl(config);

    if (!rtmpUrl) {
      addLog('error', 'No RTMP URL provided - please enter a stream key');
      alert('Please enter a valid stream key');
      return;
    }

    // Just save the configuration, don't start streaming yet
    addLog('info', 'Stream configuration saved for ' + selectedPlatform.name);
    addLog('info', 'Will stream to: ' + rtmpUrl.replace(/\/[^/]*$/, '/****'));

    // Save connected platform with stream details
    setConnectedPlatform({
      ...selectedPlatform,
      streamKey: key,
      streamUrl: cleanUrl,
    });

    // Create a new connection card
    const newConnection: StreamConnection = {
      id: Date.now().toString(),
      platform: selectedPlatform.id as StreamConnection['platform'],
      platformName: selectedPlatform.name,
      platformLogoIcon: selectedPlatform.logoIcon,
      maskedStreamKey: maskStreamKey(key),
      fullStreamKey: key,
      rtmpUrl: cleanUrl || undefined,
      createdAt: new Date().toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      }),
      isActive: false
    };

    // Add to connections list (check if platform already exists and update or add new)
    setConnections(prev => {
      const existingIndex = prev.findIndex(conn => conn.platform === newConnection.platform);
      if (existingIndex >= 0) {
        // Update existing connection
        const updated = [...prev];
        updated[existingIndex] = newConnection;
        return updated;
      }
      // Add new connection
      return [...prev, newConnection];
    });

    setShowAddedKeyPage(true);
  };

  // Helper function to mask stream key
  const maskStreamKey = (key: string) => {
    if (!key || key.length <= 4) return key;
    const lastFour = key.slice(-4);
    const maskedPart = '*'.repeat(Math.min(key.length - 4, 20));
    return maskedPart + lastFour;
  };

  const handleStartStream = async () => {
    if (!connectedPlatform || isStreamingStatus(currentStreamStatus)) return;

    const platform = connectedPlatform.id as Platform;
    const key = connectedPlatform.streamKey || '';
    const url = (connectedPlatform.streamUrl || '').trim();

    // Build config for managed streaming
    const config: StreamConfig = {
      platform,
      streamKey: key,
      customRtmpUrl: url,
      useCloudflareManaged: true,
    };

    setCurrentStreamStatus('Connecting');
    setIsStreaming(true);
    addLog('info', '--- New stream session ---');
    addLog('info', 'Starting managed stream...');
    addLog('info', 'Requesting Cloudflare managed stream...');

    const result = await postJson('/api/stream/managed/start', config, userId || undefined);

    if (result.ok === false) {
      setCurrentStreamStatus('Error');
      setIsStreaming(false);
      addLog('error', 'Failed to start: ' + (result.error || 'Unknown error'));
      alert('Failed to start stream: ' + (result.error || 'Unknown error'));
    } else {
      addLog('success', 'Managed stream request sent');
    }
  };

  const handleStopStream = async () => {
    if (!isStreamingStatus(currentStreamStatus)) return;

    setCurrentStreamStatus('Stopping');
    addLog('info', 'Stopping stream...');

    const result = await postJson('/api/stream/managed/stop', {}, userId || undefined);

    if (result.ok === false) {
      addLog('error', 'Failed to stop: ' + (result.error || 'Unknown error'));
    } else {
      addLog('success', 'Stream stopped');
      setIsStreaming(false);
      setCurrentStreamStatus('offline');
    }
  };

  const renderContent = () => {
    // Show AddedKeyPage when connection is made
    if (showAddedKeyPage && selectedPlatform) {
      return (
        <AddedKeyPage
          platformName={selectedPlatform.name}
          platformLogoIcon={selectedPlatform.logoIcon}
        />
      );
    }

    // If a platform is selected, show the setup page
    if (selectedPlatform) {
      return (
        <StreamSetup
          platform={selectedPlatform.id}
          platformName={selectedPlatform.name}
          platformIcon={selectedPlatform.icon}
          platformLogoIcon={selectedPlatform.logoIcon}
          onBack={handleBackFromSetup}
          onConnect={handleConnect}
        />
      );
    }

    switch (activeTab) {
      case 'new':
        return <PickStreamingPlatform onPlatformSelect={handlePlatformSelect} />;
      case 'stream':
        // If a connection is selected (streaming or about to stream), show StreamPlatformHub
        if (selectedConnection) {
          const showPreview = status.streamType === 'managed' && !!status.previewUrl && isStreaming;
          return (
            <StreamPlatformHub
              platformName={selectedConnection.platformName}
              platformLogoIcon={selectedConnection.platformLogoIcon}
              isStreaming={isStreaming}
              streamStatus={currentStreamStatus}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              onGoBack={() => {
                setSelectedConnection(null);
                setIsStreaming(false);
                setCurrentStreamStatus('offline');
                setLogs([]);
              }}
              logs={logs}
              maskedStreamKey={selectedConnection.maskedStreamKey}
              previewUrl={status.previewUrl ?? null}
              showPreview={showPreview}
            />
          );
        }
        // Otherwise show the list of connections
        return (
          <EstablishedStreamConnections
            connections={connections}
            onOpenConnection={(connection: StreamConnection) => {
              setSelectedConnection(connection);
              // Set the connected platform for stream operations
              setConnectedPlatform({
                id: connection.platform,
                name: connection.platformName,
                icon: connection.platformLogoIcon,
                logoIcon: connection.platformLogoIcon,
                streamKey: connection.fullStreamKey,
                streamUrl: connection.rtmpUrl
              });
              setStreamKey(connection.fullStreamKey);
              setStreamUrl(connection.rtmpUrl || '');
            }}
          />
        );
      case 'settings':
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-xl text-gray-500">Settings Tab - Coming Soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen bg-white flex flex-col relative">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 w-full h-full z-[9999]"
          >
            <Splash />
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              {renderContent()}
            </div>
            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Container;
