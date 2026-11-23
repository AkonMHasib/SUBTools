import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  FiCalendar,
  FiClock,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiBell,
  FiMapPin,
  FiBookOpen,
  FiUser,
  FiCheckCircle,
  FiSend,
} from "react-icons/fi";
import examApi from "../../api/examApi";
import subjectsApi from "../../api/subjectsApi";
import { DEPARTMENTS, normalizeDept } from "../../utils/academic";
import Dialog from "../../components/common/Dialog";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";
import Badge from "../../components/common/Badge";

const schema = yup.object().shape({
  department: yup.string().required("Department is required"),
  courseCode: yup.string().required("Course is required"),
  courseTitle: yup.string().required("Course Title is required"),
  examDate: yup.string().required("Exam Date is required"),
  examTime: yup.string().required("Exam Time is required"),
  room: yup.string().required("Room Number is required"),
  examType: yup.string().required("Exam Type is required"),
  invigilator: yup.string().nullable().optional(),
  notes: yup.string().nullable().optional(),
});

export const ExamRoutineManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [broadcastingId, setBroadcastingId] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      examType: "Midterm",
      department: "CSE",
      courseCode: "",
      courseTitle: "",
      invigilator: "",
      notes: "",
    },
  });

  const selectedModalDept = watch("department");
  const selectedCourseCode = watch("courseCode");

  const loadSubjects = async () => {
    try {
      const data = await subjectsApi.getAll();
      setSubjects(data || []);
    } catch (err) {
      console.warn("Failed to load subjects for exam dropdown:", err);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await examApi.getAll(deptFilter === "all" ? null : deptFilter);
      setExams(data);
    } catch (err) {
      toast.error("Failed to load exam routines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [deptFilter]);

  const handleOpenAdd = () => {
    setEditingExam(null);
    reset({
      department: deptFilter !== "all" ? deptFilter : "CSE",
      courseCode: "",
      courseTitle: "",
      examDate: "",
      examTime: "10:00 AM - 12:00 PM",
      room: "",
      examType: "Midterm",
      invigilator: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (exam) => {
    setEditingExam(exam);
    reset({
      department: exam.department || "CSE",
      courseCode: exam.courseCode || "",
      courseTitle: exam.courseTitle || "",
      examDate: exam.examDate || "",
      examTime: exam.examTime || "",
      room: exam.room || "",
      examType: exam.examType || "Midterm",
      invigilator: exam.invigilator || "",
      notes: exam.notes || "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (formData) => {
    setSaving(true);
    try {
      if (editingExam) {
        await examApi.update(editingExam.id, formData);
        toast.success("Exam routine slot updated successfully!");
      } else {
        await examApi.create(formData, false);
        toast.success("Exam slot scheduled successfully!");
      }
      setModalOpen(false);
      loadExams();
    } catch (err) {
      toast.error("Failed to save exam routine: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async (exam) => {
    setBroadcastingId(exam.id);
    try {
      await examApi.broadcastExamNotice(exam);
      toast.success(`FCM push broadcast dispatched for ${exam.courseCode}!`);
    } catch (err) {
      toast.error("Failed to broadcast exam notice: " + err.message);
    } finally {
      setBroadcastingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!examToDelete) return;
    try {
      await examApi.delete(examToDelete.id);
      toast.success("Exam slot deleted successfully");
      setDeleteDialogOpen(false);
      setExamToDelete(null);
      loadExams();
    } catch (err) {
      toast.error("Failed to delete exam slot");
    }
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      (e.courseCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.courseTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.room || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || (e.examType || "").toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-12 fade-in">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <FiCalendar className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Routine Management</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Schedule examinations, manage seat plans, and broadcast real-time FCM notifications to students.
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
            <span>Add Exam Slot</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by course code, title, room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-medium"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-medium"
          >
            <option value="all">All Types</option>
            <option value="Midterm">Midterm</option>
            <option value="Final">Final</option>
            <option value="Improvement">Improvement</option>
            <option value="Quiz">Quiz</option>
          </select>
        </div>
      </div>

      {/* Routine Cards / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p>Loading exam routines...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FiCalendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No exam slots found</p>
            <p className="text-xs text-slate-400 mt-1">Add a new exam slot or adjust filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Course</th>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-3.5 px-4 font-semibold">Room & Type</th>
                  <th className="py-3.5 px-4 font-semibold">Invigilator</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-indigo-600 dark:text-indigo-400">{exam.courseCode}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {exam.department}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{exam.courseTitle}</div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <FiCalendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{exam.examDate}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <FiClock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{exam.examTime}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                        <FiMapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>Room {exam.room}</span>
                      </div>
                      <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {exam.examType || "Midterm"}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <FiUser className="w-3.5 h-3.5 text-slate-400" />
                        <span>{exam.invigilator || "TBA"}</span>
                      </div>
                      {exam.notes && <div className="text-[11px] text-slate-400 italic mt-0.5">{exam.notes}</div>}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleBroadcast(exam)}
                          disabled={broadcastingId === exam.id}
                          title="Broadcast Push Notification"
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                        >
                          <FiBell className={`w-4 h-4 ${broadcastingId === exam.id ? "animate-bounce" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(exam)}
                          title="Edit"
                          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setExamToDelete(exam);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete"
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExam ? "Edit Exam Routine Slot" : "Schedule New Exam Slot"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                {...register("department")}
                onChange={(e) => {
                  register("department").onChange(e);
                  setValue("courseCode", "");
                  setValue("courseTitle", "");
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam Type</label>
              <select {...register("examType")} className="w-full text-sm">
                <option value="Midterm">Midterm</option>
                <option value="Final">Final</option>
                <option value="Improvement">Improvement</option>
                <option value="Quiz">Quiz</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Course / Subject
              </label>
              <select
                value={selectedCourseCode || ""}
                onChange={(e) => {
                  const code = e.target.value;
                  setValue("courseCode", code);
                  const found = subjects.find((s) => s.code === code);
                  if (found) {
                    setValue("courseTitle", found.name);
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
                      {s.code}: {s.name}
                    </option>
                  ))}
              </select>
              {errors.courseCode && <p className="text-rose-500 text-xs mt-1">{errors.courseCode.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Room No.</label>
              <input type="text" placeholder="e.g. 504 (Main Campus)" {...register("room")} className="w-full text-sm" />
              {errors.room && <p className="text-rose-500 text-xs mt-1">{errors.room.message}</p>}
            </div>
          </div>

          {watch("courseTitle") && (
            <div className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Selected Subject:</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                {selectedCourseCode} — {watch("courseTitle")}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam Date</label>
              <input type="date" {...register("examDate")} className="w-full text-sm" />
              {errors.examDate && <p className="text-rose-500 text-xs mt-1">{errors.examDate.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Time Slot</label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM - 12:00 PM"
                {...register("examTime")}
                className="w-full text-sm"
              />
              {errors.examTime && <p className="text-rose-500 text-xs mt-1">{errors.examTime.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Invigilator / Teacher in Charge <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Jane Doe (Associate Professor)"
              {...register("invigilator")}
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Special Instructions / Seat Plan Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Bring ID card and non-programmable calculator."
              {...register("notes")}
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
              {saving ? "Saving..." : editingExam ? "Update Slot" : "Create Slot"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Exam Slot"
        message={`Are you sure you want to delete the exam schedule for ${examToDelete?.courseCode}? This cannot be undone.`}
      />
    </div>
  );
};

export default ExamRoutineManagement;
