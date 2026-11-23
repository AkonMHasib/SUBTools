// Faculty Management page component
import { isSuperAdmin, isAdmin } from "../../utils/permissionUtils";
import { DEPARTMENTS, normalizeDept, getDepartmentName } from "../../utils/academic";
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
  FiMail,
  FiPhone,
  FiBookOpen,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import {
  fetchFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  setSearchQuery,
  setFilters,
  clearFacultyStatus,
} from "../../redux/slices/facultySlice";
import Dialog from "../../components/common/Dialog";
import Badge from "../../components/common/Badge";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";

// Form validation schema
const schema = yup.object().shape({
  name: yup.string().min(3, "Name must be at least 3 characters").required("Full Name is required"),
  email: yup.string().email("Enter a valid email").required("Email is required"),
  phone: yup
    .string()
    .matches(/^01\d{9}$/, "Use an 11-digit Bangladeshi phone number (e.g. 01711223344)")
    .required("Phone number is required"),
  department: yup
    .string()
    .oneOf(
      ["CSE", "DSE", "EEE", "ARCH", "BBA", "BUS", "ENG", "ENV", "FENS", "JCMS", "LAW", "PHAR", "MIB"],
      "Select a valid department",
    )
    .required("Department is required"),
  designation: yup
    .string()
    .oneOf(
      ["Professor", "Associate Professor", "Assistant Professor", "Lecturer"],
      "Select a valid designation",
    )
    .required("Designation is required"),
  status: yup
    .string()
    .oneOf(["Active", "On Leave", "Left"], "Select a valid status")
    .required("Status is required"),
});

// Dynamic avatar background colors based on faculty name initial
const getAvatarStyle = (name) => {
  const char = name.trim().charAt(0).toUpperCase();
  const colors = [
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  ];
  const index = char.charCodeAt(0) % colors.length;
  return colors[index];
};

