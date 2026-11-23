import { useState, useMemo, useEffect } from "react";
import {
  FiBook,
  FiSearch,
  FiPlus,
  FiTrash2,
  FiAward,
  FiLayers,
  FiCheckCircle,
  FiCheck,
  FiEdit2,
  FiSave,
  FiX,
  FiClock,
} from "react-icons/fi";
import { normalizeSubjectCode, isSameSubjectCode } from "../utils/studentHelpers";
import { getSystemSettings } from "../../../supabase/config";

const parseTermNumber = (termStr) => {
  if (!termStr) return 999;
  const digits = String(termStr).replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 999;
};

// Canonical department credits defaults matching Android CreditHelper.java
// Canonical department credits defaults matching user specifications and Android CreditHelper.java
const DEFAULT_DEPT_CREDITS = {
  CSE: 140.0,
  DSE: 140.0,
  "B.PHARM": 164.0,
  PHARMACY: 164.0,
  LLB: 140.0,
  LAW: 140.0,
  BBA: 130.0,
  ENGLISH: 130.0,
  ENG: 130.0,
  EEE: 144.0,
  ARCH: 190.0,
  ARCHITECTURE: 190.0,
  ES: 140.0,
  FENS: 145.0,
  JCMS: 140.0,
  MIB: 140.0,
  MICROBIOLOGY: 140.0,
  GENERAL: 140.0,
};

