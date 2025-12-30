import React, { useState, useEffect } from "react";
import PlatformItem from "../components/PlatformItem";
import { PickStreamingPlatformSkeleton } from "../components/skeleton";
import youtubeIcon from "../../../public/assets//youtube/Property 1=Youtube.svg";
import youtubeIconFill from "../../../public/assets/youtube/Property 1=Youtube fill.svg";
import youtubeLogo from "../../../public/assets/youtube/YoutubeSoloLogo.svg";
import customIconFill from "../../../public/assets/Property 1=Variant16.svg";
import customIcon from "../../../public/assets/Property 1=Custom.svg";
import twitchIcon from "../../../public/assets/Property 1=Twitch.svg";
import twitchIconFill from "../../../public/assets/Property 1=Twitch fill.svg";
import instagram from "../../../public/assets/Property 1=Instagram.svg";
import instagramFill from "../../../public/assets/Property 1=Instagram fill.svg";
import tiktokIcon from "../../../public/assets/Property 1=Tik Tok.svg";
import tiktokIconFill from "../../../public/assets/Property 1=Tik Tok fill.svg";
import xIcon from "../../../public/assets/Property 1=x.svg";
import xIconFill from "../../../public/assets/Property 1=x fill.svg";
import streamerIcon from "../../../public/assets/Property 1=Streamer.svg";
import streamerIconFill from "../../../public/assets/Property 1=streamer fill.svg";

interface PickStreamingPlatformProps {
  onPlatformSelect?: (
    platformId: string,
    platformName: string,
    platformIcon: string,
    platformLogoIcon: string
  ) => void;
}

function PickStreamingPlatform({
  onPlatformSelect,
}: PickStreamingPlatformProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading state for images and content
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  const platforms = [
    {
      id: "streamer",
      platformName: "Stream Here",
      imgAdress: streamerIcon,
      imgAdressFill: streamerIconFill,
      logoIcon: streamerIconFill,
      borderColor: "#DC2626",
    },
    {
      id: "twitch",
      platformName: "Twitch",
      imgAdress: twitchIcon,
      imgAdressFill: twitchIconFill,
      logoIcon: twitchIconFill,
      borderColor: "#9146FF",
    },
    {
      id: "x",
      platformName: "X",
      imgAdress: xIcon,
      imgAdressFill: xIconFill,
      logoIcon: xIconFill,
      borderColor: "#000000",
    },
    {
      id: "youtube",
      platformName: "YouTube",
      imgAdress: youtubeIcon,
      imgAdressFill: youtubeIconFill,
      logoIcon: youtubeLogo,
      borderColor: "#FF0000",
    },
    {
      id: "instagram",
      platformName: "Instagram",
      imgAdress: instagram,
      imgAdressFill: instagramFill,
      logoIcon: instagramFill,
      borderColor: "#E4405F",
    },

    {
      id: "other",
      platformName: "Custom",
      imgAdress: customIcon,
      imgAdressFill: customIconFill,
      logoIcon: customIconFill,
      borderColor: "#FFA500",
    },
  ];

  const handlePlatformClick = (
    platformId: string,
    platformName: string,
    platformIcon: string,
    platformLogoIcon: string
  ) => {
    setSelectedPlatform(platformId);
    if (onPlatformSelect) {
      onPlatformSelect(
        platformId,
        platformName,
        platformIcon,
        platformLogoIcon
      );
    }
  };

  // Show skeleton while loading
  if (isLoading) {
    return <PickStreamingPlatformSkeleton />;
  }

  return (
    <div className="w-full h-full overflow-y-auto px-[24px] pt-[25px] pb-[55px] animate-fadeIn">
      <div className="flex flex-col items-center gap-[24px]">
        <div className="text-[var(--secondary-background)] text-[20px] font-semibold">
          Where do you want to stream?
        </div>

        <div className="w-full gap-x-[16px] gap-y-[16px] grid grid-cols-2 auto-rows-auto place-items-center">
          {platforms.map((platform) => {
            const isSelected = selectedPlatform === platform.id;
            return (
              <PlatformItem
                key={platform.id}
                imgAdress={
                  isSelected ? platform.imgAdressFill : platform.imgAdress
                }
                platformName={platform.platformName}
                isSelected={isSelected}
                borderColor={platform.borderColor}
                onClick={() =>
                  handlePlatformClick(
                    platform.id,
                    platform.platformName,
                    platform.imgAdressFill,
                    platform.logoIcon
                  )
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PickStreamingPlatform;
