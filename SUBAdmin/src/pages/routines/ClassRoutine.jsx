// Class Routine Management Page Component
import { isSuperAdmin, isAdmin } from "../../utils/permissionUtils";
import { DEPARTMENTS, normalizeDept, getDepartmentName } from "../../utils/academic";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import FirestoreService from "../../services/FirestoreService";

import {
  FiSearch,
  FiFilter,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiMapPin,
  FiUser,
  FiRepeat,
  FiLayers,
  FiCopy,
  FiChevronDown,
  FiCheck,
  FiAlertTriangle,
  FiBookOpen,
  FiArrowRight,
  FiArrowLeft,
  FiCalendar,
  FiInfo,
} from "react-icons/fi";
import {
  fetchRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  bulkDeleteRoutines,
  bulkImportRoutines,
  setSearchQuery,
  setFilters,
  clearRoutineStatus,
  isTermMatching,
} from "../../redux/slices/routineSlice";
import { fetchSubjects } from "../../redux/slices/subjectSlice";
import { fetchFaculty } from "../../redux/slices/facultySlice";
import Dialog from "../../components/common/Dialog";
import Badge from "../../components/common/Badge";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";

// Form validation schema
const schema = yup.object().shape({
  code: yup.string().required("Course Code is required"),
  subject: yup.string().required("Subject Name is required"),
  department: yup.string().required("Department is required"),
  academicLevel: yup.string().nullable(),
  day: yup.string().required("Day is required"),
  startTime: yup.string().required("Start Time is required"),
  endTime: yup.string().required("End Time is required"),
  teachers: yup.mixed().nullable(),
  tower: yup.string().nullable(),
  classroom: yup.string().required("Classroom is required"),
  section: yup.string().nullable(),
});

// Dynamic academic level/term selections based on selected department
const getAcademicLevelOptions = (dept) => {
  const norm = normalizeDept(dept);
  let count = 12;
  if (norm === "ARCH") {
    count = 10;
    return ["All", "N/A", ...Array.from({ length: count }, (_, i) => `Term-${i + 1}`)];
  } else if (norm === "CSE" || norm === "DSE") {
    count = 8;
  }
  return ["All", "N/A", ...Array.from({ length: count }, (_, i) => `Term-${i + 1}`)];
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  // Support both "09:00" (24h) and "09:00 AM" (12h) formats
  const match12 = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = parseInt(match12[2]);
    const ampm = match12[3].toUpperCase();
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = timeStr.match(/^(\d+):(\d+)$/);
  if (match24) {
    const hours = parseInt(match24[1]);
    const minutes = parseInt(match24[2]);
    return hours * 60 + minutes;
  }
  return 0;
};

const convertTo12Hour = (timeStr) => {
  if (!timeStr) return "";
  if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
    return timeStr.trim().toUpperCase();
  }
  const [hourStr, minuteStr] = timeStr.split(":");
  let hour = parseInt(hourStr, 10);
  const minutes = minuteStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${String(hour).padStart(2, "0")}:${minutes} ${ampm}`;
};

const convertTo24Hour = (time12h) => {
  if (!time12h) return "";
  if (
    time12h.includes(":") &&
    !time12h.toLowerCase().includes("am") &&
    !time12h.toLowerCase().includes("pm")
  ) {
    return time12h.trim();
  }
  const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12h;
  let [_, hours, minutes, ampm] = match;
  hours = parseInt(hours, 10);
  if (ampm.toUpperCase() === "PM" && hours < 12) {
    hours += 12;
  } else if (ampm.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

const calculateDurationString = (startTime, endTime) => {
  if (!startTime || !endTime) return "";
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (endMin <= startMin) return "";
  const diff = endMin - startMin;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours} hr ${minutes} min`;
  } else if (hours > 0) {
    return `${hours} hr`;
  } else {
    return `${minutes} min`;
  }
};




export const detectRoutineConflicts = (newRoutine, existingRoutines = [], excludeId = null) => {
  const conflicts = [];
  if (!newRoutine || !newRoutine.day || !newRoutine.startTime || !newRoutine.endTime) {
    return conflicts;
  }

  const startMin = parseTimeToMinutes(newRoutine.startTime);
  const endMin = parseTimeToMinutes(newRoutine.endTime);
  if (startMin >= endMin) {
    return conflicts;
  }

  const newDay = String(newRoutine.day).trim().toLowerCase();
  const newTower = String(newRoutine.tower || "").trim().toLowerCase();
  const newRoom = String(newRoutine.classroom || "").trim().toLowerCase();

  const isTbaTeacher = (t) => {
    const s = String(t || "").trim().toLowerCase();
    return !s || s === "tba" || s === "to be announced" || s === "n/a" || s === "none";
  };

  let newTeachers = [];
  if (Array.isArray(newRoutine.teachers)) {
    newTeachers = newRoutine.teachers
      .map((t) => String(t).trim().toLowerCase())
      .filter((t) => !isTbaTeacher(t));
  } else if (typeof newRoutine.teachers === "string") {
    newTeachers = newRoutine.teachers
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => !isTbaTeacher(t));
  }

  for (const existing of existingRoutines) {
    if (!existing) continue;
    const existingId = existing.id || existing.docId;
    if (excludeId && existingId && String(existingId) === String(excludeId)) {
      continue;
    }

    const exDay = String(existing.day || "").trim().toLowerCase();
    if (exDay !== newDay) continue;

    const exStartMin = parseTimeToMinutes(existing.startTime);
    const exEndMin = parseTimeToMinutes(existing.endTime);

    // Overlap: startA < endB && startB < endA
    const isTimeOverlap = startMin < exEndMin && exStartMin < endMin;
    if (!isTimeOverlap) continue;

    // 1. Room Overlap Check
    const exTower = String(existing.tower || "").trim().toLowerCase();
    const exRoom = String(existing.classroom || "").trim().toLowerCase();
    if (newRoom && exRoom && newRoom === exRoom && (!newTower || !exTower || newTower === exTower)) {
      conflicts.push({
        type: "ROOM_COLLISION",
        message: `Classroom Conflict: Room ${existing.classroom} (${existing.tower || "Main"}) is already assigned to ${existing.code} (${existing.subject}) from ${existing.startTime} to ${existing.endTime}.`,
        conflictingRoutine: existing,
      });
    }

    // 2. Teacher Overlap Check
    if (newTeachers.length > 0) {
      let exTeachers = [];
      if (Array.isArray(existing.teachers)) {
        exTeachers = existing.teachers
          .map((t) => String(t).trim().toLowerCase())
          .filter((t) => !isTbaTeacher(t));
      } else if (typeof existing.teachers === "string") {
        exTeachers = existing.teachers
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter((t) => !isTbaTeacher(t));
      }

      const commonTeacher = newTeachers.find((t) => exTeachers.includes(t));
      if (commonTeacher) {
        conflicts.push({
          type: "TEACHER_COLLISION",
          message: `Faculty Overlap: '${commonTeacher.toUpperCase()}' is already teaching ${existing.code} in Room ${existing.classroom} from ${existing.startTime} to ${existing.endTime}.`,
          conflictingRoutine: existing,
        });
      }
    }
  }

  return conflicts;
};

const getDeptFullName = (dept) => {
  return getDepartmentName(dept);
};

const formatTeachersList = (teachers) => {
  if (Array.isArray(teachers)) {
    return teachers.filter(Boolean).join(", ");
  }
  if (typeof teachers === "string") {
    return teachers.trim();
  }
  return "";
};

