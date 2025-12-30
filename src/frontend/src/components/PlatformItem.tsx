import React from 'react'

interface PlatformItemProps {
    imgAdress: string;
    platformName: string;
    isSelected?: boolean;
    borderColor?: string;
    onClick?: () => void;
}

function PlatformItem({ imgAdress, platformName, isSelected = false, borderColor = 'var(--border)', onClick }: PlatformItemProps) {
  return (
    <div
      onClick={onClick}
      className='w-[163px] h-[171.56px] flex flex-col justify-center items-center gap-[8px] border-[1px] rounded-[12px] cursor-pointer transition-all hover:scale-105'
      style={{
        borderColor: isSelected ? borderColor : 'var(--border)'
      }}
    >
        <img src={imgAdress} width="91" height="91" alt={platformName} />
        <div className='text-[var(--secondary-background)] text-[16px] font-semibold'>{platformName}</div>
    </div>
  )
}

export default PlatformItem