export const FacultyManagement = () => {
  const dispatch = useDispatch();
  const { filteredList, searchQuery, filters, loading, success, error } = useSelector(
    (state) => state.faculty,
  );
  const { user } = useSelector((state) => state.auth);

  const isSuperAdminUser = isSuperAdmin(user);
  const isDeptAdmin = isAdmin(user) && !isSuperAdminUser;
  const adminDept = isSuperAdminUser ? "" : normalizeDept(user?.department);

  // Component States
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeFaculty, setActiveFaculty] = useState(null);

  // Bulk Import States
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);



  const getDeptFullName = (dept) => {
    return getDepartmentName(dept) || dept;
  };

  // Filter list by admin department if restricted
  const facultyToDisplay = filteredList.filter(
    (fac) => !adminDept || normalizeDept(fac.department) === normalizeDept(adminDept),
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      department: adminDept || "CSE",
      designation: "Lecturer",
      status: "Active",
      phone: "",
    },
  });

  // Fetch faculty members on mount
  useEffect(() => {
    dispatch(fetchFaculty());
  }, [dispatch]);

  // Handle Success/Error state changes
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearFacultyStatus());
    }
    if (success) {
      toast.success(editMode ? "Faculty profile updated!" : "Faculty profile registered!");
      setModalOpen(false);
      reset();
      dispatch(clearFacultyStatus());
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
  const currentItems = facultyToDisplay.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(facultyToDisplay.length / itemsPerPage);

  const onSubmit = (data) => {
    const facultyPayload = {
      ...data,
      department: adminDept || data.department,
    };

    if (editMode) {
      dispatch(updateFaculty({ id: activeFaculty.id, updatedData: facultyPayload }));
    } else {
      dispatch(createFaculty(facultyPayload));
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    reset({
      name: "",
      email: "",
      phone: "",
      department: adminDept || "CSE",
      designation: "Lecturer",
      status: "Active",
    });
    setModalOpen(true);
  };

  const openEditModal = (fac) => {
    setEditMode(true);
    setActiveFaculty(fac);
    reset({
      name: fac.name,
      email: fac.email,
      phone: fac.phone || "",
      department: fac.department,
      designation: fac.designation,
      status: fac.status,
    });
    setModalOpen(true);
  };

  const openDeleteDialog = (fac) => {
    setActiveFaculty(fac);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (activeFaculty) {
      await dispatch(deleteFaculty(activeFaculty.id));
      toast.success("Faculty profile deleted successfully!");
      setDeleteOpen(false);
      setActiveFaculty(null);
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
    setBulkLoading(true);
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) {
        toast.error("JSON must be an array of faculty objects.");
        setBulkLoading(false);
        return;
      }
      let successCount = 0;
      let errorCount = 0;
      for (const item of parsed) {
        const isValid = item.name && item.email && item.department && item.designation;
        if (isValid) {
          await dispatch(
            createFaculty({
              ...item,
              id: item.id || `fac-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              status: item.status || "Active",
            }),
          );
          successCount++;
        } else {
          errorCount++;
        }
      }
      toast.success(`Successfully imported ${successCount} faculty profiles!`);
      if (errorCount > 0) {
        toast.warn(`${errorCount} profiles skipped due to validation errors.`);
      }
      setBulkOpen(false);
      setBulkJson("");
    } catch (e) {
      toast.error("Invalid JSON format: " + e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Faculty Directory
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Manage university lecturers, professors, and advisors. Appoint credentials and monitor
            academic assignments.
          </p>
        </div>
        {(isSuperAdminUser || isDeptAdmin) && (
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
              <span>Appoint Faculty</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:max-w-xs text-slate-400 dark:text-slate-500">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" />
          <input
            type="text"
            placeholder="Search by name, email, phone (e.g. 017)..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30"
          />
        </div>

        {/* Dynamic Select Filters */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Department filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <FiFilter className="text-slate-400" />
            <select
              value={adminDept || filters.department}
              disabled={!!adminDept}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer disabled:opacity-60"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Designation filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <select
              value={filters.designation}
              onChange={(e) => handleFilterChange("designation", e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <option value="All">All Designations</option>
              <option value="Professor">Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Assistant Professor">Assistant Professor</option>
              <option value="Lecturer">Lecturer</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <select
              value={filters.status || "All"}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Left">Left</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Layout of Faculty Cards */}
      {currentItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((fac) => (
            <div
              key={fac.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative group"
            >
              {/* Edit & Delete — Super Admin or Department Admin matching department */}
              {(isSuperAdminUser ||
                (isDeptAdmin && normalizeDept(fac.department) === normalizeDept(adminDept))) && (
                <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(fac)}
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                    title="Edit Profile"
                  >
                    <FiEdit2 size={12} />
                  </button>
                  <button
                    onClick={() => openDeleteDialog(fac)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                    title="Remove Profile"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              )}

              {/* Card Body */}
              <div className="flex items-start space-x-4">
                {/* Initial Avatar */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${getAvatarStyle(fac.name)} shrink-0`}
                >
                  {fac.name.trim().charAt(0).toUpperCase()}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <h3
                    className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate pr-8"
                    title={fac.name}
                  >
                    {fac.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {fac.designation}
                    </span>
                  </div>

                  {/* Email Link */}
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <FiMail className="text-slate-400 dark:text-slate-500 text-xs shrink-0" />
                    <a
                      href={`mailto:${fac.email}`}
                      className="truncate hover:underline hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                      title={`Email ${fac.email}`}
                    >
                      {fac.email}
                    </a>
                  </div>

                  {/* Phone Link (Only displayed if available) */}
                  {fac.phone && fac.phone.trim() && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <FiPhone className="text-slate-400 dark:text-slate-500 text-xs shrink-0" />
                        <a
                          href={`tel:${fac.phone}`}
                          className="font-mono font-medium hover:underline hover:text-emerald-600 dark:hover:text-emerald-400 truncate"
                          title={`Call ${fac.phone}`}
                        >
                          {fac.phone}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigator.clipboard.writeText(fac.phone);
                          toast.info(`Copied ${fac.phone}`);
                        }}
                        className="text-[9px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 cursor-pointer shrink-0 transition-colors ml-1"
                        title="Copy phone number"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer badges */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <Badge variant="info">{getDeptFullName(fac.department)}</Badge>
                <Badge
                  variant={
                    fac.status === "Active"
                      ? "success"
                      : fac.status === "Left"
                      ? "danger"
                      : "warning"
                  }
                >
                  {fac.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-655 font-bold shadow-xs">
          No faculty members matched the active registry filters.
        </div>
      )}

      {/* Pagination Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            {facultyToDisplay.length > 0
              ? `Showing ${indexOfFirstItem + 1}–${Math.min(indexOfLastItem, facultyToDisplay.length)} of ${facultyToDisplay.length} Faculty Members`
              : "No faculty members found"}
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

      {/* Add / Edit Faculty Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMode ? "Edit Faculty Profile" : "Appoint New Faculty"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Faculty Name */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Dr. Jane Smith"
              {...register("name")}
              className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.name ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
            />
            {errors.name && (
              <span className="text-[9px] text-red-500 mt-1 font-semibold">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Faculty Email */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="jane.smith@sub.edu.bd"
              {...register("email")}
              className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.email ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
            />
            {errors.email && (
              <span className="text-[9px] text-red-500 mt-1 font-semibold">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Faculty Phone */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="01711223344"
              {...register("phone")}
              className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.phone ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
            />
            {errors.phone && (
              <span className="text-[9px] text-red-500 mt-1 font-semibold">
                {errors.phone.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Department */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Department
              </label>
              <select
                disabled={!!adminDept}
                {...register("department")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-350 disabled:opacity-60"
              >
              {DEPARTMENTS.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
              </select>
            </div>

            {/* Designation */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Designation
              </label>
              <select
                {...register("designation")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-350"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Status
              </label>
              <select
                {...register("status")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-350"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Left">Left</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3 justify-end mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
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
              {loading ? "Processing..." : editMode ? "Update" : "Appoint"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        itemName={activeFaculty ? activeFaculty.name : ""}
        loading={loading}
      />

      {/* Bulk Import Dialog */}
      <Dialog
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Import Faculty Directory"
      >
        <div className="space-y-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Select JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100/50 dark:hover:file:bg-blue-900/50 cursor-pointer"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Pasted JSON Data
            </label>
            <textarea
              rows={8}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={`[\n  {\n    "name": "Dr. Kamal Hossain",\n    "email": "kamal@sub.edu.bd",\n    "department": "CSE",\n    "designation": "Professor",\n    "status": "Active"\n  }\n]`}
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
    </div>
  );
};

export default FacultyManagement;
