// Helper utilities for Student Portal

/**
 * Sanitizes and extracts clean 2-letter faculty initials.
 * Strips honorary titles (Prof., Dr., Md., Engr., etc.) and prevents database bulk IDs from overflowing.
 */
export const getTeacherInitials = (fac) => {
  const rawInit = fac?.initial || fac?.teacher_initial || "";
  // If it's already a valid short clean initial (<= 4 chars, no dashes, numbers, or bulk id keys)
  if (
    rawInit &&
    rawInit.length <= 4 &&
    !rawInit.includes("-") &&
    !rawInit.includes("_") &&
    !/\d/.test(rawInit)
  ) {
    return rawInit.toUpperCase();
  }

  // Generate initials from faculty name
  const rawName = String(fac?.name || "").trim();
  const cleanedName = rawName.replace(/^(Prof\.|Dr\.|Md\.|Mr\.|Ms\.|Mrs\.|Engr\.|Sheikh|Syed)\s+/i, "").trim();
  const parts = cleanedName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return rawName.charAt(0).toUpperCase() || "FC";
};

/**
 * Normalizes class routine records from Supabase (handles nested 'data' JSON & root properties).
 */
export const parseRoutineItem = (r) => {
  const d = r.data || {};

  // Course Code
  const code = (d.code || r.code || r.course_code || "").trim();

  // Course Title / Subject
  const subject = (d.subject || r.subject || r.course_title || r.title || (code ? `Course ${code}` : "Class Lecture")).trim();

  // Time Slot
  let timeSlot = "";
  const startTime = (d.startTime || d.start_time || r.startTime || r.start_time || "").trim();
  const endTime = (d.endTime || d.end_time || r.endTime || r.end_time || "").trim();
  if (startTime && endTime) {
    timeSlot = `${startTime} - ${endTime}`;
  } else if (startTime) {
    timeSlot = startTime;
  } else if (r.slot || d.slot) {
    timeSlot = String(r.slot || d.slot).trim();
  } else {
    timeSlot = "Slot TBA";
  }

  // Classroom & Tower
  let classroom = (d.classroom || r.classroom || r.room || "").trim();
  const tower = (d.tower || r.tower || "").trim();
  if (classroom) {
    if (tower && !classroom.toLowerCase().includes("tower")) {
      classroom = `${tower}, Rm ${classroom}`;
    }
  } else {
    classroom = "Room TBA";
  }

  // Teachers / Faculty
  let teachers = "Faculty";
  if (Array.isArray(d.teachers) && d.teachers.length > 0) {
    teachers = d.teachers.join(", ");
  } else if (Array.isArray(r.teachers) && r.teachers.length > 0) {
    teachers = r.teachers.join(", ");
  } else if (d.teacher || r.teacher) {
    teachers = String(d.teacher || r.teacher).trim();
  } else if (r.teacher_initial || d.teacher_initial) {
    teachers = String(r.teacher_initial || d.teacher_initial).trim();
  }

  // Academic level / batch / section
  const batch = (d.academicLevel || d.batch || r.batch || d.term || "").trim();
  const section = (d.section || r.section || "").trim();
  const note = (d.note || r.note || "").trim();
  const isTemporary = Boolean(d.isTemporary || r.isTemporary);

  return {
    id: r.id || d.id,
    code,
    subject,
    timeSlot,
    startTime,
    endTime,
    classroom,
    teachers,
    batch,
    section,
    note,
    isTemporary,
    department: (d.department || r.department || "").trim(),
    day: (d.day || r.day || "").trim(),
  };
};

/**
 * Normalizes shuttle bus records from Supabase and matches real route names.
 */
