import { useState, useEffect } from "react";
import { StreamConnection } from "../types";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import { BACKEND_URL } from "../config/api";
import { SettingsSkeleton } from "../components/skeleton";
import ClearAllKeysDialog from "../components/ClearAllKeysDialog";

interface SettingsProps {
  connections: StreamConnection[];
  userId?: string;
  platformsIcon?: string;
  onClearAllKeys: () => void;
}

function Settings({ connections, userId, platformsIcon, onClearAllKeys }: SettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Simulate loading state for images and content
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  const handleClearAll = async () => {
    if (!userId) return;

    setIsDeleting(true);

    // Delete all connections from API
    try {
      const deletePromises = connections.map((conn) =>
        fetch(`${BACKEND_URL}/api/stream-configs/${conn.platform}`, {
          method: "DELETE",
          headers: { "X-User-Id": userId },
        })
      );
      await Promise.all(deletePromises);

      onClearAllKeys();
      showSuccessToast("All stream keys have been cleared.");
      setShowClearDialog(false);
    } catch (error) {
      console.error("Failed to clear all configs:", error);
      showErrorToast("Failed to clear all stream keys. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Show skeleton while loading
  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col h-full p-[24px] animate-fadeIn">
        <h2 className="text-[24px] font-semibold text-[var(--secondary-background)] mb-[24px]">
          Settings
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px]">
            <div className="flex items-center justify-center mb-[64px]">
              <img
                src={platformsIcon}
                alt="Platforms Icon"
                className="w-[92px] h-[92px]"
              />
            </div>
            <button
              onClick={() => setShowClearDialog(true)}
              className="w-full bg-black text-white rounded-[16px] px-[24px] h-[48px] text-[16px] font-medium hover:bg-red-600 transition-colors"
            >
              Clear All Stream Keys
            </button>

            <p className="text-[14px] text-gray-500 text-center mt-[8px]">
              {connections.length} stream key
              {connections.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>
      </div>

      {/* Clear All Keys Dialog */}
      <ClearAllKeysDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearAll}
        streamKeyCount={connections.length}
        isDeleting={isDeleting}
      />
    </>
  );
}

export default Settings;
