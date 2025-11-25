import { useEffect, useState } from 'react';
import { StreamStatus } from '../types';

export function useStreamStatus(onStatusUpdate?: (status: StreamStatus) => void) {
  const [status, setStatus] = useState<StreamStatus>({
    streamType: null,
    streamStatus: 'offline',
    hasActiveSession: false,
  });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      // EventSource automatically includes credentials for same-origin requests
      eventSource = new EventSource('/stream-status');

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
  }, [onStatusUpdate]);

  return { status, connected };
}
