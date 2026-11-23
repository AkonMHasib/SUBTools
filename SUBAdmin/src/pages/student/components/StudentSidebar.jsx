import { useNavigate } from "react-router-dom";
import {
  FiHome,
  FiBook,
  FiCalendar,
  FiClock,
  FiFileText,
  FiTruck,
  FiUsers,
  FiBookOpen,
  FiHeart,
  FiGlobe,
  FiMessageCircle,
  FiUser,
  FiShield,
  FiLogOut,
  FiX,
} from "react-icons/fi";
import { setActivePortalMode } from "../../../utils/permissionUtils";

export const StudentSidebar = ({
  activeSection,
  setActiveSection,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  userStats,
  isUserAdmin,
  hasDualRole,
  onLogout,
}) => {
  const navigate = useNavigate();

  const handleSwitchToAdmin = () => {
    setActivePortalMode("admin");
    navigate("/admin/dashboard");
  };
  // Categories matching SUBMobile drawer_menu.xml
  const navCategories = [
    {
      id: "academics",
      title: "Academics & Schedule",
      items: [
        { id: "subjects", label: "Subject Manager", icon: FiBook },
        { id: "routine", label: "Class Routine", icon: FiCalendar },
        { id: "exam", label: "Exam Routine", icon: FiClock },
        { id: "reminders", label: "Academic Reminders", icon: FiClock },
        { id: "cover_page", label: "Cover Page Generator", icon: FiFileText },
      ],
    },
    {
      id: "campus",
      title: "Campus & Notices",
      items: [
        { id: "notices", label: "Notices & Updates", icon: FiFileText },
        { id: "faculty", label: "Faculty Directory", icon: FiUsers },
        { id: "contributors", label: "Admins & Coordinators", icon: FiShield },
        { id: "transport", label: "Transport Fleet (Live GPS)", icon: FiTruck },
        { id: "slides", label: "Slides & Materials", icon: FiBookOpen },
      ],
    },
    {
      id: "services",
      title: "Student Services",
      items: [
        { id: "blood_donors", label: "Blood Donors", icon: FiHeart },
        { id: "community", label: "Campus Community (Lost/Rent)", icon: FiUsers },
      ],
    },
    {
      id: "support",
      title: "Profile & Support",
      items: [
        { id: "need_to_talk", label: "Need to Talk?", icon: FiHeart },
        { id: "links_contacts", label: "University Links & Helplines", icon: FiGlobe },
        { id: "about", label: "About SUBTools", icon: FiMessageCircle },
        { id: "profile", label: "My Profile", icon: FiUser },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 md:hidden"
        />
      )}

      {/* SIDEBAR NAVIGATION (Fixed on Portal matching modern app layouts) */}
      <aside
        className={`fixed top-0 md:top-16 bottom-0 left-0 z-50 md:z-30 w-72 md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between transition-transform duration-200 select-none overflow-y-auto shadow-2xl md:shadow-none ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        {/* Mobile Header with Close Button */}
        <div className="flex md:hidden items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="SUBTools"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white block leading-none">
                SUB<span className="text-blue-600 dark:text-blue-400">Tools</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Navigation Menu</span>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="p-3 space-y-4">
          {/* Always Visible Home Destination */}
          <button
            onClick={() => {
              setActiveSection("home");
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeSection === "home"
              ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <FiHome className={`text-base mr-3 ${activeSection === "home" ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
            <span>Home</span>
          </button>

          {/* Admin Console Switcher for Authorized Dual-Role Users */}
          {hasDualRole && (
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                handleSwitchToAdmin();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer shadow-xs"
              title="Switch into Admin Console"
            >
              <span className="flex items-center">
                <FiShield className="text-base mr-3 text-blue-600 dark:text-blue-400" />
                <span>Admin Console</span>
              </span>
              <span className="text-[10px] bg-blue-600 text-white font-semibold px-2 py-0.5 rounded-md">
                Admin
              </span>
            </button>
          )}

          {/* Grouped Categories from drawer_menu.xml */}
          {navCategories.map((cat) => (
            <div key={cat.id} className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{cat.title}</span>
              </div>

              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                      }`}
                  >
                    <Icon
                      className={`text-sm mr-2.5 shrink-0 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                        }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>



        {/* Admin Console Switcher for Dual-Role Admin + Student */}
        {isUserAdmin && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSwitchToAdmin}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-800/60 transition-colors cursor-pointer"
            >
              <FiShield className="text-sm" />
              <span>Admin Console</span>
            </button>
          </div>
        )}

        {/* Sidebar Footer with Live Counts matching Android drawer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center space-y-2.5">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 transition-colors cursor-pointer"
            >
              <FiLogOut className="text-sm" />
              <span>Sign Out</span>
            </button>
          )}

          {userStats && (userStats.totalUsers > 0 || userStats.onlineUsers > 0) && (
            <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 py-1.5 px-2 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              <span className="font-medium text-slate-700 dark:text-slate-300">👥 {userStats.totalUsers} registered</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1 inline-block" />
                {userStats.onlineUsers} online
              </span>
            </div>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
            SUBTools v3.0 By Akon M Hasib
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
            State University of Bangladesh (SUB)
          </p>
        </div>
      </aside>
    </>
  );
};

export default StudentSidebar;
