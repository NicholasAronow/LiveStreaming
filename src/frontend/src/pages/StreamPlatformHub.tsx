import React, { useState, useEffect } from "react";
import trashIcon from "../../../public/assets/trash.svg";
import cameraStreamIcon from "../../../public/assets/cameraStreamIcon.svg";
import { LogEntry } from "../types";
import EditStreamKeyDialog from "../components/EditStreamKeyDialog";
import DeleteStreamDialog from "../components/DeleteStreamDialog";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import { getJson, postJson } from "../utils";

interface StreamPlatformHubProps {
  platformName?: string;
  platformLogoIcon?: string;
  isStreaming?: boolean;
  streamStatus?: string;
  onStartStream?: () => void;
  onStopStream?: () => void;
  onGoBack?: () => void;
  onDelete?: () => void;
  onSaveEdit?: (newKey: string, newRtmpUrl?: string) => void;
  onFetchStreamKey?: () => Promise<string>;
  isDeleting?: boolean;
  currentStreamKey?: string;
  currentRtmpUrl?: string;
  logs?: LogEntry[];
  maskedStreamKey?: string;
  previewUrl?: string | null;
  showPreview?: boolean;
  streamStartTime?: number;
  platformId?: string;
  userId?: string;
}

function StreamPlatformHub({
  platformName = "YouTube",
  platformLogoIcon,
  isStreaming = false,
  streamStatus = "offline",
  onStartStream,
  onStopStream,
  onGoBack,
  onDelete,
  onSaveEdit,
  onFetchStreamKey,
  isDeleting = false,
  currentStreamKey = "",
  currentRtmpUrl = "",
  logs = [],
  maskedStreamKey,
  previewUrl = null,
  showPreview = false,
  streamStartTime,
  platformId,
  userId,
}: StreamPlatformHubProps) {
  const [duration, setDuration] = useState(0);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState(20); // 20 second countdown before showing stream
  const [showCountdown, setShowCountdown] = useState(false); // Control countdown visibility

  // Local button state - only changes on user action or final stream states
  const [buttonState, setButtonState] = useState<'idle' | 'starting' | 'live' | 'stopping'>('idle');

  // Sync button state with streamStatus - only update for definitive states
  useEffect(() => {
    const status = streamStatus.toLowerCase();

    // Only update button state for final/definitive states
    if (status === 'streaming' || status === 'active' || status === 'connected') {
      setButtonState('live');
    } else if (status === 'offline' || status === 'error' || status === 'failed') {
      setButtonState('idle');
    }
    // Ignore intermediate states like 'connecting', 'stopping', etc.
    // Those will be set by user actions in handleToggleStream
  }, [streamStatus]);

  // Update duration when streaming - calculate from database start time
  // Only start counting after the 20-second countdown finishes
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const status = streamStatus.toLowerCase();
    // Consider streaming/active/connected as actively streaming
    // Also include connecting since stream has been initiated
    const isActuallyStreaming =
      isStreaming &&
      (status === "streaming" ||
        status === "active" ||
        status === "connected" ||
        status === "connecting");

    console.log("[StreamPlatformHub] Duration effect:", {
      isStreaming,
      streamStatus,
      status,
      isActuallyStreaming,
      streamStartTime,
      showCountdown,
    });

    // Only count duration after countdown finishes
    if (isActuallyStreaming && !showCountdown) {
      if (streamStartTime) {
        // Calculate elapsed time, but subtract the 20-second countdown period
        const elapsed = Math.floor((Date.now() - streamStartTime) / 1000) - 20;
        // Safety check: if elapsed is negative, keep at 0
        if (elapsed < 0) {
          console.log(
            "[StreamPlatformHub] Still in countdown period, duration at 0"
          );
          setDuration(0);
        } else {
          console.log(
            "[StreamPlatformHub] Using streamStartTime, elapsed:",
            elapsed
          );
          setDuration(elapsed);

          // Update duration every second based on start time (minus 20 seconds)
          interval = setInterval(() => {
            const currentElapsed =
              Math.floor((Date.now() - streamStartTime) / 1000) - 20;
            if (currentElapsed >= 0) {
              setDuration(currentElapsed);
            } else {
              setDuration(0);
            }
          }, 1000);
        }
      } else {
        // No start time yet - keep duration at 0 until we get it from database
        console.log(
          "[StreamPlatformHub] No streamStartTime yet, waiting for database update"
        );
        setDuration(0);
      }
    } else if (!isStreaming) {
      // Stream stopped - reset duration
      console.log("[StreamPlatformHub] Stream stopped, resetting duration");
      setDuration(0);
    } else if (showCountdown) {
      // During countdown, keep duration at 0
      setDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, streamStatus, streamStartTime, showCountdown]);

  // 20-second countdown timer when streaming starts
  // Only show countdown if stream just started (elapsed time < 20 seconds)
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (isStreaming && streamStartTime) {
      const elapsedSeconds = Math.floor((Date.now() - streamStartTime) / 1000);

      // Only show countdown if stream has been running for less than 20 seconds
      if (elapsedSeconds < 20) {
        const remainingCountdown = 20 - elapsedSeconds;
        setShowCountdown(true);
        setCountdown(remainingCountdown);

        countdownInterval = setInterval(() => {
          const currentElapsed = Math.floor((Date.now() - streamStartTime) / 1000);
          const remaining = 20 - currentElapsed;

          if (remaining <= 0) {
            clearInterval(countdownInterval);
            setShowCountdown(false); // Hide countdown and reveal stream
            setCountdown(0);
          } else {
            setCountdown(remaining);
          }
        }, 1000);
      } else {
        // Stream has been running for more than 20 seconds, skip countdown
        setShowCountdown(false);
      }
    } else if (!isStreaming) {
      // Reset when stream stops
      setShowCountdown(false);
      setCountdown(20);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [isStreaming, streamStartTime]);

  // Refresh iframe preview every 30 seconds to prevent pausing
  useEffect(() => {
    if (!showPreview || !previewUrl) return;

    const refreshInterval = setInterval(() => {
      console.log("Refreshing preview iframe to prevent pause");
      setIframeKey((prev) => prev + 1);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [showPreview, previewUrl]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleStream = async () => {
    // Prevent multiple clicks while transitioning
    if (buttonState === 'starting' || buttonState === 'stopping') {
      console.log('[StreamPlatformHub] Button click ignored - already transitioning');
      return;
    }

    if (buttonState === 'live') {
      setButtonState('stopping');
      onStopStream?.();
    } else if (buttonState === 'idle') {
      // Safety check: Verify we're not already streaming before starting
      const status = streamStatus.toLowerCase();
      const isActuallyLive = status === 'streaming' || status === 'active' || status === 'connected';

      if (isActuallyLive) {
        // Edge case: Button shows idle but stream is actually live
        // Stop the existing stream first, then start a new one
        console.log('[StreamPlatformHub] Edge case detected: Stream is live but button shows idle. Stopping existing stream first...');
        setButtonState('stopping');
        onStopStream?.();

        // Wait for stream to stop, then start new one
        // The buttonState will change to 'idle' when status becomes 'offline'
        // User can then click again to start
        return;
      }

      // Check WiFi status before starting stream
      if (userId) {
        console.log('[StreamPlatformHub] Checking WiFi status before starting stream...');
        const glassStateResponse = await getJson('/api/glass-state', userId);

        if (glassStateResponse && glassStateResponse.glassState) {
          const { wifiConnected } = glassStateResponse.glassState;
          console.log('[StreamPlatformHub] WiFi connected:', wifiConnected);

          if (!wifiConnected) {
            // WiFi is not connected, request WiFi setup
            console.log('[StreamPlatformHub] WiFi not connected, requesting WiFi setup...');
            // showErrorToast('WiFi not connected. Please connect your glasses to WiFi first.');

            const wifiSetupResponse = await postJson('/api/request-wifi-setup', {}, userId);

            if (wifiSetupResponse && wifiSetupResponse.success) {
              console.log('[StreamPlatformHub] WiFi setup request sent successfully');
            } else {
              console.error('[StreamPlatformHub] Failed to request WiFi setup:', wifiSetupResponse);
            }

            // Don't start the stream
            return;
          }
        } else {
          console.warn('[StreamPlatformHub] Could not fetch glass state, proceeding with stream start...');
        }
      }

      setButtonState('starting');
      onStartStream?.();
    }
  };

  const getStatusColor = () => {
    const status = streamStatus.toLowerCase();
    if (
      status === "streaming" ||
      status === "active" ||
      status === "connected"
    ) {
      return "#10B981"; // green
    } else if (status === "connecting" || status === "starting") {
      return "#F59E0B"; // orange
    } else if (status === "error" || status === "failed") {
      return "#EF4444"; // red
    }
    return "#6B7280"; // gray
  };

  const getStatusLabel = () => {
    const status = streamStatus.toLowerCase();
    if (
      status === "streaming" ||
      status === "active" ||
      status === "connected"
    ) {
      return "Live";
    } else if (
      status === "connecting" ||
      status === "starting" ||
      status === "initializing"
    ) {
      return "Starting";
    } else if (status === "stopping" || status === "disconnecting") {
      return "Stopping";
    } else if (status === "error" || status === "failed") {
      return "Error";
    }
    return "Off";
  };

  // Check if this is the "streamer" platform (Stream Here)
  const isStreamerPlatform = platformId === "streamer" || platformName === "Stream Here";

  // Handle share button click - copy preview URL to clipboard
  const handleShareClick = async () => {
    if (!previewUrl) return;

    try {
      await navigator.clipboard.writeText(previewUrl);
      showSuccessToast("Stream URL copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy URL to clipboard:", error);
      showErrorToast("Failed to copy URL to clipboard");
    }
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
        currentRtmpUrl={currentRtmpUrl}
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
          <div
            className="relative w-full aspect-video rounded-[16px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1E2939 0%, #101828 100%)",
            }}
          >
            {/* Status Toggle */}
            <div className="absolute top-[19px] left-[19px] z-10">
              <div
                className="flex rounded-full px-[12px] h-[24px] justify-center items-center gap-[4px]"
                style={{ backgroundColor: getStatusColor() }}
              >
                <div className="w-[8px] h-[8px] rounded-full bg-white"></div>
                <span className="text-white text-[12px] font-medium">
                  {getStatusLabel()}
                </span>
              </div>
            </div>

            {/* Video Preview iframe - Load in background during countdown */}
            {showPreview && previewUrl && isStreaming && (
              <iframe
                key={iframeKey}
                src={previewUrl}
                className={`absolute inset-0 w-full h-full border-none ${
                  showCountdown ? "invisible" : "visible"
                }`}
                allowFullScreen
                allow="autoplay; fullscreen"
              />
            )}

            {/* Countdown Overlay - Shows over loading stream */}
            {showCountdown && isStreaming && (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-10">
                <div className="flex flex-col items-center gap-[8px]">
                  <p className="text-[#a3a3a3] text-[13px] font-normal">
                    Live feed starting in
                  </p>
                  <div className="text-[38px] font-bold text-[#7f7f7f]">
                    {countdown}s
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder when not streaming */}
            {!isStreaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <img
                  src={cameraStreamIcon}
                  alt="Camera"
                  className="mb-[16px] w-[64px] h-[64px]"
                />
                <p className="text-[#94A3B8] text-[16px] font-normal">
                  Stream preview will appear here
                </p>
              </div>
            )}
          </div>

          {/* Go Live / Stop Button */}
          <button
            onClick={handleToggleStream}
            className={`w-full h-[44px] text-white rounded-[16px] flex items-center justify-center gap-[6px] hover:opacity-90 transition-all ${
              buttonState === "starting"
                ? "bg-gray-600 cursor-not-allowed"
                : buttonState === "stopping"
                ? "bg-gray-600 cursor-not-allowed"
                : buttonState === "live"
                ? "bg-red-600"
                : "bg-[#0A0A0A]"
            }`}
            disabled={buttonState === "starting" || buttonState === "stopping"}
          >
            {buttonState === "starting" ? (
              <>
                <svg
                  className="animate-spin"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[14px] font-medium">Starting...</span>
              </>
            ) : buttonState === "stopping" ? (
              <>
                <svg
                  className="animate-spin"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[14px] font-medium">Stopping...</span>
              </>
            ) : buttonState === "live" ? (
              <>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="white"
                  stroke="none"
                >
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
                <span className="text-[14px] font-medium">Stop Stream</span>
              </>
            ) : (
              <>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="white"
                  stroke="none"
                >
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
              {/* Share Button - Shown only for streamer platform */}
              {isStreamerPlatform && (
                <button
                  onClick={handleShareClick}
                  disabled={!previewUrl}
                  className={`flex items-center gap-[6px] px-[12px] h-[30px] border border-[var(--border)] rounded-[12px] font-semibold text-[14px] transition-colors ${
                    previewUrl
                      ? "text-[var(--secondary-background)] hover:bg-gray-50"
                      : "text-gray-400 cursor-not-allowed opacity-50"
                  }`}
                  title={previewUrl ? "Copy stream URL" : "Waiting for stream URL..."}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Share
                </button>
              )}

              {/* Delete Button - Shown for streamer platform next to Share */}
              {isStreamerPlatform && (
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="w-[33px] h-[33px] border border-[var(--border)] rounded-[12px] flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <img
                    src={trashIcon}
                    alt="Delete"
                    className="w-[20px] h-[20px]"
                  />
                </button>
              )}

              {/* Edit Button - Opens Edit Dialog (hidden for streamer platform) */}
              {!isStreamerPlatform && (
                <button
                  onClick={() => setIsEditDialogOpen(true)}
                  className="text-[14px] w-[60px] h-[30px] border border-[var(--border)] rounded-[12px] text-[var(--secondary-background)] hover:bg-gray-50 transition-colors font-semibold"
                >
                  Edit
                </button>
              )}

              {/* Delete Button - Opens Delete Dialog (hidden for streamer platform) */}
              {!isStreamerPlatform && (
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="w-[33px] h-[33px] border border-[var(--border)] rounded-[12px] flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <img
                    src={trashIcon}
                    alt="Delete"
                    className="w-[20px] h-[20px]"
                  />
                </button>
              )}
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
                <span className="text-[14px] text-[var(--secondary-background)]">
                  Duration
                </span>
                <span className="text-[14px] font-medium text-[var(--secondary-background)]">
                  {formatDuration(duration)}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[var(--secondary-background)]">
                  Status
                </span>
                <span className="text-[14px] font-medium text-[var(--secondary-background)]">
                  {getStatusLabel()}
                </span>
              </div>

              {/* Stream Key - Only show if available and not streamer platform */}
              {maskedStreamKey && !isStreamerPlatform && (
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[var(--secondary-background)]">
                    Stream Key
                  </span>
                  <span className="text-[14px] font-medium text-[var(--secondary-background)] font-mono">
                    {maskedStreamKey.length > 10 ? maskedStreamKey.slice(-10) : maskedStreamKey}
                  </span>
                </div>
              )}

              {/* Quality */}
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[var(--secondary-background)]">
                  Quality
                </span>
                <span className="text-[14px] font-medium text-[var(--secondary-background)]">
                  720p 30fps
                </span>
              </div>
            </div>
          </div>

          {/* Logs Section - Only show if there are logs */}
          {/* {logs.length > 0 && (
            <div className="bg-[#F5F5F5] rounded-[16px] overflow-hidden">
              {/* Logs Header - Clickable to expand/collapse *\/}
              <button
                onClick={() => setLogsExpanded(!logsExpanded)}
                className="w-full p-[16px] flex items-center justify-between hover:bg-[#ECECEC] transition-colors"
              >
                <h3 className="text-[16px] text-[var(--secondary-background)] font-normal">
                  Stream Logs{" "}
                  {logs.length > 0 && (
                    <span className="text-[14px] text-[var(--muted-forground)]">
                      ({logs.length})
                    </span>
                  )}
                </h3>
                <svg
                  className={`w-[20px] h-[20px] text-[var(--secondary-background)] transition-transform duration-200 ${
                    logsExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Logs Content - Collapsible *\/}
              {logsExpanded && (
                <div className="px-[16px] pt-[16px] pb-[16px] flex flex-col gap-[8px] max-h-[300px] overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="text-[12px] font-mono">
                      <span className="text-[var(--muted-forground)]">
                        {log.timestamp}
                      </span>{" "}
                      <span
                        className={
                          log.type === "error"
                            ? "text-red-600"
                            : log.type === "success"
                            ? "text-green-600"
                            : log.type === "warning"
                            ? "text-yellow-600"
                            : "text-[var(--secondary-background)]"
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )} */}

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
  );
}

export default StreamPlatformHub;
