import { useState, useEffect, useMemo } from "react";
import {
  FiCalendar,
  FiTruck,
  FiFileText,
  FiBookOpen,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

// Multi-format date parsing matching Android HomeFragment.parseExamDate
export const parseExamDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string" || !dateStr.trim()) return null;
  const clean = dateStr.trim();

  // 1. Try standard ISO or standard Date.parse
  const direct = new Date(clean);
  if (!isNaN(direct.getTime()) && clean.length >= 8 && !clean.includes("/")) {
    return new Date(direct.getFullYear(), direct.getMonth(), direct.getDate());
  }

  // 2. dd/MM/yyyy or dd-MM-yyyy or d/M/yyyy
  const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. yyyy/MM/dd or yyyy-MM-dd
  const ymd = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
};

// Friendly relative date label matching Android HomeFragment.getFriendlyDateLabel
export const getFriendlyDateLabel = (dateObj) => {
  if (!dateObj) return "";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const examTimeMs = dateObj.getTime();
  const diffDays = Math.round((examTimeMs - todayStart) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;

  return dateObj.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Parse start time to minutes for chronological sorting matching AcademicHelper.parseTimeToMinutes
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return 99999;
  try {
    const full = timeStr.trim().toUpperCase();
    let startPart = full;
    if (full.includes("-") || full.includes("–")) {
      startPart = full.split(/[-–]/)[0].trim();
    }

    let isPm = startPart.includes("PM");
    let isAm = startPart.includes("AM");

    // Inherit PM from end range if not specified on start part (e.g. 1:00 - 2:30 PM)
    if (!isPm && !isAm && full.includes("PM")) {
      const matchHour = startPart.match(/^(\d{1,2})/);
      if (matchHour) {
        const h = parseInt(matchHour[1], 10);
        if (h >= 1 && h <= 7) isPm = true;
        else if (h >= 8 && h <= 11) isAm = true;
      }
    }

    const clean = startPart.replace(/AM|PM/g, "").trim();
    const parts = clean.split(":");
    if (parts.length >= 2) {
      let hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      if (isPm && hour < 12) hour += 12;
      else if (isAm && hour === 12) hour = 0;
      return hour * 60 + minute;
    }
    return 99999;
  } catch {
    return 99999;
  }
};

// Parse end time to minutes for active session detection
export const parseEndTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return -1;
  try {
    const full = timeStr.trim().toUpperCase();
    let endPart = full;
    if (full.includes("-") || full.includes("–")) {
      const parts = full.split(/[-–]/);
      endPart = (parts[1] || parts[0]).trim();
    }

    let isPm = endPart.includes("PM");
    let isAm = endPart.includes("AM");

    if (!isPm && !isAm && full.includes("PM")) {
      const matchHour = endPart.match(/^(\d{1,2})/);
      if (matchHour) {
        const h = parseInt(matchHour[1], 10);
        if (h >= 1 && h <= 7) isPm = true;
        else if (h >= 8 && h <= 11) isAm = true;
      }
    }

    const clean = endPart.replace(/AM|PM/g, "").trim();
    const parts = clean.split(":");
    if (parts.length >= 2) {
      let hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      if (isPm && hour < 12) hour += 12;
      else if (isAm && hour === 12) hour = 0;
      return hour * 60 + minute;
    }
    return -1;
  } catch {
    return -1;
  }
};

// Time comparison matching Android HomeFragment.isClassPassed
export const isClassPassed = (endTimeStr, timeSlot, now = new Date()) => {
  let endMin = parseEndTimeToMinutes(endTimeStr || timeSlot);
  if (endMin === -1) {
    endMin = parseEndTimeToMinutes(timeSlot);
  }
  if (endMin === -1) return false;

  const currentMin = now.getHours() * 60 + now.getMinutes();
  return currentMin >= endMin;
};

// Check if a class session is currently active based on real-time clock
export const isClassActiveNow = (timeSlot, now = new Date()) => {
  if (!timeSlot) return false;
  try {
    const startMin = parseTimeToMinutes(timeSlot);
    const endMin = parseEndTimeToMinutes(timeSlot);
    if (startMin === 99999 || endMin === -1) return false;
    const curMin = now.getHours() * 60 + now.getMinutes();
    return curMin >= startMin && curMin < endMin;
  } catch {
    return false;
  }
};

