// Cover Pages Analytics Page Component
import { useEffect, useState } from "react";
import { coverPagesApi } from "../../api/coverPagesApi";
import { toast } from "react-toastify";
import {
  FiGrid,
  FiBook,
  FiAward,
  FiUsers,
  FiSearch,
  FiRefreshCw,
} from "react-icons/fi";
import { DEPARTMENTS, getDepartmentName } from "../../utils/academic";

export const CoverPages = () => {
  // States
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Optimized Analytics Filters State (Removed unnecessary term filter)
  const [filters, setFilters] = useState({
    userId: "",
    department: "All",
    subject: "",
  });

  const fetchStatsData = async (activeFilters = filters) => {
    setLoading(true);
    try {
      const formattedFilters = { ...activeFilters };
      if (formattedFilters.department === "All") delete formattedFilters.department;
      if (!formattedFilters.userId.trim()) delete formattedFilters.userId;
      if (!formattedFilters.subject.trim()) delete formattedFilters.subject;

      const data = await coverPagesApi.getStats(formattedFilters);
      setStats(data);
    } catch (error) {
      toast.error("Failed to load cover page statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsData();
  }, []);

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    fetchStatsData(updated);
  };

  const handleReset = () => {
    const cleared = { userId: "", department: "All", subject: "" };
    setFilters(cleared);
    fetchStatsData(cleared);
  };

  // Recent 10 Generation Logs
  const recent10Logs = stats?.recentLogs ? stats.recentLogs.slice(0, 10) : [];

  // SVG Chart rendering data
  const deptLabels = stats?.byDepartment ? Object.keys(stats.byDepartment) : [];
  const deptCounts = stats?.byDepartment ? Object.values(stats.byDepartment) : [];

  return (
    <div className="space-y-6 fade-in p-2 sm:p-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-display">
            Cover Page Analytics &amp; Generation Logs
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Monitor generated cover sheet statistics consumed by students in SUBTools.
          </p>
        </div>
        <button
          onClick={() => fetchStatsData()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} size={13} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Generated */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <FiGrid size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Generated</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {stats?.totalCount ?? 0}
            </h3>
          </div>
        </div>

        {/* Unique Users */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <FiUsers size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unique Users</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {stats?.byUser ? Object.keys(stats.byUser).length : 0}
            </h3>
          </div>
        </div>

        {/* Unique Subjects */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <FiBook size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Subjects</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {stats?.bySubject ? Object.keys(stats.bySubject).length : 0}
            </h3>
          </div>
        </div>

        {/* Unique Departments */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <FiAward size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Departments</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {stats?.byDepartment ? Object.keys(stats.byDepartment).length : 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Filter Analytics
          </h3>
          <button
            onClick={handleReset}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Department */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Department</label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Search */}
          <div className="flex flex-col relative">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Subject (Code/Name)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. CSE-1102"
                value={filters.subject}
                onChange={(e) => handleFilterChange("subject", e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
              />
              <FiSearch className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            </div>
          </div>

          {/* User ID / Student ID */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Student / User ID</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. UG02-43-20-011"
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
              />
              <FiSearch className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* Department Volume Linear Progress Bar Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Department Volumes
          </h3>
          <p className="text-[10px] text-slate-400">Total cover page creations by department.</p>
        </div>

        <div className="space-y-3">
          {deptLabels.length > 0 ? (
            (() => {
              const total = deptCounts.reduce((a, b) => a + b, 0);
              const maxVal = Math.max(...deptCounts, 1);
              const colors = [
                "from-blue-600 to-blue-500",
                "from-purple-600 to-purple-500",
                "from-amber-500 to-amber-400",
                "from-emerald-500 to-emerald-400",
                "from-pink-500 to-pink-400",
                "from-indigo-600 to-indigo-500",
              ];

              return deptLabels.map((lbl, idx) => {
                const count = deptCounts[idx];
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                const barWidthPercent = total > 0 ? (count / maxVal) * 100 : 0;
                const barColor = colors[idx % colors.length];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300 font-bold" title={getDepartmentName(lbl)}>
                        {getDepartmentName(lbl)}
                      </span>
                      <div className="text-[11px] font-mono text-slate-500 space-x-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{count} sheets</span>
                        <span className="text-slate-400">({percentage}%)</span>
                      </div>
                    </div>

                    {/* Linear Bar */}
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${barWidthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-slate-400">
              No department data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Cover Page Generation Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-0.5">
              Recent Generation Logs
            </h3>
            <p className="text-[10px] text-slate-400">
              Live audit trail of cover pages printed/generated by students.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
            {stats?.recentLogs?.length || 0} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Student / User ID</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3">Exam Term</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
              {recent10Logs.length > 0 ? (
                recent10Logs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {log.userId || "Student"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                        {log.department || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-bold">
                      {log.subject || "Course Sheet"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        String(log.term || "").toLowerCase().includes("final")
                          ? "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
                          : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                      }`}>
                        {log.term || "Term Exam"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-[10px] text-slate-400 font-normal">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("en-BD", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Recently"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No recent cover page generation logs recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CoverPages;
