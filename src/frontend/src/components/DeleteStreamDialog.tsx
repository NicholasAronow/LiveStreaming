import React from "react";

interface DeleteStreamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  platformName: string;
  onDelete: () => void;
  isDeleting?: boolean;
}

function DeleteStreamDialog({
  isOpen,
  onClose,
  platformName,
  onDelete,
  isDeleting = false,
}: DeleteStreamDialogProps) {
  if (!isOpen) return null;

  const handleConfirmDelete = () => {
    onDelete();
    // Dialog will be closed by parent after deletion completes
  };

  const handleCancel = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-[24px]">
      <div className="bg-white rounded-[16px] p-[24px] w-full max-w-[400px] h-[259px] shadow-xl">
        <h2 className="text-[20px] font-semibold text-[var(--secondary-foreground)] mb-[16px] leading-none">
          {isDeleting ? "Deleting..." : "Delete Connection"}
        </h2>
        <p className="text-[14px] text-gray-600 mb-[24px] text-[var(--foreground)] leading">
          {isDeleting ? (
            "Stopping active stream and deleting stream key..."
          ) : (
            <>
              Are you sure you want to delete this stream connection for {platformName}?
              <br />
              This action will remove the streaming key associated with this stream.
            </>
          )}
        </p>
        <hr className="mb-[24px]"/>

        {isDeleting && (
          <div className="mb-[20px] flex justify-center">
            <div className="w-[40px] h-[40px] border-4 border-gray-200 border-t-red-500 rounded-full animate-spin"></div>
          </div>
        )}

        <div className="flex flex-row gap-[8px]">
          <button
            onClick={handleCancel}
            disabled={isDeleting}
            className="w-full h-[44px] border border-[var(--border)] rounded-[16px] text-[14px] text-[var(--secondary-background)] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="w-full h-[44px] bg-[var(--destructive)] text-white rounded-[16px] text-[14px] hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteStreamDialog;
