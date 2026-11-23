// Student User Management Page Component
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  FiSearch,
  FiFilter,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiUserX,
  FiUserCheck,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiKey,
  FiPhone,
  FiMail,
  FiMapPin,
} from "react-icons/fi";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserBan,
  setSearchQuery,
  setFilters,
  setSelectedUser,
  clearUserStatus,
} from "../../redux/slices/userSlice";
import Dialog from "../../components/common/Dialog";
import Badge from "../../components/common/Badge";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";
import UserDetailDialog from "../../components/dialogs/UserDetailDialog";
import ResetPasswordDialog from "../../components/dialogs/ResetPasswordDialog";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import {
  ACADEMIC_SYSTEMS,
  CITY_AREAS,
  DEPARTMENT_CODES,
  DEPARTMENTS,
  formatDOBDisplay,
  formatDOBForInput,
  getAcademicLevelOptions,
  getDepartmentName,
  normalizeAcademicLevel,
  normalizeAcademicSystem,
  normalizeDepartment,
  normalizeDept,
} from "../../utils/academic";

// Form Validation Schema for Students
const schema = yup.object().shape({
  studentId: yup
    .string()
    .matches(
      /^UG\d{2}-\d{2}-\d{2}-\d{3}$/,
      "ID must match UGXX-XX-XX-XXX format (e.g. UG01-01-25-001)",
    )
    .required("Student ID is required"),
  name: yup.string().min(3, "Name must be at least 3 characters").required("Full Name is required"),
  email: yup.string().email("Enter a valid email").required("Email is required"),
  department: yup
    .string()
    .oneOf(DEPARTMENT_CODES, "Select a valid department")
    .required("Department is required"),
  batch: yup.string().required("Batch is required"),
  phone: yup
    .string()
    .matches(/^01\d{9}$/, "Use an 11-digit Bangladeshi phone number (e.g., 01712345678)")
    .required("Phone number is required"),
  dob: yup.string().required("Date of birth is required"),
  academicSystem: yup
    .string()
    .oneOf(ACADEMIC_SYSTEMS.map((system) => system.value), "Select a valid academic system")
    .required("Academic system is required"),
  academicLevel: yup.string().required("Academic level is required"),
  bloodGroup: yup
    .string()
    .oneOf(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""], "Select a valid blood group")
    .nullable(),
  location: yup.string().nullable(),
  city: yup.string().oneOf(Object.keys(CITY_AREAS), "Select a valid city").nullable(),
  area: yup.string().nullable(),
  allowBloodDonation: yup.boolean().default(false),
});

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const SECTION_OPTIONS = [
  { label: "N/A (Not Applicable)", value: "N/A" },
  { label: "Section A (A/1)", value: "A" },
  { label: "Section B (B/2)", value: "B" },
  { label: "Section C (C/3)", value: "C" },
  { label: "Section D (D/4)", value: "D" },
  { label: "Section E (E/5)", value: "E" },
];

export const getSectionDisplayLabel = (sec) => {
  if (!sec || sec === "N/A" || sec === "NA" || sec === "None") return "N/A";
  const match = SECTION_OPTIONS.find(
    (opt) => opt.value === String(sec).toUpperCase() || opt.label === String(sec)
  );
  return match ? match.label : sec;
};

const formatDateForInput = (value) => {
  if (!value) return "";

  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString().slice(0, 10);
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  }

  const asString = String(value).trim();
  if (!asString) return "";

  const isoMatch = asString.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return isoMatch[0];
  }

  const date = new Date(asString);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return "";
};

import { isSuperAdmin, isAdmin, isStudent, getUserRoles } from "../../utils/permissionUtils";

