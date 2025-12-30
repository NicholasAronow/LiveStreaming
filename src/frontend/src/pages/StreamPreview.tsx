import { useEffect, useState, useRef, useCallback } from "react";

export default function StreamPreview() {
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [isValidUrl, setIsValidUrl] = useState<boolean>(true);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadTimeout, setLoadTimeout] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [lastReloadTime, setLastReloadTime] = useState<number>(Date.now());

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reload the iframe with rate limiting
  const reloadIframe = useCallback(() => {
    const now = Date.now();
    const timeSinceLastReload = now - lastReloadTime;

    // Rate limit: only allow reload once every 5 seconds
    if (timeSinceLastReload < 5000) {
      console.log("Reload rate limited, skipping");
      return;
    }

    console.log("Reloading iframe...");
    setLastReloadTime(now);
    setIsLoading(true);
    setLoadTimeout(false);
    setIframeError(false);
    setReloadKey((prev) => prev + 1);
  }, [lastReloadTime]);

  useEffect(() => {
    // Get the stream URL from query parameters
    const params = new URLSearchParams(window.location.search);
    const url = params.get("url");
    if (url) {
      const decodedUrl = decodeURIComponent(url);
      setStreamUrl(decodedUrl);

      // Validate URL format
      try {
        new URL(decodedUrl);
        setIsValidUrl(true);
      } catch {
        setIsValidUrl(false);
      }
    }
  }, []);

  // Load timeout monitoring - 30 seconds
  useEffect(() => {
    if (!streamUrl || !isValidUrl) return;

    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Set loading timeout (30 seconds)
    loadTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.warn("Stream load timeout - attempting reload");
        setLoadTimeout(true);
        setIsLoading(false);
        // Auto-reload after timeout
        setTimeout(() => reloadIframe(), 2000);
      }
    }, 30000);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [streamUrl, isValidUrl, isLoading, reloadIframe]);

  // Page visibility handling - reload when returning to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // When tab becomes visible, check if stream needs refresh
        // Add a small delay before reloading to avoid immediate reload
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
        }

        visibilityTimeoutRef.current = setTimeout(() => {
          const timeSinceLastReload = Date.now() - lastReloadTime;
          // If tab was hidden for more than 5 minutes, reload stream
          if (timeSinceLastReload > 300000) {
            console.log("Tab visible after long absence, reloading stream");
            reloadIframe();
          }
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [lastReloadTime, reloadIframe]);

  // Periodic health check - reload if needed every 2 minutes
  useEffect(() => {
    if (!streamUrl || !isValidUrl || iframeError) return;

    // Check stream health every 2 minutes
    healthCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastReload = Date.now() - lastReloadTime;

      // If it's been more than 15 minutes, do a preventive reload
      if (timeSinceLastReload > 900000) {
        console.log("Preventive reload after 15 minutes");
        reloadIframe();
      }
    }, 120000);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [streamUrl, isValidUrl, iframeError, lastReloadTime, reloadIframe]);

  // Handle iframe load success
  const handleIframeLoad = useCallback(() => {
    console.log("Iframe loaded successfully");
    setIsLoading(false);
    setLoadTimeout(false);
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
  }, []);

  if (!streamUrl) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-gray-900 text-2xl font-bold mb-2">
            No Stream URL Provided
          </h1>
          <p className="text-gray-600">
            Please provide a stream URL using the ?url parameter
          </p>
        </div>
      </div>
    );
  }

  if (!isValidUrl) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-gray-900 text-2xl font-bold mb-2">
            Invalid Stream URL
          </h1>
          <p className="text-gray-600 mb-4">The provided URL is not valid</p>
          <p className="text-gray-500 text-sm">
            URL must start with http:// or https://
          </p>
          <p className="text-red-600 text-sm mt-4 break-all px-4">
            Received: {streamUrl}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-white">
      {/* Animated Wave Graph Background with Gradient Lines - 50% Transparent */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
        {/* Fine Grid Lines - Red to Orange Gradient with Color Wave Animation */}
        <div className="absolute inset-0 animate-gradient-wave-long">
          <div
            className="absolute inset-0 animate-color-wave-long"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  to right,
                  #ef4444 0px,
                  #f97316 1px,
                  transparent 1px,
                  transparent 40px
                ),
                repeating-linear-gradient(
                  to bottom,
                  #f97316 0px,
                  #ef4444 1px,
                  transparent 1px,
                  transparent 40px
                )
              `,
              backgroundSize: "40px 40px",
            }}
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Bar with Logo and Share Button */}
        <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="text-[40px] font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Streamer
            </div>

            {/* Share Button */}
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  alert("Link copied to clipboard!");
                } catch (error) {
                  console.error("Failed to copy:", error);
                }
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-[#c9594c] to-[#b74539] text-white rounded-full font-semibold text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
          <div className="w-full max-w-7xl">
            {/* Stream Card */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Video Container */}
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                {/* LIVE Badge */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
                  <div className="bg-gradient-to-r from-[#c9594c] to-[#b74539] text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="font-bold text-sm uppercase tracking-wide">
                      LIVE
                    </span>
                  </div>
                </div>

                {/* Reload Button - Floating in top-right */}
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
                  <button
                    onClick={reloadIframe}
                    className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all flex items-center gap-2 group"
                    title="Reload stream"
                  >
                    <svg
                      className="w-4 h-4 text-gray-700 group-hover:rotate-180 transition-transform duration-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span className="font-semibold text-sm text-gray-900">
                      Reload
                    </span>
                  </button>
                </div>

                {/* Stream Content */}
                {iframeError || loadTimeout ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#e8e8e8] to-[#d8d8d8] flex items-center justify-center">
                    <div className="text-center p-8">
                      <svg
                        className="w-20 h-20 text-[#c9594c] mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <h2 className="text-gray-900 text-2xl font-bold mb-2">
                        {loadTimeout
                          ? "Stream Load Timeout"
                          : "Failed to Load Stream"}
                      </h2>
                      <p className="text-gray-600 mb-4">
                        {loadTimeout
                          ? "The stream is taking too long to load"
                          : "The stream URL could not be loaded"}
                      </p>
                      <p className="text-gray-500 text-sm">
                        This might happen if:
                      </p>
                      <ul className="text-gray-500 text-sm text-left max-w-md mx-auto mt-2 space-y-1">
                        <li>• The stream is not available</li>
                        <li>• The URL does not allow embedding</li>
                        <li>• The stream has ended</li>
                        <li>• Network connection is slow or interrupted</li>
                      </ul>
                      <button
                        onClick={reloadIframe}
                        className="mt-6 px-6 py-3 bg-gradient-to-r from-[#c9594c] to-[#b74539] text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Retry Now
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Loading Spinner */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#e8e8e8] to-[#d8d8d8] flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 border-4 border-[#c9594c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-700 font-semibold">
                            Loading stream...
                          </p>
                        </div>
                      </div>
                    )}

                    <iframe
                      key={reloadKey}
                      ref={iframeRef}
                      src={streamUrl}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Live Stream"
                      onLoad={handleIframeLoad}
                      onError={() => {
                        console.error("Iframe error occurred");
                        setIframeError(true);
                        setIsLoading(false);
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
