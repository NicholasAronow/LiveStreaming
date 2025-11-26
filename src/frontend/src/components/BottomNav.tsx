import streamIcon from "../../../public/assets/streamBottomNav.svg";
import addIcon from "../../../public/assets/addBottomNav.svg";
import settingsIcon from "../../../public/assets/settingsBottomNav.svg";

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

function BottomNav({ activeTab = 'stream', onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'new', label: 'New', icon: addIcon },
    { id: 'stream', label: 'Stream', icon: streamIcon },
    { id: 'settings', label: 'Settings', icon: settingsIcon }
  ];

  return (
    <div className=" bottom-0 left-0 right-0 bg-[var(--primary-forground)] border-t border-[1px] border-[var(--border] shadow-lg rounded-t-[16px]">
      <div className="flex justify-around items-center h-[77px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors relative"
          >
            <div className="relative flex flex-col items-center gap-[4px]">
              {/* Highlighted circle behind icon */}
              {activeTab === tab.id && (
                <div className="absolute -translate-y-0.5  w-[50px] h-[30px] bg-[var(--destructive)] rounded-full z-0 transition-all" />
              )}
              <img
                src={tab.icon}
                alt={tab.label}
                className={`w-6 h-6 mb-1 transition-all ${
                  activeTab === tab.id ? 'brightness-0 invert' : ''
                }`}
                style={activeTab === tab.id ? { filter: 'brightness(0) invert(1)' } : {}}
              />
              <span className={`text-[14px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[var(--destructive)]'
                  : 'text-[var(--muted-forground)]'
              }`}>
                {tab.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default BottomNav
