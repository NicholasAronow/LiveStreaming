import React, { useState } from "react";
import PlatformItem from "../components/PlatformItem";
import youtubeIcon from "../../../public/assets//youtube/Property 1=Youtube.svg";
import youtubeIconFill from "../../../public/assets/youtube/Property 1=Youtube fill.svg";
import youtubeLogo from "../../../public/assets/youtube/YoutubeSoloLogo.svg";
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
  onPlatformSelect?: (platformId: string, platformName: string, platformIcon: string, platformLogoIcon: string) => void;
}

function PickStreamingPlatform({ onPlatformSelect }: PickStreamingPlatformProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const platforms = [
    {
      id: "youtube",
      platformName: "YouTube",
      imgAdress: youtubeIcon,
      imgAdressFill: youtubeIconFill,
      logoIcon: youtubeLogo,
      borderColor: "#FF0000"
    },
    {
      id: "twitch",
      platformName: "Twitch",
      imgAdress: twitchIcon,
      imgAdressFill: twitchIconFill,
      logoIcon: twitchIconFill,
      borderColor: "#9146FF"
    },
    {
      id: "tiktok",
      platformName: "TikTok",
      imgAdress: tiktokIcon,
      imgAdressFill: tiktokIconFill,
      logoIcon: tiktokIconFill,
      borderColor: "#000000"
    },
    {
      id: "x",
      platformName: "X",
      imgAdress: xIcon,
      imgAdressFill: xIconFill,
      logoIcon: xIconFill,
      borderColor: "#000000"
    },
    {
      id: "instagram",
      platformName: "Instagram",
      imgAdress: instagram,
      imgAdressFill: instagramFill,
      logoIcon: instagramFill,
      borderColor: "#E4405F"
    },
    {
      id: "streamer",
      platformName: "Stream Here",
      imgAdress: streamerIcon,
      imgAdressFill: streamerIconFill,
      logoIcon: streamerIconFill,
      borderColor: "#DC2626"
    },
  ];

  const handlePlatformClick = (platformId: string, platformName: string, platformIcon: string, platformLogoIcon: string) => {
    setSelectedPlatform(platformId);
    if (onPlatformSelect) {
      onPlatformSelect(platformId, platformName, platformIcon, platformLogoIcon);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto px-[24px] pt-[25px] pb-[55px]">
      <div className="flex flex-col items-center gap-[24px]">
        <div className="text-[var(--secondary-background)] text-[20px] font-semibold">Where do you want to stream?</div>

        <div className="w-full gap-x-[16px] gap-y-[16px] grid grid-cols-2 auto-rows-auto place-items-center">
          {platforms.map((platform) => {
            const isSelected = selectedPlatform === platform.id;
            return (
              <PlatformItem
                key={platform.id}
                imgAdress={isSelected ? platform.imgAdressFill : platform.imgAdress}
                platformName={platform.platformName}
                isSelected={isSelected}
                borderColor={platform.borderColor}
                onClick={() => handlePlatformClick(platform.id, platform.platformName, isSelected ? platform.imgAdressFill : platform.imgAdress, platform.logoIcon)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PickStreamingPlatform;
