function StreamSetupSkeleton() {
  return (
    <div className="w-full h-full overflow-y-auto px-[24px] pt-[24px] pb-[100px] bg-white">
      <div className="flex flex-col gap-[24px]">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[8px]">
            {/* Platform Icon Skeleton */}
            <div className="w-[36px] h-[36px] bg-gray-200 rounded-md animate-pulse" />
            {/* Platform Name Skeleton */}
            <div className="w-[120px] h-[20px] bg-gray-200 rounded-md animate-pulse" />
          </div>
          {/* Cancel Button Skeleton */}
          <div className="w-[78px] h-[38px] bg-gray-200 rounded-[16px] animate-pulse" />
        </div>

        {/* Info Card Skeleton */}
        <div className="p-[12px] rounded-[10px] flex gap-[12px] h-[79px] items-center border border-gray-200 bg-gray-50">
          <div className="w-[40px] h-[40px] bg-gray-200 rounded-md animate-pulse" />
          <div className="flex-1 flex flex-col justify-center gap-[8px]">
            <div className="w-[200px] h-[14px] bg-gray-200 rounded-md animate-pulse" />
            <div className="w-[280px] h-[12px] bg-gray-200 rounded-md animate-pulse" />
          </div>
          <div className="w-[16px] h-[16px] bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Stream Server URL Skeleton */}
        <div className="flex flex-col gap-[12px]">
          <div className="w-[140px] h-[14px] bg-gray-200 rounded-md animate-pulse" />
          <div className="flex gap-[8px]">
            <div className="flex-1 h-[36px] bg-gray-200 rounded-[8px] animate-pulse" />
            <div className="w-[36px] h-[36px] bg-gray-200 rounded-[8px] animate-pulse" />
          </div>
        </div>

        {/* Stream Key Skeleton */}
        <div className="flex flex-col gap-[12px]">
          <div className="w-[100px] h-[14px] bg-gray-200 rounded-md animate-pulse" />
          <div className="flex gap-[8px]">
            <div className="flex-1 h-[36px] bg-gray-200 rounded-[8px] animate-pulse" />
          </div>
        </div>

        {/* Connect Button Skeleton */}
        <div className="w-full h-[44px] bg-gray-200 rounded-[16px] animate-pulse" />
      </div>
    </div>
  );
}

export default StreamSetupSkeleton;