export const StudentHome = ({
  filteredRoutines,
  selectedDay,
  buses,
  filteredNotices,
  slides,
  examRoutines,
  userDept,
  enrolledCodes,
  completedCodes = [],
  homeAd,
  onAdClick,
  onNavigate,
}) => {
  // Real-time clock ticker for dynamic active session updates & passed class eviction
  const [currentClock, setCurrentClock] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(new Date());
    }, 30000); // 30-second live tick
    return () => clearInterval(timer);
  }, []);

  // Check if selectedDay is actually today
  const todayDayName = useMemo(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[currentClock.getDay()];
  }, [currentClock]);
  const isSelectedDayToday = selectedDay?.toLowerCase() === todayDayName.toLowerCase();

  // Filter today's classes: hide passed classes if selected day is today, and sort chronologically ascending
  // Matching Android HomeFragment.refreshTodayClassesList (isClassPassed + parseTimeToMinutes)
  const activeTodayClasses = useMemo(() => {
    if (!filteredRoutines || filteredRoutines.length === 0) return [];

    let list = [...filteredRoutines];
    if (isSelectedDayToday) {
      list = list.filter((r) => {
        const endTime = r.endTime || r.end_time || r.raw?.endTime || r.raw?.end_time || "";
        const timeSlot = r.timeSlot || r.slot || "";
        return !isClassPassed(endTime, timeSlot, currentClock);
      });
    }

    list.sort((a, b) => {
      const timeA = a.startTime || a.timeSlot || "";
      const timeB = b.startTime || b.timeSlot || "";
      return parseTimeToMinutes(timeA) - parseTimeToMinutes(timeB);
    });

    return list;
  }, [filteredRoutines, isSelectedDayToday, currentClock]);

  // Calculate upcoming exam / CT / Quiz matching Android HomeFragment.setupExamHeroCard
  const upcomingHeroItem = useMemo(() => {
    if (!examRoutines || examRoutines.length === 0) return null;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const currentDept = (userDept || "ALL").trim().toUpperCase();
    const enrolledUpper = (enrolledCodes || []).map((c) => String(c).toUpperCase());
    const completedSet = new Set((completedCodes || []).map((c) => String(c).toUpperCase().replace(/[^A-Z0-9]/g, "")));

    const validItems = [];

    for (const r of examRoutines) {
      const data = r.data || r;
      const dept = String(data.department || r.department || "").trim().toUpperCase();
      const courseCode = String(data.courseCode || data.course_code || data.code || r.code || "").trim();
      const cleanCode = courseCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

      // Skip if course is already completed / passed
      if (cleanCode && completedSet.has(cleanCode)) {
        continue;
      }

      const courseTitle = data.courseTitle || data.course_title || data.title || r.title || "Course Exam";
      const examDateStr = data.examDate || data.exam_date || data.date || r.date || "";
      const examTime = data.examTime || data.exam_time || data.time || r.time || "TBA";
      const room = data.room || r.room || "TBA";
      const examType = data.examType || data.exam_type || data.type || r.type || "Exam";

      const deptMatch = !dept || dept === "ALL" || dept === "GENERAL" || currentDept === "ALL" || currentDept === "GENERAL" || dept === currentDept;
      const subjectMatch =
        enrolledUpper.length > 0 &&
        cleanCode &&
        enrolledUpper.some((c) => {
          const norm = String(c).toUpperCase().replace(/[^A-Z0-9]/g, "");
          return norm === cleanCode || cleanCode.includes(norm) || norm.includes(cleanCode);
        });

      if (deptMatch || subjectMatch) {
        const parsed = parseExamDate(examDateStr);
        if (parsed && parsed.getTime() >= todayStart) {
          validItems.push({
            courseCode,
            courseTitle,
            examDate: examDateStr,
            examTime,
            room,
            examType,
            dateObj: parsed,
            timeMs: parsed.getTime(),
          });
        }
      }
    }

    if (validItems.length === 0) return null;
    validItems.sort((a, b) => a.timeMs - b.timeMs);
    return validItems[0];
  }, [examRoutines, userDept, enrolledCodes, completedCodes]);

  return (
    <div className="space-y-6">
      {/* 2. Warning Card: No Subjects Added (Matching Android card_no_subjects_warning) */}
      {(!enrolledCodes || enrolledCodes.length === 0) && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 text-lg">
              <FiAlertCircle className="text-xl" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-700 dark:text-red-300">
                No Subjects Enrolled
              </h4>
              <p className="text-xs text-red-600/90 dark:text-red-400/90 mt-0.5 max-w-xl">
                Add your registered subjects in Subject Manager to view your personalized daily class schedule and exam routine.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("subjects")}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-red-900/80 text-red-700 dark:text-red-200 border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-800 transition-colors shrink-0 cursor-pointer shadow-xs flex items-center space-x-1 self-start sm:self-auto"
          >
            <span>Add Subjects Now</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Dynamic Upcoming CT / Quiz vs Exam Hero Card (Matching Android setupExamHeroCard) */}
      {upcomingHeroItem && (
        <div
          onClick={() => onNavigate("exam")}
          className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/40 hover:border-blue-400 dark:hover:border-blue-400 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
        >
          <div className="flex items-start space-x-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 text-2xl shadow-inner ${upcomingHeroItem.examType?.toLowerCase().includes("ct") ||
                  upcomingHeroItem.examType?.toLowerCase().includes("quiz") ||
                  upcomingHeroItem.examType?.toLowerCase().includes("test")
                  ? "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                  : "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                }`}
            >
              {upcomingHeroItem.examType?.toLowerCase().includes("ct") ||
                upcomingHeroItem.examType?.toLowerCase().includes("quiz") ||
                upcomingHeroItem.examType?.toLowerCase().includes("test")
                ? "📝"
                : "📅"}
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${upcomingHeroItem.examType?.toLowerCase().includes("ct") ||
                      upcomingHeroItem.examType?.toLowerCase().includes("quiz") ||
                      upcomingHeroItem.examType?.toLowerCase().includes("test")
                      ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                      : "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                    }`}
                >
                  {upcomingHeroItem.examType?.toLowerCase().includes("ct") ||
                    upcomingHeroItem.examType?.toLowerCase().includes("quiz") ||
                    upcomingHeroItem.examType?.toLowerCase().includes("test")
                    ? "📝 UPCOMING CT / QUIZ"
                    : "📅 UPCOMING EXAM"}
                </span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {upcomingHeroItem.examType}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {upcomingHeroItem.courseCode ? `${upcomingHeroItem.courseCode}: ` : ""}
                {upcomingHeroItem.courseTitle}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  📅 {getFriendlyDateLabel(upcomingHeroItem.dateObj)} ({upcomingHeroItem.examDate})
                </span>
                <span>•</span>
                <span>⏰ {upcomingHeroItem.examTime}</span>
                <span>•</span>
                <span>Room {upcomingHeroItem.room}</span>
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("exam");
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shrink-0 cursor-pointer flex items-center space-x-1"
          >
            <span>View Routine</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        </div>
      )}

      {/* Homepage Sponsor Banner Ad matching user screenshot placement */}
      {homeAd && homeAd.enabled && homeAd.imageUrl && (
        <div className="w-full">
          <div
            onClick={() => onAdClick && onAdClick("homepage", homeAd.targetUrl)}
            className="cursor-pointer relative rounded-2xl overflow-hidden max-h-36 sm:max-h-44 w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/40 transition-all group"
            title="Sponsored Partner Announcement"
          >
            <div className="absolute top-2.5 right-2.5 z-10 flex items-center space-x-1.5 bg-slate-950/70 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[9px] font-bold text-amber-400 border border-amber-400/30">
              <span>Sponsored</span>
            </div>
            <img
              src={homeAd.imageUrl}
              alt="Advertisement"
              className="w-full h-auto max-h-36 sm:max-h-44 object-cover object-center group-hover:scale-[1.008] transition-transform duration-300"
            />
          </div>
        </div>
      )}

      {/* Today's Schedule & Latest Notices Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
              <FiCalendar className="mr-2 text-indigo-600 dark:text-indigo-400" />
              <span>Today's Classes ({selectedDay})</span>
            </h3>
            <button
              onClick={() => onNavigate("routine")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>

          {activeTodayClasses.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              <FiCheckCircle className="mx-auto text-2xl text-emerald-500 mb-1.5" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {filteredRoutines.length > 0 && isSelectedDayToday
                  ? "All classes for today have ended! 🎉"
                  : "No classes scheduled for today!"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {filteredRoutines.length > 0 && isSelectedDayToday
                  ? "Great job today. Catch up on assignments or relax."
                  : "Enjoy your day or catch up on revision."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTodayClasses.slice(0, 5).map((r, i) => {
                const isActiveSession = isSelectedDayToday && isClassActiveNow(r.timeSlot, currentClock);
                return (
                  <div
                    key={r.id || i}
                    className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isActiveSession
                        ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-sm ring-2 ring-emerald-400/50"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                        {r.code && (
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50 shrink-0">
                            {r.code}
                          </span>
                        )}
                        {isActiveSession && (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Active Session
                          </span>
                        )}
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words leading-snug">
                          {r.subject}
                        </h4>
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="inline-flex items-center">
                          <span className="mr-1">📍</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{r.classroom || "Room N/A"}</span>
                        </span>
                        {r.teachers && (
                          <span className="inline-flex items-center">
                            <span className="mr-1">👤</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{r.teachers}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 dark:border-slate-800/60">
                      <span
                        className={`text-[11px] sm:text-xs font-mono font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                          isActiveSession
                            ? "bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 shadow-xs"
                            : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                        }`}
                      >
                        {r.timeSlot}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Latest Notices Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
              <FiFileText className="mr-2 text-emerald-600 dark:text-emerald-400" />
              <span>Latest Notices</span>
            </h3>
            <button
              onClick={() => onNavigate("notices")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>

          {filteredNotices.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              <p>No recent notices found.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotices.slice(0, 4).map((n, i) => (
                <div
                  key={n.id || i}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/50 px-2 py-0.5 rounded-md">
                      {n.department || "General"}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</h4>
                  {n.body && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {n.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