export const ClassRoutine = () => {
  const dispatch = useDispatch();
  const { filteredList, searchQuery, filters, loading, success, error } = useSelector(
    (state) => state.routines,
  );
  const { list: subjectsList } = useSelector((state) => state.subjects);
  const { list: facultyList } = useSelector((state) => state.faculty);
  const { user } = useSelector((state) => state.auth);

  const isSuperAdminUser = isSuperAdmin(user);
  const isDeptAdmin = isAdmin(user) && !isSuperAdminUser;
  const adminDept = isSuperAdminUser ? "" : normalizeDept(user?.department);
  const adminTerm = isSuperAdminUser ? "" : user?.term;

  // Component States
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeRoutine, setActiveRoutine] = useState(null);

  // Multi-Select & Selected Bulk Delete States
  const [selectedRoutineIds, setSelectedRoutineIds] = useState([]);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  // Bulk Import States & Post-Import Error Popup
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDepartment, setBulkDepartment] = useState("");
  const [bulkJson, setBulkJson] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importErrorsModalOpen, setImportErrorsModalOpen] = useState(false);
  const [importErrorsList, setImportErrorsList] = useState([]);
  const [importedSuccessCount, setImportedSuccessCount] = useState(0);

  const toggleSelectRoutine = (id) => {
    setSelectedRoutineIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (itemsToSelect) => {
    if (!itemsToSelect || itemsToSelect.length === 0) return;
    const allSelected = itemsToSelect.every((item) => selectedRoutineIds.includes(item.id));
    if (allSelected) {
      setSelectedRoutineIds((prev) => prev.filter((id) => !itemsToSelect.some((i) => i.id === id)));
    } else {
      const newIds = itemsToSelect.map((i) => i.id);
      setSelectedRoutineIds((prev) => Array.from(new Set([...prev, ...newIds])));
    }
  };

  const handleConfirmBulkDeleteSelected = async () => {
    if (selectedRoutineIds.length === 0) return;
    const count = selectedRoutineIds.length;
    try {
      await dispatch(bulkDeleteRoutines(selectedRoutineIds)).unwrap();
      toast.success(`${count} selected routine slot(s) deleted successfully!`);
      setSelectedRoutineIds([]);
      setConfirmBulkDeleteOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to delete selected routines");
    }
  };

  // Stepper & Multi-Assignment Builder States
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSubjectObj, setSelectedSubjectObj] = useState(null);
  const [autoGenerateSeparateEntries, setAutoGenerateSeparateEntries] = useState(false);
  const [expandedSubjectGroups, setExpandedSubjectGroups] = useState({});
  const [expandedCardDetails, setExpandedCardDetails] = useState({});

  const toggleSubjectGroup = (codeKey) => {
    setExpandedSubjectGroups((prev) => ({
      ...prev,
      [codeKey]: prev[codeKey] === undefined ? false : !prev[codeKey],
    }));
  };

  const toggleCardDetails = (id) => {
    setExpandedCardDetails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Teacher multi-select state (Add/Edit Modal)
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [manualTeacherInput, setManualTeacherInput] = useState("");
  const [facultySearch, setFacultySearch] = useState("");

  // Term & Section multi-select pill states
  const [selectedTermPills, setSelectedTermPills] = useState(["All"]);
  const [selectedSectionPills, setSelectedSectionPills] = useState(["All"]);
  const [isFacultyDirectoryOpen, setIsFacultyDirectoryOpen] = useState(false);

  const toggleTermPill = (term) => {
    if (term === "All") {
      setSelectedTermPills(["All"]);
      setValue("academicLevel", "All");
      return;
    }
    let updated = selectedTermPills.filter((t) => t !== "All");
    if (updated.includes(term)) {
      updated = updated.filter((t) => t !== term);
    } else {
      updated.push(term);
    }
    if (updated.length === 0) {
      updated = ["All"];
    }
    setSelectedTermPills(updated);
    setValue("academicLevel", updated.includes("All") ? "All" : updated.join(", "));
  };

  const toggleSectionPill = (sec) => {
    if (sec === "All") {
      setSelectedSectionPills(["All"]);
      setValue("section", "All");
      return;
    }
    let updated = selectedSectionPills.filter((s) => s !== "All");
    if (updated.includes(sec)) {
      updated = updated.filter((s) => s !== sec);
    } else {
      updated.push(sec);
    }
    if (updated.length === 0) {
      updated = ["All"];
    }
    setSelectedSectionPills(updated);
    setValue("section", updated.includes("All") ? "All" : updated.join(", "));
  };

  // Routine Type Filter ('All', 'Regular', 'Temporary')
  const [routineTypeFilter, setRoutineTypeFilter] = useState("All");

  // Reschedule / Temporary Routine Modal State
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleRoutine, setRescheduleRoutine] = useState(null);
  const [rescheduleMode, setRescheduleMode] = useState("copy"); // 'copy' or 'move'
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStartTime, setRescheduleStartTime] = useState("09:00");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("10:30");
  const [rescheduleTower, setRescheduleTower] = useState("Shadhinota");
  const [rescheduleClassroom, setRescheduleClassroom] = useState("");
  const [rescheduleTeachers, setRescheduleTeachers] = useState([]);
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleManualTeacher, setRescheduleManualTeacher] = useState("");
  const [rescheduleFacultySearch, setRescheduleFacultySearch] = useState("");

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteDept, setBulkDeleteDept] = useState(adminDept || "All");
  const [bulkDeleteTerm, setBulkDeleteTerm] = useState(adminTerm || "All");
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const handleBulkDelete = async () => {
    if (bulkDeleteDept === "All" && bulkDeleteTerm === "All" && !isSuperAdminUser) {
      toast.error("You must select a specific department or term to bulk delete.");
      return;
    }

    const targetRoutines = routinesToDisplay.filter((data) => {
      const matchDept =
        bulkDeleteDept === "All" ||
        normalizeDept(data.department) === normalizeDept(bulkDeleteDept);
      const matchTerm = bulkDeleteTerm === "All" || data.academicLevel === bulkDeleteTerm || data.term === bulkDeleteTerm;

      if (matchDept && matchTerm) {
        if (isDeptAdmin && normalizeDept(data.department) !== normalizeDept(adminDept)) {
          return false;
        }
        if (adminTerm && data.academicLevel !== adminTerm && data.term !== adminTerm) {
          return false;
        }
        return true;
      }
      return false;
    });

    const targetIds = targetRoutines.map((r) => r.id);

    if (targetIds.length === 0) {
      toast.info("No routines matched the criteria.");
      return;
    }

    setBulkDeleteLoading(true);
    try {
      await dispatch(bulkDeleteRoutines(targetIds)).unwrap();
      toast.success(`${targetIds.length} routine slot(s) deleted successfully!`);
      dispatch(fetchRoutines({ forceRefresh: true }));
      setBulkDeleteOpen(false);
    } catch (err) {
      toast.error(err || "Failed to delete routines");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Super Admin Merge Duplicates State & Logic
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [duplicateRoutineGroups, setDuplicateRoutineGroups] = useState([]);
  const [mergeLoading, setMergeLoading] = useState(false);

  const scanRoutineDuplicates = () => {
    const groups = {};
    filteredList.forEach((rot) => {
      if (rot.isTemporary) return; // Skip temporary routines
      const deptKey = normalizeDept(rot.department) || "UNKNOWN";
      const codeKey = (rot.code || rot.subject || "UNKNOWN").toUpperCase().trim();
      const groupKey = `${deptKey}_${codeKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(rot);
    });

    const duplicates = [];
    Object.entries(groups).forEach(([key, items]) => {
      const uniqueTerms = new Set(
        items.map((i) => i.academicLevel || i.term).filter(Boolean),
      );
      // ONLY available if the same subject is added across DIFFERENT terms of the same department
      if (uniqueTerms.size > 1) {
        duplicates.push({
          groupKey: key,
          dept: items[0].department,
          code: items[0].code,
          subject: items[0].subject,
          primaryId: items[0].id,
          items: items,
          terms: Array.from(uniqueTerms),
        });
      }
    });

    return duplicates;
  };

  const handleOpenMergeModal = () => {
    const found = scanRoutineDuplicates();
    setDuplicateRoutineGroups(found);
    setMergeModalOpen(true);
  };

  const setPrimarySlot = (groupKey, slotId) => {
    setDuplicateRoutineGroups((prev) =>
      prev.map((grp) => (grp.groupKey === groupKey ? { ...grp, primaryId: slotId } : grp)),
    );
  };

  const handleDeleteSingleSlot = async (groupKey, slotId) => {
    setMergeLoading(true);
    try {
      await dispatch(deleteRoutine(slotId));
      toast.success("Single duplicate slot deleted!");

      setDuplicateRoutineGroups((prev) =>
        prev
          .map((grp) => {
            if (grp.groupKey !== groupKey) return grp;
            const updatedItems = grp.items.filter((item) => item.id !== slotId);
            if (updatedItems.length <= 1) return null; // Remove group if no longer duplicated
            const newPrimaryId =
              grp.primaryId === slotId ? updatedItems[0].id : grp.primaryId;
            return { ...grp, items: updatedItems, primaryId: newPrimaryId };
          })
          .filter(Boolean),
      );

      dispatch(fetchRoutines({ forceRefresh: true }));
    } catch (err) {
      toast.error("Failed to delete slot: " + err.message);
    } finally {
      setMergeLoading(false);
    }
  };

  const handleMergeSingleGroup = async (group) => {
    setMergeLoading(true);
    try {
      const primaryItem = group.items.find((item) => item.id === group.primaryId) || group.items[0];
      const redundantItems = group.items.filter((item) => item.id !== primaryItem.id);

      const allTeachers = Array.from(
        new Set(
          group.items
            .flatMap((item) =>
              Array.isArray(item.teachers)
                ? item.teachers
                : item.teachers
                  ? item.teachers.split(",").map((t) => t.trim())
                  : [],
            )
            .filter(Boolean),
        ),
      );

      await FirestoreService.updateDocument("routines", primaryItem.id, {
        teachers: allTeachers,
        updatedAt: new Date().toISOString(),
      });

      await Promise.all(
        redundantItems.map((redDoc) => FirestoreService.deleteDocument("routines", redDoc.id))
      );

      toast.success(`Merged duplicate routine group for "${group.code} - ${group.subject}"!`);

      setDuplicateRoutineGroups((prev) => prev.filter((grp) => grp.groupKey !== group.groupKey));
      dispatch(fetchRoutines({ forceRefresh: true }));
    } catch (err) {
      toast.error("Failed to merge group: " + (err.message || err));
    } finally {
      setMergeLoading(false);
    }
  };

  const handleConfirmMergeAll = async () => {
    if (duplicateRoutineGroups.length === 0) return;
    setMergeLoading(true);
    try {
      let mergedGroupsCount = 0;
      let deletedDocsCount = 0;

      for (const group of duplicateRoutineGroups) {
        const primaryItem =
          group.items.find((item) => item.id === group.primaryId) || group.items[0];
        const redundantItems = group.items.filter((item) => item.id !== primaryItem.id);

        const allTeachers = Array.from(
          new Set(
            group.items
              .flatMap((item) =>
                Array.isArray(item.teachers)
                  ? item.teachers
                  : item.teachers
                    ? item.teachers.split(",").map((t) => t.trim())
                    : [],
              )
              .filter(Boolean),
          ),
        );

        await FirestoreService.updateDocument("routines", primaryItem.id, {
          teachers: allTeachers,
          updatedAt: new Date().toISOString(),
        });

        await Promise.all(
          redundantItems.map((redDoc) => FirestoreService.deleteDocument("routines", redDoc.id))
        );
        deletedDocsCount += redundantItems.length;
        mergedGroupsCount++;
      }

      toast.success(
        `Successfully merged all ${mergedGroupsCount} duplicate routine groups and deleted ${deletedDocsCount} redundant entries!`,
      );
      setMergeModalOpen(false);
      dispatch(fetchRoutines({ forceRefresh: true }));
    } catch (err) {
      toast.error("Failed to merge duplicate routines: " + (err.message || err));
    } finally {
      setMergeLoading(false);
    }
  };

  // Filter list by admin department, term, and routine type (Regular / Temporary)
  const cleanStr = (val) => String(val || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const routinesToDisplay = filteredList.filter((rot) => {
    const rotDept = rot.department || rot.dept || rot.departmentCode || "";
    const matchDept = !adminDept || !rotDept || normalizeDept(rotDept) === normalizeDept(adminDept);

    const rotTerm = rot.academicLevel || rot.term || rot.academic_level || rot.termName || "";
    const targetFilterTerm = adminTerm || filters.term;
    const matchTerm = isTermMatching(rotTerm, targetFilterTerm);

    let matchType = true;
    if (routineTypeFilter === "Regular") matchType = !rot.isTemporary;
    if (routineTypeFilter === "Temporary") matchType = !!rot.isTemporary;
    return matchDept && matchTerm && matchType;
  });

  const getWeekdayName = (dateStr) => {
    if (!dateStr) return "Sunday";
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3) return "Sunday";
    const [year, month, day] = parts;
    const dateObj = new Date(year, month - 1, day);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dateObj.getDay()] || "Sunday";
  };

  const openRescheduleModal = (routine) => {
    setRescheduleRoutine(routine);
    setRescheduleMode("copy");

    // Default target date to tomorrow YYYY-MM-DD
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);

    setRescheduleStartTime(convertTo24Hour(routine.startTime) || "09:00");
    setRescheduleEndTime(convertTo24Hour(routine.endTime) || "10:30");
    setRescheduleTower(routine.tower || "Shadhinota");
    setRescheduleClassroom(routine.classroom || "");

    const existingTeachers = Array.isArray(routine.teachers)
      ? routine.teachers
      : routine.teachers
        ? routine.teachers
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
        : [];
    setRescheduleTeachers(existingTeachers);
    setRescheduleNote("");
    setRescheduleManualTeacher("");
    setRescheduleFacultySearch("");
    setRescheduleOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleRoutine) return;
    if (!rescheduleDate) {
      toast.error("Target date is required for rescheduling.");
      return;
    }
    if (!rescheduleClassroom.trim()) {
      toast.error("Classroom location is required.");
      return;
    }

    setRescheduleLoading(true);
    try {
      const calculatedDay = getWeekdayName(rescheduleDate);
      const levelTerm = rescheduleRoutine.academicLevel || rescheduleRoutine.term || "";
      const tempPayload = {
        code: rescheduleRoutine.code,
        subject: rescheduleRoutine.subject,
        department: normalizeDept(rescheduleRoutine.department) || "CSE",
        academicLevel: levelTerm,
        term: levelTerm,
        day: calculatedDay,
        date: rescheduleDate,
        startTime: convertTo12Hour(rescheduleStartTime),
        endTime: convertTo12Hour(rescheduleEndTime),
        tower: rescheduleTower,
        classroom: rescheduleClassroom.trim(),
        teachers: rescheduleTeachers,
        isTemporary: true,
        rescheduleMode: rescheduleMode, // 'copy' or 'move'
        originalRoutineId: rescheduleRoutine.id,
        rescheduleNote: rescheduleNote.trim(),
        createdAt: new Date().toISOString(),
      };

      await dispatch(createRoutine(tempPayload));
      await dispatch(fetchRoutines({ forceRefresh: true }));

      toast.success(
        rescheduleMode === "copy"
          ? `Added extra temporary routine for ${rescheduleDate} (${calculatedDay})!`
          : `Routine slot rescheduled to ${rescheduleDate} (${calculatedDay})! Original weekly slot preserved.`,
      );
      setRescheduleOpen(false);
      setRescheduleRoutine(null);
    } catch (err) {
      toast.error("Failed to reschedule: " + err.message);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const toggleRescheduleTeacher = (name) => {
    setRescheduleTeachers((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const addRescheduleManualTeacher = () => {
    if (!rescheduleManualTeacher.trim()) return;
    const newTeachers = rescheduleManualTeacher
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setRescheduleTeachers((prev) => Array.from(new Set([...prev, ...newTeachers])));
    setRescheduleManualTeacher("");
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [courseSearchInput, setCourseSearchInput] = useState("");
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      department: adminDept || "CSE",
      academicLevel: adminTerm || "Term-1",
      section: "All",
      day: "Sunday",
      selectedSubjectCode: "",
      code: "",
      subject: "",
    },
  });

  const watchedDept = watch("department");
  const watchedTerm = watch("academicLevel");
  const watchedSubjectCode = watch("selectedSubjectCode");

  const availableSubjects = subjectsList.filter(
    (s) => normalizeDept(s.department) === normalizeDept(watchedDept),
  );

  const filteredAvailableSubjects = availableSubjects.filter((s) => {
    if (!courseSearchInput.trim()) return true;
    const q = courseSearchInput.toLowerCase().trim();
    return (
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      `${s.code} — ${s.name}`.toLowerCase().includes(q)
    );
  });

  // Active faculty members belonging to selected department with live search filter
  const displayedFaculty = facultyList.filter((f) => {
    const st = (f.status || "Active").trim().toLowerCase();
    if (st === "left" || st === "on leave" || st === "inactive" || st === "resigned" || st !== "active") return false;
    // Strictly filter by current selected department
    if (watchedDept && f.department && normalizeDept(f.department) !== normalizeDept(watchedDept)) {
      return false;
    }
    if (facultySearch.trim()) {
      const q = facultySearch.toLowerCase();
      return (
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.department && f.department.toLowerCase().includes(q)) ||
        (f.designation && f.designation.toLowerCase().includes(q)) ||
        (f.rank && f.rank.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const addManualTeacher = () => {
    if (!manualTeacherInput.trim()) return;
    const newTeachers = manualTeacherInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setSelectedTeachers((prev) => Array.from(new Set([...prev, ...newTeachers])));
    setManualTeacherInput("");
  };

  // Sync teachers field with selectedTeachers multi-select
  useEffect(() => {
    setValue("teachers", selectedTeachers.join(", "));
  }, [selectedTeachers, setValue]);

  const toggleTeacher = (name) => {
    setSelectedTeachers((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  // Sync code and subject fields when selectedSubjectCode changes
  useEffect(() => {
    if (watchedSubjectCode) {
      const matchingSubj = subjectsList.find((s) => s.code === watchedSubjectCode);
      if (matchingSubj) {
        setValue("code", matchingSubj.code);
        setValue("subject", matchingSubj.name);
      }
    } else if (availableSubjects.length > 0) {
      setValue("selectedSubjectCode", availableSubjects[0].code);
      setValue("code", availableSubjects[0].code);
      setValue("subject", availableSubjects[0].name);
    } else {
      setValue("code", "");
      setValue("subject", "");
    }
  }, [watchedSubjectCode, watchedDept, subjectsList, setValue, availableSubjects]);

  // Auto-set defaults based on department:
  useEffect(() => {
    if (selectedTermPills.length === 0 || (!selectedTermPills.includes("All") && !editMode)) {
      setSelectedTermPills(["All"]);
      setValue("academicLevel", "All");
    }
    if (selectedSectionPills.length === 0 && !editMode) {
      if (normalizeDept(watchedDept) === "ARCH") {
        setSelectedSectionPills(["N/A"]);
        setValue("section", "N/A");
      } else {
        setSelectedSectionPills(["All"]);
        setValue("section", "All");
      }
    }
  }, [watchedDept, setValue, editMode]);

  // Fetch routines, subjects and faculty on mount
  useEffect(() => {
    dispatch(fetchRoutines());
    dispatch(fetchSubjects());
    dispatch(fetchFaculty());
  }, [dispatch]);

  // Watch success/error state changes
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearRoutineStatus());
    }
    if (success) {
      toast.success(editMode ? "Class routine updated!" : "Class routine registered!");
      setModalOpen(false);
      reset();
      dispatch(clearRoutineStatus());
    }
  }, [success, error, editMode, dispatch, reset]);

  const handleSearchChange = (e) => {
    dispatch(setSearchQuery(e.target.value));
    setCurrentPage(1);
  };

  const handleFilterChange = (key, val) => {
    dispatch(setFilters({ [key]: val }));
    setCurrentPage(1);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = routinesToDisplay.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(routinesToDisplay.length / itemsPerPage);

  const onInvalid = (errors) => {
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      toast.error(`Please check required fields: ${errors[firstErrorKey]?.message || firstErrorKey}`);
    }
  };

  const onSubmit = async (data) => {
    const teachersArray = data.teachers
      ? typeof data.teachers === "string"
        ? data.teachers.split(",").map((t) => t.trim()).filter(Boolean)
        : Array.isArray(data.teachers)
          ? data.teachers
          : []
      : [];

    const isTbaTeacher = (t) => {
      const s = String(t || "").trim().toLowerCase();
      return !s || s === "tba" || s === "to be announced" || s === "n/a" || s === "none";
    };

    const deptCode = normalizeDept(adminDept || data.department) || "CSE";
    const termList = selectedTermPills.includes("All") || selectedTermPills.length === 0 ? ["All"] : selectedTermPills;
    const secList = selectedSectionPills.includes("All") || selectedSectionPills.length === 0 ? ["All"] : selectedSectionPills;
    const startTime12 = convertTo12Hour(data.startTime);
    const endTime12 = convertTo12Hour(data.endTime);

    // Auto-generate separate routine entries per Term & Section combination if requested
    if (autoGenerateSeparateEntries && (termList.length > 1 || secList.length > 1)) {
      const routinesToBatch = [];
      for (const tItem of termList) {
        for (const sItem of secList) {
          routinesToBatch.push({
            code: data.code,
            subject: data.subject,
            department: deptCode,
            academicLevel: tItem,
            term: tItem,
            section: sItem,
            day: data.day,
            startTime: startTime12,
            endTime: endTime12,
            tower: data.tower || "Shadhinota",
            classroom: data.classroom,
            teachers: teachersArray,
          });
        }
      }

      try {
        await dispatch(bulkImportRoutines({ routines: routinesToBatch, department: deptCode })).unwrap();
        toast.success(`Generated ${routinesToBatch.length} individual routine slots for ${data.code}!`);
        setModalOpen(false);
        dispatch(fetchRoutines({ forceRefresh: true }));
      } catch (err) {
        toast.error("Failed to generate multi-entry routines: " + err.message);
      }
      return;
    }

    const routinePayload = {
      code: data.code,
      subject: data.subject,
      department: deptCode,
      academicLevel: selectedTermPills.includes("All") ? "All" : selectedTermPills.join(", "),
      term: selectedTermPills.includes("All") ? "All" : selectedTermPills.join(", "),
      section: selectedSectionPills.includes("All") ? "All" : selectedSectionPills.join(", "),
      day: data.day,
      startTime: startTime12,
      endTime: endTime12,
      tower: data.tower || "Shadhinota",
      classroom: data.classroom,
      teachers: teachersArray,
    };

    try {
      if (editMode && activeRoutine) {
        await dispatch(updateRoutine({ id: activeRoutine.id || activeRoutine.docId, updatedData: routinePayload })).unwrap();
        toast.success("Routine slot updated successfully!");
      } else {
        await dispatch(createRoutine(routinePayload)).unwrap();
        toast.success("Routine slot registered successfully!");
      }
      setModalOpen(false);
      dispatch(fetchRoutines({ forceRefresh: true }));
    } catch (err) {
      toast.error("Failed to save routine: " + (err.message || err));
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentStep(1);
    setAutoGenerateSeparateEntries(false);
    setCourseSearchInput("");
    setIsCourseDropdownOpen(false);
    const initialDept = normalizeDept(adminDept) || "CSE";
    const deptSubjects = subjectsList.filter(
      (s) => normalizeDept(s.department) === initialDept,
    );
    const firstSubj = deptSubjects[0] || null;
    setSelectedSubjectObj(firstSubj);

    reset({
      selectedSubjectCode: firstSubj?.code || "",
      code: firstSubj?.code || "",
      subject: firstSubj?.name || "",
      department: initialDept,
      academicLevel: "All",
      section: "All",
      day: "Sunday",
      startTime: "09:00",
      endTime: "10:30",
      teachers: "",
      tower: "Shadhinota",
      classroom: "",
    });
    setSelectedTeachers([]);
    setManualTeacherInput("");
    setFacultySearch("");
    setSelectedTermPills(["All"]);
    setSelectedSectionPills(["All"]);
    setModalOpen(true);
  };

  const openEditModal = (routine) => {
    setEditMode(true);
    setCurrentStep(1);
    setAutoGenerateSeparateEntries(false);
    setActiveRoutine(routine);
    const normalizedDept = normalizeDept(routine.department) || "CSE";

    const matchingSubject = subjectsList.find(
      (s) => s.code && s.code.trim().toUpperCase() === (routine.code || "").trim().toUpperCase()
    ) || { code: routine.code, name: routine.subject, department: normalizedDept };
    setSelectedSubjectObj(matchingSubject);

    reset({
      selectedSubjectCode: routine.code,
      code: routine.code,
      subject: routine.subject,
      department: normalizedDept,
      academicLevel: routine.academicLevel,
      section: routine.section || "All",
      day: routine.day,
      startTime: convertTo24Hour(routine.startTime),
      endTime: convertTo24Hour(routine.endTime),
      teachers: Array.isArray(routine.teachers) ? routine.teachers.join(", ") : routine.teachers,
      tower: routine.tower,
      classroom: routine.classroom,
    });
    setSelectedTeachers(
      Array.isArray(routine.teachers)
        ? routine.teachers
        : routine.teachers
          ? routine.teachers.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
    );
    const termParts = (routine.academicLevel || "All").split(",").map((t) => t.trim()).filter(Boolean);
    setSelectedTermPills(termParts.length > 0 ? termParts : ["All"]);
    const secParts = (routine.section || "All").split(",").map((s) => s.trim()).filter(Boolean);
    setSelectedSectionPills(secParts.length > 0 ? secParts : ["All"]);
    setManualTeacherInput("");
    setFacultySearch("");
    setModalOpen(true);
  };

  const openDuplicateModal = (routine) => {
    setEditMode(false);
    setCurrentStep(1);
    setAutoGenerateSeparateEntries(false);
    setActiveRoutine(null);
    const normalizedDept = normalizeDept(routine.department) || "CSE";

    const matchingSubject = subjectsList.find(
      (s) => s.code && s.code.trim().toUpperCase() === (routine.code || "").trim().toUpperCase()
    ) || { code: routine.code, name: routine.subject, department: normalizedDept };
    setSelectedSubjectObj(matchingSubject);

    reset({
      selectedSubjectCode: routine.code,
      code: routine.code,
      subject: routine.subject,
      department: normalizedDept,
      academicLevel: routine.academicLevel,
      section: routine.section || "All",
      day: routine.day,
      startTime: convertTo24Hour(routine.startTime),
      endTime: convertTo24Hour(routine.endTime),
      teachers: Array.isArray(routine.teachers) ? routine.teachers.join(", ") : routine.teachers,
      tower: routine.tower,
      classroom: routine.classroom,
    });
    setSelectedTeachers(
      Array.isArray(routine.teachers)
        ? routine.teachers
        : routine.teachers
          ? routine.teachers.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
    );
    const termParts = (routine.academicLevel || "All").split(",").map((t) => t.trim()).filter(Boolean);
    setSelectedTermPills(termParts.length > 0 ? termParts : ["All"]);
    const secParts = (routine.section || "All").split(",").map((s) => s.trim()).filter(Boolean);
    setSelectedSectionPills(secParts.length > 0 ? secParts : ["All"]);
    setManualTeacherInput("");
    setFacultySearch("");
    setModalOpen(true);
    toast.info(`📋 Duplicating routine slot for ${routine.code}. Customize details & save as new entry!`);
  };

  const openDeleteDialog = (routine) => {
    setActiveRoutine(routine);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (activeRoutine) {
      const routineId = activeRoutine.id || activeRoutine.docId;
      if (!routineId) {
        toast.error("Invalid routine ID");
        return;
      }
      try {
        await dispatch(deleteRoutine(routineId)).unwrap();
        toast.success("Routine slot deleted!");
        setDeleteOpen(false);
        setActiveRoutine(null);
      } catch (err) {
        toast.error(err?.message || err || "Failed to delete routine");
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBulkJson(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkDepartment) {
      toast.error("Please select a department first.");
      return;
    }

    const text = bulkJson.trim();
    if (!text) {
      toast.error("Please upload or paste JSON or CSV data first.");
      return;
    }

    setBulkLoading(true);
    setValidationErrors([]);

    try {
      let parsed = [];
      if (text.startsWith("[")) {
        parsed = JSON.parse(text);
      } else {
        const rows = text.split("\n").map((r) => r.trim()).filter(Boolean);
        if (rows.length < 2) {
          toast.error("CSV must contain a header row and at least one data row.");
          setBulkLoading(false);
          return;
        }
        const headers = rows[0].split(",").map((h) => h.trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase());
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(",").map((c) => c.trim());
          const obj = {};
          headers.forEach((h, idx) => {
            if (h === "teachers" || h === "teacher") {
              obj.teachers = cols[idx] ? cols[idx].split(";").map((t) => t.trim()).filter(Boolean) : [];
            } else {
              const keyMap = {
                code: "code",
                subject: "subject",
                academiclevel: "academicLevel",
                term: "academicLevel",
                level: "academicLevel",
                day: "day",
                starttime: "startTime",
                endtime: "endTime",
                classroom: "classroom",
                room: "classroom",
                tower: "tower",
              };
              const mappedKey = keyMap[h];
              if (mappedKey) obj[mappedKey] = cols[idx] || "";
            }
          });
          parsed.push(obj);
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        toast.error("Format must be a valid JSON array or CSV.");
        setBulkLoading(false);
        return;
      }

      const errorsList = [];
      const validRoutines = [];
      const VALID_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      parsed.forEach((item, index) => {
        const rowNum = index + 1;
        const code = (item.code || "").trim();
        const rawSubject = (item.subject || "").trim();
        const day = (item.day || item.weekday || "").trim();
        const startTime = (item.startTime || "").trim();
        const endTime = (item.endTime || "").trim();
        const classroom = (item.classroom || item.room || "").trim();
        const teachersArr = Array.isArray(item.teachers)
          ? item.teachers.map((t) => String(t).trim()).filter(Boolean)
          : item.teachers
            ? String(item.teachers).split(",").map((t) => t.trim()).filter(Boolean)
            : [];

        const rowErrors = [];

        // 1. Basic Field Validations
        if (!code && !rawSubject) {
          rowErrors.push(`Row ${rowNum}: Missing subject code and subject name.`);
        }
        if (!day || !VALID_WEEKDAYS.some((d) => d.toLowerCase() === day.toLowerCase())) {
          rowErrors.push(`Row ${rowNum} (${code || rawSubject || "Slot"}): Missing or invalid weekday '${day}'.`);
        }
        if (!startTime || !endTime) {
          rowErrors.push(`Row ${rowNum} (${code || rawSubject || "Slot"}): Missing start or end time.`);
        }
        if (!classroom) {
          rowErrors.push(`Row ${rowNum} (${code || rawSubject || "Slot"}): Missing classroom location.`);
        }
        if (teachersArr.length === 0) {
          rowErrors.push(`Row ${rowNum} (${code || rawSubject || "Slot"}): Missing teacher assignment.`);
        }

        // 2. Resolve Subject Name (Use provided subject name, or fallback to registered subject name if missing)
        let resolvedSubjectName = rawSubject;
        if (!resolvedSubjectName && code) {
          const registeredSubj = subjectsList.find(
            (s) => s.code && s.code.trim().toUpperCase() === code.toUpperCase()
          );
          if (registeredSubj?.name) {
            resolvedSubjectName = registeredSubj.name;
          }
        }

        // 3. Subject & Time Duplicate Check (Term is irrelevant)
        const startMin = parseTimeToMinutes(startTime);
        const endMin = parseTimeToMinutes(endTime);

        if (startMin > 0 && endMin > startMin && day) {
          const isSubjectTimeDuplicate = filteredList.some((r) => {
            if (r.isTemporary) return false;

            const sameDept = normalizeDept(r.department) === normalizeDept(bulkDepartment);
            if (!sameDept) return false;

            const sameDay = r.day?.toLowerCase().trim() === day.toLowerCase().trim();
            if (!sameDay) return false;

            const codeMatch = code && r.code && r.code.toUpperCase().trim() === code.toUpperCase().trim();
            const nameMatch = rawSubject && r.subject && r.subject.toLowerCase().trim() === rawSubject.toLowerCase().trim();
            const sameSubject = codeMatch || nameMatch;
            if (!sameSubject) return false;

            const rStart = parseTimeToMinutes(r.startTime);
            const rEnd = parseTimeToMinutes(r.endTime);
            return Math.max(startMin, rStart) < Math.min(endMin, rEnd);
          });

          if (isSubjectTimeDuplicate) {
            rowErrors.push(
              `Row ${rowNum} (${code || rawSubject}): Subject routine slot on ${day} (${startTime} - ${endTime}) already exists.`
            );
          }

          // 4. Room or Teacher Collision Check
          if (classroom && !isSubjectTimeDuplicate) {
            const conflictInDb = filteredList.find((r) => {
              if (r.day?.toLowerCase() !== day.toLowerCase()) return false;
              const rStart = parseTimeToMinutes(r.startTime);
              const rEnd = parseTimeToMinutes(r.endTime);
              const timesOverlap = Math.max(startMin, rStart) < Math.min(endMin, rEnd);
              if (!timesOverlap) return false;

              if (r.classroom?.toLowerCase().trim() === classroom.toLowerCase().trim()) return true;

              const rTeachers = Array.isArray(r.teachers) ? r.teachers : (r.teachers ? r.teachers.split(",") : []);
              if (teachersArr.some((t) => rTeachers.some((rt) => rt.toLowerCase().trim() === t.toLowerCase()))) return true;

              return false;
            });

            if (conflictInDb) {
              rowErrors.push(`Row ${rowNum} (${code || rawSubject}): Schedule conflict on ${day} (${startTime}-${endTime}, Room ${classroom}).`);
            }
          }
        }

        if (rowErrors.length > 0) {
          errorsList.push(...rowErrors);
        } else {
          let rawTerm = item.academicLevel || item.term || item.level || "Term-1";
          if (typeof rawTerm === "number") rawTerm = `Term-${rawTerm}`;

          validRoutines.push({
            code: code || "SUB-101",
            subject: resolvedSubjectName || rawSubject || code,
            department: bulkDepartment,
            academicLevel: String(rawTerm),
            term: String(rawTerm),
            day: day ? day.charAt(0).toUpperCase() + day.slice(1).toLowerCase() : "Sunday",
            startTime: convertTo12Hour(startTime),
            endTime: convertTo12Hour(endTime),
            classroom,
            tower: item.tower || "Shadhinota",
            teachers: teachersArr,
          });
        }
      });

      // 4. FIRST COMPLETE THE GOOD ONES!
      if (validRoutines.length > 0) {
        await dispatch(bulkImportRoutines({ routines: validRoutines, department: bulkDepartment })).unwrap();
        toast.success(`Successfully imported ${validRoutines.length} valid routine slots for ${bulkDepartment}!`);
      }

      setBulkOpen(false);
      setBulkJson("");
      setBulkDepartment("");
      setValidationErrors([]);

      // 5. AT LAST SHOW THE ERRORS AS A POPUP!
      if (errorsList.length > 0) {
        setImportedSuccessCount(validRoutines.length);
        setImportErrorsList(errorsList);
        setImportErrorsModalOpen(true);
      } else if (validRoutines.length === 0) {
        toast.error("No valid routine slots found to import.");
      }
    } catch (e) {
      toast.error("Import failed: " + e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const renderCalendarGrid = () => {
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return (
      <div className="space-y-4">
        {daysOfWeek.map((day) => {
          const dayRoutines = routinesToDisplay
            .filter((r) => r.day === day)
            .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

          return (
            <div
              key={day}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">
                  {day}
                </h3>
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full">
                  {dayRoutines.length} classes
                </span>
              </div>

              {dayRoutines.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayRoutines.map((rot) => (
                    <div
                      key={rot.id}
                      className="relative group p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850/60 rounded-xl flex flex-col justify-between"
                    >
                      <div className="absolute top-3.5 right-3.5 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(!isDeptAdmin || rot.department === adminDept) && (
                          <button
                            onClick={() => openRescheduleModal(rot)}
                            className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                            title="Reschedule / Temporary Routine"
                          >
                            <FiRepeat size={12} />
                          </button>
                        )}
                        {(!isDeptAdmin || rot.department === adminDept) && (
                          <button
                            onClick={() => openEditModal(rot)}
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 size={12} />
                          </button>
                        )}
                        {(isSuperAdminUser ||
                          (isDeptAdmin && normalizeDept(rot.department) === normalizeDept(adminDept))) && (
                            <button
                              onClick={() => openDeleteDialog(rot)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input
                            type="checkbox"
                            checked={selectedRoutineIds.includes(rot.id)}
                            onChange={() => toggleSelectRoutine(rot.id)}
                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer shrink-0"
                            title="Select routine for bulk actions"
                          />
                          <span className="text-[10px] font-bold text-blue-500 font-mono uppercase">
                            {rot.code}
                          </span>
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded font-semibold">
                            {getDeptFullName(rot.department)}
                          </span>
                          {rot.isTemporary && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border ${rot.rescheduleMode === "move"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                }`}
                            >
                              {rot.rescheduleMode === "move"
                                ? `🔄 Rescheduled: ${rot.date || rot.day}`
                                : `⚡ Temporary: ${rot.date || rot.day}`}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-100 mt-1 line-clamp-1">
                          {rot.subject}
                        </h4>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <FiClock size={12} className="text-blue-500/70" />
                          <span className="font-semibold text-slate-700 dark:text-slate-350">
                            {rot.startTime} - {rot.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <FiMapPin size={12} className="text-pink-500/70" />
                          <span className="font-semibold text-slate-750 dark:text-slate-350">
                            {rot.tower} Block, Room {rot.classroom}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <FiUser size={12} className="text-indigo-500/70" />
                          <span className="font-semibold text-slate-600 dark:text-slate-400 truncate">
                            {formatTeachersList(rot.teachers) || "No Teacher"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 mb-2">
                  Paste JSON array or CSV text.
                  <br />
                  CSV Headers:{" "}
                  <code>
                    code, subject, department, level, day, startTime, endTime, room, tower, teachers
                  </code>
                  .
                  <br />
                  Separate multiple teachers with a semicolon <code>;</code>.
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-black text-black dark:text-white tracking-tight uppercase">
            Class Routines
          </h1>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-bold">
            Plan weekday lectures, map teacher assignments, and track classroom allocations.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl shrink-0 w-full sm:w-auto justify-center p-1 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${viewMode === "list"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${viewMode === "grid"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
            >
              Grid View
            </button>
          </div>
          <button
            onClick={() => setBulkOpen(true)}
            className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-xs"
          >
            <span>Bulk Import (JSON / CSV)</span>
          </button>
          {isSuperAdminUser && (
            <button
              onClick={handleOpenMergeModal}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 rounded-xl transition-all text-xs font-bold cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              <FiLayers className="text-sm" />
              <span>Merge Duplicates</span>
            </button>
          )}
          {(isSuperAdminUser || isDeptAdmin) && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-xl transition-all text-xs font-bold cursor-pointer shadow-xs"
            >
              Bulk Delete
            </button>
          )}
          <button
            onClick={openAddModal}
            className="px-4 py-2 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer btn-primary-gradient rounded-xl shadow-xs"
          >
            <FiPlus className="text-sm" />
            <span>Add Routine</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-xs text-slate-400 dark:text-slate-500">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" />
          <input
            type="text"
            placeholder="Search by subject, code, teacher..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto flex-wrap gap-y-2">
          {/* Department */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <FiFilter className="text-slate-400" />
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Weekday */}
          <div className="flex items-center space-x-1.5 text-xs">
            <select
              value={filters.day}
              onChange={(e) => handleFilterChange("day", e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <option value="All">All Weekdays</option>
              <option value="Sunday">Sunday</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
            </select>
          </div>

          {/* Term (Academic Level) */}
          <div className="flex items-center space-x-1.5 text-xs">
            <select
              value={filters.term || "All"}
              onChange={(e) => handleFilterChange("term", e.target.value)}
              disabled={!!adminTerm}
              className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer disabled:opacity-60"
            >
              <option value="All">All Terms</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((t) => (
                <option key={t} value={`Term-${t}`}>
                  Term-{t}
                </option>
              ))}
            </select>
          </div>

          {/* Routine Type Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <select
              value={routineTypeFilter}
              onChange={(e) => {
                setRoutineTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <option value="All">All Schedule Types</option>
              <option value="Regular">Regular Weekly Only</option>
              <option value="Temporary">Temporary / Rescheduled Only</option>
            </select>
          </div>

          {/* Select All Toggle */}
          <button
            type="button"
            onClick={() => toggleSelectAll(currentItems)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 border border-slate-200 dark:border-slate-800"
          >
            {currentItems.length > 0 && currentItems.every((item) => selectedRoutineIds.includes(item.id))
              ? "Unselect All"
              : "Select All"}
          </button>
        </div>
      </div>

      {/* Floating Bulk Selection Bar */}
      {selectedRoutineIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in border border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-600 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
              {selectedRoutineIds.length} Selected
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {selectedRoutineIds.length === 1
                ? "1 routine slot selected"
                : `${selectedRoutineIds.length} routine slots selected`}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedRoutineIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setConfirmBulkDeleteOpen(true)}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 shadow-sm"
            >
              <FiTrash2 size={13} />
              <span>Delete Selected ({selectedRoutineIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Routine Content View */}
      {loading && !filteredList.length ? (
        <LoadingSkeleton type="table" count={1} rows={8} cols={6} />
      ) : viewMode === "grid" ? (
        renderCalendarGrid()
      ) : (
        <>
          {/* Routine List Grouped by Department and Subject Code */}
          <div className="space-y-8">
            {Object.keys(
              currentItems.reduce((acc, rot) => {
                const deptKey = normalizeDept(rot.department) || rot.department || "Other";
                if (!acc[deptKey]) acc[deptKey] = [];
                acc[deptKey].push(rot);
                return acc;
              }, {}),
            ).length > 0 ? (
              Object.entries(
                currentItems.reduce((acc, rot) => {
                  const deptKey = normalizeDept(rot.department) || rot.department || "Other";
                  if (!acc[deptKey]) acc[deptKey] = [];
                  acc[deptKey].push(rot);
                  return acc;
                }, {}),
              ).map(([dept, items]) => {
                // Group items by Subject Code within department
                const groupedBySubject = items.reduce((acc, rot) => {
                  const codeKey = (rot.code || rot.subject || "UNKNOWN").trim().toUpperCase();
                  if (!acc[codeKey]) {
                    acc[codeKey] = {
                      code: rot.code,
                      subject: rot.subject,
                      items: [],
                    };
                  }
                  acc[codeKey].items.push(rot);
                  return acc;
                }, {});

                return (
                  <div key={dept} className="space-y-4 fade-in">
                    {/* Department Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          {getDeptFullName(dept)} Department
                        </h3>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                          {Object.keys(groupedBySubject).length} Subjects ({items.length} Routine Slots)
                        </span>
                      </div>
                    </div>

                    {/* Grouped Subject Cards Deck */}
                    <div className="space-y-4">
                      {Object.entries(groupedBySubject).map(([subCode, subGroup]) => {
                        const isExpanded = expandedSubjectGroups[subCode] !== false; // Default expanded
                        return (
                          <div
                            key={subCode}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition-all"
                          >
                            {/* Subject Group Accordion Header */}
                            <div
                              onClick={() => toggleSubjectGroup(subCode)}
                              className="px-5 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer border-b border-slate-100 dark:border-slate-800 transition-colors"
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg shrink-0 border border-blue-200/50 dark:border-blue-900/50">
                                  {subGroup.code || subCode}
                                </span>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {subGroup.subject}
                                </h3>
                              </div>

                              <div className="flex items-center space-x-3 shrink-0 ml-3">
                                <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-lg">
                                  {subGroup.items.length} {subGroup.items.length === 1 ? "Routine Slot" : "Routine Slots"}
                                </span>
                                <button
                                  type="button"
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                                >
                                  <FiChevronDown className={`text-base transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                              </div>
                            </div>

                            {/* Subject Group Accordion Body (Routine Entries Grid) */}
                            {isExpanded && (
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-950/40">
                                {subGroup.items.map((rot) => {
                                  const isDetailsExpanded = expandedCardDetails[rot.id] === true;
                                  const conflicts = detectRoutineConflicts(rot, filteredList, rot.id);
                                  const hasRoomConflict = conflicts.some((c) => c.type === "ROOM_COLLISION");
                                  const hasTeacherConflict = conflicts.some((c) => c.type === "TEACHER_COLLISION");
                                  const teachersList = formatTeachersList(rot.teachers);

                                  return (
                                    <div
                                      key={rot.id}
                                      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between relative space-y-3 shadow-xs hover:shadow-md transition-all ${conflicts.length > 0
                                          ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/40"
                                          : ""
                                        }`}
                                    >
                                      {/* 1. HEADER ROW */}
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 pr-24">
                                          <input
                                            type="checkbox"
                                            checked={selectedRoutineIds.includes(rot.id)}
                                            onChange={() => toggleSelectRoutine(rot.id)}
                                            className="w-4 h-4 rounded text-blue-600 border-slate-300 cursor-pointer shrink-0"
                                            title="Select slot"
                                          />
                                          <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">
                                            {rot.code}
                                          </span>
                                          <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
                                            {rot.courseType || rot.type || "Theory"}
                                          </span>
                                          {(rot.credits || rot.credit) && (
                                            <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                                              {rot.credits || rot.credit} Cr
                                            </span>
                                          )}
                                        </div>

                                        {/* Action Panel (Right side) */}
                                        <div className="absolute top-4 right-4 flex space-x-1">
                                          {(!isDeptAdmin || rot.department === adminDept) && (
                                            <button
                                              type="button"
                                              onClick={() => openDuplicateModal(rot)}
                                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                              title="Duplicate / Copy Routine Slot"
                                            >
                                              <FiCopy size={13} />
                                            </button>
                                          )}
                                          {(!isDeptAdmin || rot.department === adminDept) && (
                                            <button
                                              type="button"
                                              onClick={() => openRescheduleModal(rot)}
                                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                              title="Reschedule / Temporary Routine"
                                            >
                                              <FiRepeat size={13} />
                                            </button>
                                          )}
                                          {(!isDeptAdmin || rot.department === adminDept) && (
                                            <button
                                              type="button"
                                              onClick={() => openEditModal(rot)}
                                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                              title="Edit Slot"
                                            >
                                              <FiEdit2 size={13} />
                                            </button>
                                          )}
                                          {(isSuperAdminUser ||
                                            (isDeptAdmin && normalizeDept(rot.department) === normalizeDept(adminDept))) && (
                                              <button
                                                type="button"
                                                onClick={() => openDeleteDialog(rot)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                                title="Delete Slot"
                                              >
                                                <FiTrash2 size={13} />
                                              </button>
                                            )}
                                        </div>
                                      </div>

                                      {/* Subject Name */}
                                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                                        {rot.subject}
                                      </h3>

                                      {/* 2. APPLICABILITY CHIPS */}
                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">
                                          {normalizeDept(rot.department)}
                                        </span>
                                        <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-md">
                                          {rot.academicLevel === "All" ? "All Terms" : rot.academicLevel || "All Terms"}
                                        </span>
                                        <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md">
                                          {rot.section === "All" ? "All Sections" : rot.section ? `Sec ${rot.section}` : "All Sections"}
                                        </span>
                                      </div>

                                      {/* 3. SCHEDULE SECTION */}
                                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
                                            <FiCalendar className="text-blue-500 text-xs shrink-0" />
                                            <span>{rot.day}</span>
                                          </div>
                                          {calculateDurationString(rot.startTime, rot.endTime) && (
                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                              {calculateDurationString(rot.startTime, rot.endTime)}
                                            </span>
                                          )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                          <div className="flex items-center">
                                            <FiClock className="mr-1.5 text-slate-400 shrink-0 text-xs" />
                                            <span>{rot.startTime} – {rot.endTime}</span>
                                          </div>
                                          <div className="flex items-center">
                                            <FiMapPin className="mr-1.5 text-slate-400 shrink-0 text-xs" />
                                            <span>{rot.tower || "TBA"}, {rot.classroom ? `Room ${rot.classroom}` : "TBA"}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* 4. TEACHER ASSIGNMENT */}
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                                          Assigned Faculty:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                          {teachersList && teachersList !== "TBA" ? (
                                            teachersList.split(",").map((t, idx) => (
                                              <span
                                                key={idx}
                                                className="inline-flex items-center space-x-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg"
                                              >
                                                <FiUser className="text-slate-400 text-[10px]" />
                                                <span>{t.trim()}</span>
                                              </span>
                                            ))
                                          ) : (
                                            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
                                              <FiAlertTriangle className="text-amber-500 text-[10px]" />
                                              <span>Teacher TBA</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* 5. STATUS BADGES & CONFLICT INDICATORS */}
                                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        {rot.isTemporary && (
                                          <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                            ⚡ Temp: {rot.date || rot.day}
                                          </span>
                                        )}
                                        {rot.rescheduleMode === "move" && (
                                          <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                            🔄 Rescheduled
                                          </span>
                                        )}

                                        {/* Conflict Warning Chips */}
                                        {hasRoomConflict && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const c = conflicts.find((x) => x.type === "ROOM_COLLISION");
                                              toast.warn(c?.message || "Room conflict detected!");
                                            }}
                                            className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center space-x-1 cursor-pointer hover:bg-red-500/20"
                                            title="Click for conflict details"
                                          >
                                            <FiAlertTriangle size={10} />
                                            <span>⚠ Room Conflict</span>
                                          </button>
                                        )}
                                        {hasTeacherConflict && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const c = conflicts.find((x) => x.type === "TEACHER_COLLISION");
                                              toast.warn(c?.message || "Teacher schedule collision detected!");
                                            }}
                                            className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center space-x-1 cursor-pointer hover:bg-amber-500/20"
                                            title="Click for conflict details"
                                          >
                                            <FiAlertTriangle size={10} />
                                            <span>⚠ Teacher Conflict</span>
                                          </button>
                                        )}
                                      </div>

                                      {/* 6. OPTIONAL NOTES */}
                                      {(rot.note || rot.rescheduleNote) && (
                                        <div className="p-2 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                          <span className="font-bold text-slate-700 dark:text-slate-300">Note: </span>
                                          <span>{rot.note || rot.rescheduleNote}</span>
                                        </div>
                                      )}

                                      {/* 7. EXPANDABLE DETAILS ACCORDION TOGGLE */}
                                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex flex-col space-y-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleCardDetails(rot.id)}
                                          className="flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer w-full"
                                        >
                                          <span>{isDetailsExpanded ? "Hide Details" : "Show Details"}</span>
                                          <FiChevronDown className={`transition-transform duration-200 ${isDetailsExpanded ? "rotate-180" : ""}`} />
                                        </button>

                                        {isDetailsExpanded && (
                                          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1.5 fade-in font-mono">
                                            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                                              <div><b>Code:</b> {rot.code}</div>
                                              <div><b>Credits:</b> {rot.credits || rot.credit || "3.0"}</div>
                                              <div><b>Dept:</b> {getDeptFullName(normalizeDept(rot.department))}</div>
                                              <div><b>Terms:</b> {rot.academicLevel}</div>
                                              <div><b>Sections:</b> {rot.section || "All"}</div>
                                              <div><b>Day:</b> {rot.day}</div>
                                              <div className="col-span-2"><b>Time:</b> {rot.startTime} – {rot.endTime} ({calculateDurationString(rot.startTime, rot.endTime)})</div>
                                              <div className="col-span-2"><b>Location:</b> {rot.tower || "TBA"}, {rot.classroom ? `Room ${rot.classroom}` : "TBA"}</div>
                                              <div className="col-span-2"><b>Teachers:</b> {teachersList || "TBA"}</div>
                                              {rot.createdAt && (
                                                <div className="col-span-2 text-[10px] text-slate-400">
                                                  <b>Created:</b> {new Date(rot.createdAt).toLocaleString()}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 text-center text-slate-400 dark:text-slate-500 font-semibold w-full">
                No class schedules registered for the matching search filters.
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit Routine Dialog (5-Step Stepper Builder) */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="xl"
        title={editMode ? "Edit Class Routine Slot" : "Routine Builder & Assignment Stepper"}
      >
        <div className="space-y-6">
          {/* STEP PROGRESS HEADER */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              <span>Step {currentStep} of 5</span>
              <span className="text-blue-600 dark:text-blue-400">
                {currentStep === 1 && "1. Select Subject"}
                {currentStep === 2 && "2. Select Applicability"}
                {currentStep === 3 && "3. Schedule & Location"}
                {currentStep === 4 && "4. Faculty Assignment"}
                {currentStep === 5 && "5. Review & Confirm"}
              </span>
            </div>
            {/* Progress Bar Pills */}
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((stepNum) => (
                <div
                  key={stepNum}
                  onClick={() => setCurrentStep(stepNum)}
                  className={`h-1.5 rounded-full cursor-pointer transition-all ${stepNum === currentStep
                      ? "bg-blue-600 dark:bg-blue-500 shadow-xs"
                      : stepNum < currentStep
                        ? "bg-emerald-500"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {/* STEP 1: SELECT SUBJECT */}
            {currentStep === 1 && (
              <div className="space-y-4 fade-in">
                <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display">
                    Step 1: Choose Course / Subject
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Department Dropdown */}
                    <div className="flex flex-col">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Department
                      </label>
                      <select
                        {...register("department")}
                        disabled={!!adminDept}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium cursor-pointer text-slate-800 dark:text-slate-200 disabled:opacity-70"
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept.code} value={dept.code}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Registered Course (Single Searchable Combobox) */}
                    <div className="flex flex-col space-y-1 relative">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Select Registered Course
                      </label>
                      <div className="relative">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={courseSearchInput || (watch("code") ? `${watch("code")} — ${watch("subject")}` : "")}
                          onFocus={() => setIsCourseDropdownOpen(true)}
                          onChange={(e) => {
                            setCourseSearchInput(e.target.value);
                            setIsCourseDropdownOpen(true);
                          }}
                          placeholder="Type course code or name to search..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none" />
                      </div>

                      {/* Floating Dropdown Options List */}
                      {isCourseDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsCourseDropdownOpen(false)}
                          />
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                            {filteredAvailableSubjects.map((subj) => {
                              const isSelected = watch("code") === subj.code;
                              return (
                                <div
                                  key={subj.code}
                                  onClick={() => {
                                    setValue("selectedSubjectCode", subj.code);
                                    setValue("code", subj.code);
                                    setValue("subject", subj.name);
                                    setSelectedSubjectObj(subj);
                                    setCourseSearchInput(`${subj.code} — ${subj.name}`);
                                    setIsCourseDropdownOpen(false);
                                  }}
                                  className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center justify-between ${isSelected
                                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                                    }`}
                                >
                                  <span className="truncate">{subj.code} — {subj.name}</span>
                                  {isSelected && <FiCheck className="text-blue-600 dark:text-blue-400 shrink-0 ml-2 text-xs" />}
                                </div>
                              );
                            })}
                            {filteredAvailableSubjects.length === 0 && (
                              <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 text-center italic">
                                No matching courses found
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Selected Subject Preview Card */}
                  {watch("code") && (
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                          {watch("code")}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {selectedSubjectObj?.type || "Theory / Lab"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {watch("subject")}
                      </h3>
                      <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>Dept: <b>{getDeptFullName(watchedDept || adminDept)}</b></span>
                        <span>Credit: <b>{selectedSubjectObj?.credits || selectedSubjectObj?.credit || "3.0"}</b></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: SELECT APPLICABILITY */}
            {currentStep === 2 && (
              <div className="space-y-4 fade-in">
                <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display">
                    Step 2: Define Terms & Sections Applicability
                  </h4>

                  {/* Applicability Summary Card */}
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold">Summary: </span>
                      <span>
                        Applies to <b>{selectedTermPills.includes("All") ? "All Terms" : selectedTermPills.join(", ")}</b> |
                        Sections <b>{selectedSectionPills.includes("All") ? "All Sections" : selectedSectionPills.join(", ")}</b>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Applicable Terms */}
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Applicable Terms
                        </label>
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                          {selectedTermPills.includes("All") || selectedTermPills.length === 0
                            ? "All Terms"
                            : `${selectedTermPills.length} Selected`}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-40 overflow-y-auto">
                        {getAcademicLevelOptions(watchedDept).map((term) => {
                          const isSelected = selectedTermPills.includes(term);
                          return (
                            <button
                              key={term}
                              type="button"
                              onClick={() => toggleTermPill(term)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${isSelected
                                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60"
                                }`}
                            >
                              {term === "All" ? "All Terms" : term}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Applicable Sections (Visible for all departments) */}
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Applicable Sections
                        </label>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                          {selectedSectionPills.includes("All") || selectedSectionPills.length === 0
                            ? "All Sections"
                            : `${selectedSectionPills.length} Selected`}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-40 overflow-y-auto">
                        {[
                          { key: "All", label: "All Sections" },
                          { key: "N/A", label: "N/A (Not Applicable)" },
                          { key: "A/1", label: "Section A/1" },
                          { key: "B/2", label: "Section B/2" },
                          { key: "C/3", label: "Section C/3" },
                          { key: "D/4", label: "Section D/4" },
                          { key: "E/5", label: "Section E/5" },
                        ].map((sec) => {
                          const isSelected = selectedSectionPills.includes(sec.key);
                          return (
                            <button
                              key={sec.key}
                              type="button"
                              onClick={() => toggleSectionPill(sec.key)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${isSelected
                                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60"
                                }`}
                            >
                              {sec.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SCHEDULE & LOCATION */}
            {currentStep === 3 && (
              <div className="space-y-4 fade-in">
                <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display">
                      Step 3: Schedule & Room Location
                    </h4>
                    {calculateDurationString(watch("startTime"), watch("endTime")) && (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <FiClock className="text-purple-500" />
                        <span>Duration: {calculateDurationString(watch("startTime"), watch("endTime"))}</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {/* Day */}
                    <div className="flex flex-col">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Lecture Day
                      </label>
                      <select
                        {...register("day")}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer text-slate-800 dark:text-slate-200"
                      >
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Start Time */}
                    <div className="flex flex-col">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        {...register("startTime")}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    {/* End Time */}
                    <div className="flex flex-col">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        {...register("endTime")}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    {/* Tower */}
                    <div className="flex flex-col">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Building / Tower
                      </label>
                      <select
                        {...register("tower")}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer text-slate-800 dark:text-slate-200"
                      >
                        <option value="Shadhinota">Shadhinota Tower</option>
                        <option value="Bijoy">Bijoy Tower</option>
                      </select>
                    </div>

                    {/* Classroom */}
                    <div className="flex flex-col">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Classroom
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Room 502"
                        {...register("classroom")}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: TEACHER ASSIGNMENT */}
            {currentStep === 4 && (
              <div className="space-y-4 fade-in">
                <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display">
                      Step 4: Teacher & Faculty Assignment
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedTeachers.includes("TBA")) {
                          toggleTeacher("TBA");
                        } else {
                          setSelectedTeachers((prev) => Array.from(new Set([...prev, "TBA"])));
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${selectedTeachers.includes("TBA")
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900"
                        }`}
                    >
                      {selectedTeachers.includes("TBA") ? "✓ TBA Selected" : "+ Assign TBA"}
                    </button>
                  </div>

                  {/* Selected Teachers Chips */}
                  {selectedTeachers.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      {selectedTeachers.map((teacher, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          <FiUser className="text-blue-500 text-xs" />
                          <span>{teacher}</span>
                          <button
                            type="button"
                            onClick={() => toggleTeacher(teacher)}
                            className="text-slate-400 hover:text-red-500 font-bold ml-1 rounded-full w-4 h-4 inline-flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={manualTeacherInput}
                      onChange={(e) => setManualTeacherInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addManualTeacher();
                        }
                      }}
                      placeholder="Type faculty name and press Enter..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200"
                    />
                    {manualTeacherInput.trim() && (
                      <button
                        type="button"
                        onClick={addManualTeacher}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shrink-0"
                      >
                        + Add
                      </button>
                    )}
                  </div>

                  {/* Faculty Directory Accordion */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setIsFacultyDirectoryOpen((prev) => !prev)}
                      className="w-full px-4 py-3 bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Faculty Directory ({displayedFaculty.length} Available)
                      </span>
                      <FiChevronDown className={`text-slate-400 text-base transition-transform ${isFacultyDirectoryOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isFacultyDirectoryOpen && (
                      <div className="p-3 space-y-2 border-t border-slate-200/80 dark:border-slate-800">
                        <input
                          type="text"
                          value={facultySearch}
                          onChange={(e) => setFacultySearch(e.target.value)}
                          placeholder="Search directory..."
                          className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs"
                        />
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {displayedFaculty.map((fac) => {
                            const isSelected = selectedTeachers.includes(fac.name);
                            return (
                              <div
                                key={fac.id || fac.name}
                                onClick={() => toggleTeacher(fac.name)}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs ${isSelected ? "bg-blue-50 dark:bg-blue-950/60 font-semibold" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                  }`}
                              >
                                <span className="truncate">{fac.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{fac.designation || fac.rank || fac.department}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW & CONFIRM */}
            {currentStep === 5 && (
              <div className="space-y-4 fade-in">
                <div className="bg-slate-50/70 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display flex items-center space-x-2">
                    <FiCheck className="text-emerald-500" />
                    <span>Step 5: Review & Save Routine</span>
                  </h4>

                  {/* Summary Review Card */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div>
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded mr-2">
                          {watch("code")}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {watch("subject")}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        Dept: <b>{getDeptFullName(watchedDept || adminDept)}</b>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Terms:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {selectedTermPills.includes("All") ? "All Terms" : selectedTermPills.join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Sections:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {selectedSectionPills.includes("All") ? "All Sections" : selectedSectionPills.join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Schedule:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {watch("day")}, {watch("startTime")} – {watch("endTime")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Location:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {watch("tower")}, {watch("classroom") || "Classroom TBA"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Faculty Assigned:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTeachers.map((t, idx) => (
                          <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-semibold">
                            {t}
                          </span>
                        ))}
                        {selectedTeachers.length === 0 && <span className="text-slate-400 italic">None assigned</span>}
                      </div>
                    </div>
                  </div>

                  {/* Bulk Multi-Assignment Auto-Generator Checkbox */}
                  {(selectedTermPills.length > 1 || selectedSectionPills.length > 1) && !selectedTermPills.includes("All") && !selectedSectionPills.includes("All") && (
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="auto-gen-cb"
                        checked={autoGenerateSeparateEntries}
                        onChange={(e) => setAutoGenerateSeparateEntries(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <label htmlFor="auto-gen-cb" className="text-xs text-amber-900 dark:text-amber-200 font-semibold cursor-pointer">
                        Auto-generate separate individual routine entries per Term & Section combination ({selectedTermPills.length * selectedSectionPills.length} slots)
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP NAVIGATION BOTTOM ACTION BAR */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <div>
                {editMode && activeRoutine && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setDeleteOpen(true);
                    }}
                    className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                  >
                    Delete Slot
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer flex items-center space-x-1"
                  >
                    <FiArrowLeft size={13} />
                    <span>Back</span>
                  </button>
                )}

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((prev) => Math.min(prev + 1, 5))}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1 shadow-sm"
                  >
                    <span>Continue</span>
                    <FiArrowRight size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit(onSubmit, onInvalid)(e);
                    }}
                    disabled={loading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-sm"
                  >
                    {loading ? "Saving..." : editMode ? "Save Changes" : "Register Routine"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        itemName={activeRoutine ? `${activeRoutine.code} (${activeRoutine.subject})` : ""}
        loading={loading}
      />

      {/* Reschedule / Temporary Routine Dialog */}
      <Dialog
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title={`Reschedule Class Routine — ${rescheduleRoutine?.code || ""}`}
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4 font-sans">
          {/* Base Routine Details summary */}
          {rescheduleRoutine && (
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <span>
                  {rescheduleRoutine.code} — {rescheduleRoutine.subject}
                </span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-md font-mono">
                  {rescheduleRoutine.department} ({rescheduleRoutine.academicLevel})
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Original Schedule:{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {rescheduleRoutine.day} {rescheduleRoutine.startTime} -{" "}
                  {rescheduleRoutine.endTime}
                </strong>{" "}
                ({rescheduleRoutine.tower}, {rescheduleRoutine.classroom})
              </p>
            </div>
          )}

          {/* Reschedule Mode Selector: Copy vs Move */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-display">
              Reschedule Action Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRescheduleMode("copy")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${rescheduleMode === "copy"
                  ? "bg-blue-50/70 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>➕ Copy (Extra Session)</span>
                </div>
                <p className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                  Adds a new temporary class slot for a specific date while keeping the regular
                  schedule intact.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRescheduleMode("move")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${rescheduleMode === "move"
                  ? "bg-amber-50/70 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>🔄 Move (One-Time Shift)</span>
                </div>
                <p className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                  Moves this class session to a new date/time slot without modifying original weekly
                  data.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Target Date */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Target Date *
              </label>
              <input
                type="date"
                required
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              />
              {rescheduleDate && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1">
                  Calculated Day: {getWeekdayName(rescheduleDate)}
                </span>
              )}
            </div>

            {/* Start Time */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={rescheduleStartTime}
                onChange={(e) => setRescheduleStartTime(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              />
            </div>

            {/* End Time */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                End Time *
              </label>
              <input
                type="time"
                required
                value={rescheduleEndTime}
                onChange={(e) => setRescheduleEndTime(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tower */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Building/Tower
              </label>
              <select
                value={rescheduleTower}
                onChange={(e) => setRescheduleTower(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="Shadhinota">Shadhinota Tower</option>
                <option value="Bijoy">Bijoy Tower</option>
              </select>
            </div>

            {/* Classroom */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Classroom *
              </label>
              <input
                type="text"
                required
                placeholder="Room 502"
                value={rescheduleClassroom}
                onChange={(e) => setRescheduleClassroom(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
              />
            </div>
          </div>

          {/* Reschedule Note */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Reschedule Reason / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Make-up session due to holiday, or lab shift"
              value={rescheduleNote}
              onChange={(e) => setRescheduleNote(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
            />
          </div>

          {/* Teachers Selection for Rescheduled Slot */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Assigned Teachers
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                {rescheduleTeachers.length} selected
              </span>
            </div>

            {rescheduleTeachers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-lg max-h-24 overflow-y-auto">
                {rescheduleTeachers.map((teacher, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs"
                  >
                    <span>{teacher}</span>
                    <button
                      type="button"
                      onClick={() => toggleRescheduleTeacher(teacher)}
                      className="text-slate-400 hover:text-red-500 font-bold ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 w-4 h-4 inline-flex items-center justify-center text-xs transition-colors cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={rescheduleManualTeacher}
                onChange={(e) => setRescheduleManualTeacher(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRescheduleManualTeacher();
                  }
                }}
                placeholder="Type teacher name & press Enter..."
                className="flex-1 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={addRescheduleManualTeacher}
                disabled={!rescheduleManualTeacher.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
              >
                + Add
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-950/20 space-y-1.5">
              <input
                type="text"
                value={rescheduleFacultySearch}
                onChange={(e) => setRescheduleFacultySearch(e.target.value)}
                placeholder="Filter faculty list..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1 text-[11px]"
              />
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {displayedFaculty
                  .filter((f) => {
                    if (!rescheduleFacultySearch.trim()) return true;
                    const q = rescheduleFacultySearch.toLowerCase();
                    return (
                      (f.name && f.name.toLowerCase().includes(q)) ||
                      (f.department && f.department.toLowerCase().includes(q))
                    );
                  })
                  .map((fac) => {
                    const isSelected = rescheduleTeachers.includes(fac.name);
                    return (
                      <label
                        key={fac.id || fac.name}
                        className={`flex items-center justify-between px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs ${isSelected
                          ? "bg-blue-100/70 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 font-semibold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRescheduleTeacher(fac.name)}
                            className="accent-blue-600 rounded cursor-pointer"
                          />
                          <span className="truncate">{fac.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {getDeptFullName(fac.department)}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 justify-end mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setRescheduleOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-650 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduleLoading || !rescheduleDate}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              {rescheduleLoading
                ? "Rescheduling..."
                : rescheduleMode === "copy"
                  ? "Create Temporary Slot"
                  : "Move Slot to Date"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Import Class Routines (JSON or CSV)"
      >
        <div className="space-y-4">
          {/* Mandatory Department Selection (Step 1) */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Step 1: Select Target Department <span className="text-red-500 font-bold">* (Required)</span>
            </label>
            <select
              value={bulkDepartment}
              onChange={(e) => {
                setBulkDepartment(e.target.value);
                setValidationErrors([]);
              }}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
            >
              <option value="">-- Select Department --</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Step 2: Upload JSON or CSV File
            </label>
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100/50 dark:hover:file:bg-blue-900/50 cursor-pointer"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Pasted JSON or CSV Content
            </label>
            <textarea
              rows={6}
              value={bulkJson}
              onChange={(e) => {
                setBulkJson(e.target.value);
                setValidationErrors([]);
              }}
              placeholder={`[\n  {\n    "code": "CSE-301",\n    "subject": "Software Engineering",\n    "academicLevel": "Term-5",\n    "day": "Sunday",\n    "startTime": "09:00",\n    "endTime": "10:30",\n    "teachers": "Dr. A. Rahman",\n    "tower": "Shadhinota",\n    "classroom": "Room 502"\n  }\n]`}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30"
            />
          </div>

          {/* Validation Error Summary Box */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl space-y-1.5">
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <span>⚠️ Pre-Import Validation Errors ({validationErrors.length})</span>
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {validationErrors.map((err, idx) => (
                  <p key={idx} className="text-[10px] text-red-600 dark:text-red-300 font-mono">
                    • {err}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 justify-end border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
            <button
              type="button"
              onClick={() => {
                setBulkOpen(false);
                setValidationErrors([]);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-secondary-gradient"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkLoading || !bulkJson.trim() || !bulkDepartment}
              onClick={handleBulkImport}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient disabled:opacity-50"
            >
              {bulkLoading ? "Importing..." : "Validate & Import"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Bulk Delete Selected Routines Confirmation Dialog */}
      <Dialog
        isOpen={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
        title="Confirm Bulk Delete Routines"
      >
        <div className="space-y-4 font-sans">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Are you sure you want to delete <strong>{selectedRoutineIds.length}</strong> selected routine slot(s)?
          </p>
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-150 dark:border-red-900/40 rounded-xl">
            <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
              ⚠️ This action cannot be undone. All selected routine slots will be permanently removed from Firestore.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setConfirmBulkDeleteOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBulkDeleteSelected}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
            >
              {loading ? "Deleting..." : "Delete Selected Routines"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title="Bulk Delete Routines"
      >
        <div className="space-y-4">
          <p className="text-[11px] text-slate-500">
            Select the criteria to delete multiple class routines at once. This action cannot be
            undone.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Department
              </label>
              <select
                value={bulkDeleteDept}
                onChange={(e) => setBulkDeleteDept(e.target.value)}
                disabled={!!adminDept}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
              >
                {adminDept ? (
                  <option value={adminDept}>{adminDept}</option>
                ) : (
                  <>
                    <option value="All">All Departments</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.code} value={dept.code}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Term (Level)
              </label>
              <select
                value={bulkDeleteTerm}
                onChange={(e) => setBulkDeleteTerm(e.target.value)}
                disabled={!!adminTerm}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
              >
                {adminTerm ? (
                  <option value={adminTerm}>{adminTerm}</option>
                ) : (
                  <>
                    <option value="All">All Terms</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                      <option key={t} value={`Term-${t}`}>
                        Term-{t}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 space-x-3">
            <button
              onClick={() => setBulkDeleteOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-650 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              {bulkDeleteLoading ? "Deleting..." : "Delete Matching Routines"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Super Admin Merge Duplicates Dialog */}
      <Dialog
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        title="Merge Duplicate Class Routines (Super Admin)"
      >
        <div className="space-y-5 max-w-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Review detected duplicate routine slots. Select which slot to preserve as the <strong>Master Slot</strong>. The system will merge all unique teachers into the master slot and remove redundant entries. You can handle groups <strong>one by one</strong> or merge all at once.
          </p>

          {duplicateRoutineGroups.length > 0 ? (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
              {duplicateRoutineGroups.map((grp) => {
                const primaryItem =
                  grp.items.find((item) => item.id === grp.primaryId) || grp.items[0];

                const combinedTeachers = Array.from(
                  new Set(
                    grp.items
                      .flatMap((item) =>
                        Array.isArray(item.teachers)
                          ? item.teachers
                          : item.teachers
                            ? item.teachers.split(",").map((t) => t.trim())
                            : [],
                      )
                      .filter(Boolean),
                  ),
                );

                return (
                  <div
                    key={grp.groupKey}
                    className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-purple-200/60 dark:border-purple-900/40 rounded-2xl space-y-4 shadow-xs"
                  >
                    {/* Group Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs">
                            {grp.code}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {grp.subject}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                          Dept: <strong>{grp.dept}</strong> &middot; Term: <strong>{grp.term}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => handleMergeSingleGroup(grp)}
                        disabled={mergeLoading}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center space-x-1 shrink-0 disabled:opacity-50"
                      >
                        <FiLayers size={12} />
                        <span>Merge This Group</span>
                      </button>
                    </div>

                    {/* BEFORE vs AFTER Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* BEFORE Column: Detected Duplicates */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                          ⚡ BEFORE: Detected Slots ({grp.items.length})
                        </span>
                        <div className="space-y-2">
                          {grp.items.map((item) => {
                            const isMaster = item.id === grp.primaryId;
                            const itemTeachers = Array.isArray(item.teachers)
                              ? item.teachers.join(", ")
                              : item.teachers || "No Teacher";

                            return (
                              <div
                                key={item.id}
                                className={`p-2.5 rounded-xl border text-[11px] transition-all relative ${isMaster
                                  ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700 shadow-xs"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
                                  }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                                    <input
                                      type="radio"
                                      name={`master-${grp.groupKey}`}
                                      checked={isMaster}
                                      onChange={() => setPrimarySlot(grp.groupKey, item.id)}
                                      className="accent-purple-600 cursor-pointer"
                                    />
                                    <span>
                                      {item.day}, {item.startTime} - {item.endTime}
                                    </span>
                                  </label>

                                  <button
                                    onClick={() => handleDeleteSingleSlot(grp.groupKey, item.id)}
                                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                                    title="Delete this single duplicate slot"
                                  >
                                    <FiTrash2 size={12} />
                                  </button>
                                </div>

                                <div className="mt-1 pl-5 space-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                  <div>
                                    Room: {item.tower} - {item.classroom}
                                  </div>
                                  <div>Teachers: {itemTeachers}</div>
                                </div>

                                {isMaster && (
                                  <span className="mt-1.5 ml-5 inline-block text-[9px] font-extrabold bg-purple-600 text-white px-1.5 py-0.2 rounded-full">
                                    Selected Master Slot
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* AFTER Column: Resulting Merged Outcome */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                          ✨ AFTER: Resulting Master Slot
                        </span>
                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl space-y-2 text-[11px] h-full flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {primaryItem.day}, {primaryItem.startTime} - {primaryItem.endTime}
                              </span>
                              <Badge variant="success">Preserved</Badge>
                            </div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400">
                              Location: <strong>{primaryItem.tower} Block, Room {primaryItem.classroom}</strong>
                            </div>
                            <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-100 dark:border-slate-800">
                              <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                                Combined Teachers ({combinedTeachers.length}):
                              </span>
                              {combinedTeachers.length > 0
                                ? combinedTeachers.join(", ")
                                : "No Teachers Assigned"}
                            </div>
                          </div>

                          <span className="text-[9px] text-slate-400 italic block border-t border-emerald-200/40 dark:border-slate-800 pt-1.5">
                            Redundant slots will be deleted automatically.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold">
              🎉 Clean! No duplicate routine slots were found across your database.
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400">
              {duplicateRoutineGroups.length} duplicate {duplicateRoutineGroups.length === 1 ? "group" : "groups"} remaining
            </span>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMergeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg btn-secondary-gradient cursor-pointer"
              >
                Close
              </button>
              {duplicateRoutineGroups.length > 0 && (
                <button
                  onClick={handleConfirmMergeAll}
                  disabled={mergeLoading}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition-colors disabled:opacity-50 flex items-center space-x-1.5 shadow-sm"
                >
                  {mergeLoading ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                      <span>Merging...</span>
                    </>
                  ) : (
                    <>
                      <FiLayers className="text-sm" />
                      <span>Merge All ({duplicateRoutineGroups.length} Groups)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Post-Import Error Breakdown Popup Modal */}
      <Dialog
        isOpen={importErrorsModalOpen}
        onClose={() => setImportErrorsModalOpen(false)}
        title="Bulk Import Results & Skipped Rows Breakdown"
      >
        <div className="space-y-4 font-sans">
          {importedSuccessCount > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                ✅ {importedSuccessCount} valid routine slot(s) successfully imported into Firestore!
              </span>
            </div>
          )}

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1">
            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <span>⚠️ {importErrorsList.length} item(s) skipped due to errors / mismatches</span>
            </h4>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              The valid items were imported. Below are the specific errors found in the skipped rows:
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl">
            {importErrorsList.map((err, idx) => (
              <div key={idx} className="p-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-lg text-xs text-red-600 dark:text-red-400 font-mono leading-relaxed flex items-start gap-2">
                <span className="font-bold text-red-500 shrink-0">•</span>
                <span>{err}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setImportErrorsModalOpen(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
            >
              Close Summary
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ClassRoutine;
