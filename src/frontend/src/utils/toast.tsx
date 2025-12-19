import toast from "react-hot-toast";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

// Common style configuration
const baseToastStyle = {
  width: "100%",
  maxWidth: "500px",
  borderRadius: "12px",
  padding: "0",
  fontSize: "13px",
  fontWeight: "500",
};

// Common class configuration for inner content
const toastClassName = "flex items-center justify-start gap-2 px-4 py-3 w-full";

// Success toast - Green accent
export const showSuccessToast = (message: string, duration: number = 3000) => {
  const toastId = toast.custom(
    (t) => (
      <div
        className={toastClassName}
        style={{
          ...baseToastStyle,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#0A0A0A",
          border: "1px solid #86EFAC",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
          opacity: t.visible ? 1 : 0,
          transition: "opacity 0.3s",
          padding: "9px",
        }}
      >
        <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
        <span className="flex-1 text-left">{message}</span>
      </div>
    ),
    { duration }
  );

  // Ensure toast is dismissed after duration
  setTimeout(() => {
    toast.dismiss(toastId);
  }, duration + 100);
};

// Warning toast - Yellow accent
export const showWarningToast = (message: string, duration: number = 4000) => {
  const toastId = toast.custom(
    (t) => (
      <div
        className={toastClassName}
        style={{
          ...baseToastStyle,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#0A0A0A",
          border: "1px solid #FCD34D",
          boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)",
          opacity: t.visible ? 1 : 0,
          transition: "opacity 0.3s",
          padding: "9px",
        }}
      >
        <AlertTriangle className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
        <span className="flex-1 text-left">{message}</span>
      </div>
    ),
    { duration }
  );

  // Ensure toast is dismissed after duration
  setTimeout(() => {
    toast.dismiss(toastId);
  }, duration + 100);
};

// Error toast - Red accent
export const showErrorToast = (message: string, duration: number = 4000) => {
  const toastId = toast.custom(
    (t) => (
      <div
        className={toastClassName}
        style={{
          ...baseToastStyle,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#0A0A0A",
          border: "1px solid #FCA5A5",
          boxShadow: "0 4px 12px rgba(220, 38, 38, 0.15)",
          opacity: t.visible ? 1 : 0,
          transition: "opacity 0.3s",
          padding: "9px",
        }}
      >
        <XCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
        <span className="flex-1 text-left">{message}</span>
      </div>
    ),
    { duration }
  );

  // Ensure toast is dismissed after duration
  setTimeout(() => {
    toast.dismiss(toastId);
  }, duration + 100);
};

// Info toast - Blue accent (bonus)
export const showInfoToast = (message: string, duration: number = 3000) => {
  const toastId = toast.custom(
    (t) => (
      <div
        className={toastClassName}
        style={{
          ...baseToastStyle,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#0A0A0A",
          border: "1px solid #93C5FD",
          boxShadow: "0 4px 12px rgba(59, 130, 246, 0.15)",
          opacity: t.visible ? 1 : 0,
          transition: "opacity 0.3s",
          padding: "9px",
        }}
      >
        <div className="w-5 h-5 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">i</span>
        </div>
        <span className="flex-1 text-left">{message}</span>
      </div>
    ),
    { duration }
  );

  // Ensure toast is dismissed after duration
  setTimeout(() => {
    toast.dismiss(toastId);
  }, duration + 100);
};
