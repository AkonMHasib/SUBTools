// Subject Management Page Component
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
  FiChevronLeft,
  FiChevronRight,
  FiLayers,
} from "react-icons/fi";
import {
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  setSearchQuery,
  setFilters,
  clearSubjectStatus,
} from "../../redux/slices/subjectSlice";
import { DEPARTMENTS, normalizeDept, getDepartmentName } from "../../utils/academic";
import Dialog from "../../components/common/Dialog";
import Badge from "../../components/common/Badge";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import DatabaseService from "../../services/DatabaseService";

// Form validation schema
const schema = yup.object().shape({
  code: yup
    .string()
    .matches(
      /^[A-Z]{3,4}-\d{3,4}$/,
      "Course Code must match FORMAT-NNN(N) (e.g. CSE-221, BNG-1103)",
    )
    .required("Course Code is required"),
  name: yup
    .string()
    .min(3, "Subject Name must be at least 3 characters")
    .required("Subject Name is required"),
  department: yup
    .string()
    .oneOf(
      ["CSE", "DSE", "EEE", "ARCH", "BBA", "BUS", "ENG", "ENV", "FENS", "JCMS", "LAW", "PHAR", "MIB"],
      "Select a valid department",
    )
    .required("Department is required"),
  term: yup.string().required("Term is required"),
  credit: yup.string().required("Course Credit is required"),
});

// Dynamic term options helper
const getAcademicLevelOptions = (dept) => {
  if (dept === "ARCH") {
    return Array.from({ length: 10 }, (_, i) => `Term-${i + 1}`);
  } else if (dept === "CSE" || dept === "DSE") {
    return Array.from({ length: 8 }, (_, i) => `Term-${i + 1}`);
  } else {
    return Array.from({ length: 12 }, (_, i) => `Term-${i + 1}`);
  }
};

import { isSuperAdmin, isAdmin } from "../../utils/permissionUtils";

