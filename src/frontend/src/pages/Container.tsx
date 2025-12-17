import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMentraAuth } from "@mentra/react";
import toast from "react-hot-toast";
import { AlertCircle } from "lucide-react";
import Splash from "./Splash";
import BottomNav from "../components/BottomNav";
import LiveBanner from "../components/LiveBanner";
import PickStreamingPlatform from "./PickStreamingPlatform";
import StreamSetup from "./StreamSetup";
import AddedKeyPage from "./AddedKeyPage";
import StreamPlatformHub from "./StreamPlatformHub";
import EstablishedStreamConnections from "./EstabllishedStreamConnections";
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

const MAX_LOGS = 100;

interface ContainerProps {
  userId?: string;
}

function Container({ userId: userIdProp }: ContainerProps) {
  const { userId: authUserId } = useMentraAuth();
  const userId = userIdProp || authUserId;
  const [showSplash, setShowSplash] = useState(true);
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

  const skipSplashAnimation = true; // Set to true to skip splash

  // Add log entry
  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    const timestamp = formatTimestamp();
    setLogs((prev) => {
      const newLogs = [...prev, { timestamp, type, message }];
      return newLogs.slice(-MAX_LOGS);
    });
  }, []);

  // Stream status hook
  const { status } = useStreamStatus(userId, (newStatus) => {
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
          statusLower === "disconnecting"
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
          statusLower === "disconnecting"
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

  const handlePlatformSelect = (
    platformId: string,
    platformName: string,
    platformIcon: string,
    platformLogoIcon: string
  ) => {
    // For "streamer" platform, skip StreamSetup and auto-connect with test values
    if (platformId === "streamer") {
      const testPlatform = {
        id: platformId,
        name: platformName,
        icon: platformIcon,
        logoIcon: platformLogoIcon,
      };
      setSelectedPlatform(testPlatform);
      // Auto-connect with test values and immediately switch to stream tab
      // Pass the platform directly to avoid race condition with state update
      handleConnect("test", "test", testPlatform);
      // Don't change tab here - let handleConnect flow handle it naturally
      return;
    }

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

  const handleConnect = async (key: string, url: string, platformOverride?: typeof selectedPlatform) => {
    const currentPlatform = platformOverride || selectedPlatform;
    if (!currentPlatform || !userId) return;

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
      toast.error("Please enter a valid stream key", { duration: 3000 });
      return;
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
        }
      } else {
        addLog("error", "Failed to save configuration to database");
      }
    } catch (error) {
      console.error("Failed to save connection to API:", error);
      addLog("error", "Failed to save configuration");
    }

    // Show AddedKeyPage for all platforms (including "streamer")
    setShowAddedKeyPage(true);
  };

  // Helper function to mask stream key
  const maskStreamKey = (key: string) => {
    if (!key || key.length <= 4) return key;
    const lastFour = key.slice(-4);
    const maskedPart = "*".repeat(Math.min(key.length - 4, 20));
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

      // Show toast notification with WiFi-specific styling if it's a WiFi error
      const errorMessage = result.error || "Unknown error";
      if (errorMessage.includes("WiFi") || errorMessage.includes("wifi")) {
        toast.error(errorMessage, {
          duration: 5000,
          style: {
            background: "#FEE2E2",
            color: "#991B1B",
            border: "1px solid #FCA5A5",
            fontSize: "10px",
          },
          icon: <AlertCircle className="w-10 h-10 " />,
        });
      } else {
        toast.error("Failed to start stream: " + errorMessage, {
          duration: 4000,
        });
      }
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
        toast.error("Failed to stop stream. Please try again.", {
          duration: 4000,
        });
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

    // If a platform is selected, show the setup page (unless it's "streamer" platform)
    if (selectedPlatform && selectedPlatform.id !== "streamer") {
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
          <div className="flex flex-col h-full p-[24px]">
            <h2 className="text-[24px] font-semibold text-[var(--secondary-background)] mb-[24px]">
              Settings
            </h2>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-[400px]">
                <div className="flex items-center justify-center mb-[64px]">
                  <img
                    src={platformsIcon}
                    alt="Platforms Icon"
                    className="w-[92px] h-[92px]"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Are you sure you want to clear all saved stream keys? This action cannot be undone."
                      )
                    ) {
                      if (!userId) return;

                      // Delete all connections from API
                      try {
                        const deletePromises = connections.map((conn) =>
                          fetch(
                            `${BACKEND_URL}/api/stream-configs/${conn.platform}`,
                            {
                              method: "DELETE",
                              headers: { "X-User-Id": userId },
                            }
                          )
                        );
                        await Promise.all(deletePromises);

                        setConnections([]);
                        setSelectedConnection(null);
                        setConnectedPlatform(null);
                        toast.success("All stream keys have been cleared.", {
                          duration: 3000,
                        });
                      } catch (error) {
                        console.error("Failed to clear all configs:", error);
                        toast.error(
                          "Failed to clear all stream keys. Please try again.",
                          { duration: 4000 }
                        );
                      }
                    }
                  }}
                  className="w-full bg-black text-white rounded-[16px] px-[24px] h-[48px] text-[16px] font-medium hover:bg-red-600 transition-colors"
                >
                  Clear All Stream Keys
                </button>

                <p className="text-[14px] text-gray-500 text-center mt-[8px]">
                  {connections.length} stream key
                  {connections.length !== 1 ? "s" : ""} saved
                </p>
              </div>
            </div>
          </div>
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
            {showLiveBanner && (
              <LiveBanner
                platformLogoIcon={activePlatform?.platformLogoIcon}
                platformName={activePlatform?.platformName}
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
