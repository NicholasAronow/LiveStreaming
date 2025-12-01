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

interface ContainerProps {
  userId?: string;
}

function Container({ userId: userIdProp }: ContainerProps) {
  const { userId: authUserId } = useMentraAuth();
  const userId = userIdProp || authUserId;
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

  // Stream connections management - load from localStorage on mount
  const [connections, setConnections] = useState<StreamConnection[]>(() => {
    try {
      const saved = localStorage.getItem('streamConnections');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load connections from localStorage:', error);
      return [];
    }
  });
  const [selectedConnection, setSelectedConnection] = useState<StreamConnection | null>(null);
  const [activeStreamingConnectionId, setActiveStreamingConnectionId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Save connections to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('streamConnections', JSON.stringify(connections));
    } catch (error) {
      console.error('Failed to save connections to localStorage:', error);
    }
  }, [connections]);

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
      useCloudflareManaged: true, // Use Cloudflare managed streaming with restreaming
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
    console.log('handleStartStream called');
    console.log('connectedPlatform:', connectedPlatform);
    console.log('currentStreamStatus:', currentStreamStatus);
    console.log('userId:', userId);

    if (!connectedPlatform || isStreamingStatus(currentStreamStatus)) {
      console.log('Returning early - connectedPlatform or streaming status check failed');
      return;
    }

    const platform = connectedPlatform.id as Platform;
    const key = connectedPlatform.streamKey || '';
    const url = (connectedPlatform.streamUrl || '').trim();

    // Build config for managed streaming with restreaming
    const config: StreamConfig = {
      platform,
      streamKey: key,
      customRtmpUrl: url,
      useCloudflareManaged: true,
    };

    console.log('Stream config:', config);

    setCurrentStreamStatus('Connecting');
    setIsStreaming(true);
    setActiveStreamingConnectionId(selectedConnection?.id || null);
    addLog('info', '--- New stream session ---');
    addLog('info', 'Starting managed stream...');
    if (platform !== 'here') {
      const rtmpUrl = getRtmpUrl(config);
      addLog('info', 'Restreaming to: ' + (rtmpUrl ? rtmpUrl.replace(/\/[^/]*$/, '/****') : 'unknown'));
    }
    addLog('info', 'Requesting Cloudflare managed stream...');

    console.log('Calling postJson to /api/stream/managed/start');
    const result = await postJson('/api/stream/managed/start', config, userId || undefined);
    console.log('postJson result:', result);

    if (result.ok === false) {
      setCurrentStreamStatus('Error');
      setIsStreaming(false);
      setActiveStreamingConnectionId(null);
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
      setActiveStreamingConnectionId(null);
    }
  };

  const handleDeleteConnection = async () => {
    if (!selectedConnection) return;

    setIsDeleting(true);

    // First, stop the stream if it's currently streaming
    if (isStreamingStatus(currentStreamStatus)) {
      addLog('info', 'Stopping stream before deletion...');
      setCurrentStreamStatus('Stopping');

      const result = await postJson('/api/stream/managed/stop', {}, userId || undefined);

      if (result.ok === false) {
        addLog('error', 'Failed to stop stream: ' + (result.error || 'Unknown error'));
        alert('Failed to stop stream. Please try again.');
        setIsDeleting(false);
        return; // Don't proceed with deletion if stop failed
      }

      // Wait a moment for stream to fully stop
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('success', 'Stream stopped');
    }

    // Now remove from connections array
    setConnections(prev => prev.filter(conn => conn.id !== selectedConnection.id));

    // Clear selected connection and go back to list
    setSelectedConnection(null);
    setConnectedPlatform(null);
    setIsStreaming(false);
    setCurrentStreamStatus('offline');
    setLogs([]);
    setIsDeleting(false);
    setIsDialogOpen(false);

    addLog('info', `Deleted stream key for ${selectedConnection.platformName}`);
  };

  const handleEditConnection = (newKey: string) => {
    if (!selectedConnection || !newKey.trim()) return;

    const trimmedKey = newKey.trim();

    // Update the connection with new key
    setConnections(prev => prev.map(conn => {
      if (conn.id === selectedConnection.id) {
        return {
          ...conn,
          fullStreamKey: trimmedKey,
          maskedStreamKey: maskStreamKey(trimmedKey)
        };
      }
      return conn;
    }));

    // Update selected connection
    const updatedConnection = {
      ...selectedConnection,
      fullStreamKey: trimmedKey,
      maskedStreamKey: maskStreamKey(trimmedKey)
    };
    setSelectedConnection(updatedConnection);

    // Update connected platform
    if (connectedPlatform) {
      setConnectedPlatform({
        ...connectedPlatform,
        streamKey: trimmedKey
      });
    }

    addLog('info', `Updated stream key for ${selectedConnection.platformName}`);
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!isDeleting) {
      setIsDialogOpen(false);
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
              onOpenDialog={handleOpenDialog}
              isDialogOpen={isDialogOpen}
              onCloseDialog={handleCloseDialog}
              onDelete={handleDeleteConnection}
              onSaveEdit={handleEditConnection}
              isDeleting={isDeleting}
              currentStreamKey={selectedConnection.fullStreamKey}
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
            onNavigateToNew={() => setActiveTab('new')}
            activeConnectionId={activeStreamingConnectionId}
            isStreaming={isStreaming}
          />
        );
      case 'settings':
        return (
          <div className="flex flex-col items-center justify-center h-full p-[24px]">
            <div className="w-full max-w-[400px] space-y-[16px]">
              <h2 className="text-[24px] font-semibold text-[var(--secondary-background)] mb-[24px]">Settings</h2>

              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all saved stream keys? This action cannot be undone.')) {
                    setConnections([]);
                    setSelectedConnection(null);
                    setConnectedPlatform(null);
                    localStorage.removeItem('streamConnections');
                    alert('All stream keys have been cleared.');
                  }
                }}
                className="w-full bg-red-500 text-white rounded-[16px] px-[24px] h-[48px] text-[16px] font-medium hover:bg-red-600 transition-colors"
              >
                Clear All Stream Keys
              </button>

              <p className="text-[14px] text-gray-500 text-center mt-[8px]">
                {connections.length} stream key{connections.length !== 1 ? 's' : ''} saved
              </p>
            </div>
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