export const parseBusItem = (b, routes = []) => {
  const d = b.data || {};
  const rawRouteId = b.routeId || b.route_id || d.routeId || d.route_id || b.route || d.route || "";
  
  let routeName = "";
  if (rawRouteId && Array.isArray(routes) && routes.length > 0) {
    const match = routes.find(
      (r) =>
        (r.id && String(r.id).trim() === String(rawRouteId).trim()) ||
        (r.name && r.name.toLowerCase() === String(rawRouteId).toLowerCase()) ||
        (r.code && r.code.toLowerCase() === String(rawRouteId).toLowerCase())
    );
    if (match) {
      routeName = match.name + (match.code ? ` (${match.code})` : "");
    }
  }

  // If not matched from routes collection, inspect explicit route or starting point
  if (!routeName) {
    if (
      rawRouteId &&
      !["campus shuttle route", "campus shuttle", "route", "shuttle route"].includes(
        String(rawRouteId).toLowerCase().trim()
      )
    ) {
      routeName = rawRouteId;
    } else if (b.startingPoint || d.startingPoint || b.starting_point || d.starting_point) {
      const sp = (b.startingPoint || d.startingPoint || b.starting_point || d.starting_point).trim();
      routeName = `${sp} ⇄ Campus`;
    } else if (b.name || d.name) {
      routeName = `${b.name || d.name} Route`;
    } else {
      routeName = "Campus Shuttle Route";
    }
  }

  return {
    id: b.id || d.id,
    name: b.name || d.name || "Campus Shuttle",
    number: b.number || d.number || "",
    route: routeName,
    routeId: rawRouteId,
    driver: b.driver || b.driver_name || d.driver || d.driver_name || "University Fleet Driver",
    driverPhone: b.driverPhone || b.driver_phone || d.driverPhone || d.driver_phone || b.phone || d.phone || "",
    capacity: b.capacity || d.capacity || 40,
    startingPoint: b.startingPoint || b.starting_point || d.startingPoint || d.starting_point || "",
    startTime: b.startTime || b.start_time || d.startTime || d.start_time || "",
    leavingCampusTime: b.leavingCampusTime || b.leaving_campus_time || d.leavingCampusTime || d.leaving_campus_time || "",
    gpsUrl: b.gpsUrl || b.gps_url || b.tracking_link || b.trackingLink || d.gpsUrl || d.gps_url || d.tracking_link || "",
    isTemporaryOverride: Boolean(b.isTemporaryOverride || b.is_temporary_override || d.isTemporaryOverride || d.is_temporary_override),
    pickupTimes: b.pickupTimes || d.pickupTimes || null,
  };
};

/**
 * Normalizes a course or subject code (e.g. "CSE-101" -> "CSE101").
 */
export const normalizeSubjectCode = (code) => {
  if (!code) return "";
  if (typeof code === "object") {
    code = code.code || code.subject_code || code.course_code || code.subjectCode || code.id || code.name || "";
  }
  return String(code).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim();
};

/**
 * Compares two subject codes after normalization.
 */
export const isSameSubjectCode = (code1, code2) => {
  if (!code1 || !code2) return false;
  const n1 = normalizeSubjectCode(code1);
  const n2 = normalizeSubjectCode(code2);
  return Boolean(n1 && n1 === n2);
};

/**
 * Checks day equivalence (case-insensitive and prefix-based, e.g. "Sun" == "Sunday").
 */
export const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const c1 = String(d1).trim().toLowerCase();
  const c2 = String(d2).trim().toLowerCase();
  if (c1 === c2) return true;
  if (c1.startsWith("sat") && c2.startsWith("sat")) return true;
  if (c1.startsWith("sun") && c2.startsWith("sun")) return true;
  if (c1.startsWith("mon") && c2.startsWith("mon")) return true;
  if (c1.startsWith("tue") && c2.startsWith("tue")) return true;
  if (c1.startsWith("wed") && c2.startsWith("wed")) return true;
  if (c1.startsWith("thu") && c2.startsWith("thu")) return true;
  if (c1.startsWith("fri") && c2.startsWith("fri")) return true;
  return false;
};

/**
 * Checks if a routine's academic level/term matches the student's term.
 */
export const isSameTermOrLevel = (studentTerm, routineTerm) => {
  if (!studentTerm || !studentTerm.trim()) return true;
  if (!routineTerm || !routineTerm.trim() || routineTerm.trim().toLowerCase() === "all") return true;

  const sClean = studentTerm.trim().toLowerCase();
  const sDigits = sClean.replace(/[^0-9]/g, "");

  const parts = routineTerm.split(/[,/;|]/);
  for (const p of parts) {
    const pClean = p.trim().toLowerCase();
    if (!pClean || pClean === "all") return true;

    const pDigits = pClean.replace(/[^0-9]/g, "");

    // If both contain numbers (e.g. Semester 1 vs Semester 10), they must match numerically
    if (sDigits && pDigits) {
      if (sDigits === pDigits) {
        return true;
      }
      continue;
    }

    if (pClean === sClean) return true;
  }
  return false;
};