export const StudentSubjects = ({
  subjects = [],
  userDept = "CSE",
  enrolledCodes = [],
  onToggleEnroll,
  completedCodes = [],
  onToggleCompleted,
  onUpdateCompletedCredits,
  completedCreditsOverride = 0,
  user,
}) => {
  const [activeTab, setActiveTab] = useState("available"); // 'available' | 'selected' | 'completed'
  const [searchQuery, setSearchQuery] = useState("");
  const [deptCreditsMap, setDeptCreditsMap] = useState(DEFAULT_DEPT_CREDITS);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [manualCreditInput, setManualCreditInput] = useState("");

  // Responsive optimistic local state to guarantee immediate UI reaction on clicks
  const [localCompleted, setLocalCompleted] = useState(() =>
    (completedCodes || []).map(normalizeSubjectCode).filter(Boolean)
  );
  const [localEnrolled, setLocalEnrolled] = useState(() =>
    (enrolledCodes || []).map(normalizeSubjectCode).filter(Boolean)
  );

  useEffect(() => {
    setLocalCompleted((completedCodes || []).map(normalizeSubjectCode).filter(Boolean));
  }, [completedCodes]);

  useEffect(() => {
    setLocalEnrolled((enrolledCodes || []).map(normalizeSubjectCode).filter(Boolean));
  }, [enrolledCodes]);

  const handleToggleCompletedInternal = (code) => {
    if (!code) return;
    const clean = normalizeSubjectCode(code);
    setLocalCompleted((prev) => {
      const exists = prev.some((c) => isSameSubjectCode(c, clean));
      return exists ? prev.filter((c) => !isSameSubjectCode(c, clean)) : [...prev, clean];
    });
    if (onToggleCompleted) onToggleCompleted(code);
  };

  const handleToggleEnrollInternal = (code) => {
    if (!code) return;
    const clean = normalizeSubjectCode(code);
    setLocalEnrolled((prev) => {
      const exists = prev.some((e) => isSameSubjectCode(e, clean));
      return exists ? prev.filter((e) => !isSameSubjectCode(e, clean)) : [...prev, clean];
    });
    if (onToggleEnroll) onToggleEnroll(code);
  };

  // Dynamically fetch department credit requirements configured by Super Admin in Settings
  useEffect(() => {
    let isMounted = true;
    getSystemSettings("department_credits")
      .then((data) => {
        if (isMounted && data && typeof data === "object") {
          setDeptCreditsMap((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const cleanEnrolled = localEnrolled;
  const cleanCompleted = localCompleted;

  const isSubjectEnrolled = (code) => {
    if (!code) return false;
    const clean = normalizeSubjectCode(code);
    return cleanEnrolled.some((e) => isSameSubjectCode(clean, e));
  };

  const isSubjectCompleted = (code) => {
    if (!code) return false;
    const clean = normalizeSubjectCode(code);
    return cleanCompleted.some((c) => isSameSubjectCode(clean, c));
  };

  // Enrolled subjects list & current term credits
  const enrolledSubjectList = useMemo(() => {
    return subjects.filter((s) => isSubjectEnrolled(s.code || s.subject_code || s.course_code));
  }, [subjects, cleanEnrolled]);

  const termEnrolledCredits = useMemo(() => {
    return enrolledSubjectList.reduce(
      (sum, s) => sum + (Number(s.credits || s.credit || 3) || 3),
      0
    );
  }, [enrolledSubjectList]);

  // Completed subjects list
  const completedSubjectList = useMemo(() => {
    return subjects.filter((s) => isSubjectCompleted(s.code || s.subject_code || s.course_code));
  }, [subjects, cleanCompleted]);

  // Calculate completed credits: sum from completed courses or override
  const completedCredits = useMemo(() => {
    const sumFromCompleted = completedSubjectList.reduce(
      (acc, s) => acc + (Number(s.credits || s.credit || 3) || 3),
      0
    );
    if (sumFromCompleted > 0) return sumFromCompleted;
    if (completedCreditsOverride && Number(completedCreditsOverride) > 0) {
      return Number(completedCreditsOverride);
    }
    return Number(user?.completedCredits || user?.completed_credits || 0);
  }, [completedCreditsOverride, completedSubjectList, user?.completedCredits, user?.completed_credits]);

  // Total required degree credits dynamically derived from Super Admin Settings
  const totalRequiredCredits = useMemo(() => {
    const rawDept = (userDept || "").trim().toUpperCase();
    const cleanDept = rawDept
      .replace("DEPARTMENT OF ", "")
      .replace("DEPT OF ", "")
      .trim();

    // Check direct key in settings map
    if (deptCreditsMap[cleanDept] && Number(deptCreditsMap[cleanDept]) > 0) {
      return Number(deptCreditsMap[cleanDept]);
    }

    // Check alias variations
    if (cleanDept.includes("ARCH") && (deptCreditsMap["ARCH"] || deptCreditsMap["ARCHITECTURE"])) {
      return Number(deptCreditsMap["ARCH"] || deptCreditsMap["ARCHITECTURE"]);
    }
    if (cleanDept.includes("PHARM") && (deptCreditsMap["B.PHARM"] || deptCreditsMap["PHARMACY"])) {
      return Number(deptCreditsMap["B.PHARM"] || deptCreditsMap["PHARMACY"]);
    }
    if ((cleanDept.includes("LAW") || cleanDept.includes("LLB")) && (deptCreditsMap["LLB"] || deptCreditsMap["LAW"])) {
      return Number(deptCreditsMap["LLB"] || deptCreditsMap["LAW"]);
    }
    if ((cleanDept.includes("ENG") || cleanDept.includes("ENGLISH")) && (deptCreditsMap["ENG"] || deptCreditsMap["ENGLISH"])) {
      return Number(deptCreditsMap["ENG"] || deptCreditsMap["ENGLISH"]);
    }
    if (cleanDept.includes("DSE") && deptCreditsMap["DSE"]) {
      return Number(deptCreditsMap["DSE"]);
    }
    if (cleanDept.includes("CSE") && deptCreditsMap["CSE"]) {
      return Number(deptCreditsMap["CSE"]);
    }
    if (cleanDept.includes("BBA") && deptCreditsMap["BBA"]) {
      return Number(deptCreditsMap["BBA"]);
    }

    return Number(deptCreditsMap["GENERAL"] || DEFAULT_DEPT_CREDITS["GENERAL"] || 140.0);
  }, [userDept, deptCreditsMap]);

  const remainingCredits = Math.max(0, totalRequiredCredits - completedCredits);
  const degreeProgressPct = Math.min(100, Math.round((completedCredits / (totalRequiredCredits || 1)) * 100));
  const semesterTargetCredits = 18.0;
  const semesterProgressPct = Math.min(100, Math.round((termEnrolledCredits / semesterTargetCredits) * 100));

  // Filter subjects based on active tab, department, and search
  const displayedSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sanitizedQ = q.replace(/[^a-zA-Z0-9]/g, "");
    const studentDept = (userDept || "ALL").trim().toUpperCase();

    const list = subjects.filter((s) => {
      const code = s.code || s.subject_code || s.course_code || "";
      const name = s.name || s.title || s.subject_name || "";
      const sDept = String(s.department || "").trim().toUpperCase();

      const isEnrolled = isSubjectEnrolled(code);
      const isCompleted = isSubjectCompleted(code);

      // 1. Tab filter:
      // 'available': subjects neither currently enrolled nor already marked completed
      // 'selected': currently enrolled subjects
      // 'completed': previously passed/completed subjects
      if (activeTab === "available" && (isEnrolled || isCompleted)) return false;
      if (activeTab === "selected" && !isEnrolled) return false;
      if (activeTab === "completed" && !isCompleted) return false;

      // 2. Department filter on Available tab
      if (activeTab === "available") {
        const matchesDept =
          !studentDept ||
          studentDept === "ALL" ||
          studentDept === "N/A" ||
          !sDept ||
          sDept === "ALL" ||
          sDept === "GENERAL" ||
          sDept === "GED" ||
          sDept === studentDept;
        if (!matchesDept) return false;
      }

      // 3. Search query filter
      if (q) {
        const normCode = String(code).toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
        const normName = String(name).toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
        return normCode.includes(sanitizedQ) || normName.includes(sanitizedQ);
      }

      return true;
    });

    // Chronological Term Sorting matching Android UX-005
    list.sort((a, b) => {
      const termA = parseTermNumber(a.term || a.level || a.semester);
      const termB = parseTermNumber(b.term || b.level || b.semester);
      if (termA !== termB) return termA - termB;
      const codeA = String(a.code || a.subject_code || "");
      const codeB = String(b.code || b.subject_code || "");
      return codeA.localeCompare(codeB);
    });

    return list;
  }, [subjects, userDept, activeTab, searchQuery, cleanEnrolled, cleanCompleted]);

  const handleSaveManualCredits = () => {
    if (manualCreditInput === "") return;
    const val = Number(manualCreditInput);
    if (isNaN(val) || val < 0) {
      return;
    }
    if (onUpdateCompletedCredits) {
      onUpdateCompletedCredits(val);
    }
    setShowAdjustModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <FiBook className="mr-2 text-indigo-600 dark:text-indigo-400" />
            <span>Academic Course &amp; Credit Manager ({userDept})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your registered semester courses and track completed subjects toward degree graduation requirements.
          </p>
        </div>

        {/* Credit count badge */}
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-2xl shadow-xs self-start md:self-auto">
          <FiAward className="text-indigo-600 dark:text-indigo-400 text-sm" />
          <span className="text-xs text-slate-600 dark:text-slate-300">
            Selected: <strong className="text-slate-900 dark:text-white">{cleanEnrolled.length} subjects</strong> ({termEnrolledCredits.toFixed(1)} Credits)
          </span>
        </div>
      </div>

      {/* Credit Progress & Degree Summary Cards matching Android SubjectFragment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Enrolled Courses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Enrolled (Current Term)
          </p>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {cleanEnrolled.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">courses</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Active semester registration load
          </p>
        </div>

        {/* Card 2: Semester Load */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Term Credit Load
            </p>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              {termEnrolledCredits.toFixed(1)} / {semesterTargetCredits.toFixed(1)} Cr
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${semesterProgressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Target: 18.0 Credits / semester
          </p>
        </div>

        {/* Card 3: Completed Credits with Manual Adjustment Option */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Completed Credits
            </p>
            <button
              onClick={() => {
                setManualCreditInput(completedCredits.toString());
                setShowAdjustModal(true);
              }}
              className="text-[10px] flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/50 dark:border-emerald-800/40 transition-colors cursor-pointer"
              title="Manually adjust completed credits"
            >
              <FiEdit2 size={10} />
              <span>Adjust</span>
            </button>
          </div>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {completedCredits.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              earned ({cleanCompleted.length} courses)
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Sum of completed courses + waivers
          </p>
        </div>

        {/* Card 4: Degree Requirement (Dynamic from Super Admin) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Degree Requirement
            </p>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {degreeProgressPct}%
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalRequiredCredits.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({remainingCredits.toFixed(1)} left)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${degreeProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Manual Credit Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiEdit2 className="text-emerald-500" />
                <span>Adjust Completed Credits</span>
              </h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              If you have credit waivers, transferred credits, or historical courses completed before SUBTools, enter your actual earned credits total here.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Total Completed Credits (CR)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="300"
                value={manualCreditInput}
                onChange={(e) => setManualCreditInput(e.target.value)}
                placeholder="e.g. 75.0"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualCredits}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FiSave size={13} />
                <span>Save Credits</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs and Search Bar matching Android tabLayoutSubjects */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab("available")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "available"
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Available Subjects
          </button>
          <button
            onClick={() => setActiveTab("selected")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "selected"
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Selected (Enrolled)</span>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.2 rounded-full">
              {cleanEnrolled.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "completed"
                ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Completed (Passed)</span>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
              {cleanCompleted.length}
            </span>
          </button>
        </div>

        <div className="w-full sm:w-72">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search code or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
      {displayedSubjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          <FiBook className="mx-auto text-3xl text-indigo-600 dark:text-indigo-400 mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {activeTab === "selected"
              ? "You have not selected any courses for this semester."
              : activeTab === "completed"
              ? "No completed subjects marked yet."
              : "No available subjects found matching your criteria."}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === "selected"
              ? "Switch to Available Subjects and click Enroll to customize your daily schedule."
              : activeTab === "completed"
              ? "You can mark completed courses from Available or Selected subjects to calculate your earned credits."
              : "All subjects for your department may already be enrolled or completed, or try clearing search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {displayedSubjects.map((s, i) => {
            const code = s.code || s.subject_code || s.course_code || `SUB-${i}`;
            const title = s.name || s.title || s.subject_name || "Academic Subject";
            const credits = s.credits || s.credit || 3;
            const term = s.level || s.term || s.semester || "Undergraduate";
            const isEnrolled = isSubjectEnrolled(code);
            const isCompleted = isSubjectCompleted(code);

            return (
              <div
                key={s.id || code || i}
                className={`border rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between ${
                  isCompleted
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-600/50"
                    : isEnrolled
                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-500/60"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                        isCompleted
                          ? "bg-emerald-100/70 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                          : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60"
                      }`}
                    >
                      {code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {credits} Credits
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                    {title}
                  </h4>

                  <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="flex items-center">
                      <FiLayers className="mr-1 text-slate-400" />
                      <span>{term}</span>
                    </span>
                    <span>•</span>
                    <span>Dept: {s.department || userDept}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-2">
                  {/* Action 1: Enroll / Remove in Current Semester */}
                  {activeTab !== "completed" && (
                    <button
                      onClick={() => handleToggleEnrollInternal(code)}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        isEnrolled
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                          : "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-98 shadow-md shadow-indigo-600/30"
                      }`}
                    >
                      {isEnrolled ? (
                        <>
                          <FiTrash2 className="mr-1.5" />
                          <span>Remove from Semester</span>
                        </>
                      ) : (
                        <>
                          <FiPlus className="mr-1.5" />
                          <span>Enroll in Semester</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Action 2: Mark / Unmark Completed (Count toward degree credits) */}
                  <button
                    onClick={() => handleToggleCompletedInternal(code)}
                    className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                      isCompleted
                        ? "bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 border border-transparent"
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <FiCheck className="mr-1.5 text-emerald-600" />
                        <span>Completed (Click to Unmark)</span>
                      </>
                    ) : (
                      <>
                        <FiCheckCircle className="mr-1.5 text-slate-400 group-hover:text-emerald-500" />
                        <span>Mark as Completed Before</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentSubjects;
