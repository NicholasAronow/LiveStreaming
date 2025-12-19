import React from 'react'
import { StreamConnection } from '../types'

interface StreamConnectionCardProps {
  connection: StreamConnection;
  onOpen: (connection: StreamConnection) => void;
  isActive?: boolean;
  isGreyedOut?: boolean;
}

function StreamConnectionCard({ connection, onOpen, isActive = false, isGreyedOut = false }: StreamConnectionCardProps) {
  return (
    <div className={`bg-white border border-[var(--border)] rounded-[14px] p-[20px] flex items-center justify-between hover:shadow-sm transition-all h-[140px] ${isGreyedOut ? 'opacity-50' : ''} ${isActive? "border-[#DC2626] border-[2px]": ""}`}>
      <div className="flex flex-col gap-[16px]">
        <div className='flex flex-row items-center gap-[8px]'>
          <img
            src={connection.platformLogoIcon}
            alt={connection.platformName}
            className="w-[52px] object-contain"
          />
          <div className="flex flex-col gap-[4px]">
            <div className="flex items-center gap-[8px]">
              <h3 className="text-[16px] font-semibold text-[var(--secondary-background)]">
                {connection.platformName}
              </h3>
              {/* {isActive && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-[8px] py-[2px] rounded-[4px] uppercase tracking-wider">
                  LIVE
                </span>
              )} */}
            </div>
          </div>
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
        disabled={isGreyedOut}
        className={`bg-[#0A0A0A] text-[var(--background)] rounded-[16px] w-[68px] h-[44px] text-[14px] font-medium transition-opacity ${isGreyedOut ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90 cursor-pointer'}`}
      >
        Open
      </button>
    </div>
  )
}

export default StreamConnectionCard
