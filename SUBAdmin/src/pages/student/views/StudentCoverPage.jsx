import { useState, useEffect, useMemo } from "react";
import {
  FiFileText,
  FiPrinter,
  FiUser,
  FiBook,
  FiCalendar,
  FiCheck,
  FiType,
  FiLayout,
  FiLock,
  FiEdit2,
  FiAlertCircle,
  FiArrowRight,
} from "react-icons/fi";
import DatabaseService from "../../../services/DatabaseService";
import {
  getCoverPageDepartmentName,
  getDepartmentFullName,
} from "../../../utils/academic";
import { normalizeSubjectCode } from "../utils/studentHelpers";

// 6 Unique Flagship Templates matching SUBTools Android CanvasTemplates.java
export const TEMPLATES = [
  "Classic Standard",
  "Emerald Dotted Border",
  "Formal Grid Table",
  "Header & Footer Accent",
  "Modern Minimalist",
  "Dark Emerald Premium",
];

export const FONTS = [
  "Poppins",
  "Roboto",
  "Inter",
  "Montserrat",
  "Playfair Display",
  "Space Grotesk",
];

export const SUBMISSION_TYPES = [
  "Assignment",
  "Midterm Exam",
  "Final Exam",
  "Lab Report",
  "Project Proposal",
  "Presentation",
];

