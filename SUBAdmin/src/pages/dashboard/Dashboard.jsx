import { isSuperAdmin, isAdmin } from "../../utils/permissionUtils";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiUsers,
  FiShield,
  FiAlertOctagon,
  FiBookOpen,
  FiFileText,
  FiTruck,
  FiCalendar,
  FiActivity,
  FiRefreshCw,
  FiRadio,
  FiMousePointer,
  FiLoader,
} from "react-icons/fi";
import { clearDashboardCache } from "../../redux/slices/dashboardSlice";
import { useDashboardQuery } from "../../redux/api/adminApi";
import DeptDistributionChart from "../../components/charts/DeptDistributionChart";
import { normalizeDepartment } from "../../utils/academic";
import CacheManager from "../../services/CacheManager";

export const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { data: dashboardData, isLoading: loading, isError, refetch } = useDashboardQuery();
  const stats = dashboardData?.stats || {};
  const deptDistribution = dashboardData?.deptDistribution || [];

  const isSuperAdminUser = isSuperAdmin(user);
  const isAdminUser = isAdmin(user);
  const adminDept = user?.department; // E.g. 'CSE'
  const canResetCache = isSuperAdminUser;

  const handleHardCacheReset = async () => {
    CacheManager.clearAllAdminCaches();
    await dispatch(clearDashboardCache());
    toast.info("Dashboard cache cleared. Reloading fresh data from Supabase...");
    refetch();
  };

  const isDeptRestricted = !isSuperAdminUser && !!adminDept;
  const normalizedAdminDept = adminDept ? normalizeDepartment(adminDept) : "";
  const deptData = deptDistribution.find(
    (d) =>
      normalizeDepartment(d.name) === normalizedAdminDept ||
      d.name === adminDept ||
      (normalizedAdminDept && String(d.name || "").toUpperCase().startsWith(normalizedAdminDept)),
  );
  const deptStudents = deptData ? deptData.value : 0;

  const displayStats =
    isDeptRestricted && deptStudents > 0
      ? {
          ...stats,
          totalUsers: deptStudents,
        }
      : stats;

  const displayDeptDistribution = isDeptRestricted
    ? [{ name: adminDept, value: deptStudents }]
    : deptDistribution;

  // Essential Stats Cards mapping configurations filtered by role
  // Essential Stats Cards mapping configurations filtered by role
  const allStatCards = [
    {
      id: "online",
      label: "Live Users Online",
      value: Number(displayStats.onlineUsers) || 0,
      desc: "Currently active app sessions",
      icon: FiRadio,
      color:
        "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40",
      barColor: "bg-emerald-500",
      roles: ["super_admin", "admin"],
      isLive: true,
    },
    {
      id: "users",
      label: "Total Users",
      value: displayStats.totalUsers || 0,
      desc: isDeptRestricted ? `${adminDept} Student Registry` : "Students registered in app",
      icon: FiUsers,
      color:
        "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40",
      barColor: "bg-blue-500",
      roles: ["super_admin", "admin"],
      link: "/admin/users",
    },
    {
      id: "ads_clicks",
      label: "Ads Click Tracker",
      value: displayStats.totalAdClicks || 0,
      desc:
        (displayStats.appAdClicks || 0) > 0
          ? `Home: ${displayStats.homeAdClicks || 0} • App: ${displayStats.appAdClicks || 0} • Nav: ${displayStats.navAdClicks || 0}`
          : `Nav: ${displayStats.navAdClicks || 0} • Home: ${displayStats.homeAdClicks || 0}`,
      icon: FiMousePointer,
      color:
        "text-violet-600 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/40",
      barColor: "bg-violet-500",
      roles: ["super_admin", "admin"],
      link: "/admin/ads-analytics",
    },
    {
      id: "admins",
      label: "Admins & Staff",
      value: displayStats.totalAdmins || 0,
      desc: "System administrators",
      icon: FiShield,
      color:
        "text-teal-600 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/40",
      barColor: "bg-teal-500",
      roles: ["super_admin", "admin"],
      link: "/admin/rbac",
    },
    {
      id: "coverpages",
      label: "Cover Pages Generated",
      value: displayStats.totalCoverPagesGenerated || 0,
      desc: "PDF assignments & lab reports generated",
      icon: FiFileText,
      color:
        "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40",
      barColor: "bg-amber-500",
      roles: ["super_admin", "admin"],
      link: "/admin/cover-pages",
    },
    {
      id: "banned",
      label: "Banned Students",
      value: displayStats.bannedUsers || 0,
      desc: "Restricted student accounts",
      icon: FiAlertOctagon,
      color:
        "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40",
      barColor: "bg-rose-500",
      roles: ["super_admin", "admin"],
    },
    {
      id: "faculty",
      label: "Faculty Members",
      value: displayStats.totalFaculty || 0,
      desc: isDeptRestricted ? `${adminDept} Teaching Faculty` : "Registered teaching faculty",
      icon: FiUsers,
      color:
        "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/40",
      barColor: "bg-purple-500",
      roles: ["super_admin", "admin"],
      link: "/admin/faculty",
    },
    {
      id: "subjects",
      label: "Total Subjects",
      value: displayStats.totalSubjects || 0,
      desc: isDeptRestricted ? `${adminDept} Subject Catalog` : "Subjects mapped in database",
      icon: FiBookOpen,
      color:
        "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40",
      barColor: "bg-indigo-500",
      roles: ["super_admin", "admin"],
      link: "/admin/subjects",
    },
    {
      id: "buses",
      label: "Total Buses",
      value: displayStats.totalBuses || 0,
      desc: "Total transport buses in fleet",
      icon: FiTruck,
      color:
        "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/40",
      barColor: "bg-cyan-500",
      roles: ["super_admin", "admin"],
      link: "/admin/transport",
    },
    {
      id: "routines",
      label: "Class Routines",
      value: displayStats.totalClassRoutines || 0,
      desc: isDeptRestricted ? `${adminDept} Schedule Slots` : "Routine schedules added",
      icon: FiCalendar,
      color:
        "text-pink-600 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/40",
      barColor: "bg-pink-500",
      roles: ["super_admin", "admin"],
      link: "/admin/routines",
    },
  ];

  const statCards = allStatCards.filter((card) => {
    if (isSuperAdminUser) return true;
    if (isAdminUser && card.roles.includes("admin")) return true;
    return false;
  });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">
              Dashboard Overview
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
              Live System
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-medium">
            Monitor real-time system stats, active users online, and department analytics.
          </p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {canResetCache && (
            <button
              onClick={handleHardCacheReset}
              className="w-full sm:w-auto justify-center flex items-center space-x-2 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-98"
            >
              <FiRefreshCw className="text-sm text-indigo-600 dark:text-indigo-400" />
              <span>Refresh & Clear Cache</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="relative">
        {loading && (
          <div className="absolute -top-1 right-0 z-10 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <FiLoader className="animate-spin" size={14} />
            <span>Loading stats</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            const CardWrapper = card.link ? Link : "div";
            const wrapperProps = card.link ? { to: card.link } : {};
            return (
              <CardWrapper
                key={idx}
                {...wrapperProps}
                className={`relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex justify-between items-start group ${
                  card.link ? "cursor-pointer" : ""
                }`}
              >
                {/* Electric Campus Accent Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${card.barColor}`} />

                <div className="flex flex-col justify-between h-full pt-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {card.label}
                    </span>
                    {card.isLive && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-display mt-2 tracking-tight">
                    {(card.value || 0).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    {card.desc}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-xl ${card.color} transition-transform group-hover:scale-110 shrink-0 mt-1`}
                >
                  <Icon size={20} className="stroke-[2.2]" />
                </div>
              </CardWrapper>
            );
          })}
        </div>
      </div>

      {/* Department Distribution Section */}
      <div className="grid grid-cols-1 gap-6">
        {displayDeptDistribution.length > 0 ? (
          <DeptDistributionChart data={displayDeptDistribution} />
        ) : (
          <div className="min-h-64 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400">
            {loading ? (
              <FiLoader
                className="animate-spin"
                size={24}
                aria-label="Loading department statistics"
              />
            ) : isError ? (
              <span className="text-xs font-medium">Department statistics unavailable</span>
            ) : (
              <span className="text-xs font-medium">No department data yet</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
