import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Splash from "./Splash";
import BottomNav from "../components/BottomNav";
import PickStreamingPlatform from "./PickStreamingPlatform";
import StreamSetup from "./StreamSetup";
import AddedKeyPage from "./AddedKeyPage";
import StreamPlatformHub from "./StreamPlatformHub";

function Container() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('new');
  const [showAddedKeyPage, setShowAddedKeyPage] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<{
    id: string;
    name: string;
    icon: string;
    logoIcon: string;
  } | null>(null);
  const [connectedPlatform, setConnectedPlatform] = useState<{
    id: string;
    name: string;
    icon: string;
    logoIcon: string;
  } | null>(null);
  const skipSplashAnimation = false; // Set to true to skip splash

  useEffect(() => {
    if (skipSplashAnimation) {
      setShowSplash(false);
    } else {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [skipSplashAnimation]);

  // Handle AddedKeyPage timer - show for 3 seconds then go to stream tab
  useEffect(() => {
    if (showAddedKeyPage) {
      const timer = setTimeout(() => {
        setShowAddedKeyPage(false);
        setActiveTab('stream');
        setSelectedPlatform(null);
      }, 1500); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [showAddedKeyPage]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedPlatform(null); // Reset selected platform when changing tabs
    setShowAddedKeyPage(false); // Reset added key page
    console.log('Active tab:', tab);
  };

  const handlePlatformSelect = (platformId: string, platformName: string, platformIcon: string, platformLogoIcon: string) => {
    setSelectedPlatform({
      id: platformId,
      name: platformName,
      icon: platformIcon,
      logoIcon: platformLogoIcon,
    });
  };

  const handleBackFromSetup = () => {
    setSelectedPlatform(null);
  };

  const handleConnect = () => {
    if (selectedPlatform) {
      setConnectedPlatform(selectedPlatform);
    }
    setShowAddedKeyPage(true);
  };

  const renderContent = () => {
    // Show AddedKeyPage when connection is made
    if (showAddedKeyPage && selectedPlatform) {
      return (
        <AddedKeyPage
          platformName={selectedPlatform.name}
          platformLogoIcon={selectedPlatform.logoIcon}
        />
      );
    }

    // If a platform is selected, show the setup page
    if (selectedPlatform) {
      return (
        <StreamSetup
          platform={selectedPlatform.id}
          platformName={selectedPlatform.name}
          platformIcon={selectedPlatform.icon}
          platformLogoIcon={selectedPlatform.logoIcon}
          onBack={handleBackFromSetup}
          onConnect={handleConnect}
        />
      );
    }

    switch (activeTab) {
      case 'new':
        return <PickStreamingPlatform onPlatformSelect={handlePlatformSelect} />;
      case 'stream':
        return (
          <StreamPlatformHub
            platformName={connectedPlatform?.name}
            platformLogoIcon={connectedPlatform?.logoIcon}
          />
        );
      case 'settings':
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-xl text-gray-500">Settings Tab - Coming Soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen bg-white flex flex-col relative">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 w-full h-full z-[9999]"
          >
            <Splash />
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              {renderContent()}
            </div>
            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Container;
