import { useState } from "react";
import youtubePlayLogo from "../../../public/assets/youtube/YoutubePlaylogo.svg";

interface StreamSetupProps {
  platform: string;
  platformName: string;
  platformIcon: string;
  platformLogoIcon?: string;
  onBack: () => void;
  onConnect: () => void;
}

function StreamSetup({ platform, platformName, platformIcon, platformLogoIcon, onBack, onConnect }: StreamSetupProps) {
  const [streamUrl, setStreamUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const getDefaultStreamUrl = (platform: string) => {
    switch (platform) {
      case "youtube":
        return "rtmp://a.rtmp.youtube.com/live2/";
      case "twitch":
        return "rtmp://live.twitch.tv/app/";
      case "tiktok":
        return "rtmp://push.tiktok.com/rtmp/";
      case "instagram":
        return "rtmp://live.instagram.com:80/rtmp/";
      case "x":
        return "rtmp://live.x.com/rtmp/";
      default:
        return "";
    }
  };

  const getPlatformColors = (platform: string) => {
    switch (platform) {
      case "youtube":
        return { bg: "#FEF2F2", border: "#FCA5A5" }; // Light red
      case "twitch":
        return { bg: "#F3E8FF", border: "#D8B4FE" }; // Light purple
      case "tiktok":
        return { bg: "#F9FAFB", border: "#D1D5DB" }; // Light gray
      case "instagram":
        return { bg: "#FDF2F8", border: "#FBCFE8" }; // Light pink
      case "x":
        return { bg: "#F9FAFB", border: "#D1D5DB" }; // Light gray
      case "streamer":
        return { bg: "#FEF2F2", border: "#FCA5A5" }; // Light red
      default:
        return { bg: "#F3E8FF", border: "#D8B4FE" }; // Default purple
    }
  };

  const getInfoCardIcon = (platform: string) => {
    switch (platform) {
      case "youtube":
        return youtubePlayLogo;
      default:
        return platformIcon;
    }
  };

  const getPlatformAccentColor = (platform: string) => {
    switch (platform) {
      case "youtube":
        return "#FF0000"; // YouTube red
      case "twitch":
        return "#9146FF"; // Twitch purple
      case "tiktok":
        return "#000000"; // TikTok black
      case "instagram":
        return "#E4405F"; // Instagram pink
      case "x":
        return "#000000"; // X black
      case "streamer":
        return "#DC2626"; // Streamer red
      default:
        return "#9146FF"; // Default purple
    }
  };

  const handleConnect = () => {
    console.log("Connecting to", platform, "with URL:", streamUrl, "and key:", streamKey);
    // Call the onConnect callback to show AddedKeyPage
    onConnect();
  };

  return (
    <div className="w-full h-full overflow-y-auto px-[24px] pt-[24px] pb-[100px] bg-white">
      <div className="flex flex-col gap-[24px]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[8px]">
            <img src={platformLogoIcon || platformIcon} alt={platformName} className=" h-[36px]" />
            <h1 className="text-[16px] text-[var(--secondary-background)] font-fa font-semibold">
              {platformName}
            </h1>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 text-[14px] hover:text-[var(--secondary-background)] transition-colors min-w-[78px] min-h-[38px] border-[1px] border-[var(--border)] rounded-[16px] text-[var(--secondary-foreground)] font-semibold"
          >
            Cancel
          </button>
        </div>

        {/* Info Card */}
        <div
          className="p-[12px] rounded-[10px] flex gap-[12px] h-[79px] items-center border"
          style={{
            backgroundColor: getPlatformColors(platform).bg,
            borderColor: getPlatformColors(platform).border
          }}
        >
          <img src={getInfoCardIcon(platform)} alt={platformName} className="w-[40px] h-[40px]" />
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-[14px] text-[var(--secondary-background)] font-normal">
              Get your {platformName} stream key
            </h3>
            <p className="text-[12px] text-[var(--muted-forground)] font-normal">
              Dashboard → Settings → Stream → Primary Stream Key
            </p>
          </div>
          <button className="text-purple-600 hover:text-purple-700">
            <svg 
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              color="#99A1AF"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>

        {/* Stream Server URL */}
        <div className="flex flex-col gap-[12px]">
          <label className="text-[14px] font-medium text-[var(--secondary-background)] font-medium">
            Stream Server URL
          </label>
          <div className="flex gap-[8px]">
            <input
              type="text"
              value={streamUrl || getDefaultStreamUrl(platform)}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder={getDefaultStreamUrl(platform)}
              className="h-[36px] flex-1 px-4 py-3 border border-[var(--border)] text-[14px] text-[var(--muted-forground)] focus:outline-none transition-colors rounded-[8px]"
              style={{
                borderColor: 'var(--border)',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = getPlatformAccentColor(platform)}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => navigator.clipboard.writeText(streamUrl || getDefaultStreamUrl(platform))}
              className="w-[36px] h-[36px] rounded-[8px] border border-[var(--border)] hover:bg-gray-50 transition-colors flex justify-center items-center"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                color="#0F0F0F"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stream Key */}
        <div className="flex flex-col gap-[12px]">
          <label className="text-[14px] font-medium text-[var(--secondary-background)] font-medium">
            Stream Key
          </label>
          <div className="flex gap-[8px]">
            <div className="flex-1 relative">
              <input
                type={showKey ? "text" : "password"}
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Paste your stream key here"
                className="h-[36px] w-full px-4 py-3 border border-[var(--border)] rounded-[8px] text-[14px] text-[var(--muted-forground)] focus:outline-none transition-colors pr-10"
                style={{
                  borderColor: 'var(--border)',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = getPlatformAccentColor(platform)}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-forground)] hover:text-[var(--secondary-background)]"
              >
                {showKey ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <button
          onClick={handleConnect}
          disabled={!streamKey}
          className="w-full bg-[var(--secondary-background)] text-white rounded-[16px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all h-[44px] text-[14px] font-semibold"
        >
          Connect {platformName}
        </button>
      </div>
    </div>
  );
}

export default StreamSetup;
