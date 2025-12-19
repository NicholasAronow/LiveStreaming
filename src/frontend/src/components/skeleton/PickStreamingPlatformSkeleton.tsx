function PickStreamingPlatformSkeleton() {
  return (
    <div className="w-full h-full overflow-y-auto px-[24px] pt-[25px] pb-[55px]">
      <div className="flex flex-col items-center gap-[24px]">
        {/* Title Skeleton */}
        <div className="w-[280px] h-[24px] bg-gray-200 rounded-md animate-pulse" />

        {/* Platform Grid Skeleton */}
        <div className="w-full gap-x-[16px] gap-y-[16px] grid grid-cols-2 auto-rows-auto place-items-center">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="w-full h-[170px] bg-gray-200 rounded-[16px] animate-pulse"
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PickStreamingPlatformSkeleton;
