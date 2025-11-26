import React, { useState } from 'react'
import trashIcon from '../../../public/assets/trash.svg'
import cameraStreamIcon from '../../../public/assets/cameraStreamIcon.svg'

interface StreamPlatformHubProps {
  platformName?: string;
  platformLogoIcon?: string;
}

function StreamPlatformHub({ platformName = "YouTube", platformLogoIcon }: StreamPlatformHubProps) {
  const [isLive, setIsLive] = useState(false);

  return (
    <div className="w-full h-full overflow-y-auto px-[24px] pt-[24px] pb-[100px] bg-white">
      <div className="flex flex-col gap-[12px]">
        {/* Stream Preview */}
        <div className="relative w-full aspect-video rounded-[16px] flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E2939 0%, #101828 100%)' }}>
          {/* Off Toggle */}
          <div className="absolute top-[19px] left-[19px]">
            <div className="flex bg-[var(--muted-forground)] rounded-full w-[48px] h-[24px] justify-center items-center gap-[4px]">
              <div className="w-[8px] h-[8px] rounded-full bg-[var(--primary-forground)]"></div>
              <span className="text-white text-[12px] ">Off</span>
            </div>
          </div>

          {/* Video Camera Icon */}
          <img src={cameraStreamIcon} alt="Camera" className="mb-[16px] w-[64px] h-[64px]" />

          {/* Preview Text */}
          <p className="text-[#94A3B8] text-[16px] font-normal">Stream preview will appear here</p>
        </div>

        {/* Go Live Button */}
        <button
          onClick={() => setIsLive(!isLive)}
          className="w-full h-[44px] bg-[#0A0A0A] text-white rounded-[16px] flex items-center justify-center gap-[6px] hover:opacity-90 transition-all"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
            stroke="none"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-[14px] font-medium">Go Live</span>
        </button>

        {/* Platform Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[8px]">
            {platformLogoIcon && (
              <img
                src={platformLogoIcon}
                alt={platformName}
                className="w-[48px] h-[48px] object-contain"
              />
            )}
            <span className="text-[16px] font-semibold text-[var(--secondary-background)]">
              {platformName}
            </span>
          </div>

          <div className="flex items-center gap-[9px]">
            {/* Edit Button */}
            <button className="text-[14px] w-[60px] h-[30px] border border-[var(--border)] rounded-[12px] text-[var(--secondary-background)] hover:bg-gray-50 transition-colors font-semibold">
              Edit
            </button>

            {/* Delete Button */}
            <button className="w-[33px] h-[33px] border border-[var(--border)] rounded-[12px] flex items-center justify-center hover:bg-gray-50 transition-colors">
              <img src={trashIcon} alt="Delete" className="w-[20px] h-[20px]" />
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-[#F5F5F5] rounded-[16px] p-[16px]">
          <h3 className="text-[16px] text-[var(--secondary-background)] mb-[24px] font-normal">
            Info
          </h3>

          <div className="flex flex-col gap-[12px]">
            {/* Duration */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--secondary-background)]">Duration</span>
              <span className="text-[14px] font-medium text-[var(--secondary-background)]">00:00</span>
            </div>

            {/* Quality */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--secondary-background)]">Quality</span>
              <span className="text-[14px] font-medium text-[var(--secondary-background)]">1080p 60fps</span>
            </div>

            {/* Stream Key */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--secondary-background)]">Streamkey</span>
              <span className="text-[14px] font-medium text-[var(--secondary-background)]">
                **********************3434
              </span>
            </div>

            {/* Dropped Frames */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--secondary-background)]">Dropped Frames</span>
              <span className="text-[14px] font-medium text-[var(--secondary-background)]">0</span>
            </div>
          </div>
        </div>

        {/* Go Back Button */}
        <button className="text-[14px] w-full h-[44px] border border-[var(--border)] rounded-[16px] font-semibold text-[var(--secondary-background)] hover:bg-gray-50 transition-colors">
          Go back to Streams
        </button>
      </div>
    </div>
  )
}

export default StreamPlatformHub