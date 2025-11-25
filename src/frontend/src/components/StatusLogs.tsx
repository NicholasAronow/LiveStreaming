import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface StatusLogsProps {
  logs: LogEntry[];
  visible: boolean;
}

export const StatusLogs: React.FC<StatusLogsProps> = ({ logs, visible }) => {
  const logsContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsContentRef.current) {
      logsContentRef.current.scrollTop = logsContentRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={`status-logs ${visible ? 'visible' : ''}`}>
      <div className="logs-header">Stream Status</div>
      <div className="logs-content" ref={logsContentRef}>
        {logs.map((log, index) => (
          <div key={index} className={`log-entry ${log.type}`}>
            <span className="log-timestamp">{log.timestamp}</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
