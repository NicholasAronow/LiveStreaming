import React from 'react'
import { StreamConnection } from '../types'

interface StreamConnectionCardProps {
  connection: StreamConnection;
  onOpen: (connection: StreamConnection) => void;
}

function StreamConnectionCard({ connection, onOpen }: StreamConnectionCardProps) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-[24px] p-[20px] flex items-center justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-[16px]">
        <img
          src={connection.platformLogoIcon}
          alt={connection.platformName}
          className="w-[64px] h-[64px] object-contain"
        />
        <div className="flex flex-col gap-[4px]">
          <h3 className="text-[18px] font-semibold text-[var(--secondary-background)]">
            {connection.platformName}
          </h3>
          <p className="text-[14px] text-[var(--muted-forground)] font-mono">
            Stream Key - {connection.maskedStreamKey.slice(0, 10)}...
          </p>
          <p className="text-[12px] text-[var(--muted-forground)]">
            {connection.createdAt}
          </p>
        </div>
      </div>

      <button
        onClick={() => onOpen(connection)}
        className="bg-[#0A0A0A] text-white rounded-[16px] px-[24px] h-[44px] text-[14px] font-medium hover:opacity-90 transition-opacity"
      >
        Open
      </button>
    </div>
  )
}

export default StreamConnectionCard
