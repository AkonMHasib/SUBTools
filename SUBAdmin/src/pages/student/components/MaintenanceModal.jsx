import { useState } from "react";
import { FiRefreshCw, FiPhoneCall, FiMail } from "react-icons/fi";

export const MaintenanceModal = ({ isOpen, message, onRetry }) => {
  const [retrying, setRetrying] = useState(false);

  if (!isOpen) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (onRetry) await onRetry();
    } finally {
      setTimeout(() => setRetrying(false), 600);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-7 text-center relative">
        <div className="text-5xl mb-4 select-none animate-bounce">
          🛠️
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          System Maintenance
        </h3>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
          {message ||
            "SUBTools is currently undergoing scheduled maintenance to improve services. Normal operations will resume shortly."}
        </p>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 mb-6 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center justify-center space-x-1.5 font-medium text-slate-700 dark:text-slate-300">
            <FiPhoneCall className="text-blue-500" />
            <span>Hotline: <strong>16665</strong></span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <FiMail className="text-purple-500" />
            <span><strong>info@sub.edu.bd</strong></span>
          </div>
          <div className="text-[11px] text-slate-400">
            State University of Bangladesh IT Services
          </div>
        </div>

        <button
          onClick={handleRetry}
          disabled={retrying}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70"
        >
          <FiRefreshCw className={retrying ? "animate-spin text-base" : "text-base"} />
          <span>{retrying ? "Checking System Status..." : "Retry Connection"}</span>
        </button>
      </div>
    </div>
  );
};

export default MaintenanceModal;
