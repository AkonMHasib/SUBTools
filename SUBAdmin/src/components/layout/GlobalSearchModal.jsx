// Interactive Global Search & Command Palette Modal
import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiUser,
  FiBookOpen,
  FiCalendar,
  FiTruck,
  FiX,
  FiArrowRight,
  FiCornerDownLeft,
  FiBriefcase,
} from "react-icons/fi";
import { normalizeDept } from "../../utils/academic";
import { fetchUsers } from "../../redux/slices/userSlice";
import { fetchSubjects } from "../../redux/slices/subjectSlice";
import { fetchRoutines } from "../../redux/slices/routineSlice";
import { fetchFaculty } from "../../redux/slices/facultySlice";
import { fetchBusesAndRoutes } from "../../redux/slices/transportSlice";

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Redux data sources
  const users = useSelector((state) => state.users?.list || []);
  const subjects = useSelector((state) => state.subjects?.list || []);
  const routines = useSelector((state) => state.routines?.list || []);
  const faculty = useSelector((state) => state.faculty?.list || []);
  const buses = useSelector((state) => state.transport?.buses || []);

  // Fetch data on first open if empty
  useEffect(() => {
    if (isOpen) {
      if (users.length === 0) dispatch(fetchUsers());
      if (subjects.length === 0) dispatch(fetchSubjects());
      if (routines.length === 0) dispatch(fetchRoutines());
      if (faculty.length === 0) dispatch(fetchFaculty());
      if (buses.length === 0) dispatch(fetchBusesAndRoutes());
      
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen, dispatch, users.length, subjects.length, routines.length, faculty.length, buses.length]);

  // Compute search results across all categories
  const searchResults = [];
  const qLower = query.trim().toLowerCase();

  if (qLower.length >= 1) {
    // 1. Match Users / Students
    users.forEach((user) => {
      const nameMatch = (user.name || "").toLowerCase().includes(qLower);
      const idMatch = (user.studentId || "").toLowerCase().includes(qLower);
      const emailMatch = (user.email || "").toLowerCase().includes(qLower);
      const deptMatch = (user.department || "").toLowerCase().includes(qLower);

      if (nameMatch || idMatch || emailMatch || deptMatch) {
        searchResults.push({
          type: "User",
          title: user.name || "Student",
          subtitle: `${user.studentId || "N/A"} • ${normalizeDept(user.department) || "Dept"} • ${user.email || ""}`,
          path: "/admin/users",
          icon: FiUser,
          color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40",
          tag: user.role === "student" ? "Student" : "Admin",
          badgeColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
        });
      }
    });

    // 2. Match Faculty
    faculty.forEach((fac) => {
      const nameMatch = (fac.name || "").toLowerCase().includes(qLower);
      const codeMatch = (fac.initials || fac.code || "").toLowerCase().includes(qLower);
      const deptMatch = (fac.department || "").toLowerCase().includes(qLower);
      const emailMatch = (fac.email || "").toLowerCase().includes(qLower);

      if (nameMatch || codeMatch || deptMatch || emailMatch) {
        searchResults.push({
          type: "Faculty",
          title: fac.name || "Faculty Member",
          subtitle: `${fac.designation || "Teacher"} • ${normalizeDept(fac.department) || "Dept"} • ${fac.initials || ""}`,
          path: "/admin/faculty",
          icon: FiBriefcase,
          color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40",
          tag: "Faculty",
          badgeColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
        });
      }
    });

    // 3. Match Subjects
    subjects.forEach((subj) => {
      const nameMatch = (subj.name || subj.title || "").toLowerCase().includes(qLower);
      const codeMatch = (subj.code || "").toLowerCase().includes(qLower);
      const deptMatch = (subj.department || "").toLowerCase().includes(qLower);

      if (nameMatch || codeMatch || deptMatch) {
        searchResults.push({
          type: "Subject",
          title: `${subj.code || ""} - ${subj.name || subj.title || "Course"}`,
          subtitle: `Dept: ${normalizeDept(subj.department)} • Credits: ${subj.credit || subj.credits || 3}`,
          path: "/admin/subjects",
          icon: FiBookOpen,
          color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40",
          tag: "Subject",
          badgeColor: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
        });
      }
    });

    // 4. Match Routines
    routines.forEach((rot) => {
      const subjMatch = (rot.subject || "").toLowerCase().includes(qLower);
      const codeMatch = (rot.code || "").toLowerCase().includes(qLower);
      const teacherMatch = Array.isArray(rot.teachers)
        ? rot.teachers.some((t) => (t || "").toLowerCase().includes(qLower))
        : (rot.teachers || "").toLowerCase().includes(qLower);
      const roomMatch = (rot.classroom || rot.room || "").toLowerCase().includes(qLower);

      if (subjMatch || codeMatch || teacherMatch || roomMatch) {
        searchResults.push({
          type: "Routine",
          title: `${rot.code || ""} ${rot.subject || "Lecture"}`,
          subtitle: `${rot.day || "Day"} • ${rot.startTime || ""} - ${rot.endTime || ""} • Room ${rot.classroom || "N/A"}`,
          path: "/admin/routines",
          icon: FiCalendar,
          color: "text-pink-500 bg-pink-50 dark:bg-pink-950/40",
          tag: rot.isTemporary ? "Reschedule" : "Routine",
          badgeColor: rot.isTemporary
            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
            : "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
        });
      }
    });

    // 5. Match Transport Buses
    buses.forEach((bus) => {
      const nameMatch = (bus.name || "").toLowerCase().includes(qLower);
      const numberMatch = (bus.number || bus.plate || "").toLowerCase().includes(qLower);
      const driverMatch = (bus.driverName || "").toLowerCase().includes(qLower);

      if (nameMatch || numberMatch || driverMatch) {
        searchResults.push({
          type: "Bus",
          title: `${bus.name} (${bus.number})`,
          subtitle: `Driver: ${bus.driverName || "N/A"} • ${bus.driverPhone || "No Phone"}`,
          path: "/admin/transport",
          icon: FiTruck,
          color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40",
          tag: "Transport",
          badgeColor: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
        });
      }
    });
  }

  const results = searchResults.slice(0, 15);

  const handleSelectResult = (item) => {
    onClose();
    navigate(item.path);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 md:pt-24 px-4 fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] slide-in-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <FiSearch className="text-slate-400 dark:text-slate-500 text-lg mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search students, faculty, routines, subjects, or buses..."
            className="w-full bg-transparent border-none text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-colors mr-2 cursor-pointer"
            >
              <FiX className="text-sm" />
            </button>
          )}
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            ESC
          </span>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
          {query.trim().length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <FiSearch className="mx-auto text-3xl opacity-40 animate-pulse" />
              <p className="text-xs font-semibold">Type to instantly search across SUBTools</p>
              <p className="text-[11px] opacity-70">
                Search student IDs, teacher names, course codes, routine rooms, or bus routes.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <FiX className="mx-auto text-3xl opacity-40" />
              <p className="text-xs font-semibold">No records found for "{query}"</p>
              <p className="text-[11px] opacity-70">Try searching with a different course code, ID, or keyword.</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 pl-2.5"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${item.color}`}>
                      <Icon className="text-base" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.title}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${item.badgeColor}`}>
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-slate-400 dark:text-slate-500 text-xs ml-3 shrink-0">
                    <span className="text-[10px] font-semibold mr-1.5 hidden sm:inline opacity-60">Go</span>
                    <FiArrowRight />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[9px] mr-1">↑</span>
              <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[9px] mr-1.5">↓</span>
              Navigate
            </span>
            <span className="flex items-center">
              <FiCornerDownLeft className="mr-1 text-xs" /> Select
            </span>
          </div>
          <div>
            Showing {results.length} result(s)
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
