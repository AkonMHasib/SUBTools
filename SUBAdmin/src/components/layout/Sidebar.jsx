// Left Collapsible Sidebar Component
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiUsers,
  FiBook,
  FiCalendar,
  FiTruck,
  FiBriefcase,
  FiHome,
  FiLayers,
  FiFileText,
  FiImage,
  FiSettings,
  FiUser,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiAward,
  FiShield,
  FiClock,
  FiSearch,
  FiTrendingUp,
  FiExternalLink,
} from "react-icons/fi";
import { logoutUser } from "../../redux/slices/authSlice";
import { isSuperAdmin, isAdmin, hasBothStudentAndAdmin, setActivePortalMode } from "../../utils/permissionUtils";

export const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login", { replace: true });
  };

  const isSuperAdminUser = isSuperAdmin(user);
  const isAdminUser = isAdmin(user);

  const navItems = [
    { to: "/admin/dashboard", label: "Dashboard", icon: FiGrid },
    
    // Admin & Coordinator Pages
    ...(isAdminUser
      ? [
          { to: "/admin/users", label: "Users", icon: FiUsers },
          { to: "/admin/subjects", label: "Subjects", icon: FiBook },
          { to: "/admin/routines", label: "Class Routine", icon: FiCalendar },
          { to: "/admin/exam-routine", label: "Exam Routine", icon: FiCalendar },
          { to: "/admin/slides", label: "Slides", icon: FiLayers },
          { to: "/admin/faculty", label: "Faculty", icon: FiAward },
          { to: "/admin/transport", label: "Transport", icon: FiTruck },
          { to: "/admin/lost-found", label: "Lost & Found", icon: FiSearch },
          { to: "/admin/sublets", label: "Room Sublets", icon: FiHome },
          { to: "/admin/tuitions", label: "Tuition Posts", icon: FiBriefcase },
        ]
      : []),

    // Notice Management (All Staff)
    { to: "/admin/notices", label: "Notices", icon: FiFileText },
    
    // Super Admin System Pages
    ...(isSuperAdminUser
      ? [
          { to: "/admin/cover-pages", label: "Cover Pages", icon: FiLayers },
          { to: "/admin/holidays", label: "University Holidays", icon: FiCalendar },
          { to: "/admin/ads", label: "Ads Management", icon: FiImage },
          { to: "/admin/ads-analytics", label: "Ads Analytics", icon: FiTrendingUp },
          { to: "/admin/rbac", label: "Role & Access Control (RBAC)", icon: FiShield },
          { to: "/admin/activity-logs", label: "Activity Log", icon: FiClock },
          { to: "/admin/settings", label: "Settings", icon: FiSettings },
        ]
      : []),
    { to: "/admin/profile", label: "Profile", icon: FiUser },
  ];

  return (
    <>
      {/* Mobile Backdrop Drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 md:sticky md:top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col justify-between select-none ${
          collapsed ? "w-16" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Toggle Button for Desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute top-5 -right-3.5 w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 shadow-sm z-50 transition-colors"
        >
          {collapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* Brand Logo inside sidebar on mobile */}
        <div className="h-16 flex items-center px-4 md:hidden border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="SUBTools Logo"
              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
            />
            <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
              SUBTools
            </span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto mt-4 md:mt-0">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isComingSoon = item.badge === "Soon";

            if (isComingSoon) {
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-600 cursor-not-allowed`}
                >
                  <div className="flex items-center">
                    <Icon className={`text-base shrink-0 ${collapsed ? "mr-0" : "mr-3"}`} />
                    {!collapsed && <span className="fade-in">{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md">
                      Soon
                    </span>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-xl text-xs transition-all group ${
                    isActive
                      ? "bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border-l-3 border-indigo-600 dark:border-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-medium hover:text-slate-900 dark:hover:text-white"
                  }`
                }
              >
                <Icon
                  className={`text-base shrink-0 transition-transform group-hover:scale-105 ${collapsed ? "mr-0" : "mr-3"}`}
                />
                {!collapsed && <span className="fade-in">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer (Switch Portal & Logout) */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
          {hasBothStudentAndAdmin(user) && (
            <button
              onClick={() => {
                setActivePortalMode("student");
                navigate("/portal");
              }}
              className={`w-full flex items-center px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors cursor-pointer border border-blue-200/50 dark:border-blue-900/50 ${
                collapsed ? "justify-center" : ""
              }`}
              title="Switch to Student Portal"
            >
              <FiExternalLink className={`text-sm shrink-0 ${collapsed ? "mr-0" : "mr-2.5"}`} />
              {!collapsed && <span className="fade-in">Student Portal</span>}
            </button>
          )}

          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors cursor-pointer ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <FiLogOut className={`text-base shrink-0 ${collapsed ? "mr-0" : "mr-3"}`} />
            {!collapsed && <span className="fade-in">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
