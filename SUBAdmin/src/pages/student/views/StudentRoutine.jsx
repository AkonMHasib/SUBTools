import { useState, useMemo, useEffect } from "react";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUser,
  FiSearch,
  FiBookOpen,
  FiX,
  FiAlertCircle,
  FiSun,
} from "react-icons/fi";
import { isSameDay, filterPersonalizedRoutine } from "../utils/studentHelpers";
import { parseTimeToMinutes } from "./StudentHome";

const DAYS_OF_WEEK = [
  "All Days",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const StudentRoutine = ({
  routines = [],
  personalizedRoutines: propPersonalized,
  filteredRoutines: propFiltered,
  selectedDay = "Sunday",
  setSelectedDay,
  userDept = "CSE",
  user,
  enrolledCodes = [],
  completedCodes = [],
  holidays = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showHolidaysModal, setShowHolidaysModal] = useState(false);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  // Keep live time updated every 30 seconds matching Android timeHandler
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTimeMinutes(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Today's day name string (e.g. "Monday")
  const todayDayName = useMemo(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[new Date().getDay()];
  }, []);

  // Today's ISO date string "YYYY-MM-DD"
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Filter active university holidays
  const activeHolidays = useMemo(() => {
    if (!Array.isArray(holidays)) return [];
    return holidays
      .filter((h) => h && h.enabled !== false)
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }, [holidays]);

  // Check if today is a university holiday matching Android todayHoliday
  const todayHoliday = useMemo(() => {
    return (
      activeHolidays.find((h) => {
        const hDate = String(h.date || h.holiday_date || "").trim();
        return hDate === todayDateStr;
      }) || null
    );
  }, [activeHolidays, todayDateStr]);

  // Resolve completed codes (from props or user profile)
  const resolvedCompleted = useMemo(() => {
    if (Array.isArray(completedCodes) && completedCodes.length > 0) return completedCodes;
    const list = user?.completed_subjects || user?.completedSubjects;
    return Array.isArray(list) ? list : [];
  }, [completedCodes, user?.completed_subjects, user?.completedSubjects]);

  // Calculate base personalized routines matching Android RoutineViewModel
  const basePersonalized = useMemo(() => {
    if (Array.isArray(propPersonalized)) return propPersonalized;
    return filterPersonalizedRoutine(
      routines,
      userDept,
      user?.academicLevel || user?.term || user?.batch || "",
      user?.section || "",
      enrolledCodes,
      resolvedCompleted
    );
  }, [propPersonalized, routines, userDept, user?.academicLevel, user?.term, user?.batch, user?.section, enrolledCodes, resolvedCompleted]);

  // Calculate Ongoing Class or Next Upcoming Class Hero matching Android updateNextClassHeroBanner
  const classHeroState = useMemo(() => {
    if (todayHoliday) {
      return {
        type: "HOLIDAY",
        badge: "🎉 UNIVERSITY HOLIDAY",
        statusText: "View Calendar ➔",
        title: todayHoliday.name || todayHoliday.title || "Academic Holiday",
        timeRoom: todayHoliday.description || "Enjoy your university holiday!",
        subtitle: "Tap to view full academic holiday schedule",
        onClick: () => setShowHolidaysModal(true),
      };
    }

    // Collect today's personalized routines
    const todaysClasses = basePersonalized.filter((r) => isSameDay(todayDayName, r.day));
    if (todaysClasses.length === 0) return null;

    let ongoing = null;
    let nextUpcoming = null;
    let minUpcomingDiff = Infinity;

    for (const r of todaysClasses) {
      const startMins = parseTimeToMinutes(r.startTime || r.timeSlot || "");
      const endMins = parseTimeToMinutes(r.endTime || r.timeSlot || "");

      if (currentTimeMinutes >= startMins && currentTimeMinutes <= endMins) {
        ongoing = r;
        break;
      } else if (startMins > currentTimeMinutes) {
        const diff = startMins - currentTimeMinutes;
        if (diff < minUpcomingDiff) {
          minUpcomingDiff = diff;
          nextUpcoming = r;
        }
      }
    }

    if (ongoing) {
      return {
        type: "ONGOING",
        badge: "🟢 ONGOING CLASS",
        statusText: "In session now",
        title: `${ongoing.code ? `${ongoing.code} • ` : ""}${ongoing.subject}`,
        timeRoom: `⏰ ${ongoing.timeSlot}  •  📍 ${ongoing.classroom}`,
        subtitle: ongoing.teachers ? `Teacher: ${ongoing.teachers}` : "",
      };
    }

    if (nextUpcoming) {
      const hours = Math.floor(minUpcomingDiff / 60);
      const mins = minUpcomingDiff % 60;
      const timeDiffStr = hours > 0 ? `In ${hours}h ${mins}m` : `In ${mins} mins`;

      return {
        type: "UPCOMING",
        badge: "⚡ NEXT UPCOMING CLASS",
        statusText: timeDiffStr,
        title: `${nextUpcoming.code ? `${nextUpcoming.code} • ` : ""}${nextUpcoming.subject}`,
        timeRoom: `⏰ ${nextUpcoming.timeSlot}  •  📍 ${nextUpcoming.classroom}`,
        subtitle: nextUpcoming.teachers ? `Teacher: ${nextUpcoming.teachers}` : "",
      };
    }

    return null;
  }, [todayHoliday, basePersonalized, todayDayName, currentTimeMinutes]);

  // Filter by Day & Search query matching Android RoutineFragment.filterRoutinesList (UX-004)
  const displayedRoutines = useMemo(() => {
    let list = [...basePersonalized];

    // 1. Day filter
    if (selectedDay && selectedDay.toLowerCase() !== "all days") {
      list = list.filter((r) => isSameDay(selectedDay, r.day));
    }

    // 2. Search filter (UX-004)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const code = (r.code || "").toLowerCase();
        const subject = (r.subject || "").toLowerCase();
        const teachers = (r.teachers || "").toLowerCase();
        const classroom = (r.classroom || "").toLowerCase();
        return (
          code.includes(q) ||
          subject.includes(q) ||
          teachers.includes(q) ||
          classroom.includes(q)
        );
      });
    }

    // 3. Sort chronologically by start time ascending
    list.sort((a, b) => {
      const timeA = a.startTime || a.timeSlot || "";
      const timeB = b.startTime || b.timeSlot || "";
      return parseTimeToMinutes(timeA) - parseTimeToMinutes(timeB);
    });

    return list;
  }, [basePersonalized, selectedDay, searchQuery]);

  const isAllDaysSelected = selectedDay.toLowerCase() === "all days";

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar & Holiday Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <FiCalendar className="mr-2 text-indigo-600 dark:text-indigo-400" />
            <span>Class Routine ({userDept})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {enrolledCodes && enrolledCodes.length > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ Personalized schedule filtered by your {enrolledCodes.length} enrolled subjects
              </span>
            ) : (
              <span>Showing all department courses • Add subjects in Subject Manager to customize</span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto">
          {/* Search Bar matching Android UX-004 */}
          <div className="relative flex-1 md:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, title, teacher, room..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Academic Holidays Button matching Android showHolidaysBottomSheet */}
          <button
            onClick={() => setShowHolidaysModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shrink-0 cursor-pointer flex items-center space-x-1.5"
            title="View University Academic Holidays"
          >
            <span>🎉</span>
            <span className="hidden sm:inline">Holidays</span>
            {activeHolidays.length > 0 && (
              <span className="bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                {activeHolidays.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Live Hero Banner: Ongoing Class / Next Upcoming Class / Holiday (Matching Android updateNextClassHeroBanner) */}
      {classHeroState && (
        <div
          onClick={classHeroState.onClick}
          className={`rounded-3xl p-5 sm:p-6 shadow-sm border transition-all ${
            classHeroState.type === "HOLIDAY"
              ? "bg-gradient-to-r from-amber-50 via-amber-50/60 to-yellow-50 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800/70 cursor-pointer hover:shadow-md"
              : classHeroState.type === "ONGOING"
              ? "bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/30 border-emerald-300 dark:border-emerald-700/60"
              : "bg-gradient-to-r from-blue-50 via-white to-indigo-50/40 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800/60"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    classHeroState.type === "HOLIDAY"
                      ? "bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                      : classHeroState.type === "ONGOING"
                      ? "bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 animate-pulse"
                      : "bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700"
                  }`}
                >
                  {classHeroState.badge}
                </span>

                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {classHeroState.statusText}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {classHeroState.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                {classHeroState.timeRoom}
              </p>

              {classHeroState.subtitle && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {classHeroState.subtitle}
                </p>
              )}
            </div>

            {classHeroState.type === "HOLIDAY" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHolidaysModal(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0 shadow-xs cursor-pointer flex items-center space-x-1 self-start sm:self-auto"
              >
                <span>View Holiday Calendar</span>
                <span>➔</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Day selector pill buttons including 'All Days' matching Android daysOfWeek */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDay.toLowerCase() === day.toLowerCase();
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                {day === "All Days" ? "All Days" : day.substring(0, 3)}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-900 dark:text-white">{displayedRoutines.length}</span> class slot(s)
        </div>
      </div>

      {/* Routine Cards Grid */}
      {displayedRoutines.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          <FiCalendar className="mx-auto text-3xl text-indigo-600 dark:text-indigo-400 mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {todayHoliday && (isAllDaysSelected || isSameDay(selectedDay, todayDayName))
              ? `🎉 Holiday — No Classes Scheduled (${todayHoliday.name || todayHoliday.title})`
              : searchQuery
              ? `No classes matching "${searchQuery}"`
              : enrolledCodes.length === 0
              ? "No subjects registered yet."
              : `No classes scheduled for your registered subjects on ${selectedDay}.`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
              >
                Clear search filter
              </button>
            ) : todayHoliday ? (
              "Enjoy your official university holiday!"
            ) : enrolledCodes.length === 0 ? (
              "Please select your enrolled subjects in Subject Manager to view your personalized routine."
            ) : (
              "Check 'All Days' tab or inspect other weekdays."
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {displayedRoutines.map((r, i) => (
            <div
              key={r.id || i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all shadow-xs flex flex-col justify-between relative overflow-hidden group"
            >
              {/* Top Header: Code, Day Badge (if All Days), Time slot */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/90 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60 tracking-wider shrink-0">
                      {r.code || "COURSE"}
                    </span>
                    {/* Show Day Badge if All Days is selected matching Android setShowDayBadge */}
                    {isAllDaysSelected && r.day && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                        {r.day}
                      </span>
                    )}
                    {/* Active Ongoing Beacon */}
                    {isSameDay(todayDayName, r.day) &&
                      currentTimeMinutes >= parseTimeToMinutes(r.startTime || r.timeSlot || "") &&
                      currentTimeMinutes <= parseTimeToMinutes(r.endTime || r.timeSlot || "") && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Ongoing
                        </span>
                      )}
                  </div>

                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center shrink-0">
                    <FiClock className="mr-1 text-[11px] text-indigo-600 dark:text-indigo-400" />
                    <span>{r.timeSlot}</span>
                  </span>
                </div>

                {/* Subject Title without truncation */}
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition-colors">
                  {r.subject}
                </h4>

                {/* Room & Teacher details without truncation */}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <p className="flex items-start text-slate-700 dark:text-slate-300">
                    <FiMapPin className="mr-2 text-indigo-600 dark:text-indigo-400 text-xs shrink-0 mt-0.5" />
                    <span className="break-words font-medium">{r.classroom || "Room N/A"}</span>
                  </p>
                  <p className="flex items-start text-slate-700 dark:text-slate-300">
                    <FiUser className="mr-2 text-indigo-600 dark:text-indigo-400 text-xs shrink-0 mt-0.5" />
                    <span className="break-words">Teacher: <strong className="text-slate-900 dark:text-white font-semibold">{r.teachers || "TBA"}</strong></span>
                  </p>
                </div>
              </div>

              {/* Footer: Batch / Section & Override Note */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                {r.batch ? (
                  <span className="bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    Batch: {r.batch}
                  </span>
                ) : (
                  <span>General Batch</span>
                )}
                {r.section && (
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    Sec: {r.section}
                  </span>
                )}
                {r.isTemporary && (
                  <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                    RESCHEDULED
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Academic Holidays Modal Dialog matching Android showHolidaysBottomSheet */}
      {showHolidaysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
                  🎉
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    University Academic Holidays
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Official state and university schedule
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHolidaysModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <FiX className="text-base" />
              </button>
            </div>

            {/* Modal List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {activeHolidays.length === 0 ? (
                <div className="py-10 text-center text-slate-500 dark:text-slate-400 text-xs">
                  <FiAlertCircle className="mx-auto text-2xl text-amber-500 mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    No academic holidays recorded yet.
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Official holidays announced by administration will appear here.
                  </p>
                </div>
              ) : (
                activeHolidays.map((h, i) => {
                  const isToday = (h.date || h.holiday_date) === todayDateStr;
                  return (
                    <div
                      key={h.id || i}
                      className={`p-4 rounded-2xl border transition-all ${
                        isToday
                          ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/80 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              🎉 {h.name || h.title}
                            </h4>
                            {isToday && (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                                TODAY
                              </span>
                            )}
                          </div>
                          {h.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {h.description}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60 shrink-0">
                          📅 {h.date || h.holiday_date}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowHolidaysModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRoutine;
