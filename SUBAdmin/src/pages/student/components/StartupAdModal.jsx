import { FiX, FiExternalLink } from "react-icons/fi";

export const StartupAdModal = ({
  isOpen,
  onClose,
  fullscreenAd,
  onAdClick,
}) => {
  if (!isOpen || !fullscreenAd?.enabled || !fullscreenAd?.imageUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-500/20">
              Special Announcement
            </span>
            {fullscreenAd.title && (
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 truncate max-w-[200px]">
                {fullscreenAd.title}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <FiX className="text-lg" />
          </button>
        </div>
        <div
          onClick={() => {
            onAdClick("fullscreen_ad", fullscreenAd.targetUrl);
            onClose();
          }}
          className="cursor-pointer block relative max-h-[70vh] overflow-hidden bg-slate-100 dark:bg-slate-950 group"
          title="Click to learn more"
        >
          <img
            src={fullscreenAd.imageUrl}
            alt={fullscreenAd.title || "Announcement Ad"}
            className="w-full h-auto object-contain max-h-[60vh] mx-auto group-hover:scale-[1.01] transition-transform"
          />
        </div>
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
          {fullscreenAd.targetUrl && (
            <button
              onClick={() => {
                onAdClick("fullscreen_ad", fullscreenAd.targetUrl);
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/30 flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Learn More</span>
              <FiExternalLink className="text-xs" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartupAdModal;
