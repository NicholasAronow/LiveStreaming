import { useEffect, useState } from 'react';
import { StreamStatus } from '../types';
import { BACKEND_URL } from '../config/api';

export function useStreamStatus(userId?: string, onStatusUpdate?: (status: StreamStatus) => void) {
  const [status, setStatus] = useState<StreamStatus>({
    streamType: null,
    streamStatus: 'offline',
    hasActiveSession: false,
  });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) {
      console.log('useStreamStatus: No userId provided, skipping SSE connection');
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    const connectSSE = () => {
      if (isUnmounted) return;

      try {
        // Use absolute URL with backend server
        // When accessing through ngrok, we need to connect directly to the backend
        // In dev with localhost:5173, this will use the proxy config automatically
        const url = `${BACKEND_URL}/stream-status?userId=${encodeURIComponent(userId)}`;
        console.log('Connecting to SSE:', url);
        console.log('BACKEND_URL:', BACKEND_URL);
        console.log('Current location:', window.location.href);

        eventSource = new EventSource(url);
        console.log('EventSource created, readyState:', eventSource.readyState);

        eventSource.addEventListener('status', (evt) => {
          try {
            console.log('SSE status event received:', evt.data);
            const data = JSON.parse(evt.data) as StreamStatus;
            console.log('Parsed SSE data:', data);
            setStatus(data);
            setConnected(true);
            onStatusUpdate?.(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        });

        eventSource.addEventListener('message', (evt) => {
          console.log('SSE generic message event:', evt.data);
        });

        eventSource.onerror = (error) => {
          console.log('SSE connection error, readyState:', eventSource?.readyState);
          console.log('Error object:', error);
          console.log('EventSource CONNECTING=0, OPEN=1, CLOSED=2');
          setConnected(false);

          // Close the failed connection
          if (eventSource) {
            console.log('Closing failed EventSource connection');
            eventSource.close();
            eventSource = null;
          }

          // Reconnect after 3 seconds
          if (!isUnmounted) {
            console.log('Will reconnect in 3 seconds...');
            reconnectTimeout = setTimeout(() => {
              console.log('Attempting reconnection now...');
              connectSSE();
            }, 3000);
          }
        };

        eventSource.onopen = () => {
          console.log('SSE connection opened successfully, readyState:', eventSource?.readyState);
          setConnected(true);
        };
      } catch (e) {
        console.error('SSE connection failed:', e);
        // Try to reconnect after error
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(() => {
            connectSSE();
          }, 3000);
        }
      }
    };

    // Start connection
    connectSSE();

    return () => {
      console.log('useStreamStatus cleanup: closing SSE connection');
      isUnmounted = true;
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [userId, onStatusUpdate]);

  return { status, connected };
}
