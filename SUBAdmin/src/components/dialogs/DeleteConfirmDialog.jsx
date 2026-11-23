// Delete Confirmation Dialog Component
import Dialog from '../common/Dialog';
import { FiAlertTriangle } from 'react-icons/fi';

export const DeleteConfirmDialog = ({ isOpen, onClose, onConfirm, itemName, loading }) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Confirm Deletion" size="sm">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-500 rounded-full flex items-center justify-center text-xl mb-4">
          <FiAlertTriangle />
        </div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
          Are you sure you want to delete <span className="font-bold text-red-500">"{itemName}"</span>?
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
          This operation is permanent and cannot be undone. All linked database relationships will be severed.
        </p>
        <div className="flex items-center space-x-3 mt-6 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-50 flex justify-center items-center cursor-pointer shadow-sm"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeleteConfirmDialog;
