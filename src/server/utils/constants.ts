/**
 * Constants and configuration values for the server
 */

// Server-Sent Events heartbeat interval (milliseconds)
export const SSE_HEARTBEAT_INTERVAL = 15000;

// Server-Sent Events status ping interval (milliseconds)
export const SSE_STATUS_PING_INTERVAL = 20000;

// Connection health check timeout (milliseconds)
export const CONNECTION_HEALTH_TIMEOUT = 3000;

// Stream operation timeout (milliseconds)
export const STREAM_OPERATION_TIMEOUT = 45000;

// Connection check timeout (milliseconds)
export const CONNECTION_CHECK_TIMEOUT = 5000;

// Stream stop delay for cleanup (milliseconds)
export const STREAM_STOP_DELAY = 2000;

// Stream reconnection timeout - how long to attempt reconnection before giving up (milliseconds)
// Default: 15 seconds
export const STREAM_RECONNECT_TIMEOUT_MS = 15000;

// Delay between reconnection attempts during the reconnection window (milliseconds)
export const STREAM_RECONNECT_RETRY_INTERVAL_MS = 2000;
