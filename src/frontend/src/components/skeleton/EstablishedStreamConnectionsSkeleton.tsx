function EstablishedStreamConnectionsSkeleton() {
  return (
    <div className="w-full h-full overflow-y-auto px-[24px] pt-[24px] pb-[100px] bg-[#FAFAFA]">
      <div className="flex flex-col gap-[24px]">
        {/* Connection Card Skeletons */}
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-[16px] p-[16px] border border-[var(--border)]"
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <div className="flex items-center gap-[12px]">
              {/* Platform Icon Skeleton */}
              <div className="w-[48px] h-[48px] bg-gray-200 rounded-[12px] animate-pulse" />

              {/* Content Skeleton */}
              <div className="flex-1 flex flex-col gap-[8px]">
                {/* Platform Name Skeleton */}
                <div className="w-[120px] h-[16px] bg-gray-200 rounded-md animate-pulse" />

                {/* Stream Key Skeleton */}
                <div className="w-[180px] h-[14px] bg-gray-200 rounded-md animate-pulse" />
              </div>

              {/* Status Badge Skeleton */}
              <div className="w-[60px] h-[24px] bg-gray-200 rounded-full animate-pulse" />
            </div>

            {/* Additional Info Row Skeleton */}
            <div className="flex items-center gap-[16px] mt-[12px] pt-[12px] border-t border-[var(--border)]">
              <div className="w-[100px] h-[12px] bg-gray-200 rounded-md animate-pulse" />
              <div className="w-[80px] h-[12px] bg-gray-200 rounded-md animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EstablishedStreamConnectionsSkeleton;
