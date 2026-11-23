// Admin Activity Logs Page Component
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FiClock,
  FiSearch,
  FiRotateCcw,
  FiCheckCircle,
  FiAlertTriangle,
  FiCornerUpLeft,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import {
  fetchActivityLogs,
  revertActivityLog,
  setSearchQuery,
  clearActivityLogsStatus,
} from "../../redux/slices/activityLogsSlice";
import Badge from "../../components/common/Badge";
import Dialog from "../../components/common/Dialog";

export const ActivityLogs = () => {
  const dispatch = useDispatch();
  const { filteredList, searchQuery, loading, success, error } = useSelector(
    (state) => state.activityLogs
  );

  const [actionFilter, setActionFilter] = useState("All");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [logToRevert, setLogToRevert] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    dispatch(fetchActivityLogs({ forceRefresh: true }));
  }, [dispatch]);

  // Handle operation outcomes
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearActivityLogsStatus());
    }
    if (success) {
      toast.success("Activity reverted successfully!");
      setRevertConfirmOpen(false);
      setLogToRevert(null);
      dispatch(clearActivityLogsStatus());
      dispatch(fetchActivityLogs({ forceRefresh: true }));
    }
  }, [success, error, dispatch]);

  const toggleExpand = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const handleRevertClick = (e, log) => {
    e.stopPropagation();
    setLogToRevert(log);
    setRevertConfirmOpen(true);
  };

  const confirmRevert = () => {
    if (logToRevert) {
      dispatch(revertActivityLog(logToRevert.id));
    }
  };

  const getActionBadgeColor = (action) => {
    switch (String(action || "").toLowerCase()) {
      case "create":
        return "success";
      case "delete":
        return "danger";
      case "update":
        return "blue";
      case "ban":
        return "danger";
      case "unban":
        return "success";
      case "verify":
        return "success";
      default:
        return "warning";
    }
  };

  // Helper to render object changes side-by-side
  const renderStateDiff = (prev, current) => {
    if (!prev && !current) return <p className="text-[10px] text-slate-400">No states recorded.</p>;

    const keys = Array.from(new Set([...Object.keys(prev || {}), ...Object.keys(current || {})]));

    return (
      <div className="max-h-60 overflow-y-auto border border-slate-100 dark:border-slate-900 rounded-xl text-[10px] font-mono leading-relaxed">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-150 dark:border-slate-800">
              <th className="px-3 py-1.5 w-1/3">Property</th>
              <th className="px-3 py-1.5 w-1/3">Previous Value</th>
              <th className="px-3 py-1.5 w-1/3">New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 font-medium">
            {keys.map((key) => {
              if (["id", "createdAt", "updatedAt", "timestamp"].includes(key)) return null;

              const valPrev = prev ? prev[key] : undefined;
              const valCurr = current ? current[key] : undefined;

              const valPrevStr = typeof valPrev === "object" ? JSON.stringify(valPrev) : String(valPrev ?? "");
              const valCurrStr = typeof valCurr === "object" ? JSON.stringify(valCurr) : String(valCurr ?? "");

              if (valPrevStr === valCurrStr) return null;

              return (
                <tr key={key} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                  <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 font-bold select-all">{key}</td>
                  <td className="px-3 py-1.5 text-red-500 bg-red-50/10 line-through select-all">{valPrevStr || "(Empty)"}</td>
                  <td className="px-3 py-1.5 text-emerald-600 bg-emerald-50/10 select-all">{valCurrStr || "(Removed)"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const displayedLogs = (Array.isArray(filteredList) ? filteredList : []).filter((log) => {
    if (!log) return false;
    if (actionFilter === "All") return true;
    return (log.action || "").toLowerCase() === actionFilter.toLowerCase();
  });

  const totalActionsCount = filteredList.length;
  const revertedCount = filteredList.filter((l) => l.reverted).length;
  const uniqueAdminsCount = new Set(filteredList.map((l) => l.adminEmail).filter(Boolean)).size;

  // Pagination helpers
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayedLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(displayedLogs.length / itemsPerPage);

  return (
    <div className="space-y-6 fade-in p-2 sm:p-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-display">
            Security & Audit Logs
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Audit logs of all administrator CRUD operations. Only visible to Super Administrators.
          </p>
        </div>
        <button
          onClick={() => dispatch(fetchActivityLogs({ forceRefresh: true }))}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
        >
          <FiRotateCcw className={loading ? "animate-spin" : ""} size={13} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Audit Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Operations</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{totalActionsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FiClock size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reverted Actions</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{revertedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
            <FiRotateCcw size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Admins</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{uniqueAdminsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <FiCheckCircle size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Search by admin name, email, target collection..."
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-hidden"
          />
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        </div>

        {/* Action Type Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {["All", "Create", "Update", "Delete", "Ban"].map((act) => (
            <button
              key={act}
              onClick={() => {
                setActionFilter(act);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                actionFilter === act
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {act === "All" ? "All Operations" : act}
            </button>
          ))}
        </div>
      </div>

      {/* Audit List Container */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-905 p-5 rounded-2xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-900 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Administrator</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target Doc</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Audit Trail</th>
                <th className="py-2.5 px-3 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-900/50 font-semibold text-slate-700 dark:text-slate-300">
              {loading && filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <span>Reading logs trail...</span>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => toggleExpand(log.id)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-3">
                      <div>
                        <p className="text-slate-800 dark:text-slate-200 font-bold">{log.adminName}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{log.adminEmail}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 uppercase text-[10px]">
                      {(() => {
                        const actionText = typeof log.action === "string" ? log.action : (log.action?.action || "ACTIVITY");
                        return <Badge variant={getActionBadgeColor(actionText)}>{actionText}</Badge>;
                      })()}
                    </td>
                    <td className="py-3.5 px-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {typeof log.targetCollection === "string" ? log.targetCollection : (log.targetCollection ? JSON.stringify(log.targetCollection) : "SYSTEM")}
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                          {typeof log.targetId === "string" || typeof log.targetId === "number" ? log.targetId : "—"}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-[10px] text-slate-400 font-normal">
                      <div className="flex items-center gap-1.5">
                        <FiClock size={11} />
                        <span>
                          {new Date(log.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      {log.reverted ? (
                        <Badge variant="success" className="flex items-center gap-1 w-max">
                          <FiCheckCircle size={10} />
                          <span>Reverted</span>
                        </Badge>
                      ) : (
                        <Badge variant="blue" className="flex items-center gap-1 w-max font-normal">
                          <span>Active</span>
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-655 rounded-lg cursor-pointer"
                          title="View Changes"
                        >
                          {expandedLogId === log.id ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        </button>
                        <button
                          onClick={(e) => handleRevertClick(e, log)}
                          disabled={log.reverted}
                          className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-650 disabled:opacity-40 disabled:hover:bg-violet-50 rounded-lg text-[10px] font-bold border border-violet-200/40 cursor-pointer disabled:cursor-not-allowed"
                          title={log.reverted ? "Action Reverted" : "Revert/Undo changes"}
                        >
                          <FiRotateCcw size={10} />
                          <span>Revert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    No activity logs recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Accordion detail pane (renders when row is clicked) */}
        {expandedLogId && (
          <div className="mt-4 p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-900 rounded-2xl animate-fadeIn space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Changes Diff Comparison
            </h4>
            {(() => {
              const selectedItem = filteredList.find((l) => l.id === expandedLogId);
              if (!selectedItem) return null;
              return renderStateDiff(selectedItem.previousState, selectedItem.currentState);
            })()}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-4 mt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 cursor-pointer disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-[10px] font-bold text-slate-500">
              {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 cursor-pointer disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Reversion confirmation dialog */}
      <Dialog
        isOpen={revertConfirmOpen}
        onClose={() => setRevertConfirmOpen(false)}
        title="Confirm Undo/Reversion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200/30">
            <FiAlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
            <div className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 leading-relaxed">
              <p className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Warning: Reverting this write operation.</p>
              This action will restore document <code className="font-mono text-violet-500">{logToRevert?.targetId}</code> in collection <code className="font-mono text-violet-500">{logToRevert?.targetCollection}</code> back to its previous state. Any newer modifications since then will be overwritten.
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-3">
            <button
              onClick={() => setRevertConfirmOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmRevert}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              <FiCornerUpLeft size={13} />
              <span>Confirm Rollback</span>
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ActivityLogs;