/**
 * Checks if a routine's section matches the student's section.
 */
export const matchesSection = (studentSection, routineSection) => {
  if (!studentSection || !studentSection.trim()) return true;
  if (!routineSection || !routineSection.trim() || routineSection.trim().toLowerCase() === "all") return true;

  const sClean = studentSection.trim().toUpperCase();
  const sLetter = sClean.replace(/[^A-Z]/g, "") || sClean;

  const parts = routineSection.split(/[,;|]/);
  for (const p of parts) {
    const pClean = p.trim().toUpperCase();
    if (!pClean || pClean === "ALL" || pClean === "N/A" || pClean === "NOT APPLICABLE" || pClean === "NA") return true;

    const pLetter = pClean.replace(/[^A-Z]/g, "") || pClean;
    if (sClean === pClean || sLetter.toLowerCase() === pLetter.toLowerCase() || pClean.includes(sClean) || sClean.includes(pClean)) {
      return true;
    }
  }
  return false;
};

/**
 * Filter personalized routine matching Android AcademicHelper.filterPersonalizedRoutine.
 * 1. Matches student department, section, and term.
 * 2. Matches routine code/subject against student's enrolled courses from auth data.
 * 3. Excludes any courses that have been marked completed / passed.
 * 4. Strictly returns only matching routines — NO fallback to all department routines!
 */
export const filterPersonalizedRoutine = (
  allRoutines,
  department = "ALL",
  term = "",
  section = "",
  studentSubjects = [],
  completedSubjects = []
) => {
  if (!Array.isArray(allRoutines) || allRoutines.length === 0) return [];
  if (!studentSubjects || studentSubjects.length === 0) return [];

  const studentDept = String(department || "").trim().toUpperCase();
  const addedKeys = new Set();
  const personalized = [];

  // Build set of completed / passed subject codes
  const cleanCompleted = new Set(
    (completedSubjects || [])
      .map((s) => normalizeSubjectCode(typeof s === "object" ? s.code || s.course_code : s))
      .filter(Boolean)
  );

  // Normalize student subjects from auth data, excluding any passed/completed subjects
  const cleanSubjects = (studentSubjects || [])
    .map((s) => normalizeSubjectCode(typeof s === "object" ? s.code || s.course_code : s))
    .filter((code) => code && !cleanCompleted.has(code));

  // If student has no active enrolled subjects, strictly return empty (no fallback)
  if (cleanSubjects.length === 0) {
    return [];
  }

  for (const r of allRoutines) {
    if (!r) continue;
    const rDept = String(r.department || "").trim().toUpperCase();
    const matchDept =
      !studentDept ||
      studentDept === "ALL" ||
      studentDept === "GENERAL" ||
      !rDept ||
      rDept === "ALL" ||
      rDept === "GENERAL" ||
      rDept === studentDept;

    if (!matchDept) continue;
    if (!matchesSection(section, r.section)) continue;
    if (!isSameTermOrLevel(term, r.batch || r.academicLevel || r.term)) continue;

    const rawCode = r.code || r.course_code || r.data?.code || "";
    const normCode = normalizeSubjectCode(rawCode);
    const normSubject = String(r.subject || r.course_title || r.data?.subject || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    // Routine must NOT be for a passed/completed subject
    if (
      (normCode && cleanCompleted.has(normCode)) ||
      (normSubject && cleanCompleted.has(normSubject))
    ) {
      continue;
    }

    let matchSubject = false;
    for (const sub of cleanSubjects) {
      if (normCode) {
        if (normCode === sub) {
          matchSubject = true;
          break;
        }
      } else if (normSubject && normSubject === sub) {
        matchSubject = true;
        break;
      }
    }

    if (matchSubject) {
      const key = r.id || `${r.code}_${r.day}_${r.startTime || r.timeSlot}_${r.classroom}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        personalized.push(r);
      }
    }
  }

  // Strictly return only matching personalized routines. No fallback to all routines!
  return personalized;
};
