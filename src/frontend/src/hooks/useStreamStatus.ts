import { useEffect, useState } from 'react';
import { StreamStatus } from '../types';

export function useStreamStatus(userId?: string, onStatusUpdate?: (status: StreamStatus) => void) {
  const [status, setStatus] = useState<StreamStatus>({
    streamType: null,
    streamStatus: 'offline',
    hasActiveSession: false,
  });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      // Use relative URL (will be proxied by Vite in dev)
      // Add userId as query parameter if provided
      const url = userId ? `/stream-status?userId=${encodeURIComponent(userId)}` : '/stream-status';
      eventSource = new EventSource(url);

      eventSource.addEventListener('status', (evt) => {
        try {
          const data = JSON.parse(evt.data) as StreamStatus;
          setStatus(data);
          setConnected(true);
          onStatusUpdate?.(data);
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      });

      eventSource.onerror = () => {
        setConnected(false);
        console.log('SSE connection error, will retry...');
      };

      eventSource.onopen = () => {
        setConnected(true);
      };
    } catch (e) {
      console.error('SSE not supported:', e);
    }

    return () => {
      eventSource?.close();
    };
  }, [userId, onStatusUpdate]);

  return { status, connected };
}
