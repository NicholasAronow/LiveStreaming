import React from 'react'

interface LiveBannerProps {
  platformLogoIcon?: string;
  platformName?: string;
}

function LiveBanner({ platformLogoIcon, platformName }: LiveBannerProps) {
  return (
    <div className="w-full bg-gradient-to-r from-[#FA263B] to-[#FB681F] px-[24px] py-[12px] flex items-center justify-between h-[48px] ">
      <div className="flex items-center gap-[12px]">
        {platformName && (
          <span className="text-white text-[18px] font-semibold">
            {platformName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-[4px] bg-[var(--destructive)] h-[24px] w-[51px] rounded-full justify-center">
        <div className="w-[8px] h-[8px] rounded-full bg-white animate-pulse"></div>
        <span className="text-white font-medium tracking-wide text-[12px]">
          Live
        </span>
      </div>
    </div>
  )
}

export default LiveBanner
