import React from 'react';

interface ClearAllKeysDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  streamKeyCount: number;
  isDeleting?: boolean;
}

function ClearAllKeysDialog({
  isOpen,
  onClose,
  onConfirm,
  streamKeyCount,
  isDeleting = false
}: ClearAllKeysDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-[24px]">
      <div className="bg-white rounded-[24px] p-[24px] w-full max-w-[400px] shadow-xl">
        <h2 className="text-[20px] font-semibold text-red-600 mb-[16px]">
          {isDeleting ? 'Clearing...' : 'Clear All Stream Keys'}
        </h2>

        <p className="text-[14px] text-gray-600 mb-[20px]">
          {isDeleting
            ? 'Removing all saved stream keys...'
            : `Are you sure you want to clear all ${streamKeyCount} saved stream key${streamKeyCount !== 1 ? 's' : ''}? This action cannot be undone.`
          }
        </p>

        {isDeleting && (
          <div className="mb-[20px] flex justify-center">
            <div className="w-[40px] h-[40px] border-4 border-gray-200 border-t-red-500 rounded-full animate-spin"></div>
          </div>
        )}

        <div className="flex flex-col gap-[12px]">
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full h-[48px] bg-red-500 text-white rounded-[16px] text-[16px] font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Clearing...' : 'Yes, Clear All'}
          </button>

          <button
            onClick={handleCancel}
            disabled={isDeleting}
            className="w-full h-[48px] border border-[var(--border)] rounded-[16px] text-[16px] font-medium text-[var(--secondary-background)] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClearAllKeysDialog;
