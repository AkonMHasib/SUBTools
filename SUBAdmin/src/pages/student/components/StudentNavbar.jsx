import { useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiShield,
  FiSun,
  FiMoon,
  FiLogOut,
  FiUsers,
  FiExternalLink,
} from "react-icons/fi";
import { setActivePortalMode } from "../../../utils/permissionUtils";
import { getDepartmentFullName } from "../../../utils/academic";

export const StudentNavbar = ({
  user,
  userDept,
  isUserAdmin,
  userStats,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  theme,
  toggleTheme,
  onLogout,
}) => {
  const navigate = useNavigate();

  const handleSwitchToAdmin = () => {
    setActivePortalMode("admin");
    navigate("/admin/dashboard");
  };

  const fullDeptName = getDepartmentFullName(userDept) || userDept || "All Departments";

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 h-16 shrink-0 flex items-center justify-between w-full shadow-xs transition-colors">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle navigation"
        >
          {mobileSidebarOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
        </button>

        <div className={`items-center space-x-2.5 ${mobileSidebarOpen ? "flex" : "hidden md:flex"}`}>
          <img
            src="/logo.png"
            alt="SUBTools"
            className="w-9 h-9 object-contain shrink-0"
          />
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
              SUB<span className="text-blue-600 dark:text-blue-500">Tools</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block leading-none mt-1 truncate max-w-[170px] sm:max-w-xs">
              Student Portal • {fullDeptName}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Web Beta Version Notice with Facebook Group Link */}
      <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-800 dark:text-amber-300">
        <span className="font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500 text-white text-[9px] tracking-wide">
          Beta
        </span>
        <span className="truncate max-w-xs xl:max-w-md">
          This is a beta version in web, so if facing any problem, post in our
        </span>
        <a
          href="https://www.facebook.com/groups/app.subtools"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200 inline-flex items-center gap-1 shrink-0"
        >
          <span>Facebook Group</span>
          <FiExternalLink className="text-[10px]" />
        </a>
      </div>

      {/* Right: Quick Actions & Profile Header */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Switch to Admin Console Button (Only for dual-role Admin + Student, NEVER for Super Admin) */}
        {isUserAdmin && (
          <button
            onClick={handleSwitchToAdmin}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
            title="Switch to Admin Console"
          >
            <FiShield className="text-xs" />
            <span>Admin Console</span>
          </button>
        )}

        {/* User Identification Tag (Name only + status dot) */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px] sm:max-w-xs">
            {user?.name || user?.email || "Student"}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {theme === "dark" ? <FiSun className="text-base text-yellow-400" /> : <FiMoon className="text-base text-slate-600" />}
        </button>
      </div>
    </header>
  );
};

export default StudentNavbar;
