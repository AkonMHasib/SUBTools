import { useState, useMemo } from "react";
import {
  FiClock,
  FiSearch,
  FiX,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiFileText,
  FiBookOpen,
  FiFilter,
  FiCheckCircle,
} from "react-icons/fi";
import { parseExamDate } from "./StudentHome";

const EXAM_TYPES = ["All Types", "Midterm", "Final", "CT", "Quiz"];

const DEPARTMENTS = [
  "All",
  "CSE",
  "EEE",
  "BBA",
  "ENG",
  "LAW",
  "PHARM",
  "ARCH",
  "JOUR",
  "THM",
];

const normalizeDept = (dept) => {
  if (!dept) return "";
  const d = dept.trim().toUpperCase();
  if (d.includes("COMPUTER") || d === "CSE") return "CSE";
  if (d.includes("ELECTR") || d === "EEE") return "EEE";
  if (d.includes("BUSINESS") || d === "BBA") return "BBA";
  if (d.includes("ENGLISH") || d === "ENG") return "ENG";
  if (d.includes("LAW")) return "LAW";
  if (d.includes("PHARM")) return "PHARM";
  if (d.includes("ARCH")) return "ARCH";
  if (d.includes("JOUR") || d.includes("MEDIA")) return "JOUR";
  if (d.includes("TOUR") || d.includes("THM") || d.includes("HOTEL")) return "THM";
  return d;
};

