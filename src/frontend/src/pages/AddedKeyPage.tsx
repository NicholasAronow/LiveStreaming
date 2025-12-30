import React from 'react'

interface AddedKeyPageProps {
  platformName: string;
  platformLogoIcon: string;
}

function AddedKeyPage({ platformName, platformLogoIcon }: AddedKeyPageProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white px-[24px]">
      <div className="flex flex-col items-center gap-[64px] max-w-[400px]">
        {/* Platform Logo */}
        <div className="w-[90px] flex items-center justify-center">
          <img
            src={platformLogoIcon}
            alt={platformName}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Success Message */}
        <div className="flex flex-col items-center gap-[24px] text-center">
          <h1 className="text-[24px] text-[var(--secondary-background)] font-semibold">
            {platformName} stream key added
          </h1>
          <p className="text-[14px] text-[#101828]">
            You're all set to go live and confirm your connection.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AddedKeyPage