export const SubjectManagement = () => {
  const dispatch = useDispatch();
  const { filteredList, searchQuery, filters, loading, success, error } = useSelector(
    (state) => state.subjects,
  );
  const { user } = useSelector((state) => state.auth);

  const isSuperAdminUser = isSuperAdmin(user);
  const isDeptAdmin = isAdmin(user) && !isSuperAdminUser;
  const adminDept = isSuperAdminUser ? "" : normalizeDept(user?.department);
  const adminTerm = isSuperAdminUser ? "" : (user?.academicLevel || user?.term || "");

  // Component States
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  // Bulk Import States
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDepartment, setBulkDepartment] = useState(adminDept || "CSE");

  // Super Admin Merge Duplicates State & Logic
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [duplicateSubjectGroups, setDuplicateSubjectGroups] = useState([]);
  const [mergeLoading, setMergeLoading] = useState(false);

  const scanSubjectDuplicates = () => {
    const groups = {};
    filteredList.forEach((subj) => {
      const deptKey = normalizeDept(subj.department) || "UNKNOWN";
      const codeKey = (subj.code || subj.name || "UNKNOWN").toUpperCase().trim();
      const groupKey = `${deptKey}_${codeKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(subj);
    });

    const duplicates = [];
    Object.entries(groups).forEach(([key, items]) => {
      const uniqueTerms = new Set(items.map((i) => i.term).filter(Boolean));
      // ONLY available if the same subject is added across DIFFERENT terms of the same department
      if (uniqueTerms.size > 1) {
        duplicates.push({
          groupKey: key,
          dept: items[0].department,
          code: items[0].code,
          name: items[0].name,
          primaryId: items[0].code || items[0].id,
          items: items,
          terms: Array.from(uniqueTerms),
        });
      }
    });

    return duplicates;
  };

  const handleOpenMergeModal = () => {
    const found = scanSubjectDuplicates();
    setDuplicateSubjectGroups(found);
    setMergeModalOpen(true);
  };

  const setPrimarySubjectSlot = (groupKey, subjectId) => {
    setDuplicateSubjectGroups((prev) =>
      prev.map((grp) => (grp.groupKey === groupKey ? { ...grp, primaryId: subjectId } : grp)),
    );
  };

  const handleDeleteSingleSubject = async (groupKey, subjectCode) => {
    setMergeLoading(true);
    try {
      await dispatch(deleteSubject(subjectCode));
      toast.success("Single duplicate course deleted!");

      setDuplicateSubjectGroups((prev) =>
        prev
          .map((grp) => {
            if (grp.groupKey !== groupKey) return grp;
            const updatedItems = grp.items.filter(
              (item) => (item.code || item.id) !== subjectCode,
            );
            if (updatedItems.length <= 1) return null;
            const newPrimaryId =
              grp.primaryId === subjectCode
                ? updatedItems[0].code || updatedItems[0].id
                : grp.primaryId;
            return { ...grp, items: updatedItems, primaryId: newPrimaryId };
          })
          .filter(Boolean),
      );

      dispatch(fetchSubjects({ forceRefresh: true }));
    } catch (err) {
      toast.error("Failed to delete subject: " + err.message);
    } finally {
      setMergeLoading(false);
    }
  };

  const handleMergeSingleSubjectGroup = async (group) => {
    setMergeLoading(true);
    try {
      const primaryItem =
        group.items.find((item) => (item.code || item.id) === group.primaryId) || group.items[0];
      const redundantItems = group.items.filter(
        (item) => (item.code || item.id) !== (primaryItem.code || primaryItem.id),
      );

      await Promise.all(
        redundantItems.map((redDoc) =>
          DatabaseService.deleteDocument("subjects", redDoc.code || redDoc.id)
        )
      );
      toast.success(`Merged duplicate subject group for "${group.code} - ${group.name}"!`);

      setDuplicateSubjectGroups((prev) => prev.filter((grp) => grp.groupKey !== group.groupKey));
      dispatch(fetchSubjects({ forceRefresh: true }));
    } catch (err) {
      toast.error("Failed to merge subject group: " + err.message);
    } finally {
      setMergeLoading(false);
    }
  };

  const handleConfirmMergeAll = async () => {
    if (duplicateSubjectGroups.length === 0) return;
    setMergeLoading(true);
    try {
      let deletedDocsCount = 0;

      for (const group of duplicateSubjectGroups) {
        const primaryItem =
          group.items.find((item) => (item.code || item.id) === group.primaryId) || group.items[0];
        const redundantItems = group.items.filter(
          (item) => (item.code || item.id) !== (primaryItem.code || primaryItem.id),
        );

        await Promise.all(
          redundantItems.map((redDoc) =>
            DatabaseService.deleteDocument("subjects", redDoc.code || redDoc.id)
          )
        );
        deletedDocsCount += redundantItems.length;
      }

      toast.success(
        `Successfully merged all ${duplicateSubjectGroups.length} duplicate subject groups and deleted ${deletedDocsCount} redundant courses!`,
      );
      setMergeModalOpen(false);
      dispatch(fetchSubjects({ forceRefresh: true }));
    } catch (err) {
      toast.error("Failed to merge duplicate subjects: " + err.message);
    } finally {
      setMergeLoading(false);
    }
  };



  const getDeptFullName = (dept) => {
    return getDepartmentName(dept) || dept;
  };

  // Filter list by admin department if restricted
  const subjectsToDisplay = filteredList.filter(
    (subj) => !adminDept || normalizeDept(subj.department) === normalizeDept(adminDept)
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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
      term: adminTerm || "Term-1",
      credit: "3.0",
    },
  });

  // Fetch subjects on mount
  useEffect(() => {
    dispatch(fetchSubjects());
  }, [dispatch]);

  // Handle Success/Error status changes
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearSubjectStatus());
    }
    if (success) {
      toast.success(editMode ? "Course updated successfully!" : "Course registered successfully!");
      setModalOpen(false);
      reset();
      dispatch(clearSubjectStatus());
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
  const currentItems = subjectsToDisplay.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(subjectsToDisplay.length / itemsPerPage);

  const onSubmit = (data) => {
    const subjectPayload = {
      ...data,
      department: adminDept || data.department,
      term: adminTerm || data.term,
    };
    if (editMode) {
      dispatch(updateSubject({ code: data.code, updatedData: subjectPayload }));
    } else {
      dispatch(createSubject(subjectPayload));
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    reset({
      code: "",
      name: "",
      department: adminDept || "CSE",
      term: adminTerm || "Term-1",
      credit: "3.0",
    });
    setModalOpen(true);
  };

  const openEditModal = (subject) => {
    setEditMode(true);
    reset({
      code: subject.code,
      name: subject.name,
      department: subject.department,
      term: subject.term || "Term-1",
      credit: subject.credit || "3.0",
    });
    setModalOpen(true);
  };

  const openDeleteDialog = (subject) => {
    setSubjectToDelete(subject);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (subjectToDelete) {
      await dispatch(deleteSubject(subjectToDelete.code));
      toast.success("Course deleted from registry!");
      setDeleteOpen(false);
      setSubjectToDelete(null);
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
      const selectedDepartment = adminDept || bulkDepartment;
      if (!selectedDepartment) {
        toast.error("Please select a department.");
        setBulkLoading(false);
        return;
      }
      const parsed = JSON.parse(bulkJson.trim());
      if (!Array.isArray(parsed)) {
        toast.error("JSON must be an array of subject objects.");
        setBulkLoading(false);
        return;
      }
      let successCount = 0;
      let errorCount = 0;
      for (const item of parsed) {
        const isValid = item.code && item.name && item.term && item.credit;
        if (isValid) {
          await dispatch(
            createSubject({
              ...item,
              department: selectedDepartment,
            }),
          );
          successCount++;
        } else {
          errorCount++;
        }
      }
      toast.success(`Successfully imported ${successCount} subjects!`);
      if (errorCount > 0) {
        toast.warn(`${errorCount} subjects skipped due to validation errors.`);
      }
      setBulkOpen(false);
      setBulkJson("");
      setBulkDepartment(adminDept || "CSE");
    } catch (e) {
      toast.error("Invalid JSON format: " + e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Subject Registry
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Manage course lists, edit catalog details, and define department mappings.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          {isSuperAdminUser && (
            <button
              onClick={handleOpenMergeModal}
              className="px-4 py-2 rounded-xl bg-purple-600/10 hover:bg-purple-600 text-purple-600 hover:text-white border border-purple-200 dark:border-purple-900/40 hover:border-transparent transition-all text-xs font-bold cursor-pointer flex items-center justify-center space-x-1.5 font-display"
            >
              <FiLayers className="text-sm" />
              <span>Merge Duplicates</span>
            </button>
          )}
          <button
            onClick={() => setBulkOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-800"
          >
            <span>Bulk Import (JSON)</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer btn-primary-gradient"
          >
            <FiPlus className="text-sm" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* Search & Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search bar */}
        <div className="relative w-full md:max-w-xs text-slate-400 dark:text-slate-500">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" />
          <input
            type="text"
            placeholder="Search by code or course name..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30"
          />
        </div>

        {/* Filter Selection */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
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
        </div>
      </div>

      {/* Subjects Data Table */}
      {loading && !filteredList.length ? (
        <LoadingSkeleton type="table" count={1} rows={8} cols={6} />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                <th className="px-6 py-4">Course Code</th>
                <th className="px-6 py-4">Subject Name</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Term</th>
                <th className="px-6 py-4">Credit</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {currentItems.length > 0 ? (
                currentItems.map((subj) => (
                  <tr
                    key={subj.code}
                    className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {subj.code}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-350">
                      {subj.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-tight bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50 shadow-2xs"
                        title={getDeptFullName(subj.department)}
                      >
                        {normalizeDept(subj.department) || subj.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="warning">{subj.term || "Term-1"}</Badge>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {subj.credit || "3.0"}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {(!isDeptAdmin ||
                        normalizeDept(subj.department) === normalizeDept(adminDept)) && (
                        <button
                          onClick={() => openEditModal(subj)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                          title="Edit Course"
                        >
                          <FiEdit2 />
                        </button>
                      )}
                      {(isSuperAdminUser ||
                        (isDeptAdmin &&
                          normalizeDept(subj.department) === normalizeDept(adminDept))) && (
                        <button
                          onClick={() => openDeleteDialog(subj)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                          title="Delete Course"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-slate-400 dark:text-slate-600 font-semibold"
                  >
                    No matching course codes found in this registry.
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
              {subjectsToDisplay.length > 0
                ? `Showing ${indexOfFirstItem + 1}–${Math.min(indexOfLastItem, subjectsToDisplay.length)} of ${subjectsToDisplay.length} Courses`
                : "No courses found"}
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

      {/* Add / Edit Course Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMode ? "Edit Course Record" : "Register New Course"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Course Code */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Course Code
            </label>
            <input
              type="text"
              placeholder="CSE-221"
              disabled={editMode}
              {...register("code")}
              className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.code ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
            />
            {errors.code && (
              <span className="text-[9px] text-red-500 mt-1 font-semibold">
                {errors.code.message}
              </span>
            )}
          </div>

          {/* Subject Name */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Subject Name
            </label>
            <input
              type="text"
              placeholder="Object Oriented Programming"
              {...register("name")}
              className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.name ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
            />
            {errors.name && (
              <span className="text-[9px] text-red-500 mt-1 font-semibold">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Department
              </label>
              <select
                disabled={!!adminDept}
                {...register("department")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-60"
              >
              {DEPARTMENTS.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
              </select>
            </div>

            {/* Term */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Term
              </label>
              <select
                disabled={!!adminTerm}
                {...register("term")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-350 disabled:opacity-60"
              >
                {getAcademicLevelOptions(watch("department")).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Course Credit */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Course Credit
            </label>
            <select
              {...register("credit")}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-350"
            >
              <option value="1.0">1.0 Credit</option>
              <option value="1.5">1.5 Credits</option>
              <option value="2.0">2.0 Credits</option>
              <option value="3.0">3.0 Credits</option>
              <option value="4.0">4.0 Credits</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 justify-end mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm"
            >
              {loading ? "Processing..." : editMode ? "Update" : "Register"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        itemName={subjectToDelete ? subjectToDelete.name : ""}
        loading={loading}
      />

      {/* Bulk Import Dialog */}
      <Dialog
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Import Course Subjects"
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
              Department
            </label>
            <select
              value={adminDept || bulkDepartment}
              disabled={!!adminDept}
              onChange={(e) => setBulkDepartment(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Pasted JSON Data
            </label>
            <textarea
              rows={8}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={`[\n  {\n    "code": "CSE-321",\n    "name": "Operating Systems",\n    "term": "Term-5",\n    "credit": "3.0"\n  }\n]`}
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

      {/* Super Admin Merge Duplicates Dialog */}
      <Dialog
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        title="Merge Duplicate Subject Courses (Super Admin)"
      >
        <div className="space-y-5 max-w-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Review detected duplicate courses. Select which course entry to preserve as the <strong>Master Course Record</strong>. Redundant duplicate records will be purged. You can merge groups <strong>one by one</strong> or merge all at once.
          </p>

          {duplicateSubjectGroups.length > 0 ? (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
              {duplicateSubjectGroups.map((grp) => {
                const primaryItem =
                  grp.items.find((item) => (item.code || item.id) === grp.primaryId) || grp.items[0];

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
                            {grp.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                          Dept: <strong>{grp.dept}</strong> &middot; Term: <strong>{grp.term}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => handleMergeSingleSubjectGroup(grp)}
                        disabled={mergeLoading}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center space-x-1 shrink-0 disabled:opacity-50"
                      >
                        <FiLayers size={12} />
                        <span>Merge This Group</span>
                      </button>
                    </div>

                    {/* BEFORE vs AFTER Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* BEFORE Column */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                          ⚡ BEFORE: Detected Course Records ({grp.items.length})
                        </span>
                        <div className="space-y-2">
                          {grp.items.map((item) => {
                            const itemId = item.code || item.id;
                            const isMaster = itemId === grp.primaryId;

                            return (
                              <div
                                key={itemId}
                                className={`p-2.5 rounded-xl border text-[11px] transition-all relative ${
                                  isMaster
                                    ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700 shadow-xs"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                                    <input
                                      type="radio"
                                      name={`master-subj-${grp.groupKey}`}
                                      checked={isMaster}
                                      onChange={() => setPrimarySubjectSlot(grp.groupKey, itemId)}
                                      className="accent-purple-600 cursor-pointer"
                                    />
                                    <span>
                                      {item.code} - {item.name}
                                    </span>
                                  </label>

                                  <button
                                    onClick={() => handleDeleteSingleSubject(grp.groupKey, itemId)}
                                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                                    title="Delete this duplicate course record"
                                  >
                                    <FiTrash2 size={12} />
                                  </button>
                                </div>

                                <div className="mt-1 pl-5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  Credit: {item.credit} &middot; Term: {item.term}
                                </div>

                                {isMaster && (
                                  <span className="mt-1.5 ml-5 inline-block text-[9px] font-extrabold bg-purple-600 text-white px-1.5 py-0.2 rounded-full">
                                    Selected Master Record
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* AFTER Column */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                          ✨ AFTER: Preserved Course Record
                        </span>
                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl space-y-2 text-[11px] h-full flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {primaryItem.code} - {primaryItem.name}
                              </span>
                              <Badge variant="success">Preserved</Badge>
                            </div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400">
                              Mapped: <strong>{primaryItem.department} &middot; {primaryItem.term} ({primaryItem.credit} Credits)</strong>
                            </div>
                          </div>

                          <span className="text-[9px] text-slate-400 italic block border-t border-emerald-200/40 dark:border-slate-800 pt-1.5">
                            Redundant entries will be deleted.
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
              🎉 Clean! No duplicate course entries were found in the database.
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400">
              {duplicateSubjectGroups.length} duplicate {duplicateSubjectGroups.length === 1 ? "group" : "groups"} remaining
            </span>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMergeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg btn-secondary-gradient cursor-pointer"
              >
                Close
              </button>
              {duplicateSubjectGroups.length > 0 && (
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
                      <span>Merge All ({duplicateSubjectGroups.length} Groups)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default SubjectManagement;
