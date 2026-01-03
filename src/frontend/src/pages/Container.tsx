import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMentraAuth } from "@mentra/react";
import Splash from "./Splash";
import BottomNav from "../components/BottomNav";
import LiveBanner from "../components/LiveBanner";
import PickStreamingPlatform from "./PickStreamingPlatform";
import StreamSetup from "./StreamSetup";
import AddedKeyPage from "./AddedKeyPage";
import StreamPlatformHub from "./StreamPlatformHub";
import EstablishedStreamConnections from "./EstabllishedStreamConnections";
import Settings from "./Settings";
import { useStreamStatus } from "../hooks/useStreamStatus";
import { Platform, StreamConfig, LogEntry, StreamConnection } from "../types";
import {
  isStreamingStatus,
  postJson,
  formatTimestamp,
  getRtmpUrl,
} from "../utils";
import { BACKEND_URL } from "../config/api";
import platformsIcon from "../../../public/assets/Platforms Icon.svg";
import { showSuccessToast, showErrorToast } from "../utils/toast";

const MAX_LOGS = 100;

interface ContainerProps {
  userId?: string;
}

function Container({ userId: userIdProp }: ContainerProps) {
  const { userId: authUserId } = useMentraAuth();
  const userId = userIdProp || authUserId;
  const [showSplash, setShowSplash] = useState(false);

  // Safety: Force hide splash after 3 seconds max
  useEffect(() => {
    if (showSplash) {
      const safetyTimer = setTimeout(() => {
        console.log('[Container] Safety timeout: forcing splash to hide');
        setShowSplash(false);
      }, 1000); // Force hide after 3 seconds

      return () => clearTimeout(safetyTimer);
    }
  }, [showSplash]);
  const [activeTab, setActiveTab] = useState("new");
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

  // Stream connections management - load from API on mount
  const [connections, setConnections] = useState<StreamConnection[]>([]);
  const [selectedConnection, setSelectedConnection] =
    useState<StreamConnection | null>(null);
  const [activeStreamingConnectionId, setActiveStreamingConnectionId] =
    useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stream configuration state
  const [streamKey, setStreamKey] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamStatus, setCurrentStreamStatus] = useState("offline");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Check if splash should be shown based on 20-minute interval (using useEffect like Translation app)
  useEffect(() => {
    const SPLASH_INTERVAL = 1000; // 20 minutes in milliseconds
    const SPLASH_DURATION = 1500; // 1.5 seconds
    const lastSplashTime = localStorage.getItem('lastSplashShown');
    const currentTime = Date.now();

    console.log('[Container] Splash check:', {
      lastSplashTime,
      currentTime,
      elapsed: lastSplashTime ? currentTime - parseInt(lastSplashTime) : 'N/A',
      shouldShow: !lastSplashTime || currentTime - parseInt(lastSplashTime) >= SPLASH_INTERVAL
    });

    if (!lastSplashTime || currentTime - parseInt(lastSplashTime) >= SPLASH_INTERVAL) {
      // Show splash screen
      console.log('[Container] Showing splash screen');
      setShowSplash(true);
      localStorage.setItem('lastSplashShown', currentTime.toString());

      // Hide splash after 1.5 seconds
      const timer = setTimeout(() => {
        console.log('[Container] Hiding splash screen (normal timeout)');
        setShowSplash(false);
      }, SPLASH_DURATION);

      return () => {
        console.log('[Container] Cleaning up splash timer');
        clearTimeout(timer);
      };
    } else {
      console.log('[Container] Skipping splash screen (shown recently)');
    }
  }, []);

  // Add log entry
  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    const timestamp = formatTimestamp();
    setLogs((prev) => {
      const newLogs = [...prev, { timestamp, type, message }];
      return newLogs.slice(-MAX_LOGS);
    });
  }, []);

  // Stream status hook
  const { status } = useStreamStatus(userId || undefined, (newStatus) => {
    // Handle session status
    if (
      newStatus.hasActiveSession !== undefined &&
      !newStatus.hasActiveSession
    ) {
      setCurrentStreamStatus("offline");
      if (isStreaming) {
        setIsStreaming(false);
        setActiveStreamingConnectionId(null);
        addLog("error", "Session lost");
      }
    }

    // Handle stream status updates
    if (newStatus.streamStatus !== undefined) {
      const oldStatus = currentStreamStatus;
      setCurrentStreamStatus(newStatus.streamStatus);

      // Log status changes for managed streams
      if (
        newStatus.streamType === "managed" &&
        oldStatus !== newStatus.streamStatus
      ) {
        const statusLower = (newStatus.streamStatus || "").toLowerCase();
        let logType: LogEntry["type"] = "info";
        if (
          statusLower === "active" ||
          statusLower === "connected" ||
          statusLower === "streaming"
        ) {
          logType = "success";
        } else if (statusLower === "error" || statusLower === "failed") {
          logType = "error";
        } else if (
          statusLower === "stopping" ||
          statusLower === "disconnecting" ||
          statusLower === "reconnecting"
        ) {
          logType = "warning";
        }
        addLog(logType, "Status: " + newStatus.streamStatus);
      }

      // Log status changes for unmanaged streams
      if (
        newStatus.streamType === "unmanaged" &&
        oldStatus !== newStatus.streamStatus
      ) {
        const statusLower = (newStatus.streamStatus || "").toLowerCase();
        let logType: LogEntry["type"] = "info";
        if (
          statusLower === "active" ||
          statusLower === "connected" ||
          statusLower === "streaming"
        ) {
          logType = "success";
        } else if (statusLower === "error" || statusLower === "failed") {
          logType = "error";
        } else if (
          statusLower === "stopping" ||
          statusLower === "disconnecting" ||
          statusLower === "reconnecting"
        ) {
          logType = "warning";
        }
        addLog(logType, "Status: " + newStatus.streamStatus);
      }

      // Update streaming state
      const shouldShowStop = isStreamingStatus(newStatus.streamStatus);
      if (shouldShowStop !== isStreaming) {
        setIsStreaming(shouldShowStop);
      }

      // Restore active connection ID from streamPlatform when streaming
      if (shouldShowStop && newStatus.streamPlatform) {
        setActiveStreamingConnectionId((currentId) => {
          // Only update if not already set to avoid unnecessary re-renders
          if (currentId) return currentId;

          // Find the connection that matches the streaming platform
          const activeConnection = connections.find(
            (conn) => conn.platform === newStatus.streamPlatform
          );
          return activeConnection?.id || null;
        });
      } else if (!shouldShowStop) {
        // Clear active connection when not streaming
        setActiveStreamingConnectionId(null);
      }
    }

    // Handle errors
    if (newStatus.error) {
      console.error("Stream error:", newStatus.error);
      addLog("error", newStatus.error);
    }

    // Handle preview URL for managed streams
    if (newStatus.streamType === "managed" && newStatus.previewUrl) {
      addLog("info", "Stream preview available");
    }
  });

  // Fetch connections from API on mount
  useEffect(() => {
    const fetchConnections = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`${BACKEND_URL}/api/stream-configs`, {
          headers: {
            "X-User-Id": userId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.configs) {
            // Transform API configs to StreamConnection format
            const transformedConnections: StreamConnection[] = data.configs.map(
              (config: any) => ({
                id: config._id,
                platform: config.platform,
                platformName: config.platformName,
                platformLogoIcon: config.platformLogoIcon,
                maskedStreamKey: config.maskedStreamKey,
                fullStreamKey: config.streamKey,
                rtmpUrl: config.rtmpUrl || undefined,
                createdAt: config.createdAt,
                isActive: false,
                streamStartTime: config.streamStartTime || undefined,
              })
            );
            setConnections(transformedConnections);
          }
        }
      } catch (error) {
        console.error("Failed to fetch connections from API:", error);
      }
    };

    fetchConnections();
  }, [userId]);

  // Restore active connection ID after connections are loaded and when stream status indicates active streaming
  useEffect(() => {
    if (
      connections.length > 0 &&
      status.streamPlatform &&
      isStreaming &&
      !activeStreamingConnectionId
    ) {
      const activeConnection = connections.find(
        (conn) => conn.platform === status.streamPlatform
      );
      if (activeConnection) {
        setActiveStreamingConnectionId(activeConnection.id);
      }
    }
  }, [
    connections,
    status.streamPlatform,
    isStreaming,
    activeStreamingConnectionId,
  ]);

  // Handle AddedKeyPage timer - show for 3 seconds then go to stream tab
  useEffect(() => {
    if (showAddedKeyPage) {
      const timer = setTimeout(() => {
        setShowAddedKeyPage(false);
        setActiveTab("stream");
        setSelectedPlatform(null);
      }, 1500); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [showAddedKeyPage]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedPlatform(null); // Reset selected platform when changing tabs
    setShowAddedKeyPage(false); // Reset added key page
    console.log("Active tab:", tab);
  };

  const handlePlatformSelect = async (
    platformId: string,
    platformName: string,
    platformIcon: string,
    platformLogoIcon: string
  ) => {
    // Special handling for "Stream Here" platform - auto-configure and go directly to hub
    if (platformId === "streamer") {
      // Auto-configure with test values
      const testStreamKey = "test";
      const testRtmpUrl = "rtmp://localhost:1935/live";

      // Check if streamer connection already exists in database
      const existingConnection = connections.find(conn => conn.platform === "streamer");

      if (existingConnection) {
        // Connection already exists, just open it
        setSelectedConnection(existingConnection);
        setConnectedPlatform({
          id: platformId,
          name: platformName,
          icon: platformIcon,
          logoIcon: platformLogoIcon,
          streamKey: existingConnection.fullStreamKey,
          streamUrl: existingConnection.rtmpUrl,
        });
        setStreamKey(existingConnection.fullStreamKey);
        setStreamUrl(existingConnection.rtmpUrl || "");
        setActiveTab("stream");
      } else {
        // Create new connection silently and get the result
        const newConnection = await handleConnect(testStreamKey, testRtmpUrl, {
          id: platformId,
          name: platformName,
          icon: platformIcon,
          logoIcon: platformLogoIcon,
        }, true); // Skip AddedKeyPage

        // Immediately set up the connection and navigate
        if (newConnection) {
          setSelectedConnection(newConnection);
          setConnectedPlatform({
            id: platformId,
            name: platformName,
            icon: platformIcon,
            logoIcon: platformLogoIcon,
            streamKey: testStreamKey,
            streamUrl: testRtmpUrl,
          });
        }
        setActiveTab("stream");
      }
      return;
    }

    // All other platforms go through StreamSetup
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

  const handleConnect = async (key: string, url: string, platformOverride?: typeof selectedPlatform, skipAddedKeyPage = false): Promise<StreamConnection | undefined> => {
    const currentPlatform = platformOverride || selectedPlatform;
    if (!currentPlatform || !userId) return undefined;

    // Store the stream configuration (use empty string if url is just whitespace)
    const cleanUrl = url.trim();
    setStreamKey(key);
    setStreamUrl(cleanUrl);

    // Build RTMP URL using the utility function to validate
    const platformId = currentPlatform.id as Platform;
    const config: StreamConfig = {
      platform: platformId,
      streamKey: key,
      customRtmpUrl: cleanUrl,
      useCloudflareManaged: true, // Use Cloudflare managed streaming with restreaming
    };
    const rtmpUrl = getRtmpUrl(config);

    if (!rtmpUrl) {
      addLog("error", "No RTMP URL provided - please enter a stream key");
      showErrorToast("Please enter a valid stream key");
      return undefined;
    }

    // Just save the configuration, don't start streaming yet
    addLog("info", "Stream configuration saved for " + currentPlatform.name);
    addLog("info", "Will stream to: " + rtmpUrl.replace(/\/[^/]*$/, "/****"));

    // Save connected platform with stream details
    setConnectedPlatform({
      ...currentPlatform,
      streamKey: key,
      streamUrl: cleanUrl,
    });

    // Create a new connection card
    const createdAt = new Date().toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });

    const maskedKey = maskStreamKey(key);

    // Save to API
    try {
      const response = await fetch(`${BACKEND_URL}/api/stream-configs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify({
          platform: currentPlatform.id,
          streamKey: key,
          rtmpUrl: cleanUrl,
          platformName: currentPlatform.name,
          platformLogoIcon: currentPlatform.logoIcon,
          maskedStreamKey: maskedKey,
          createdAt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.config) {
          // Update local state with saved config
          const newConnection: StreamConnection = {
            id: data.config._id,
            platform: data.config.platform,
            platformName: data.config.platformName,
            platformLogoIcon: data.config.platformLogoIcon,
            maskedStreamKey: data.config.maskedStreamKey,
            fullStreamKey: data.config.streamKey,
            rtmpUrl: data.config.rtmpUrl || undefined,
            createdAt: data.config.createdAt,
            isActive: false,
            streamStartTime: data.config.streamStartTime || undefined,
          };

          // Add to connections list (check if platform already exists and update or add new)
          setConnections((prev) => {
            const existingIndex = prev.findIndex(
              (conn) => conn.platform === newConnection.platform
            );
            if (existingIndex >= 0) {
              // Update existing connection
              const updated = [...prev];
              updated[existingIndex] = newConnection;
              return updated;
            }
            // Add new connection
            return [...prev, newConnection];
          });

          addLog("success", "Configuration saved to database");

          // Show AddedKeyPage (unless skipped for auto-setup platforms like streamer)
          if (!skipAddedKeyPage) {
            setShowAddedKeyPage(true);
          }

          // Return the new connection
          return newConnection;
        }
      } else {
        addLog("error", "Failed to save configuration to database");
      }
    } catch (error) {
      console.error("Failed to save connection to API:", error);
      addLog("error", "Failed to save configuration");
    }

    // Show AddedKeyPage (unless skipped for auto-setup platforms like streamer)
    if (!skipAddedKeyPage) {
      setShowAddedKeyPage(true);
    }

    return undefined;
  };

  // Helper function to mask stream key
  const maskStreamKey = (key: string) => {
    if (!key || key.length <= 4) return key;
    const lastFour = key.slice(-4);
    const maskedPart = "*".repeat(Math.min(key.length - 4, 6));
    return maskedPart + lastFour;
  };

  const handleStartStream = async () => {
    console.log("handleStartStream called");
    console.log("connectedPlatform:", connectedPlatform);
    console.log("currentStreamStatus:", currentStreamStatus);
    console.log("userId:", userId);

    if (!connectedPlatform || isStreamingStatus(currentStreamStatus)) {
      console.log(
        "Returning early - connectedPlatform or streaming status check failed"
      );
      return;
    }

    const platform = connectedPlatform.id as Platform;
    const key = connectedPlatform.streamKey || "";
    const url = (connectedPlatform.streamUrl || "").trim();

    // For custom platforms, concatenate URL and key to form the full RTMP URL
    let fullCustomRtmpUrl = url;
    if (platform === "other" && url && key) {
      // If URL doesn't already end with the key, append it
      if (!url.endsWith(key)) {
        fullCustomRtmpUrl = `${url}/${key}`;
      }
    }

    // Build config for managed streaming with restreaming
    const config: StreamConfig = {
      platform,
      streamKey: key,
      customRtmpUrl: fullCustomRtmpUrl,
      useCloudflareManaged: true,
    };

    console.log("Stream config:", config);

    setCurrentStreamStatus("Connecting");
    setIsStreaming(true);
    setActiveStreamingConnectionId(selectedConnection?.id || null);
    addLog("info", "--- New stream session ---");
    addLog("info", "Starting managed stream...");
    if (platform !== "here") {
      const rtmpUrl = getRtmpUrl(config);
      addLog(
        "info",
        "Restreaming to: " +
          (rtmpUrl ? rtmpUrl.replace(/\/[^/]*$/, "/****") : "unknown")
      );
    }
    addLog("info", "Requesting Cloudflare managed stream...");

    console.log("Calling postJson to /api/stream/managed/start");
    console.log("Config being sent:", config);
    console.log("UserId being sent:", userId);

    const result = await postJson(
      "/api/stream/managed/start",
      config,
      userId || undefined
    );
    console.log("postJson result:", result);
    console.log("result.ok:", result.ok);
    console.log("result.error:", result.error);

    if (result.ok === false) {
      setCurrentStreamStatus("Error");
      setIsStreaming(false);
      setActiveStreamingConnectionId(null);
      addLog("error", "Failed to start: " + (result.error || "Unknown error"));

      // Show toast notification
      const errorMessage = result.error || "Unknown error";
      showErrorToast("Failed to start stream: " + errorMessage, 5000);
    } else {
      addLog("success", "Managed stream request sent");

      // Refetch the connection to get the updated streamStartTime from the database
      if (userId && selectedConnection) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/stream-configs`, {
            headers: {
              "X-User-Id": userId,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.ok && data.configs) {
              const updatedConfig = data.configs.find(
                (config: any) => config.platform === platform
              );
              if (updatedConfig && updatedConfig.streamStartTime) {
                // Update the selectedConnection with the new streamStartTime
                setSelectedConnection((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    streamStartTime: updatedConfig.streamStartTime,
                  };
                });
                // Also update in the connections array
                setConnections((prev) =>
                  prev.map((conn) =>
                    conn.id === selectedConnection.id
                      ? { ...conn, streamStartTime: updatedConfig.streamStartTime }
                      : conn
                  )
                );
              }
            }
          }
        } catch (error) {
          console.error("Failed to refetch stream start time:", error);
        }
      }
    }
  };

  const handleStopStream = async () => {
    if (!isStreamingStatus(currentStreamStatus)) return;

    setCurrentStreamStatus("Stopping");
    addLog("info", "Stopping stream...");

    const result = await postJson(
      "/api/stream/managed/stop",
      {},
      userId || undefined
    );

    if (result.ok === false) {
      addLog("error", "Failed to stop: " + (result.error || "Unknown error"));
    } else {
      addLog("success", "Stream stopped");
      setIsStreaming(false);
      setCurrentStreamStatus("offline");
      setActiveStreamingConnectionId(null);

      // Clear streamStartTime from local state
      if (selectedConnection) {
        setSelectedConnection((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            streamStartTime: undefined,
          };
        });
        // Also update in the connections array
        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === selectedConnection.id
              ? { ...conn, streamStartTime: undefined }
              : conn
          )
        );
      }
    }
  };

  const handleDeleteConnection = async () => {
    if (!selectedConnection || !userId) return;

    setIsDeleting(true);

    // First, stop the stream if it's currently streaming
    if (isStreamingStatus(currentStreamStatus)) {
      addLog("info", "Stopping stream before deletion...");
      setCurrentStreamStatus("Stopping");

      const result = await postJson(
        "/api/stream/managed/stop",
        {},
        userId || undefined
      );

      if (result.ok === false) {
        addLog(
          "error",
          "Failed to stop stream: " + (result.error || "Unknown error")
        );
        showErrorToast("Failed to stop stream. Please try again.");
        setIsDeleting(false);
        return; // Don't proceed with deletion if stop failed
      }

      // Wait a moment for stream to fully stop
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addLog("success", "Stream stopped");
    }

    // Delete from API
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/stream-configs/${selectedConnection.platform}`,
        {
          method: "DELETE",
          headers: {
            "X-User-Id": userId,
          },
        }
      );

      if (response.ok) {
        addLog("success", "Configuration deleted from database");
        // Now remove from connections array
        setConnections((prev) =>
          prev.filter((conn) => conn.id !== selectedConnection.id)
        );
      } else {
        addLog("error", "Failed to delete from database");
      }
    } catch (error) {
      console.error("Failed to delete connection from API:", error);
      addLog("error", "Failed to delete configuration");
    }

    // Clear selected connection and go back to list
    setSelectedConnection(null);
    setConnectedPlatform(null);
    setIsStreaming(false);
    setCurrentStreamStatus("offline");
    setLogs([]);
    setIsDeleting(false);

    addLog("info", `Deleted stream key for ${selectedConnection.platformName}`);
  };

  const handleEditConnection = async (newKey: string, newRtmpUrl?: string) => {
    if (!selectedConnection || !newKey.trim() || !userId) return;

    const trimmedKey = newKey.trim();
    const trimmedUrl = (newRtmpUrl || "").trim();
    const maskedKey = maskStreamKey(trimmedKey);

    // Update via API
    try {
      const response = await fetch(`${BACKEND_URL}/api/stream-configs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify({
          platform: selectedConnection.platform,
          streamKey: trimmedKey,
          rtmpUrl: trimmedUrl,
          platformName: selectedConnection.platformName,
          platformLogoIcon: selectedConnection.platformLogoIcon,
          maskedStreamKey: maskedKey,
          createdAt: selectedConnection.createdAt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          // Update the connection with new key and URL
          setConnections((prev) =>
            prev.map((conn) => {
              if (conn.id === selectedConnection.id) {
                return {
                  ...conn,
                  fullStreamKey: trimmedKey,
                  maskedStreamKey: maskedKey,
                  rtmpUrl: trimmedUrl || undefined,
                };
              }
              return conn;
            })
          );

          // Update selected connection
          const updatedConnection = {
            ...selectedConnection,
            fullStreamKey: trimmedKey,
            maskedStreamKey: maskedKey,
            rtmpUrl: trimmedUrl || undefined,
          };
          setSelectedConnection(updatedConnection);

          // Update connected platform
          if (connectedPlatform) {
            setConnectedPlatform({
              ...connectedPlatform,
              streamKey: trimmedKey,
              streamUrl: trimmedUrl,
            });
          }

          addLog(
            "success",
            `Updated stream configuration for ${selectedConnection.platformName}`
          );
        }
      } else {
        addLog("error", "Failed to update configuration in database");
      }
    } catch (error) {
      console.error("Failed to update connection in API:", error);
      addLog("error", "Failed to update configuration");
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

    // If a platform is selected, show the setup page (for all platforms including "streamer")
    if (selectedPlatform) {
      return (
        <StreamSetup
          id={selectedPlatform.id}
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
      case "new":
        return (
          <PickStreamingPlatform onPlatformSelect={handlePlatformSelect} />
        );
      case "stream":
        // If a connection is selected (streaming or about to stream), show StreamPlatformHub
        if (selectedConnection) {
          const showPreview =
            status.streamType === "managed" &&
            !!status.previewUrl &&
            isStreaming;
          return (
            <StreamPlatformHub
              platformName={selectedConnection.platformName}
              platformLogoIcon={selectedConnection.platformLogoIcon}
              platformId={selectedConnection.platform}
              isStreaming={isStreaming}
              streamStatus={currentStreamStatus}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              onGoBack={() => {
                setSelectedConnection(null);
                setIsStreaming(false);
                setCurrentStreamStatus("offline");
                setLogs([]);
              }}
              onDelete={handleDeleteConnection}
              onSaveEdit={handleEditConnection}
              isDeleting={isDeleting}
              currentStreamKey={selectedConnection.fullStreamKey}
              currentRtmpUrl={selectedConnection.rtmpUrl || ""}
              logs={logs}
              maskedStreamKey={selectedConnection.maskedStreamKey}
              previewUrl={status.previewUrl ?? null}
              showPreview={showPreview}
              streamStartTime={selectedConnection.streamStartTime}
              userId={userId ?? undefined}
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
                streamUrl: connection.rtmpUrl,
              });
              setStreamKey(connection.fullStreamKey);
              setStreamUrl(connection.rtmpUrl || "");
            }}
            onNavigateToNew={() => setActiveTab("new")}
            activeConnectionId={activeStreamingConnectionId}
            isStreaming={isStreaming}
          />
        );
      case "settings":
        return (
          <Settings
            connections={connections}
            userId={userId || undefined}
            platformsIcon={platformsIcon}
            isStreaming={isStreaming}
            onStopStream={handleStopStream}
            onClearAllKeys={() => {
              setConnections([]);
              setSelectedConnection(null);
              setConnectedPlatform(null);
            }}
          />
        );
      default:
        return null;
    }
  };

  // Determine if we should show the live banner
  // Show banner on all pages except when viewing StreamPlatformHub (selectedConnection is set AND activeTab is "stream")
  const isOnStreamPlatformHub = selectedConnection && activeTab === "stream";
  const showLiveBanner = isStreaming && !isOnStreamPlatformHub;

  // Get the active streaming platform info for the banner
  const activePlatform = connections.find(
    (conn) => conn.id === activeStreamingConnectionId
  );

  // Handle live banner click - navigate to the active streaming platform
  const handleLiveBannerClick = () => {
    if (activePlatform) {
      setSelectedConnection(activePlatform);
      setActiveTab("stream");
    }
  };

  return (
    <div className="w-screen h-screen bg-white flex flex-col relative">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
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
            {showLiveBanner && (
              <LiveBanner
                platformLogoIcon={activePlatform?.platformLogoIcon}
                platformName={activePlatform?.platformName}
                onClick={handleLiveBannerClick}
              />
            )}
            <div className="flex-1 overflow-hidden">{renderContent()}</div>
            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Container;
