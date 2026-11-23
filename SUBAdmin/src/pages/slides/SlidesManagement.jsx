import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  FiBook,
  FiFileText,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiDownload,
  FiExternalLink,
  FiCopy,
  FiFilter,
  FiTag,
  FiLayers,
} from "react-icons/fi";
import slidesApi from "../../api/slidesApi";
import subjectsApi from "../../api/subjectsApi";
import { DEPARTMENTS, normalizeDept } from "../../utils/academic";
import Dialog from "../../components/common/Dialog";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";

const schema = yup.object().shape({
  title: yup.string().min(3, "Title must be at least 3 characters").required("Slide Title is required"),
  department: yup.string().required("Department is required"),
  subjectCode: yup.string().required("Subject Code is required"),
  subjectName: yup.string().optional(),
  lectureNumber: yup.string().optional(),
  fileUrl: yup.string().url("Must be a valid URL").required("Download/Drive URL is required"),
  description: yup.string().optional(),
});

export const SlidesManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const [slides, setSlides] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      department: "CSE",
      subjectCode: "",
      subjectName: "",
    },
  });

  const selectedModalDept = watch("department");
  const selectedSubjectCode = watch("subjectCode");

  const loadSubjects = async () => {
    try {
      const data = await subjectsApi.getAll();
      setSubjects(data || []);
    } catch (err) {
      console.warn("Could not load subjects for dropdown:", err);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSlides = async () => {
    setLoading(true);
    try {
      const data = await slidesApi.getAll(
        deptFilter === "all" ? null : deptFilter,
        subjectFilter === "all" ? null : subjectFilter
      );
      setSlides(data);
    } catch (err) {
      toast.error("Failed to load slides: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlides();
  }, [deptFilter, subjectFilter]);

  const handleOpenAdd = () => {
    setEditingSlide(null);
    reset({
      title: "",
      department: deptFilter !== "all" ? deptFilter : "CSE",
      subjectCode: "",
      subjectName: "",
      lectureNumber: "Lecture 01",
      fileUrl: "",
      description: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (slide) => {
    setEditingSlide(slide);
    reset({
      title: slide.title || "",
      department: slide.department || "CSE",
      subjectCode: slide.subjectCode || "",
      subjectName: slide.subjectName || "",
      lectureNumber: slide.lectureNumber || "",
      fileUrl: slide.fileUrl || "",
      description: slide.description || "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (formData) => {
    setSaving(true);
    try {
      if (editingSlide) {
        await slidesApi.update(editingSlide.id, formData);
        toast.success("Lecture slide updated successfully!");
      } else {
        await slidesApi.create({
          ...formData,
          uploaderName: user?.displayName || user?.email || "Admin",
          uploaderEmail: user?.email || "",
        });
        toast.success("Lecture slide uploaded successfully!");
      }
      setModalOpen(false);
      loadSlides();
    } catch (err) {
      toast.error("Failed to save slide: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!slideToDelete) return;
    try {
      await slidesApi.delete(slideToDelete.id);
      toast.success("Slide deleted successfully");
      setDeleteDialogOpen(false);
      setSlideToDelete(null);
      loadSlides();
    } catch (err) {
      toast.error("Failed to delete slide");
    }
  };

  const handleCopyLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.info("Slide URL copied to clipboard!");
  };

  // Extract unique subjects for subject filter
  const uniqueSubjects = Array.from(new Set(slides.map((s) => s.subjectCode).filter(Boolean)));

  const filteredSlides = slides.filter((s) => {
    const matchesSearch =
      (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.subjectCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.lectureNumber || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 fade-in">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
              <FiBook className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Slides & Learning Materials</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Upload course slides, organize by department and subject, and enable seamless student downloads.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm active:scale-95"
          >
            <FiPlus className="w-4 h-4" />
            <span>Upload Slide</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search slides by title, subject code, or lecture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setSubjectFilter("all");
            }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-medium"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          {uniqueSubjects.length > 0 && (
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="all">All Subjects</option>
              {uniqueSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid of Slide Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Loading lecture slides...</p>
        </div>
      ) : filteredSlides.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <FiFileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No slides uploaded yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Upload Slide" above to add course materials.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSlides.map((slide) => (
            <div
              key={slide.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    {slide.subjectCode}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {slide.department}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2 mb-1">
                  {slide.title}
                </h3>

                {slide.lectureNumber && (
                  <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                    {slide.lectureNumber}
                  </p>
                )}

                {slide.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {slide.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-3">
                <a
                  href={slide.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  <span>Download / View</span>
                </a>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyLink(slide.fileUrl)}
                    title="Copy URL"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(slide)}
                    title="Edit"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSlideToDelete(slide);
                      setDeleteDialogOpen(true);
                    }}
                    title="Delete"
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Slide Modal */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSlide ? "Edit Lecture Slide" : "Upload Lecture Slide"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                {...register("department")}
                onChange={(e) => {
                  register("department").onChange(e);
                  setValue("subjectCode", "");
                  setValue("subjectName", "");
                }}
                className="w-full text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Subject</label>
              <select
                value={selectedSubjectCode || ""}
                onChange={(e) => {
                  const code = e.target.value;
                  setValue("subjectCode", code);
                  const found = subjects.find((s) => s.code === code);
                  if (found) {
                    setValue("subjectName", found.name);
                  }
                }}
                className="w-full text-sm"
              >
                <option value="">-- Choose Subject from List --</option>
                {subjects
                  .filter(
                    (s) =>
                      !selectedModalDept ||
                      selectedModalDept === "all" ||
                      normalizeDept(s.department) === normalizeDept(selectedModalDept)
                  )
                  .map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
              </select>
              {errors.subjectCode && <p className="text-rose-500 text-xs mt-1">{errors.subjectCode.message}</p>}
            </div>
          </div>

          {watch("subjectName") && (
            <div className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Course:</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                {selectedSubjectCode} — {watch("subjectName")}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Slide Title / Topic</label>
            <input
              type="text"
              placeholder="e.g. Chapter 4: Memory Management & Paging"
              {...register("title")}
              className="w-full text-sm"
            />
            {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Lecture / Week Number</label>
            <input
              type="text"
              placeholder="e.g. Lecture 05 / Week 3"
              {...register("lectureNumber")}
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              File / Google Drive Download URL
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/file/d/... or direct link"
              {...register("fileUrl")}
              className="w-full text-sm"
            />
            {errors.fileUrl && <p className="text-rose-500 text-xs mt-1">{errors.fileUrl.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes or topics covered in this slide pack..."
              {...register("description")}
              className="w-full text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm active:scale-95"
            >
              {saving ? "Saving..." : editingSlide ? "Update Slide" : "Upload Slide"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Lecture Slide"
        message={`Are you sure you want to delete "${slideToDelete?.title}"? This cannot be undone.`}
      />
    </div>
  );
};

export default SlidesManagement;
