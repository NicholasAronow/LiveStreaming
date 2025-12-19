function SettingsSkeleton() {
  return (
    <div className="flex flex-col h-full p-[24px]">
      {/* Title Skeleton */}
      <div className="w-[120px] h-[28px] bg-gray-200 rounded-md animate-pulse mb-[24px]" />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[400px]">
          {/* Platform Icon Skeleton */}
          <div className="flex items-center justify-center mb-[64px]">
            <div className="w-[92px] h-[92px] bg-gray-200 rounded-full animate-pulse" />
          </div>

          {/* Button Skeleton */}
          <div className="w-full h-[48px] bg-gray-200 rounded-[16px] animate-pulse" />

          {/* Text Skeleton */}
          <div className="flex justify-center mt-[8px]">
            <div className="w-[150px] h-[14px] bg-gray-200 rounded-md animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsSkeleton;
