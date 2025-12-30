import { ToolCall, AppServer, AppSession } from "@mentra/sdk";
import path from "path";
import { setupExpressRoutes, broadcastStreamStatus, formatStreamStatus } from "./setup";
import { handleToolCall } from "./tools";
import { connectDB } from "./db";
import { User } from "../shared/class/User";
import { ENV_CONFIG } from "./config/env.config";
import {
  setupDeviceStateListeners,
  setupStreamEventHandlers,
  handleSessionStop,
  setupGracefulShutdown
} from "./handlers";
import { initializeSession } from "./services/session-setup.service";

/**
 * Main application server class
 * Extends AppServer from MentraOS SDK
 */
class StreamerApp extends AppServer {
  /** Map to store active users with their sessions and state */
  private userSessionsMap = new Map<string, User>();

  constructor() {
    super({
      packageName: ENV_CONFIG.PACKAGE_NAME,
      apiKey: ENV_CONFIG.MENTRAOS_API_KEY,
      port: ENV_CONFIG.PORT,
      publicDir: path.join(__dirname, "../public"),
    });

    // Set up Express routes with access to userSessionsMap
    setupExpressRoutes(
      this,
      (userId: string) => this.userSessionsMap.get(userId)?.getUserSession() ?? undefined,
      (userId: string) => this.userSessionsMap.get(userId) ?? undefined,
      // Debug: function to list all users in the session map
      () => Array.from(this.userSessionsMap.entries()).map(([id, user]) => ({
        userId: id,
        hasSession: user.getUserSession() !== null
      }))
    );

    // Set up graceful shutdown handlers
    setupGracefulShutdown(this.userSessionsMap);
  }

  /**
   * Handles tool calls from the MentraOS system
   * @param toolCall The tool call request
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
   * Sets up event listeners and initializes session
   * @param session The app session instance
   * @param sessionId Unique session identifier
   * @param userId User identifier
   */
  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    console.log(`📱 [${userId}] New session received - sessionId: ${sessionId}`);

    // Create or get User instance for this userId
    let user = this.userSessionsMap.get(userId);
    if (!user) {
      console.log(`📱 [${userId}] Creating new User instance`);
      user = new User(userId);
      this.userSessionsMap.set(userId, user);
    } else {
      console.log(`📱 [${userId}] Reusing existing User instance, updating session`);
    }

    // Set the session in the User instance
    user.setUserSession(session);

    // Set up device state listeners (WiFi, battery, model)
    setupDeviceStateListeners(session, userId, user);

    // Initialize session (subscriptions, existing stream detection)
    await initializeSession(session, userId);

    // Set up stream event handlers (managed stream, RTMP, battery, connection, disconnect)
    const cleanupFunctions = setupStreamEventHandlers(session, userId, this.userSessionsMap);

    // Register cleanup handlers
    this.addCleanupHandler(() => {
      cleanupFunctions.forEach(cleanup => cleanup());
    });

    // Send initial status snapshot
    broadcastStreamStatus(userId, formatStreamStatus(session));
  }

  /**
   * Handles stop requests
   * Ensures streams are terminated and resources are cleaned up
   * @param sessionId The session identifier
   * @param userId The user identifier
   * @param reason The stop reason
   */
  protected async onStop(
    sessionId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    await handleSessionStop(sessionId, userId, reason, this.userSessionsMap);
  }
}

// Start the server
const app = new StreamerApp();

// Connect to MongoDB and start the server
connectDB()
  .then(() => app.start())
  .catch(console.error);