export const UserManagement = () => {
  const dispatch = useDispatch();
  const { filteredList, searchQuery, filters, selectedUser, loading, success, error, lastAction } =
    useSelector((state) => state.users);
  const { user } = useSelector((state) => state.auth);

  const isSuperAdminUser = isSuperAdmin(user);
  const isDeptAdmin = isAdmin(user) && !isSuperAdminUser;
  const adminDept = isSuperAdminUser ? "" : normalizeDepartment(user?.department);

  // Component States
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [roleFilter, setRoleFilter] = useState("All");
  const [resetPasswordUser, setResetPasswordUser] = useState(null);

  // Bulk Import States
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Sort State
  const [sortField, setSortField] = useState("studentId");
  const [sortDirection, setSortDirection] = useState("asc");

  const getUserDocId = (user) => user?.id || user?.studentId || user?.uid;

  // Filter list by admin department if restricted
  // Counts any user who has the student role (even if they have multiple roles like admin & student)
  const usersToDisplay = (Array.isArray(filteredList) ? filteredList : []).filter((u) => {
    if (!u) return false;
    const hasStudentRole = isStudent(u);
    if (!hasStudentRole) return false;

    if (adminDept && normalizeDepartment(u.department) !== normalizeDepartment(adminDept)) {
      return false;
    }

    if (roleFilter === "student_only") {
      const roles = getUserRoles(u);
      if (roles.includes("admin") || roles.includes("super_admin")) return false;
    } else if (roleFilter === "multi_role") {
      const roles = getUserRoles(u);
      if (!roles.includes("admin") && !roles.includes("super_admin")) return false;
    }

    return true;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Student Form Hooks
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
      academicSystem: normalizeAcademicSystem(null, adminDept || "CSE"),
      academicLevel: getAcademicLevelOptions(null, adminDept || "CSE")[0],
      city: "Dhaka",
      area: CITY_AREAS.Dhaka[0],
    },
  });

  const watchedDept = watch("department");
  const watchedAcademicSystem = watch("academicSystem");
  const watchedCity = watch("city");

  // Sync current level when the academic system changes to keep it valid without overwriting valid existing level
  useEffect(() => {
    if (watchedAcademicSystem || watchedDept) {
      const options = getAcademicLevelOptions(watchedAcademicSystem, watchedDept);
      const currentLevel = watch("academicLevel");
      if (!options.includes(currentLevel)) {
        setValue("academicLevel", options[0]);
      }
    }
  }, [watchedAcademicSystem, watchedDept, setValue, watch]);

  useEffect(() => {
    if (watchedCity) {
      const validAreas = CITY_AREAS[watchedCity] || [];
      const currentArea = watch("area");
      if (!validAreas.includes(currentArea)) {
        setValue("area", validAreas[0] || "");
      }
    }
  }, [watchedCity, setValue, watch]);

  // Load users data
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  // Handling thunk notification results
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearUserStatus());
    }
    if (success) {
      const messageMap = {
        create: "Account registered successfully!",
        update: "Account updated successfully!",
        delete: "Student account deleted successfully!",
        inviteAdmin: "Administrator account created successfully!",
      };

      toast.success(messageMap[lastAction] || "Action completed successfully!");
      setModalOpen(false);
      reset();
      dispatch(clearUserStatus());
    }
  }, [success, error, lastAction, dispatch, reset]);

  // Search & Filter change triggers
  const handleSearchChange = (e) => {
    dispatch(setSearchQuery(e.target.value));
    setCurrentPage(1);
  };

  const handleFilterChange = (key, val) => {
    dispatch(setFilters({ [key]: val }));
    setCurrentPage(1);
  };

  // Sorting Handler
  const handleSort = (field) => {
    const isAsc = sortField === field && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortField(field);
  };

  // Sort application on rows
  const sortedUsers = [...usersToDisplay].sort((a, b) => {
    let aVal = a[sortField] || "";
    let bVal = b[sortField] || "";

    if (typeof aVal === "string") {
      return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  });

  // Paginated application on sorted rows
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  // Form submit handles
  const onSubmit = (data) => {
    const formattedDOB = formatDOBDisplay(data.dob);
    const existingRoles = editMode && editingUser ? getUserRoles(editingUser) : ["student"];
    const updatedRoles = Array.from(new Set([...existingRoles, "student"]));

    const userPayload = {
      ...data,
      dob: formattedDOB,
      roles: updatedRoles,
      department: adminDept || data.department,
      academicSystem: normalizeAcademicSystem(data.academicSystem, data.department),
      academicLevel: normalizeAcademicLevel(data.academicLevel, data.academicSystem, data.department),
      location: data.area && data.city ? `${data.area}, ${data.city}` : data.location,
      section: data.section || "",
    };
    if (editMode) {
      dispatch(
        updateUser({
          studentId: editingStudentId || data.studentId,
          updatedData: userPayload,
        }),
      );
    } else {
      dispatch(createUser(userPayload));
    }
  };

  // Add Mode dialog open
  const openAddModal = () => {
    setEditMode(false);
    setEditingStudentId(null);
    setEditingUser(null);
    reset({
      studentId: "",
      name: "",
      email: "",
      department: adminDept || "CSE",
      batch: "",
      phone: "",
      dob: "",
      academicSystem: normalizeAcademicSystem(null, adminDept || "CSE"),
      academicLevel: getAcademicLevelOptions(null, adminDept || "CSE")[0],
      bloodGroup: "",
      city: "Dhaka",
      area: CITY_AREAS.Dhaka[0],
      location: "",
      section: "",
      allowBloodDonation: false,
    });
    setModalOpen(true);
  };

  // Edit Mode dialog open
  const openEditModal = (user) => {
    setEditMode(true);
    setEditingStudentId(getUserDocId(user));
    setEditingUser(user);

    let resolvedCity = user.city || "";
    let resolvedArea = user.area || "";

    if ((!resolvedCity || !resolvedArea) && user.location) {
      const parts = String(user.location).split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        if (!resolvedArea) resolvedArea = parts[0];
        if (!resolvedCity) resolvedCity = parts[parts.length - 1];
      } else if (parts.length === 1) {
        if (!resolvedCity) resolvedCity = parts[0];
      }
    }

    if (!resolvedCity || !CITY_AREAS[resolvedCity]) {
      resolvedCity = "Dhaka";
    }

    const availableAreas = CITY_AREAS[resolvedCity] || [];
    if (!resolvedArea || !availableAreas.includes(resolvedArea)) {
      resolvedArea = availableAreas[0] || "";
    }

    reset({
      studentId: user.studentId || "",
      name: user.name || "",
      email: user.email || "",
      department: user.department || (adminDept || "CSE"),
      batch: user.batch || "",
      phone: user.phone || "",
      dob: formatDOBForInput(user.dob),
      academicSystem: normalizeAcademicSystem(user.academicSystem, user.department),
      academicLevel: normalizeAcademicLevel(user.academicLevel, user.academicSystem, user.department),
      bloodGroup: user.bloodGroup || "",
      city: resolvedCity,
      area: resolvedArea,
      location: user.location || `${resolvedArea}, ${resolvedCity}`,
      section: user.section || "",
      allowBloodDonation: !!user.allowBloodDonation,
    });
    setModalOpen(true);
  };

  // Delete handlers
  const openDeleteDialog = (user) => {
    setUserToDelete(user);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    const userDocId = getUserDocId(userToDelete);
    if (!userDocId) {
      toast.error("Could not find identifier for this student account.");
      setDeleteOpen(false);
      setUserToDelete(null);
      return;
    }

    setDeletingStudent(true);
    try {
      await dispatch(deleteUser(userDocId)).unwrap();
      toast.success("Student account deleted successfully!");
      setDeleteOpen(false);
      setUserToDelete(null);
    } catch (err) {
      toast.error(err?.message || err || "Failed to delete student account");
      setDeleteOpen(false);
      setUserToDelete(null);
    } finally {
      setDeletingStudent(false);
    }
  };

  // Ban/Unban toggle handler
  const handleBanToggle = (user) => {
    const verb = user.status === "Active" ? "banned" : "unbanned";
    dispatch(
      toggleUserBan({ studentId: getUserDocId(user), isBanned: user.status === "Banned" }),
    ).then(() => toast.info(`Student accounts ${verb} successfully!`));
  };

  const handleInspect = (user) => {
    dispatch(setSelectedUser(user));
    setInspectOpen(true);
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
    setBulkLoading(true);
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) {
        toast.error("JSON must be an array of student objects.");
        setBulkLoading(false);
        return;
      }
      let successCount = 0;
      let errorCount = 0;
      for (const item of parsed) {
        const isValidId = item.studentId && /^UG\d{2}-\d{2}-\d{2}-\d{3}$/.test(item.studentId);
        const isValidName = item.name && item.name.length >= 3;
        const isValidEmail = item.email && item.email.includes("@");
        const isValidDept =
          item.department &&
          DEPARTMENT_CODES.includes(item.department);

        if (isValidId && isValidName && isValidEmail && isValidDept) {
          const academicSystem = normalizeAcademicSystem(item.academicSystem, item.department);
          const payload = {
            studentId: item.studentId,
            name: item.name,
            email: item.email,
            department: item.department,
            batch: item.batch || "53",
            phone: item.phone || "01700000000",
            dob: item.dob || "2000-01-01",
            academicSystem,
            academicLevel: normalizeAcademicLevel(item.academicLevel, academicSystem, item.department),
            bloodGroup: item.bloodGroup || "",
            allowBloodDonation: !!item.allowBloodDonation,
            city: item.city || "",
            area: item.area || "",
            location: item.location || (item.area && item.city ? `${item.area}, ${item.city}` : ""),
            role: "student",
            status: item.status || "Active",
          };
          await dispatch(createUser(payload));
          successCount++;
        } else {
          errorCount++;
        }
      }
      toast.success(`Import completed: ${successCount} student profiles imported!`);
      if (errorCount > 0) {
        toast.warning(
          `${errorCount} entries were skipped due to invalid formats or missing fields.`,
        );
      }
      setBulkOpen(false);
      setBulkJson("");
    } catch (e) {
      toast.error("Invalid JSON structure. Please check formatting.");
    } finally {
      setBulkLoading(false);
    }
  };


  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            User Directory
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Manage student databases, register department-term admins, inspect profiles, or remove
            credentials.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          {isSuperAdminUser && (
            <button
              onClick={() => setBulkOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-800"
            >
              <span>Bulk Import (JSON)</span>
            </button>
          )}
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer btn-primary-gradient"
          >
            <FiPlus className="text-sm" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Registered</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{usersToDisplay.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FiUsers size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Students</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {usersToDisplay.filter((u) => u.status !== "Banned" && u.status !== "Disabled").length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <FiCheckCircle size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Restricted Accounts</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {usersToDisplay.filter((u) => u.status === "Banned" || u.status === "Disabled").length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
            <FiAlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Items</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{usersToDisplay.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <FiFilter size={18} />
          </div>
        </div>
      </div>

      {/* Search & Filters Panel */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-72 xl:w-80 text-slate-400 dark:text-slate-500 flex items-center">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" />
          <input
            type="text"
            placeholder="Search by ID, name, email..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30 text-slate-800 dark:text-slate-200"
          />
          {searchQuery && (
            <button
              onClick={() => dispatch(setSearchQuery(""))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <FiX size={12} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Department */}
          <div className="flex items-center space-x-1.5 text-xs">
            <select
              value={adminDept || filters.department}
              disabled={!!adminDept}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 sm:px-3 py-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer disabled:opacity-60 text-xs"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((department) => (
                <option key={department.code} value={department.code}>
                  {department.code} - {department.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-1.5 text-xs">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 sm:px-3 py-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Banned">Banned</option>
            </select>
          </div>

          {/* Blood Group */}
          <div className="flex items-center space-x-1.5 text-xs">
            <select
              value={filters.bloodGroup}
              onChange={(e) => handleFilterChange("bloodGroup", e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 sm:px-3 py-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
            >
              <option value="All">All Blood Groups</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 sm:px-3 py-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
            >
              <option value="All">All Roles</option>
              <option value="student_only">Student Only</option>
              <option value="multi_role">Admin &amp; Student</option>
            </select>
          </div>

          {/* Clear / Reset Filters */}
          {(filters.department !== "All" || filters.status !== "All" || filters.bloodGroup !== "All" || roleFilter !== "All" || searchQuery) && (
            <button
              onClick={() => {
                handleFilterChange("department", "All");
                handleFilterChange("status", "All");
                handleFilterChange("bloodGroup", "All");
                setRoleFilter("All");
                dispatch(setSearchQuery(""));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center justify-center gap-1 cursor-pointer col-span-2 sm:col-span-1"
              title="Reset all filters"
            >
              <FiX size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      {loading && !sortedUsers.length ? (
        <LoadingSkeleton type="table" count={1} rows={8} cols={6} />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {/* Mobile Card View (screens < 768px) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {currentItems.length > 0 ? (
              currentItems.map((student) => {
                const rowKey = student.id || student.studentId || student.uid || student.email || Math.random();
                const deptCode = normalizeDepartment(student.department) || student.department || "N/A";
                const deptFullName = getDepartmentName(student.department) || student.department || "";
                const pic =
                  student.photo_url ||
                  student.photoURL ||
                  student.photoUrl ||
                  student.profileImage ||
                  student.avatar ||
                  student.avatarUrl ||
                  student.image ||
                  student.photo ||
                  student.picture;

                return (
                  <div key={rowKey} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Top Row: Avatar, Name, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        {pic ? (
                          <img
                            src={pic}
                            alt={student.name}
                            onError={(e) => { e.target.style.display = "none"; }}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900/40">
                            {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                            {student.name || student.fullName || student.data?.name || "Student"}
                          </h4>
                          <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {student.studentId || student.student_id || student.data?.studentId || student.data?.student_id || "No ID"}
                          </span>
                        </div>
                      </div>
                      <Badge variant={(student.status || "Active") === "Active" ? "success" : "danger"}>
                        {student.status || "Active"}
                      </Badge>
                    </div>

                    {/* Academic Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50" title={deptFullName}>
                        {deptCode}
                      </span>
                      {student.batch && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Batch {student.batch}
                        </span>
                      )}
                      {(student.academicLevel || student.semester) && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          {student.academicLevel || student.semester}
                        </span>
                      )}
                      {student.section && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                          Sec: {student.section}
                        </span>
                      )}
                      {student.bloodGroup && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                          {student.bloodGroup}
                        </span>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {student.email && (
                        <div className="flex items-center gap-2 truncate">
                          <FiMail className="shrink-0 text-slate-400" size={13} />
                          <span className="truncate">{student.email}</span>
                        </div>
                      )}
                      {student.phone && (
                        <div className="flex items-center gap-2 font-mono">
                          <FiPhone className="shrink-0 text-slate-400" size={13} />
                          <span>{student.phone}</span>
                        </div>
                      )}
                      {(student.city || student.area || student.location) && (
                        <div className="flex items-center gap-2 truncate text-[11px] text-slate-400">
                          <FiMapPin className="shrink-0" size={12} />
                          <span className="truncate">{student.location || `${student.area || ""}, ${student.city || ""}`}</span>
                        </div>
                      )}
                    </div>

                    {/* Role Badges */}
                    <div className="flex items-center gap-1.5">
                      {getUserRoles(student).map((role) => (
                        <span
                          key={role}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            role === "super_admin"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60"
                              : role === "admin"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/60"
                          }`}
                        >
                          {role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "Student"}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleInspect(student)}
                        className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                        title="View Details"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      {(isSuperAdminUser || (isDeptAdmin && normalizeDept(student.department) === normalizeDept(adminDept))) && (
                        <>
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl cursor-pointer"
                            title="Edit Student"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setResetPasswordUser(student)}
                            className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl cursor-pointer"
                            title="Reset Password"
                          >
                            <FiKey className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleBanToggle(student)}
                            className={`p-2 rounded-xl cursor-pointer ${
                              (student.status || "Active") === "Active"
                                ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                            title={(student.status || "Active") === "Active" ? "Ban Student" : "Unban Student"}
                          >
                            {(student.status || "Active") === "Active" ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openDeleteDialog(student)}
                            className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                            title="Delete Student"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 dark:text-slate-600 font-bold text-xs">
                No students registered matching filters.
              </div>
            )}
          </div>

          {/* Desktop Table View (screens >= 768px) with horizontal scroll and all columns */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                  <th
                    onClick={() => handleSort("studentId")}
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 whitespace-nowrap"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Student ID</span>
                      {sortField === "studentId" &&
                        (sortDirection === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("name")}
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 whitespace-nowrap"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Student Name</span>
                      {sortField === "name" &&
                        (sortDirection === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Contact Info</th>
                  <th
                    onClick={() => handleSort("department")}
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 whitespace-nowrap"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Academic</span>
                      {sortField === "department" &&
                        (sortDirection === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Blood Group</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Role</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap pr-6 sticky right-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {currentItems.length > 0 ? (
                  currentItems.map((student) => {
                    const rowKey = student.id || student.studentId || student.uid || student.email || Math.random();
                    const deptCode = normalizeDepartment(student.department) || student.department || "N/A";
                    const deptFullName = getDepartmentName(student.department) || student.department || "";

                    return (
                      <tr
                        key={rowKey}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Student ID */}
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {student.studentId || student.student_id || student.data?.studentId || student.data?.student_id ? (
                            <span className="bg-slate-100 dark:bg-slate-800/70 px-2 py-1 rounded-lg text-blue-600 dark:text-blue-400 font-bold">
                              {student.studentId || student.student_id || student.data?.studentId || student.data?.student_id}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 font-sans font-normal text-xs">—</span>
                          )}
                        </td>

                        {/* Student Name & Avatar */}
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          <div className="flex items-center space-x-2.5">
                            {(() => {
                              const pic =
                                student.photo_url ||
                                student.photoURL ||
                                student.photoUrl ||
                                student.profileImage ||
                                student.avatar ||
                                student.avatarUrl ||
                                student.image ||
                                student.photo ||
                                student.picture;
                              if (pic) {
                                return (
                                  <img
                                    src={pic}
                                    alt={student.name}
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                  />
                                );
                              }
                              return (
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900/40">
                                  {(student.name || student.data?.name) ? (student.name || student.data?.name).charAt(0).toUpperCase() : "S"}
                                </div>
                              );
                            })()}
                            <div>
                              <span>{student.name || student.fullName || student.data?.name || "Student"}</span>
                              {(student.section || student.data?.section) && (
                                <span className="ml-1.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                                  Sec {student.section || student.data?.section}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact Info: Email & Phone */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={student.email}>
                              <FiMail className="shrink-0 text-slate-400" size={12} />
                              <span className="truncate">{student.email || "—"}</span>
                            </div>
                            {(student.phone || student.data?.phone) ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                <FiPhone className="shrink-0 text-slate-400" size={11} />
                                <span>{student.phone || student.data?.phone}</span>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Academic: Dept + Batch + Level */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-tight bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50 shadow-2xs"
                                title={deptFullName}
                              >
                                {deptCode}
                              </span>
                              {(student.batch || student.data?.batch) && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  B-{student.batch || student.data?.batch}
                                </span>
                              )}
                            </div>
                            {(student.academicLevel || student.semester || student.data?.academicLevel || student.data?.semester) && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                                {student.academicLevel || student.semester || student.data?.academicLevel || student.data?.semester}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Blood Group */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {(student.bloodGroup || student.blood_group || student.data?.bloodGroup || student.data?.blood_group) ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-200 dark:border-rose-900/40">
                              {student.bloodGroup || student.blood_group || student.data?.bloodGroup || student.data?.blood_group}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 font-sans font-normal text-xs">—</span>
                          )}
                        </td>

                        {/* Roles */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            {getUserRoles(student).map((role) => {
                              if (role === "super_admin") {
                                return (
                                  <span
                                    key="super_admin"
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50"
                                  >
                                    Super Admin
                                  </span>
                                );
                              }
                              if (role === "admin") {
                                return (
                                  <span
                                    key="admin"
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50"
                                  >
                                    Admin
                                  </span>
                                );
                              }
                              return (
                                <span
                                  key="student"
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50"
                                >
                                  Student
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge
                            variant={(student.status || "Active") === "Active" ? "success" : "danger"}
                          >
                            {student.status || "Active"}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap pr-6 sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* View Details */}
                            <button
                              onClick={() => handleInspect(student)}
                              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-all"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>

                            {/* Super admin gets full CRUD; Department Admins get CRUD on their own department students */}
                            {(isSuperAdminUser || (isDeptAdmin && normalizeDept(student.department) === normalizeDept(adminDept))) && (
                              <>
                                {/* Edit */}
                                <button
                                  onClick={() => openEditModal(student)}
                                  className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl cursor-pointer transition-all"
                                  title="Edit Student"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                </button>

                                {/* Reset Password / Send Link */}
                                <button
                                  onClick={() => setResetPasswordUser(student)}
                                  className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl cursor-pointer transition-all"
                                  title="Reset Password / Send Link"
                                >
                                  <FiKey className="w-4 h-4" />
                                </button>

                                {/* Ban / Unban */}
                                <button
                                  onClick={() => handleBanToggle(student)}
                                  className={`p-2 rounded-xl cursor-pointer transition-all ${
                                    (student.status || "Active") === "Active"
                                      ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                      : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  }`}
                                  title={
                                    (student.status || "Active") === "Active"
                                      ? "Ban Student"
                                      : "Unban Student"
                                  }
                                >
                                  {(student.status || "Active") === "Active" ? (
                                    <FiUserX className="w-4 h-4" />
                                  ) : (
                                    <FiUserCheck className="w-4 h-4" />
                                  )}
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => openDeleteDialog(student)}
                                  className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer transition-all"
                                  title="Delete Student"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-slate-400 dark:text-slate-600 font-bold"
                    >
                      No students registered in registry matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        {/* Pagination Panel */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {sortedUsers.length > 0
                ? `Showing ${indexOfFirstItem + 1}–${Math.min(indexOfLastItem, sortedUsers.length)} of ${sortedUsers.length} Students`
                : "No students found"}
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={30}>30 / page</option>
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
              >
                <FiChevronLeft className="text-sm" />
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
              >
                <FiChevronRight className="text-sm" />
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Add / Edit Student Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMode ? "Edit Student Profile" : "Register New Student"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student ID */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Student ID
              </label>
              <input
                type="text"
                placeholder="UG09-10-60-001"
                readOnly={editMode}
                {...register("studentId")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.studentId ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors ${editMode ? "cursor-not-allowed opacity-80" : ""}`}
              />
              {errors.studentId && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.studentId.message}
                </span>
              )}
            </div>

            {/* Name */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Sadman Rahman"
                {...register("name")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.name ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.name && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.name.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="sadman.rahman@sub.edu.bd"
                {...register("email")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.email ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.email && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Phone */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="01711222333"
                {...register("phone")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.phone ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.phone && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.phone.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Department Selection */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Department
              </label>
              <select
                disabled={!!adminDept}
                {...register("department")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-60"
              >
                {DEPARTMENTS.map((department) => (
                  <option key={department.code} value={department.code}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic System */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Academic System
              </label>
              <select
                {...register("academicSystem")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300"
              >
                {ACADEMIC_SYSTEMS.map((system) => (
                  <option key={system.value} value={system.value}>
                    {system.label} ({system.levels} {system.levelLabel}s)
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Current Term/Studio Selection */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Current Term / Studio
              </label>
              <select
                {...register("academicLevel")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300"
              >
                {getAcademicLevelOptions(watchedAcademicSystem, watchedDept).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Batch
              </label>
              <input
                type="text"
                placeholder="53"
                {...register("batch")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.batch ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.batch && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.batch.message}
                </span>
              )}
            </div>

            {/* Section */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Section
              </label>
              <select
                {...register("section")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <option value="">— Select Section —</option>
                {SECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date of Birth */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                {...register("dob")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.dob ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-500`}
              />
              {errors.dob && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.dob.message}
                </span>
              )}
            </div>

            {/* Gender */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Gender
              </label>
              <select
                {...register("gender")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.gender ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.gender.message}
                </span>
              )}
            </div>

            {/* Blood Group */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Blood Group
              </label>
              <select
                {...register("bloodGroup")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <option value="">— Not specified —</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
              {errors.bloodGroup && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.bloodGroup.message}
                </span>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                City
              </label>
              <select
                {...register("city")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300"
              >
                {Object.keys(CITY_AREAS).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Area / Thana
              </label>
              <input
                type="search"
                list="student-area-options"
                placeholder="Search area"
                {...register("area")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs transition-colors"
              />
              <datalist id="student-area-options">
                {(CITY_AREAS[watchedCity] || []).map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Blood Donation Permission */}
          <div className="flex items-start space-x-2 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200/50 dark:border-red-900/40">
            <input
              type="checkbox"
              id="allowBloodDonation"
              {...register("allowBloodDonation")}
              className="rounded border-slate-300 dark:border-slate-700 text-red-500 focus:ring-red-400 w-4 h-4 cursor-pointer mt-0.5"
            />
            <div className="flex flex-col">
              <label
                htmlFor="allowBloodDonation"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Allow Blood Donation Visibility
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                When enabled, this student's blood group and contact info will be discoverable by
                other students searching for blood donors in the mobile app.
              </span>
            </div>
          </div>

          {editMode && editingUser && (
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Assigned Roles</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getUserRoles(editingUser).map((role) => (
                    <span
                      key={role}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        role === "super_admin"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60"
                          : role === "admin"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60"
                      }`}
                    >
                      {role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "Student"}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-slate-400">Multi-role support active</span>
            </div>
          )}

          <div className="flex items-center space-x-3 justify-between mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            {editMode && editingUser ? (
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setResetPasswordUser(editingUser);
                }}
                className="px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg cursor-pointer border border-amber-200/60 dark:border-amber-800/50 transition-colors flex items-center gap-1.5"
                title="Reset Password or Send Link"
              >
                <FiKey className="w-3.5 h-3.5" />
                <span>Reset Password</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-secondary-gradient"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient"
              >
                {loading ? "Processing..." : editMode ? "Update" : "Register"}
              </button>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={userToDelete ? (userToDelete.name || userToDelete.full_name || userToDelete.studentId || userToDelete.email || "Student") : ""}
        loading={deletingStudent || loading}
      />

      {/* View Detail drawer */}
      <UserDetailDialog
        isOpen={inspectOpen}
        onClose={() => setInspectOpen(false)}
        user={selectedUser}
      />

      {/* Bulk Import Dialog */}
      <Dialog
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Import Student Accounts (JSON)"
      >
        <div className="space-y-4">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Paste a JSON array of student objects, or upload a <code>.json</code> file. Note:
            student IDs must match the <code>UGXX-XX-XX-XXX</code> format.
          </p>

          {/* File input uploader */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Upload JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100/50 dark:hover:file:bg-blue-900/50 cursor-pointer"
            />
          </div>

          {/* JSON raw text editor */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Pasted JSON Data
            </label>
            <textarea
              rows={8}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={`[\n  {\n    "studentId": "UG09-10-60-999",\n    "name": "Jane Doe",\n    "email": "jane.doe@sub.edu.bd",\n    "department": "CSE",\n    "batch": "53",\n    "academicSystem": "Semester",\n    "academicLevel": "Semester 1",\n    "city": "Dhaka",\n    "area": "Mirpur"\n  }\n]`}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30"
            />
          </div>

          <div className="flex items-center space-x-3 justify-end border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-secondary-gradient"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkLoading || !bulkJson.trim()}
              onClick={handleBulkImport}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient"
            >
              {bulkLoading ? "Importing..." : "Import Data"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Reset Password Modal */}
      <ResetPasswordDialog
        isOpen={Boolean(resetPasswordUser)}
        onClose={() => setResetPasswordUser(null)}
        user={resetPasswordUser}
      />
    </div>
  );
};

export default UserManagement;
