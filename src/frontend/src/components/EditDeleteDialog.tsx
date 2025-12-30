import React, { useState } from 'react'

interface EditDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  platformName: string;
  currentStreamKey: string;
  onSave: (newKey: string) => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

function EditDeleteDialog({
  isOpen,
  onClose,
  platformName,
  currentStreamKey,
  onSave,
  onDelete,
  isDeleting = false
}: EditDeleteDialogProps) {
  const [streamKey, setStreamKey] = useState(currentStreamKey);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (streamKey.trim() && streamKey !== currentStreamKey) {
      onSave(streamKey.trim());
      onClose();
    } else if (!streamKey.trim()) {
      alert('Stream key cannot be empty');
    } else {
      onClose(); // No changes, just close
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    // Dialog will be closed by parent after deletion completes
  };

  const handleCancel = () => {
    if (!isDeleting) {
      setStreamKey(currentStreamKey); // Reset to original
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-[24px]">
      <div className="bg-white rounded-[24px] p-[24px] w-full max-w-[400px] shadow-xl">
        {!showDeleteConfirm ? (
          <>
            {/* Edit Mode */}
            <h2 className="text-[20px] font-semibold text-[var(--secondary-background)] mb-[16px]">
              Edit Stream Key
            </h2>
            <p className="text-[14px] text-gray-600 mb-[20px]">
              Update the stream key for {platformName}
            </p>

            <div className="mb-[24px]">
              <label className="block text-[14px] font-medium text-[var(--secondary-background)] mb-[8px]">
                Stream Key
              </label>
              <input
                type="text"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                className="w-full px-[16px] h-[48px] border border-[var(--border)] rounded-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="Enter stream key"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-[12px]">
              <button
                onClick={handleSave}
                className="w-full h-[48px] bg-[#0A0A0A] text-white rounded-[16px] text-[16px] font-medium hover:opacity-90 transition-opacity"
              >
                Save Changes
              </button>

              <button
                onClick={handleDeleteClick}
                className="w-full h-[48px] bg-red-500 text-white rounded-[16px] text-[16px] font-medium hover:bg-red-600 transition-colors"
              >
                Delete Stream Key
              </button>

              <button
                onClick={handleCancel}
                className="w-full h-[48px] border border-[var(--border)] rounded-[16px] text-[16px] font-medium text-[var(--secondary-background)] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Delete Confirmation Mode */}
            <h2 className="text-[20px] font-semibold text-red-600 mb-[16px]">
              {isDeleting ? 'Deleting...' : 'Delete Stream Key'}
            </h2>
            <p className="text-[14px] text-gray-600 mb-[20px]">
              {isDeleting
                ? 'Stopping active stream and deleting stream key...'
                : `Are you sure you want to delete the stream key for ${platformName}? This action cannot be undone.`
              }
            </p>

            {isDeleting && (
              <div className="mb-[20px] flex justify-center">
                <div className="w-[40px] h-[40px] border-4 border-gray-200 border-t-red-500 rounded-full animate-spin"></div>
              </div>
            )}

            <div className="flex flex-col gap-[12px]">
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full h-[48px] bg-red-500 text-white rounded-[16px] text-[16px] font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="w-full h-[48px] border border-[var(--border)] rounded-[16px] text-[16px] font-medium text-[var(--secondary-background)] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default EditDeleteDialog
