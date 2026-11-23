import { FiAlertTriangle, FiLogOut, FiMail } from "react-icons/fi";

export const BannedAccountModal = ({ isOpen, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-center relative">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center text-3xl mb-4 border border-red-200 dark:border-red-500/20 shadow-inner">
          <FiAlertTriangle />
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Account Suspended
        </h3>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          Your account has been restricted/banned by the administrator. Please contact university support.
        </p>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-6 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-2">
          <FiMail className="text-sm text-slate-400" />
          <span>Support Contact: <strong>support@sub.edu.bd</strong></span>
        </div>

        <button
          onClick={onConfirm}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <FiLogOut />
          <span>Return to Login</span>
        </button>
      </div>
    </div>
  );
};

export default BannedAccountModal;
