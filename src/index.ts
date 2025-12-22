import { ToolCall, AppServer, AppSession, StreamType } from "@mentra/sdk";
import path from "path";
import { setupExpressRoutes } from "./webview";
import { handleToolCall } from "./tools";
import { broadcastStreamStatus, formatStreamStatus } from "./webview";
import { connectDB } from "./db";
import { User } from "./class/User";

const PACKAGE_NAME =
  process.env.PACKAGE_NAME ??
  (() => {
    throw new Error("PACKAGE_NAME is not set in .env file");
  })();
const MENTRAOS_API_KEY =
  process.env.MENTRAOS_API_KEY ??
  (() => {
    throw new Error("MENTRAOS_API_KEY is not set in .env file");
  })();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 80;

class StreamerApp extends AppServer {
  /** Map to store active users with their sessions and state */
  private userSessionsMap = new Map<string, User>();

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
      publicDir: path.join(__dirname, "../public"),
    });

    // Set up Express routes with access to userSessionsMap
    setupExpressRoutes(
      this,
      (userId: string) => this.userSessionsMap.get(userId)?.getUserSession() ?? undefined,
      (userId: string) => this.userSessionsMap.get(userId) ?? undefined
    );
  }

  /**
   * Handles tool calls from the MentraOS system
   * @param toolCall - The tool call request
   * @returns Promise resolving to the tool call response or undefined
   */
  protected async onToolCall(toolCall: ToolCall): Promise<string | undefined> {
    return handleToolCall(
      toolCall,
      toolCall.userId,
      this.userSessionsMap.get(toolCall.userId)?.getUserSession() ?? undefined
    );
  }

  /**
   * Handles new user sessions
   * Sets up event listeners and displays welcome message
   * @param session - The app session instance
   * @param sessionId - Unique session identifier
   * @param userId - User identifier
   */
  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    // Create or get User instance for this userId
    let user = this.userSessionsMap.get(userId);
    if (!user) {
      user = new User(userId);
      this.userSessionsMap.set(userId, user);
    }

    // Set the session in the User instance
    user.setUserSession(session);

    // Set up onChange listeners to update User class state
    // These will be triggered automatically when the actual state becomes available
    // Keep not that this blokc of code will take a sec at amx to get populated correctly
    session.device.state.wifiConnected.onChange((connected) => {
      console.log(`[${userId}] WiFi status:`, connected);
      user?.updateWifiConnected(connected);
      console.log(`[${userId}] Updated glass state:`, user?.getGlassState());
    });

    session.device.state.batteryLevel.onChange((level) => {
      console.log(`[${userId}] Battery:`, level, "%");
      user?.updateBatteryLevel(level);
      console.log(`[${userId}] Updated glass state:`, user?.getGlassState());
    });

    session.device.state.modelName.onChange((model) => {
      console.log(`[${userId}] Model:`, model);
      user?.updateModelName(model);
      console.log(`[${userId}] Updated glass state:`, user?.getGlassState());
    });

    session.device.state.wifiSsid.onChange((ssid) => {
      console.log(`[${userId}] WiFi SSID changed to:`, ssid);
      user?.updateWifiSsid(ssid);
      console.log(`[${userId}] Updated glass state:`, user?.getGlassState());
    });

    // console.log(session.device.state.wifiConnected);


    // Test updateFromMessage (internal - simulated)
    // session.device.state.updateFromMessage({
    //   wifiConnected: true,
    //   wifiSsid: "MyNetwork",
    //   batteryLevel: 85,
    // });
    // Initialize WiFi state
    session.glassesSupportsWifi = null;
    session.glassesWifiConnected = null;
    session.glassesWifiSsid = null;

    // Check capabilities to see if glasses support WiFi
    if (session.capabilities) {
      session.glassesSupportsWifi = session.capabilities.hasWifi === true;
      console.log(
        `📶 [${userId}] Glasses WiFi support: ${session.glassesSupportsWifi}`
      );
    }

    session.subscribe(StreamType.MANAGED_STREAM_STATUS);
    session.subscribe(StreamType.RTMP_STREAM_STATUS);
    session.subscribe(StreamType.GLASSES_CONNECTION_STATE);

    // Glasses connection state updates (includes WiFi status) - register IMMEDIATELY after subscription
    const connectionStateUnsubscribe = session.onGlassesConnectionState(
      (state: any) => {
        try {
          console.log(`📡 [${userId}] Glasses connection state update:`, state);
          // Update WiFi status if available
          if (state?.wifi) {
            session.glassesWifiConnected = state.wifi.connected === true;
            session.glassesWifiSsid = state.wifi.ssid || null;
            console.log(
              `📶 [${userId}] WiFi status - Connected: ${session.glassesWifiConnected}, SSID: ${session.glassesWifiSsid}`
            );
          }
          // Broadcast updated status to UI
          broadcastStreamStatus(userId, formatStreamStatus(session));
        } catch (error) {
          console.error(
            `[${userId}] Error processing connection state:`,
            error
          );
        }
      }
    );

    // Check for existing streams and update UI accordingly
    try {
      const streamInfo = await session.camera.checkExistingStream();

      if (streamInfo.hasActiveStream && streamInfo.streamInfo) {
        console.log("Found existing stream:", streamInfo.streamInfo.type);

        if (streamInfo.streamInfo.type === "managed") {
          // Managed stream is active - reconnect to it
          console.log("Reconnecting to existing managed stream...");

          // The stream is already active, just update our local state
          session.streamType = "managed";
          session.streamStatus = streamInfo.streamInfo.status || "active";
          session.hlsUrl = streamInfo.streamInfo.hlsUrl || null;
          session.dashUrl = streamInfo.streamInfo.dashUrl || null;
          session.streamId = streamInfo.streamInfo.streamId || null;
          session.directRtmpUrl = null;
          session.error = null;
          session.previewUrl = streamInfo.streamInfo.previewUrl || null;

          // Broadcast the existing stream info
          broadcastStreamStatus(userId, formatStreamStatus(session));

          // Show notification in glasses
          session.layouts.showTextWall(
            `📺 Stream already active!\n\nHLS: ${
              streamInfo.streamInfo.hlsUrl || "Generating..."
            }`
          );
        } else {
          // Unmanaged stream is active
          session.streamType = "unmanaged";
          session.streamStatus = streamInfo.streamInfo.status || "active";
          session.hlsUrl = null;
          session.dashUrl = null;
          session.streamId = streamInfo.streamInfo.streamId || null;
          session.directRtmpUrl = streamInfo.streamInfo.rtmpUrl || null;
          session.error = null;

          // Broadcast the existing stream info
          broadcastStreamStatus(userId, formatStreamStatus(session));

          // Show notification in glasses
          session.layouts.showTextWall(
            `⚠️ Another app is streaming to:\n${
              streamInfo.streamInfo.rtmpUrl || "Unknown URL"
            }`
          );
        }
      }
    } catch (error) {
      console.error("Error checking existing stream:", error);
      // Continue with normal setup even if check fails
    }

    const statusUnsubscribe = session.camera.onManagedStreamStatus(
      async (data) => {
        console.log(data);
        const sess = session as any;

        // Auto-cleanup and auto-restart failed streams
        if (
          data.status?.toLowerCase() === "error" ||
          data.status?.toLowerCase() === "failed"
        ) {
          console.log(
            "Stream entered error state, auto-stopping managed stream..."
          );

          // First broadcast the error status
          sess.streamType = "managed";
          sess.streamStatus = data.status;
          sess.error = data.message ?? "Stream error";
          broadcastStreamStatus(userId, formatStreamStatus(session));

          // Then cleanup
          try {
            await session.camera.stopManagedStream();
            console.log("Auto-stop completed successfully");
          } catch (stopErr) {
            console.error("Failed to auto-stop errored stream:", stopErr);
          }

          // Reset session state after stop completes
          sess.streamStatus = "offline";
          sess.streamType = null;
          sess.streamId = null;
          sess.previewUrl = null;
          sess.hlsUrl = null;
          sess.dashUrl = null;
          sess.error = null;

          // Broadcast offline status
          broadcastStreamStatus(userId, formatStreamStatus(session));

          // Auto-restart: wait 2 seconds then try to restart the stream
          console.log("Waiting 2 seconds before auto-restart...");
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Check if we still have restream config saved
          if (
            sess.restreamDestinations &&
            sess.restreamDestinations.length > 0
          ) {
            console.log("Auto-restarting stream with saved configuration...");
            try {
              const options = {
                restreamDestinations: sess.restreamDestinations,
              };
              await session.camera.startManagedStream(options);
              console.log("Auto-restart initiated successfully");
            } catch (restartErr) {
              console.error("Failed to auto-restart stream:", restartErr);
              sess.error = "Auto-restart failed: " + String(restartErr);
              broadcastStreamStatus(userId, formatStreamStatus(session));
            }
          } else {
            console.log(
              "No restream configuration saved, skipping auto-restart"
            );
          }

          return;
        }

        // Normal status update
        sess.streamType = "managed";
        sess.streamStatus = data.status;
        sess.hlsUrl = data.hlsUrl ?? null;
        sess.dashUrl = data.dashUrl ?? null;
        sess.directRtmpUrl = null;
        sess.streamId = data.streamId ?? null;
        sess.error = null;
        sess.previewUrl = data.previewUrl ?? null;
        sess.thumbnailUrl = data.thumbnailUrl ?? null;

        // Broadcast updated status to the user's SSE clients
        broadcastStreamStatus(userId, formatStreamStatus(session));
      }
    );

    const rtmpStatusUnsubscribe = session.camera.onStreamStatus((data) => {
      console.log(data);
      session.streamType = "unmanaged";
      session.streamStatus = data.status;
      session.hlsUrl = null;
      session.dashUrl = null;
      session.streamId = data.streamId ?? null;
      session.mangedRtmpRestreamUrls = null;
      session.error = data.errorDetails ?? null;
      // Broadcast updated status to the user's SSE clients
      broadcastStreamStatus(userId, formatStreamStatus(session));
    });

    // Glasses battery level updates (if available)
    const batteryUnsubscribe =
      session.events?.onGlassesBattery?.((data: any) => {
        try {
          const pct =
            typeof data?.percent === "number"
              ? data.percent
              : typeof data === "number"
              ? data
              : null;
          session.glassesBatteryPercent = pct ?? null;
        } catch {
          session.glassesBatteryPercent = null;
        }
        broadcastStreamStatus(userId, formatStreamStatus(session));
      }) ?? (() => {});

    // Broadcast on disconnect and cleanup the mapping
    const disconnectedUnsubscribe = session.events.onDisconnected(
      async (info: any) => {
        try {
          // Only broadcast a disconnected state if the SDK marks it as permanent
          if (info && typeof info === "object" && info.permanent === true) {
            // Clear stream start times for all platforms for this user
            try {
              const StreamConfig = (await import("./model/StreamConfig"))
                .default;
              await StreamConfig.updateMany(
                { userId },
                { streamStartTime: null }
              );
              console.log(
                `[onDisconnected] Cleared stream start times for user: ${userId}`
              );
            } catch (dbError) {
              console.error(
                "[onDisconnected] Failed to clear stream start times:",
                dbError
              );
            }

            this.userSessionsMap.delete(userId);
            broadcastStreamStatus(userId, formatStreamStatus(undefined));
          }
          // Otherwise, allow auto-reconnect without UI flicker
        } catch {
          // No-op
        }
      }
    );

    this.addCleanupHandler(() => {
      statusUnsubscribe();
      rtmpStatusUnsubscribe();
      batteryUnsubscribe();
      connectionStateUnsubscribe();
      disconnectedUnsubscribe();
    });

    // Send an initial status snapshot
    broadcastStreamStatus(userId, formatStreamStatus(session));

    // tell the user that they can start streaming via the webview (speak)
  }

  /**
   * Handles stop requests to ensure SSE clients are notified of disconnection
   * and streams are properly terminated
   */
  protected async onStop(
    sessionId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    try {
      // Get the user and session before cleanup to send explicit stream termination commands
      const user = this.userSessionsMap.get(userId);
      const session = user?.getUserSession();

      // Send explicit stream termination commands
      if (session?.streamType) {
        try {
          if (session.streamType === "managed") {
            await session.camera.stopManagedStream();
            console.log("Managed stream terminated on app stop");
          } else if (session.streamType === "unmanaged") {
            await session.camera.stopStream();
            console.log("Unmanaged stream terminated on app stop");
          }
        } catch (streamError) {
          console.error("Error terminating stream on stop:", streamError);
          // Continue with cleanup even if stream stop fails
        }
      }

      // Clear stream start times for all platforms for this user
      try {
        const StreamConfig = (await import("./model/StreamConfig")).default;
        await StreamConfig.updateMany({ userId }, { streamStartTime: null });
        console.log(`[onStop] Cleared stream start times for user: ${userId}`);
      } catch (dbError) {
        console.error("[onStop] Failed to clear stream start times:", dbError);
      }

      // Ensure base cleanup (disconnects and clears SDK's active session maps)
      await super.onStop(sessionId, userId, reason);
      // Remove any cached session for this user
      this.userSessionsMap.delete(userId);
    } finally {
      // Broadcast a no-session status so clients update UI promptly
      broadcastStreamStatus(userId, formatStreamStatus(undefined));
    }
  }
}

// Start the server
const app = new StreamerApp();

// Connect to MongoDB and start the server
connectDB()
  .then(() => app.start())
  .catch(console.error);
