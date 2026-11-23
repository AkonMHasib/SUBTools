import { FiX, FiClock, FiFileText, FiExternalLink, FiDownload, FiUser } from "react-icons/fi";
import { getDepartmentFullName, getCoverPageDepartmentName } from "../../../utils/academic";

export const NoticeDetailModal = ({ notice, isOpen = true, onClose }) => {
  if (!isOpen || !notice) return null;

  const priority = (notice.priority || "Normal").toUpperCase();
  const isCritical = priority === "CRITICAL";
  const isHigh = priority === "HIGH";

  // Resolve image and PDF attachments
  let imageUrl = notice.imageUrl || notice.image_url || "";
  let pdfUrl = notice.pdfUrl || notice.pdf_url || "";

  if (Array.isArray(notice.attachments) && notice.attachments.length > 0) {
    for (const att of notice.attachments) {
      if (typeof att === "string") {
        if (!imageUrl && att.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)) {
          imageUrl = att;
        } else if (!pdfUrl && att.match(/\.pdf($|\?)/i)) {
          pdfUrl = att;
        } else if (!pdfUrl && !imageUrl) {
          pdfUrl = att; // fallback attachment link
        }
      }
    }
  }

  const formattedDate = notice.date || (notice.created_at ? new Date(notice.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }) : "");

  const sender = notice.created_by || notice.author || notice.publisher || (notice.department ? getCoverPageDepartmentName(notice.department) : "University Administration");

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <span
              className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-md tracking-wider ${
                isCritical
                  ? "bg-rose-500 text-white"
                  : isHigh
                  ? "bg-amber-500 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              {priority}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {getDepartmentFullName(notice.department) || "ALL DEPARTMENTS"}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {formattedDate && (
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                <FiClock className="mr-1 text-xs" />
                {formattedDate}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Notice"
            >
              <FiX className="text-lg" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {notice.title}
            </h2>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1 space-x-1.5">
              <FiUser className="text-[11px]" />
              <span>Publisher: <strong>{sender}</strong></span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {notice.content || notice.body || notice.description || "No description provided."}
            </p>
          </div>

          {/* Image Attachment Preview */}
          {imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
              <img
                src={imageUrl}
                alt="Notice Attachment"
                className="w-full max-h-72 object-contain mx-auto"
              />
            </div>
          )}

          {/* PDF / File Attachment Link */}
          {pdfUrl && (
            <div className="pt-2">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 transition-all flex items-center justify-center space-x-2"
              >
                <FiFileText className="text-sm" />
                <span>View Attached Official Document (PDF)</span>
                <FiExternalLink className="text-xs" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Dismiss Notice
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeDetailModal;
