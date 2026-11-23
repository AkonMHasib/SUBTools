import { useState, useMemo } from "react";
import {
  FiFileText,
  FiSearch,
  FiClock,
  FiExternalLink,
  FiX,
  FiTag,
  FiUser,
  FiBell,
} from "react-icons/fi";
import NoticeDetailModal from "../components/NoticeDetailModal";
import { getDepartmentFullName } from "../../../utils/academic";

export const StudentNotices = ({
  notices = [],
  filteredNotices: initialFilteredNotices = [],
  searchQuery: externalSearchQuery = "",
  setSearchQuery: setExternalSearchQuery,
  user,
  userDept = "",
}) => {
  const [activeTab, setActiveTab] = useState(0); // 0: "All Announcements", 1: "My Department"
  const [localSearch, setLocalSearch] = useState(externalSearchQuery);
  const [selectedNotice, setSelectedNotice] = useState(null);

  const studentDept = (user?.department || userDept || "").trim().toUpperCase();

  const handleSearchChange = (val) => {
    setLocalSearch(val);
    if (setExternalSearchQuery) {
      setExternalSearchQuery(val);
    }
  };

  // Filter notices matching Android NoticesFragment.filterNoticesList()
  const displayNotices = useMemo(() => {
    const list = notices && notices.length > 0 ? notices : initialFilteredNotices;
    const query = localSearch.trim().toLowerCase();

    const filtered = list.filter((n) => {
      if (!n) return false;

      // 1. Tab Scope Filter
      if (activeTab === 1) {
        // "My Department"
        const noticeDept = String(n.department || "").trim().toUpperCase();
        const matchesDept =
          noticeDept &&
          noticeDept !== "ALL" &&
          (noticeDept === studentDept ||
            studentDept.includes(noticeDept) ||
            noticeDept.includes(studentDept));
        if (!matchesDept) return false;
      }

      // 2. Search Query
      if (!query) return true;

      const title = String(n.title || "").toLowerCase();
      const body = String(n.body || n.content || "").toLowerCase();
      const sender = String(n.sender || n.author || "").toLowerCase();
      const dept = String(n.department || "").toLowerCase();

      return (
        title.includes(query) ||
        body.includes(query) ||
        sender.includes(query) ||
        dept.includes(query)
      );
    });

    // 3. Chronological Sort: newest first
    return filtered.sort((a, b) => {
      const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
      const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [notices, initialFilteredNotices, activeTab, studentDept, localSearch]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <FiBell className="mr-2 text-emerald-600 dark:text-emerald-400" />
            <span>Noticeboard & University Announcements</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official circulars, exam schedules, class updates, holiday notifications, and academic circulars.
          </p>
        </div>
      </div>

      {/* Scope Tabs & Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Scope Tabs matching Android NoticesFragment */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(0)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 0
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All Announcements
            </button>
            <button
              onClick={() => setActiveTab(1)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 1
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>My Department</span>
              {studentDept && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-md bg-emerald-500/30 text-white">
                  {studentDept}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-white">{displayNotices.length}</strong> notices
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search by title, department, publisher, or keywords..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors"
          />
          {localSearch && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <FiX className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Notices Grid */}
      {displayNotices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          <FiFileText className="mx-auto text-3xl text-emerald-600 dark:text-emerald-400 mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No notices found.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {localSearch
              ? `No announcements match "${localSearch}". Try a different keyword.`
              : activeTab === 1
              ? `No notices specifically published for Department of ${studentDept} yet.`
              : "No general university notices published yet."}
          </p>
          {localSearch && (
            <button
              onClick={() => handleSearchChange("")}
              className="mt-3 px-3 py-1.5 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayNotices.map((n, i) => {
            const deptStr = String(n.department || "All Departments").toUpperCase();
            const isDeptSpecific = deptStr !== "ALL" && deptStr !== "ALL DEPARTMENTS";
            const dateStr = n.created_at
              ? new Date(n.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "";

            return (
              <div
                key={n.id || i}
                onClick={() => setSelectedNotice(n)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between cursor-pointer group hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-md border ${
                        isDeptSpecific
                          ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800/60"
                          : "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800/60"
                      }`}
                    >
                      {getDepartmentFullName(deptStr)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center shrink-0">
                      <FiClock className="mr-1 text-[11px]" />
                      {dateStr}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {n.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {n.body || n.content || ""}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center">
                    <FiUser className="mr-1 text-[10px]" />
                    {n.sender || n.author || "SUB Administration"}
                  </span>

                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform">
                    <span>View Notice</span>
                    <FiExternalLink className="ml-1 text-[10px]" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notice Detail Dialog matching Android DialogHelper.showModernNoticeDialog */}
      {selectedNotice && (
        <NoticeDetailModal
          notice={selectedNotice}
          isOpen={Boolean(selectedNotice)}
          onClose={() => setSelectedNotice(null)}
        />
      )}
    </div>
  );
};

export default StudentNotices;
