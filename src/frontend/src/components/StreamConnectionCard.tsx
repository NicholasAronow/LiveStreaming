import React from 'react'
import { StreamConnection } from '../types'

interface StreamConnectionCardProps {
  connection: StreamConnection;
  onOpen: (connection: StreamConnection) => void;
}

function StreamConnectionCard({ connection, onOpen }: StreamConnectionCardProps) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-[14px] p-[20px] flex items-center justify-between hover:shadow-sm transition-shadow h-[140px]">
      <div className="flex flex-col gap-[16px]">
        <div className='flex flex-row  items-center gap-[8px]'>
          <img
            src={connection.platformLogoIcon}
            alt={connection.platformName}
            className="w-[52px] object-contain"
          />
          <h3 className="text-[16px] font-semibold text-[var(--secondary-background)]">
            {connection.platformName}
          </h3>
        </div>

        <div className="flex flex-col gap-[8px]">

          <p className="text-[var(--secondary-foreground)] text-[12px]">
            Stream Key - {connection.maskedStreamKey.slice(0, 10)}...
          </p>
          <p className="text-[12px] text-[var(--secondary-foreground)]">
            {connection.createdAt}
          </p>
        </div>
      </div>

      <button
        onClick={() => onOpen(connection)}
        className="bg-[#0A0A0A] text-[var(--background)] rounded-[16px]  w-[68px] h-[44px] text-[14px] font-medium hover:opacity-90 transition-opacity"
      >
        Open
      </button>
    </div>
  )
}

export default StreamConnectionCard
