import { isSuperAdmin, hasBothStudentAndAdmin, setActivePortalMode } from "../../utils/permissionUtils";
import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FiSun, FiMoon, FiSearch, FiLogOut, FiUser, FiSettings, FiMenu, FiCommand, FiExternalLink } from "react-icons/fi";
import { logoutUser } from "../../redux/slices/authSlice";
import { setSearchQuery as setUserSearch } from "../../redux/slices/userSlice";
import { setSearchQuery as setSubjectSearch } from "../../redux/slices/subjectSlice";
import { setSearchQuery as setRoutineSearch } from "../../redux/slices/routineSlice";
import { setSearchQuery as setFacultySearch } from "../../redux/slices/facultySlice";
import { setSearchQuery as setTransportSearch } from "../../redux/slices/transportSlice";
import useTheme from "../../hooks/useTheme";
import GlobalSearchModal from "./GlobalSearchModal";
import NotificationCenter from "./NotificationCenter";

export const Navbar = ({ onMenuClick, mobileMenuOpen = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { theme, toggleTheme } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login", { replace: true });
  };

  // Keyboard shortcut Ctrl+K / Cmd+K for global search modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentSearch = useSelector((state) => {
    const p = location.pathname;
    if (p.includes("/users")) return state.users?.searchQuery || "";
    if (p.includes("/subjects")) return state.subjects?.searchQuery || "";
    if (p.includes("/routines")) return state.routines?.searchQuery || "";
    if (p.includes("/faculty")) return state.faculty?.searchQuery || "";
    if (p.includes("/transport")) return state.transport?.searchQuery || "";
    return "";
  });

  const handleSearchChange = (e) => {
    const val = e.target.value;
    const p = location.pathname;
    if (p.includes("/users")) dispatch(setUserSearch(val));
    else if (p.includes("/subjects")) dispatch(setSubjectSearch(val));
    else if (p.includes("/routines")) dispatch(setRoutineSearch(val));
    else if (p.includes("/faculty")) dispatch(setFacultySearch(val));
    else if (p.includes("/transport")) dispatch(setTransportSearch(val));
    else {
      dispatch(setUserSearch(val));
      dispatch(setSubjectSearch(val));
      dispatch(setRoutineSearch(val));
      dispatch(setFacultySearch(val));
      dispatch(setTransportSearch(val));
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-3 sm:px-6 h-16 flex items-center justify-between w-full shadow-xs">
        {/* Mobile Burger and Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-1 sm:-ml-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-hidden md:hidden transition-colors cursor-pointer"
            aria-label="Toggle Sidebar"
          >
            <FiMenu className="text-xl" />
          </button>
          <Link
            to="/admin/dashboard"
            className={`items-center space-x-2 sm:space-x-2.5 ${mobileMenuOpen ? "flex" : "hidden md:flex"}`}
          >
            <img
              src="/logo.png"
              alt="SUBTools Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
            />
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 sm:gap-2">
              SUBTools
              <span className="hidden sm:inline-block text-indigo-600 dark:text-indigo-400 font-semibold text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60">
                Admin
              </span>
            </span>
          </Link>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center max-w-md w-full mx-8">
          <div className="relative w-full text-slate-900 dark:text-slate-100 flex items-center">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-slate-400" />
            <input
              type="search"
              value={currentSearch}
              onChange={handleSearchChange}
              onFocus={() => setSearchModalOpen(true)}
              placeholder="Search users, routines, courses... (Ctrl+K)"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-14 py-2 text-sm transition-all placeholder:text-slate-400 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={() => setSearchModalOpen(true)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              <FiCommand className="text-[10px]" />
              <span>K</span>
            </button>
          </div>
        </div>

        {/* Nav Actions */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Mobile Search Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="p-2 md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Open Interactive Search"
          >
            <FiSearch className="text-lg" />
          </button>

          {/* Switch to Student Portal Quick Button (Only for dual-role Admin + Student, NEVER for Super Admin) */}
          {hasBothStudentAndAdmin(user) && (
            <button
              onClick={() => {
                setActivePortalMode("student");
                navigate("/portal");
              }}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
              title="Switch to Student Portal"
            >
              <FiExternalLink className="text-xs" />
              <span>Student Portal</span>
            </button>
          )}

          {/* Notification Center Dropdown */}
          <NotificationCenter />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? (
              <FiMoon className="text-lg" />
            ) : (
              <FiSun className="text-lg text-amber-500" />
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center space-x-2 focus:outline-hidden p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <img
                src={
                  user?.photo_url ||
                  user?.photoURL ||
                  (isSuperAdmin(user)
                    ? "/Profile.jpg"
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "Admin")}&background=4f46e5&color=fff&size=80`)
                }
                alt={user?.name || "User Avatar"}
                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
              <span className="hidden md:block text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                {user?.name || "Administrator"}
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg z-50 py-1.5 fade-in">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user?.name || "Super Admin"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {user?.email || "akonmhasib@gmail.com"}
                  </p>
                </div>

                <div className="py-1">
                  {hasBothStudentAndAdmin(user) && (
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setActivePortalMode("student");
                        navigate("/portal");
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold cursor-pointer"
                    >
                      <FiExternalLink className="mr-2" /> Switch to Student Portal
                    </button>
                  )}
                  <Link
                    to="/admin/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FiUser className="mr-2" /> My Profile
                  </Link>
                  <Link
                    to="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FiSettings className="mr-2" /> Settings
                  </Link>
                </div>


                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                  >
                    <FiLogOut className="mr-2" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal Command Palette */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