export const StudentCoverPage = ({
  user,
  userDept = "",
  enrolledCodes = [],
  enrolledSubjects = [],
  allSubjects = [],
  routines = [],
  facultyList = [],
  onNavigate,
}) => {
  // Document Options
  const [submissionType, setSubmissionType] = useState("Assignment");
  const [selectedTemplate, setSelectedTemplate] = useState("Classic Standard");
  const [selectedFont, setSelectedFont] = useState("Poppins");
  const [assignmentNum, setAssignmentNum] = useState("01");
  const [topicTitle, setTopicTitle] = useState("Research & Implementation Analysis");

  // Filter ONLY selected subjects in auth data (user.subjects / enrolledCodes / enrolledSubjects)
  const userEnrolledSubjects = useMemo(() => {
    // 1. If enrolledSubjects prop is passed with items, use it directly
    if (Array.isArray(enrolledSubjects) && enrolledSubjects.length > 0) {
      return enrolledSubjects
        .map((s) => ({
          code: s.code || s.subject_code || s.course_code || "",
          name: s.name || s.title || s.subject_name || s.code || "",
        }))
        .filter((s) => s.code);
    }

    // 2. Otherwise resolve from non-empty enrolledCodes, user.subjects, or localStorage
    let rawCodes = [];
    if (Array.isArray(enrolledCodes) && enrolledCodes.length > 0) {
      rawCodes = enrolledCodes;
    } else if (Array.isArray(user?.subjects) && user.subjects.length > 0) {
      rawCodes = user.subjects;
    } else {
      try {
        const saved = localStorage.getItem(`subtools_enrolled_subjects_${user?.id || user?.uid || "guest"}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) rawCodes = parsed;
        }
      } catch (_) {}
    }

    const normalizedCodes = (rawCodes || []).map(normalizeSubjectCode).filter(Boolean);
    if (normalizedCodes.length === 0) return [];

    const pool = (Array.isArray(allSubjects) && allSubjects.length > 0)
      ? allSubjects
      : (Array.isArray(enrolledSubjects) ? enrolledSubjects : []);

    return normalizedCodes.map((code) => {
      const match = pool.find(
        (s) => normalizeSubjectCode(s.code || s.subject_code || s.course_code) === code
      );
      if (match) {
        return {
          code: match.code || match.subject_code || match.course_code || code,
          name: match.name || match.title || match.subject_name || code,
        };
      }
      return { code, name: code };
    });
  }, [user?.subjects, user?.id, user?.uid, enrolledCodes, enrolledSubjects, allSubjects]);

  // Initial subject from user's enrolled courses only
  const firstSubject = userEnrolledSubjects.length > 0 ? userEnrolledSubjects[0] : null;
  const [courseCode, setCourseCode] = useState(firstSubject ? firstSubject.code : "");
  const [courseTitle, setCourseTitle] = useState(firstSubject ? firstSubject.name : "");

  // Helper to extract teacher/faculty name from routine
  const extractTeacherFromRoutine = (r) => {
    if (!r) return "";
    if (Array.isArray(r.teachers) && r.teachers.length > 0) {
      return r.teachers.filter(Boolean).join(", ");
    }
    if (typeof r.teachers === "string" && r.teachers.trim()) {
      return r.teachers.trim();
    }
    if (r.teacher && typeof r.teacher === "string") return r.teacher.trim();
    if (r.instructor && typeof r.instructor === "string") return r.instructor.trim();
    if (r.faculty && typeof r.faculty === "string") return r.faculty.trim();
    return "";
  };

  // Helper to lookup Faculty Name & Designation from routine and faculty profile
  const lookupFacultyFromRoutine = (subCode, subName) => {
    if (!routines || routines.length === 0) {
      return { name: "", designation: "" };
    }
    const cleanSubCode = normalizeSubjectCode(subCode);
    const cleanSubName = (subName || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    let matchedRoutine = null;
    let rawTeacherName = "";

    // 1st Pass: Match by normalized subject code
    if (cleanSubCode) {
      for (const r of routines) {
        const rCode = normalizeSubjectCode(r.code || r.subjectCode || r.subject_code || r.course_code);
        if (rCode && (rCode === cleanSubCode || rCode.startsWith(cleanSubCode) || cleanSubCode.startsWith(rCode))) {
          const t = extractTeacherFromRoutine(r);
          if (t) {
            matchedRoutine = r;
            rawTeacherName = t;
            break;
          }
        }
      }
    }

    // 2nd Pass: Match by subject name
    if (!rawTeacherName && cleanSubName) {
      for (const r of routines) {
        const rSub = (r.subject || r.name || r.title || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (rSub && (rSub.includes(cleanSubName) || cleanSubName.includes(rSub))) {
          const t = extractTeacherFromRoutine(r);
          if (t) {
            matchedRoutine = r;
            rawTeacherName = t;
            break;
          }
        }
      }
    }

    if (!rawTeacherName) {
      return { name: "", designation: "" };
    }

    // Resolve formal Faculty Name and Designation against faculty profile directory
    let resolvedName = rawTeacherName;
    let resolvedDesignation = matchedRoutine?.teacher_designation || matchedRoutine?.designation || "";

    if (facultyList && facultyList.length > 0) {
      const cleanRaw = rawTeacherName.toLowerCase().trim();
      const fac = facultyList.find((f) => {
        if (!f) return false;
        const fName = (f.name || "").toLowerCase().trim();
        const fInitials = (f.initials || f.shortName || "").toLowerCase().trim();
        if (fInitials && fInitials === cleanRaw) return true;
        if (fName && (fName === cleanRaw || fName.includes(cleanRaw) || cleanRaw.includes(fName))) return true;
        return false;
      });

      if (fac) {
        resolvedName = fac.name || resolvedName;
        resolvedDesignation = fac.designation && fac.designation !== "Faculty Member" ? fac.designation : (resolvedDesignation || "Lecturer");
      }
    }

    if (!resolvedDesignation || resolvedDesignation === "Faculty Member") {
      resolvedDesignation = "Lecturer";
    }

    return { name: resolvedName, designation: resolvedDesignation };
  };

  // Faculty state: auto-filled from routine/faculty directory, with direct text edit support
  const initialFaculty = useMemo(() => {
    if (firstSubject) {
      return lookupFacultyFromRoutine(firstSubject.code, firstSubject.name);
    }
    return { name: "", designation: "Lecturer" };
  }, [firstSubject, routines, facultyList]);

  const [facultyName, setFacultyName] = useState(initialFaculty.name || "");
  const [facultyDesignation, setFacultyDesignation] = useState(
    initialFaculty.designation || "Lecturer"
  );

  // Sync course and faculty when user enrolled subjects change
  useEffect(() => {
    if (userEnrolledSubjects.length > 0) {
      const exists = userEnrolledSubjects.some((s) => s.code === courseCode);
      if (!exists || !courseCode) {
        const first = userEnrolledSubjects[0];
        setCourseCode(first.code);
        setCourseTitle(first.name);

        const found = lookupFacultyFromRoutine(first.code, first.name);
        if (found.name) {
          setFacultyName(found.name);
          setFacultyDesignation(found.designation && found.designation !== "Faculty Member" ? found.designation : "Lecturer");
        }
      }
    } else {
      setCourseCode("");
      setCourseTitle("");
      setFacultyName("");
      setFacultyDesignation("Lecturer");
    }
  }, [userEnrolledSubjects]);

  // When routines or faculty list load, auto-fetch faculty details
  useEffect(() => {
    if (courseCode && routines.length > 0) {
      const found = lookupFacultyFromRoutine(courseCode, courseTitle);
      if (found.name) {
        setFacultyName(found.name);
        setFacultyDesignation(found.designation && found.designation !== "Faculty Member" ? found.designation : "Lecturer");
      }
    }
  }, [routines, facultyList, courseCode]);

  // When student changes enrolled subject from dropdown: auto-fetch faculty (no manual picker)
  const handleSubjectSelect = (e) => {
    const selectedCode = e.target.value;
    setCourseCode(selectedCode);

    const foundSubject = userEnrolledSubjects.find((s) => s.code === selectedCode);
    const newTitle = foundSubject ? foundSubject.name : "";
    setCourseTitle(newTitle);

    const foundFac = lookupFacultyFromRoutine(selectedCode, newTitle);
    if (foundFac.name) {
      setFacultyName(foundFac.name);
      setFacultyDesignation(foundFac.designation && foundFac.designation !== "Faculty Member" ? foundFac.designation : "Lecturer");
    } else {
      setFacultyName("");
      setFacultyDesignation("Lecturer");
    }
  };

  // Student Info (Read-only from authenticated profile)
  const studentName = user?.name || user?.fullName || "Student Name";
  const studentId = user?.studentId || user?.student_id || "0689-59-25-004";
  const department = userDept || user?.department || "CSE";

  // Format Batch as "Batch - XX" (omit semester per specification)
  const rawBatch = (user?.batch || "59th").toString();
  const digitsOnly = rawBatch.replace(/[^0-9]/g, "");
  const cleanBatchNum = digitsOnly || rawBatch.replace(/(batch|th|st|nd|rd)/gi, "").trim();
  const batchLabel = cleanBatchNum ? `Batch - ${cleanBatchNum}` : (rawBatch.trim() ? `Batch - ${rawBatch.trim()}` : "Batch - 59");
  const sectionStr = user?.section && user.section.trim() !== "All" && user.section.trim() !== "" ? ` (Sec: ${user.section.trim()})` : "";
  const batchDisplay = `${batchLabel}${sectionStr}`;

  // Submission Date (Date picker in form)
  const [submissionDate, setSubmissionDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [isLogging, setIsLogging] = useState(false);

  // Log analytics to Supabase analytics_cover_pages matching Android CoverPageFragment
  const logCoverPageAnalytics = async () => {
    const now = Date.now();
    const lastSent = sessionStorage.getItem("subtools_last_cover_analytics");
    if (lastSent && now - parseInt(lastSent, 10) < 15000) {
      return;
    }
    sessionStorage.setItem("subtools_last_cover_analytics", now.toString());

    setIsLogging(true);
    try {
      const payload = {
        id: `cp-${now}`,
        user_id: user?.id || user?.uid || "",
        template_id: selectedTemplate,
        data: {
          template: selectedTemplate,
          font: selectedFont,
          type: submissionType,
          subjectCode: courseCode,
          subjectName: courseTitle,
          facultyName: facultyName,
          facultyDesignation: facultyDesignation,
          batch: batchDisplay,
          date: submissionDate,
          timestamp: now,
        },
      };

      await DatabaseService.addDocument("analytics_cover_pages", payload);
    } catch (err) {
      console.warn("Cover page analytics log non-fatal error:", err);
    } finally {
      setIsLogging(false);
    }
  };

  const handlePrint = async () => {
    await logCoverPageAnalytics();
    window.print();
  };

  // Template Styling Helpers
  const isDarkEmerald = selectedTemplate === "Dark Emerald Premium";
  const isEmeraldDotted = selectedTemplate === "Emerald Dotted Border";
  const isFormalGrid = selectedTemplate === "Formal Grid Table";
  const isHeaderFooter = selectedTemplate === "Header & Footer Accent";
  const isModernMinimal = selectedTemplate === "Modern Minimalist";

  const getTemplateContainerClasses = () => {
    switch (selectedTemplate) {
      case "Emerald Dotted Border":
        return "border-[2.5px] border-dashed border-emerald-600 bg-white text-slate-900";
      case "Formal Grid Table":
        return "border-2 border-slate-900 bg-white text-slate-900 divide-y-2 divide-slate-900 p-0";
      case "Header & Footer Accent":
        return "border-t-[16px] border-t-indigo-900 border-b-[16px] border-b-indigo-900 border-x border-slate-200 bg-white text-slate-900";
      case "Modern Minimalist":
        return "border border-slate-300 border-l-[6px] border-l-slate-900 bg-white text-slate-900";
      case "Dark Emerald Premium":
        return "bg-[#0b1c14] text-emerald-100 border-2 border-emerald-500 ring-2 ring-emerald-500/20";
      case "Classic Standard":
      default:
        return "border-[6px] border-double border-blue-950 outline-1 outline-blue-900 outline-offset-[-8px] bg-white text-slate-900";
    }
  };

  return (
    <div className="space-y-6">
      {/* Fullscreen A4 Print Stylesheet */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Poppins:wght@400;600;700&family=Roboto:wght@400;500;700&family=Space+Grotesk:wght@400;600;700&display=swap');

        .font-poppins { font-family: 'Poppins', sans-serif !important; }
        .font-roboto { font-family: 'Roboto', sans-serif !important; }
        .font-inter { font-family: 'Inter', sans-serif !important; }
        .font-montserrat { font-family: 'Montserrat', sans-serif !important; }
        .font-playfair-display { font-family: 'Playfair Display', serif !important; }
        .font-space-grotesk { font-family: 'Space Grotesk', sans-serif !important; }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          #printable-cover-page, #printable-cover-page * {
            visibility: visible !important;
          }

          #printable-cover-page {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 16mm 14mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            overflow: hidden !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <FiFileText className="mr-2 text-blue-600 dark:text-blue-400" />
            <span>Academic Cover Page Generator</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-generate flagship university cover sheets with routine-linked faculty details.
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={userEnrolledSubjects.length === 0}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Print or export cover sheet as full-page A4 PDF"
        >
          <FiPrinter className="text-sm" />
          <span>Print / Save PDF (A4 Fullscreen)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Input Form Controls (Only Assignment & Faculty Info, Student section hidden) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FiLayout className="text-blue-500" />
              <span>Template & Typography</span>
            </h3>

            {/* Template & Font Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Template Style
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                >
                  {TEMPLATES.map((tmpl) => (
                    <option key={tmpl} value={tmpl}>
                      {tmpl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Font Family
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                >
                  {FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submission Type & Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Assessment Type
                </label>
                <select
                  value={submissionType}
                  onChange={(e) => setSubmissionType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                >
                  {SUBMISSION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Assignment No.
                </label>
                <input
                  type="text"
                  value={assignmentNum}
                  onChange={(e) => setAssignmentNum(e.target.value)}
                  placeholder="e.g. 01, 02"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Assignment / Report Topic Title */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Assignment Title / Topic
              </label>
              <input
                type="text"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Enter report topic or assignment title..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
              />
            </div>

            {/* Course Selection - STRICTLY ENROLLED SUBJECTS IN AUTH DATA */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FiBook className="text-blue-500" />
                <span>Course & Subject</span>
              </h3>

              {userEnrolledSubjects.length === 0 ? (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs space-y-2">
                  <div className="flex items-center text-amber-800 dark:text-amber-300 font-bold gap-1.5">
                    <FiAlertCircle className="text-sm shrink-0" />
                    <span>No Enrolled Subjects in Profile</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    Only selected subjects from your account profile are shown here. Please add your registered subjects in Subject Manager.
                  </p>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate("subjects")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      <span>Open Subject Manager</span>
                      <FiArrowRight className="text-xs" />
                    </button>
                  )}
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Select Enrolled Subject
                  </label>
                  <select
                    value={courseCode}
                    onChange={handleSubjectSelect}
                    disabled={userEnrolledSubjects.length === 0}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium disabled:opacity-50"
                  >
                    {userEnrolledSubjects.length === 0 ? (
                      <option value="">No enrolled subjects</option>
                    ) : (
                      userEnrolledSubjects.map((s, idx) => (
                        <option key={idx} value={s.code}>
                          {s.code}{s.name && s.name !== s.code ? ` - ${s.name}` : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Course Title"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Course Faculty (Auto-fetched from routines & faculty profile, no manual picker dropdown) */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FiUser className="text-emerald-500" />
                  <span>Course Faculty</span>
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/40">
                  Auto-fetched from Routine
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Faculty Name
                  </label>
                  <input
                    type="text"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    placeholder="Faculty Name (Auto-fetched)"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Faculty Designation
                  </label>
                  <input
                    type="text"
                    value={facultyDesignation}
                    onChange={(e) => setFacultyDesignation(e.target.value)}
                    placeholder="e.g. Lecturer, Assistant Professor"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Submission Date */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Submission Date
              </label>
              <input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Live A4 Sheet Preview (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>A4 Live Preview</span>
              <span className="font-mono text-[10px] text-slate-400">(210mm × 297mm)</span>
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">
              Font: {selectedFont} • {selectedTemplate}
            </span>
          </div>

          {/* Printable Cover Page Container */}
          <div
            id="printable-cover-page"
            className={`w-full max-w-[560px] aspect-[210/297] rounded-xl shadow-2xl transition-all flex flex-col justify-between select-none relative overflow-hidden font-${selectedFont.toLowerCase().replace(/\s+/g, "-")} ${getTemplateContainerClasses()} ${
              isFormalGrid ? "" : "p-8 sm:p-12"
            }`}
          >
            {/* Template Variant 1: Formal Grid Table matching FormalTableTemplate.java */}
            {isFormalGrid ? (
              <div className="w-full h-full flex flex-col justify-between divide-y-2 divide-slate-900">
                {/* Header Cell */}
                <div className="p-6 text-center">
                  <img
                    src="/sub_logo.png"
                    alt="SUB Logo"
                    className="h-16 w-auto mx-auto mb-2 object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <h1 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">
                    State University of Bangladesh
                  </h1>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-700 mt-1">
                    {getCoverPageDepartmentName(department)}
                  </p>
                </div>

                {/* Assignment & Topic Cell */}
                <div className="p-6 text-center bg-slate-50/50 flex-1 flex flex-col justify-center space-y-2">
                  <span className="inline-block text-xs font-black uppercase px-3 py-1 rounded bg-slate-900 text-white tracking-wider mx-auto">
                    {submissionType} {assignmentNum ? `• No. ${assignmentNum}` : ""}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug max-w-md mx-auto">
                    {topicTitle || "Project / Assignment Report"}
                  </h2>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    Course: <span className="font-mono">{courseCode || "N/A"}</span> — {courseTitle || "Course Title"}
                  </p>
                </div>

                {/* Split Table: Submitted By & Submitted To */}
                <div className="grid grid-cols-2 divide-x-2 divide-slate-900 text-xs">
                  {/* Submitted By (Left) */}
                  <div className="p-6 space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                      SUBMITTED BY:
                    </p>
                    <p className="font-bold text-sm text-slate-900">{studentName}</p>
                    <p className="font-mono font-bold text-slate-800">ID: {studentId}</p>
                    <p className="text-slate-600 font-semibold">{batchDisplay}</p>
                    <p className="text-slate-600 font-medium">Dept: {getDepartmentFullName(department)}</p>
                  </div>

                  {/* Submitted To (Right) */}
                  <div className="p-6 space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                      SUBMITTED TO:
                    </p>
                    <p className="font-bold text-sm text-slate-900">{facultyName || "Faculty Member"}</p>
                    <p className="text-slate-700 font-semibold">{facultyDesignation || "Lecturer"}</p>
                    <p className="text-slate-600">{getCoverPageDepartmentName(department)}</p>
                    <p className="text-slate-500 text-[10px]">State University of Bangladesh</p>
                  </div>
                </div>

                {/* Footer Cell with Submission Date */}
                <div className="p-4 bg-slate-50/80 px-6">
                  <p className="text-center text-[11px] font-semibold text-slate-600">
                    Date of Submission: <strong className="text-slate-900">{submissionDate}</strong>
                  </p>
                </div>
              </div>
            ) : (
              /* All Other Templates (Classic, Dotted, Header/Footer, Minimalist, Dark Emerald) */
              <>
                {/* 1. University Header & Logo */}
                <div className="text-center relative z-10">
                  <img
                    src="/sub_logo.png"
                    alt="State University of Bangladesh"
                    className="h-16 w-auto mx-auto mb-2.5 object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <h1
                    className={`text-lg sm:text-xl font-extrabold uppercase tracking-tight ${
                      isDarkEmerald
                        ? "text-emerald-300"
                        : isEmeraldDotted
                        ? "text-[#065f46]"
                        : isHeaderFooter
                        ? "text-indigo-950 font-black"
                        : "text-slate-900"
                    }`}
                  >
                    State University of Bangladesh
                  </h1>
                  <p
                    className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${
                      isDarkEmerald
                        ? "text-emerald-400/90"
                        : isEmeraldDotted
                        ? "text-emerald-800 font-extrabold"
                        : isHeaderFooter
                        ? "text-indigo-700 font-extrabold"
                        : "text-slate-600"
                    }`}
                  >
                    {getCoverPageDepartmentName(department)}
                  </p>
                  <div
                    className={`w-28 h-0.5 mx-auto mt-2.5 ${
                      isDarkEmerald
                        ? "bg-emerald-600/70"
                        : isEmeraldDotted
                        ? "bg-emerald-500"
                        : isHeaderFooter
                        ? "bg-indigo-900"
                        : "bg-slate-400"
                    }`}
                  />
                </div>

                {/* 2. Submission Pill & Topic Title */}
                <div className="text-center my-6 relative z-10">
                  <span
                    className={`inline-block text-[11px] font-extrabold uppercase px-3.5 py-1 rounded-full mb-3 tracking-wider ${
                      isDarkEmerald
                        ? "bg-emerald-950 border border-emerald-600 text-emerald-300"
                        : isEmeraldDotted
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : isHeaderFooter
                        ? "bg-indigo-100 text-indigo-950 font-black"
                        : "bg-blue-100 text-blue-950 border border-blue-200"
                    }`}
                  >
                    {submissionType} {assignmentNum ? `• No. ${assignmentNum}` : ""}
                  </span>

                  <h2
                    className={`text-base sm:text-xl font-black leading-snug max-w-md mx-auto ${
                      isDarkEmerald ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {topicTitle || "Project / Assignment Report"}
                  </h2>

                  <p
                    className={`text-xs font-semibold mt-2.5 ${
                      isDarkEmerald ? "text-emerald-300/90" : "text-slate-700"
                    }`}
                  >
                    Course: <span className="font-bold font-mono">{courseCode || "N/A"}</span> — {courseTitle || "Course Title"}
                  </p>
                </div>

                {/* 3. Submitted To & Submitted By Split Block */}
                <div
                  className={`grid grid-cols-2 gap-5 text-left py-5 text-xs relative z-10 ${
                    isDarkEmerald
                      ? "border-t border-b border-emerald-800/60"
                      : isEmeraldDotted
                      ? "border-t border-b border-emerald-400"
                      : isHeaderFooter
                      ? "border-t-2 border-b-2 border-indigo-200"
                      : "border-t border-b border-slate-300"
                  }`}
                >
                  {/* Submitted To (Faculty) */}
                  <div
                    className={`pr-4 border-r ${
                      isDarkEmerald ? "border-emerald-800/60" : isEmeraldDotted ? "border-emerald-300" : "border-slate-200"
                    }`}
                  >
                    <p
                      className={`text-[10px] uppercase font-black tracking-wider mb-1.5 ${
                        isDarkEmerald
                          ? "text-emerald-400"
                          : isEmeraldDotted
                          ? "text-emerald-800"
                          : isHeaderFooter
                          ? "text-indigo-900"
                          : "text-slate-500"
                      }`}
                    >
                      SUBMITTED TO:
                    </p>
                    <p className={`font-bold text-sm ${isDarkEmerald ? "text-white" : "text-slate-900"}`}>
                      {facultyName || "Faculty Member"}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${isDarkEmerald ? "text-emerald-300/80" : "text-slate-600"}`}>
                      {facultyDesignation || "Lecturer"}
                    </p>
                    <p className={`text-[11px] ${isDarkEmerald ? "text-emerald-300/80" : "text-slate-600"}`}>
                      {getCoverPageDepartmentName(department)}
                    </p>
                    <p className={`text-[10px] mt-1 ${isDarkEmerald ? "text-emerald-400/60" : "text-slate-500"}`}>
                      State University of Bangladesh
                    </p>
                  </div>

                  {/* Submitted By (Student) - Batch - XX (No semester) */}
                  <div className="pl-3">
                    <p
                      className={`text-[10px] uppercase font-black tracking-wider mb-1.5 ${
                        isDarkEmerald
                          ? "text-emerald-400"
                          : isEmeraldDotted
                          ? "text-emerald-800"
                          : isHeaderFooter
                          ? "text-indigo-900"
                          : "text-slate-500"
                      }`}
                    >
                      SUBMITTED BY:
                    </p>
                    <p className={`font-bold text-sm ${isDarkEmerald ? "text-white" : "text-slate-900"}`}>
                      {studentName}
                    </p>
                    <p
                      className={`text-[11px] font-mono font-bold ${
                        isDarkEmerald ? "text-emerald-300" : "text-slate-800"
                      }`}
                    >
                      ID: {studentId}
                    </p>
                    <p className={`text-[11px] font-semibold ${isDarkEmerald ? "text-emerald-300/80" : "text-slate-600"}`}>
                      {batchDisplay}
                    </p>
                    <p className={`text-[11px] ${isDarkEmerald ? "text-emerald-300/80" : "text-slate-600"}`}>
                      Dept: {getDepartmentFullName(department)}
                    </p>
                  </div>
                </div>

                {/* 4. Submission Date Footer */}
                <div className="pt-4 text-xs relative z-10 space-y-4">
                  <div
                    className={`text-center text-[11px] ${
                      isDarkEmerald ? "text-emerald-400/90" : "text-slate-600"
                    }`}
                  >
                    Date of Submission: <strong className={isDarkEmerald ? "text-white" : "text-slate-900"}>{submissionDate}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCoverPage;