export const StudentExamRoutine = ({ examRoutines = [], userDept = "", user }) => {
  const [selectedType, setSelectedType] = useState("All Types");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptOverride, setSelectedDeptOverride] = useState("All");

  const studentDept = useMemo(() => {
    return normalizeDept(user?.department || userDept || "");
  }, [user?.department, userDept]);

  // Is locked to student's department if available (matching Android ExamRoutineFragment)
  const isDeptLocked = Boolean(studentDept && studentDept !== "ALL");

  // Relative date calculation
  const getRelativeExamStatus = (dateStr) => {
    const examDate = parseExamDate(dateStr);
    if (!examDate) return { label: null, isPast: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = examDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: "Past Exam", isPast: true, color: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700" };
    }
    if (diffDays === 0) {
      return { label: "TODAY", isPast: false, color: "bg-rose-500 text-white border-rose-600 animate-pulse font-bold" };
    }
    if (diffDays === 1) {
      return { label: "TOMORROW", isPast: false, color: "bg-amber-500 text-white border-amber-600 font-bold" };
    }
    if (diffDays <= 7) {
      return { label: `In ${diffDays} days`, isPast: false, color: "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
    }
    return { label: `In ${diffDays} days`, isPast: false, color: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
  };

  // Filter and sort exams
  const filteredExams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matched = examRoutines.filter((ex) => {
      // 1. Department matching
      const exDept = normalizeDept(ex.department || ex.dept || "");
      let matchesDept = false;

      if (isDeptLocked) {
        matchesDept =
          exDept === studentDept ||
          (ex.department && ex.department.toUpperCase() === "ALL") ||
          exDept === "ALL";
      } else {
        if (selectedDeptOverride === "All") {
          matchesDept = true;
        } else {
          matchesDept =
            exDept === selectedDeptOverride ||
            (ex.department && ex.department.toUpperCase() === "ALL") ||
            exDept === "ALL";
        }
      }

      if (!matchesDept) return false;

      // 2. Exam Type matching
      const rawType = (ex.exam_type || ex.examType || ex.type || "Midterm").trim();
      let matchesType = false;
      if (selectedType === "All Types") {
        matchesType = true;
      } else if (selectedType === "Midterm") {
        matchesType = rawType.toLowerCase().includes("mid");
      } else if (selectedType === "Final") {
        matchesType = rawType.toLowerCase().includes("fin");
      } else if (selectedType === "CT") {
        matchesType =
          rawType.toLowerCase().includes("ct") ||
          rawType.toLowerCase().includes("class test");
      } else if (selectedType === "Quiz") {
        matchesType = rawType.toLowerCase().includes("quiz");
      } else {
        matchesType = rawType.toLowerCase() === selectedType.toLowerCase();
      }

      if (!matchesType) return false;

      // 3. Search query matching
      if (!query) return true;

      const code = (ex.course_code || ex.courseCode || ex.code || "").toLowerCase();
      const title = (ex.course_title || ex.courseTitle || ex.title || "").toLowerCase();
      const room = (ex.room || "").toLowerCase();
      const date = (ex.exam_date || ex.examDate || ex.date || "").toLowerCase();
      const invigilator = (ex.invigilator || "").toLowerCase();
      const notes = (ex.notes || "").toLowerCase();

      return (
        code.includes(query) ||
        title.includes(query) ||
        room.includes(query) ||
        date.includes(query) ||
        invigilator.includes(query) ||
        notes.includes(query)
      );
    });

    // Chronological Sort: closest upcoming first, then future, then past
    return matched.sort((a, b) => {
      const dateA = parseExamDate(a.exam_date || a.examDate || a.date);
      const dateB = parseExamDate(b.exam_date || b.examDate || b.date);

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      return dateA.getTime() - dateB.getTime();
    });
  }, [examRoutines, isDeptLocked, studentDept, selectedDeptOverride, selectedType, searchQuery]);

  // Counts for each exam type
  const typeCounts = useMemo(() => {
    const counts = { "All Types": 0, Midterm: 0, Final: 0, CT: 0, Quiz: 0 };
    examRoutines.forEach((ex) => {
      // Must match department
      const exDept = normalizeDept(ex.department || ex.dept || "");
      let matchesDept = false;
      if (isDeptLocked) {
        matchesDept =
          exDept === studentDept ||
          (ex.department && ex.department.toUpperCase() === "ALL") ||
          exDept === "ALL";
      } else {
        matchesDept =
          selectedDeptOverride === "All" ||
          exDept === selectedDeptOverride ||
          (ex.department && ex.department.toUpperCase() === "ALL") ||
          exDept === "ALL";
      }
      if (!matchesDept) return;

      counts["All Types"]++;
      const raw = (ex.exam_type || ex.examType || ex.type || "Midterm").toLowerCase();
      if (raw.includes("mid")) counts.Midterm++;
      if (raw.includes("fin")) counts.Final++;
      if (raw.includes("ct") || raw.includes("class test")) counts.CT++;
      if (raw.includes("quiz")) counts.Quiz++;
    });
    return counts;
  }, [examRoutines, isDeptLocked, studentDept, selectedDeptOverride]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
              <FiClock className="mr-2 text-blue-600 dark:text-blue-400" />
              <span>Examination Schedule</span>
            </h2>
            {isDeptLocked ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Dept: {studentDept} (Locked)
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                All Departments
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Midterm, final, class test (CT), and quiz timetables published by the exam controller.
          </p>
        </div>

        {/* Department selector if not locked */}
        {!isDeptLocked && (
          <div className="flex items-center gap-2">
            <FiFilter className="text-slate-400 text-sm" />
            <select
              value={selectedDeptOverride}
              onChange={(e) => setSelectedDeptOverride(e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "All" ? "All Departments" : dept}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Exam Type Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {EXAM_TYPES.map((type) => {
            const count = typeCounts[type] || 0;
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>{type}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-blue-500/40 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course code, title, room, date, or invigilator..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <FiX className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong className="text-slate-900 dark:text-white font-semibold">{filteredExams.length}</strong> exam schedule{filteredExams.length === 1 ? "" : "s"}
        </span>
        {searchQuery && (
          <span className="italic">
            Filtered by &quot;{searchQuery}&quot;
          </span>
        )}
      </div>

      {/* Routine Cards Grid */}
      {filteredExams.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          <FiClock className="mx-auto text-3xl text-blue-600 dark:text-blue-400 mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No matching exam schedules found.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {searchQuery
              ? "Try adjusting your search query or exam type filter."
              : `No ${selectedType !== "All Types" ? selectedType : ""} exams published yet for your department.`}
          </p>
          {(searchQuery || selectedType !== "All Types") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedType("All Types");
              }}
              className="mt-3 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredExams.map((ex, i) => {
            const dateStr = ex.exam_date || ex.examDate || ex.date || "";
            const timeStr = ex.exam_time || ex.examTime || ex.time || "Time TBA";
            const typeStr = ex.exam_type || ex.examType || ex.type || "Examination";
            const codeStr = ex.course_code || ex.courseCode || ex.code || "";
            const titleStr = ex.course_title || ex.courseTitle || ex.title || "Course Exam";
            const roomStr = ex.room ? `Room ${ex.room}` : "Room TBA";
            const invigilatorStr = ex.invigilator || "";
            const notesStr = ex.notes || "";
            const deptStr = ex.department || userDept || "";

            const status = getRelativeExamStatus(dateStr);

            // Determine badge style by exam type
            let typeColor = "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60";
            const tLower = typeStr.toLowerCase();
            if (tLower.includes("fin")) {
              typeColor = "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
            } else if (tLower.includes("ct") || tLower.includes("class test")) {
              typeColor = "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60";
            } else if (tLower.includes("quiz")) {
              typeColor = "bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60";
            }

            return (
              <div
                key={ex.id || `${codeStr}-${i}`}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs flex flex-col justify-between ${
                  status.isPast
                    ? "border-slate-200 dark:border-slate-800/80 opacity-75"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${typeColor}`}>
                      {typeStr}
                    </span>
                    {status.label && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                  </div>

                  {/* Course Code & Title */}
                  {codeStr && (
                    <span className="text-[11px] font-bold tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                      {codeStr}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-2">
                    {titleStr}
                  </h4>

                  {/* Schedule Details */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="text-blue-500 shrink-0 text-sm" />
                      <span className="font-medium font-mono">{dateStr || "Date TBA"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiClock className="text-amber-500 shrink-0 text-sm" />
                      <span>{timeStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiMapPin className="text-rose-500 shrink-0 text-sm" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{roomStr}</span>
                    </div>
                    {invigilatorStr && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <FiUser className="shrink-0" />
                        <span>Invigilator: {invigilatorStr}</span>
                      </div>
                    )}
                    {notesStr && (
                      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <FiFileText className="shrink-0 mt-0.5" />
                        <span className="italic">{notesStr}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Dept / Batch */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Dept: {deptStr}</span>
                  {ex.batch ? (
                    <span>Batch: {ex.batch}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Regular</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentExamRoutine;
