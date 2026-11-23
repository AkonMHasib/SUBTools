import { useState, useEffect, useMemo } from "react";
import {
  FiClock,
  FiPlus,
  FiCheckCircle,
  FiCircle,
  FiTrash2,
  FiCalendar,
  FiBook,
  FiAlertCircle,
  FiX,
  FiBell,
  FiBellOff,
} from "react-icons/fi";
import { toast } from "react-toastify";

const PREF_KEY = "subtools_academic_reminders_pref";

export const StudentAcademicReminders = ({ user }) => {
  const [reminders, setReminders] = useState(() => {
    try {
      const stored = localStorage.getItem(PREF_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeFilter, setActiveFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission === "granted"
      : false
  );

  // Form states
  const [type, setType] = useState("Class Test");
  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("10:00 AM");

  // Save to localStorage whenever reminders change
  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(reminders));
    } catch (e) {
      console.warn("Failed to persist reminders to localStorage", e);
    }
  }, [reminders]);

  // Request browser notification permission
  const handleRequestNotification = async () => {
    if (!("Notification" in window)) {
      toast.info("Browser notifications are not supported on this device.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotificationsEnabled(true);
      toast.success("Academic reminders notifications enabled!");
    } else {
      toast.error("Notification permission denied.");
    }
  };

  // Add reminder
  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a reminder title.");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a due date.");
      return;
    }

    const newReminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      courseCode: courseCode.trim().toUpperCase() || "ACADEMIC",
      title: title.trim(),
      dueDate,
      dueTime,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setReminders((prev) => [newReminder, ...prev]);
    toast.success(`${type} reminder added!`);
    setShowAddModal(false);
    setTitle("");
    setCourseCode("");
    setDueDate("");
  };

  // Toggle complete
  const handleToggleComplete = (id) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  // Delete reminder
  const handleDeleteReminder = (id) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.info("Reminder removed.");
  };

  // Filtered list
  const filtered = useMemo(() => {
    return reminders.filter((r) => {
      if (activeFilter === "All") return true;
      return r.type.toLowerCase().includes(activeFilter.toLowerCase());
    });
  }, [reminders, activeFilter]);

  // Relative due label helper
  const getDueLabel = (dateStr) => {
    if (!dateStr) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d Overdue`, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800" };
    if (diffDays === 0) return { label: "Due Today", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800" };
    if (diffDays === 1) return { label: "Due Tomorrow", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800" };
    return { label: `In ${diffDays} days`, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800" };
  };

  const enrolledSubjects = user?.subjects || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <FiClock className="mr-2 text-indigo-500" />
            <span>Academic Reminders</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track your upcoming Class Tests (CTs), Quizzes, and Assignment deadlines with browser notifications.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Notification Permission Toggle */}
          <button
            onClick={handleRequestNotification}
            title={notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 cursor-pointer ${
              notificationsEnabled
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900"
            }`}
          >
            {notificationsEnabled ? <FiBell className="text-sm" /> : <FiBellOff className="text-sm" />}
            <span className="hidden sm:inline">
              {notificationsEnabled ? "Alerts Active" : "Enable Alerts"}
            </span>
          </button>

          {/* Add Reminder CTA */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer"
          >
            <FiPlus className="text-sm" />
            <span>Add Reminder</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs matching Android filter_all, filter_ct, filter_quiz, filter_assignment */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "All", label: `All Reminders (${reminders.length})` },
          { id: "Class Test", label: "Class Tests (CT)" },
          { id: "Quiz Test", label: "Quizzes" },
          { id: "Assignment", label: "Assignments" },
        ].map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Reminders List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          <FiCalendar className="mx-auto text-4xl text-indigo-500/60 mb-3" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No academic reminders found
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Stay organized! Click "Add Reminder" above to set reminders for your next Class Test, Quiz, or Assignment submission.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filtered.map((r) => {
            const dueInfo = getDueLabel(r.dueDate);
            const isCompleted = r.completed;

            return (
              <div
                key={r.id}
                className={`border rounded-2xl p-4 transition-all shadow-xs flex flex-col justify-between ${
                  isCompleted
                    ? "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 opacity-70"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                        r.type === "Assignment"
                          ? "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                          : r.type === "Quiz Test"
                            ? "bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                            : "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                      }`}
                    >
                      {r.type}
                    </span>

                    {dueInfo && !isCompleted && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${dueInfo.color}`}
                      >
                        {dueInfo.label}
                      </span>
                    )}

                    {isCompleted && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        ✓ Completed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <FiBook className="text-indigo-500" />
                    <span>{r.courseCode}</span>
                  </div>

                  <h4
                    className={`text-sm font-bold mb-2 leading-snug ${
                      isCompleted
                        ? "line-through text-slate-400 dark:text-slate-500"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {r.title}
                  </h4>

                  <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="flex items-center">
                      <FiCalendar className="mr-1 text-slate-400" />
                      {r.dueDate}
                    </span>
                    {r.dueTime && (
                      <span className="flex items-center">
                        <FiClock className="mr-1 text-slate-400" />
                        {r.dueTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleToggleComplete(r.id)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                  >
                    {isCompleted ? (
                      <>
                        <FiCheckCircle className="text-emerald-500 text-sm" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <FiCircle className="text-slate-400 text-sm" />
                        <span>Mark as Done</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteReminder(r.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                    title="Delete reminder"
                  >
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <FiClock className="mr-2 text-indigo-500" />
                <span>Add Academic Reminder</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleAddReminder} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Reminder Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Class Test", "Quiz Test", "Assignment"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        type === t
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Course Code / Subject *
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE 311 or Software Engineering"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  {enrolledSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-slate-400 mr-1 self-center">Enrolled:</span>
                      {enrolledSubjects.slice(0, 5).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setCourseCode(code)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 cursor-pointer font-mono"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Topic / Submission Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4 Quiz, ER Diagram Submission"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Due Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM / 11:59 PM"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAcademicReminders;
