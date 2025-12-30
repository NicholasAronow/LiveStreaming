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
    <div className={`w-full h-full bg-bg-secondary flex-col border-t border-border ${visible ? 'flex' : 'hidden'}`}>
      <div className="py-3 px-4 bg-bg-tertiary border-b border-border text-xs font-semibold uppercase tracking-wider text-text-secondary">Stream Status</div>
      <div className="flex-1 overflow-y-auto py-3 px-4 font-mono text-[13px] leading-relaxed custom-scrollbar" ref={logsContentRef}>
        {logs.map((log, index) => (
          <div key={index} className={`mb-2 py-2 px-2.5 bg-bg-tertiary rounded-md border-l-[3px] break-words ${
            log.type === 'info' ? 'border-l-primary' :
            log.type === 'success' ? 'border-l-success' :
            log.type === 'warning' ? 'border-l-warning' :
            log.type === 'error' ? 'border-l-danger text-red-300' :
            'border-l-border'
          }`}>
            <span className="text-text-secondary text-[11px] mr-2">{log.timestamp}</span>
            <span className="text-text-primary">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
