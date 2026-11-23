// University Holiday Management Page Component — Super Admin Only
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  FiCalendar,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiAlertCircle,
  FiClock,
} from "react-icons/fi";
import holidayApi from "../../api/holidayApi";
import Dialog from "../../components/common/Dialog";
import Badge from "../../components/common/Badge";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";

const schema = yup.object().shape({
  name: yup.string().min(2, "Holiday title must be at least 2 characters").required("Holiday Title is required"),
  date: yup.string().required("Date is required"),
  description: yup.string().nullable(),
  enabled: yup.boolean().default(true),
});

export const HolidayManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, disabled

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      enabled: true,
    },
  });

  const loadHolidays = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await holidayApi.getAll(forceRefresh);
      setHolidays(data);
    } catch (err) {
      toast.error("Failed to load holidays: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const openCreateModal = () => {
    setEditingHoliday(null);
    reset({
      name: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      enabled: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (h) => {
    setEditingHoliday(h);
    reset({
      name: h.name || "",
      date: h.date || "",
      description: h.description || "",
      enabled: h.enabled !== false,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (editingHoliday) {
        await holidayApi.update(editingHoliday.id, data);
        toast.success("Holiday updated successfully!");
      } else {
        await holidayApi.create(data);
        toast.success("New university holiday scheduled!");
      }
      setModalOpen(false);
      loadHolidays(true);
    } catch (err) {
      toast.error("Failed to save holiday: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (h) => {
    try {
      await holidayApi.toggleStatus(h.id, h.enabled !== false);
      toast.info(`Holiday ${h.enabled !== false ? "disabled" : "enabled"}.`);
      loadHolidays(true);
    } catch (err) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!holidayToDelete) return;
    try {
      await holidayApi.delete(holidayToDelete.id);
      toast.success("Holiday removed.");
      setDeleteModalOpen(false);
      setHolidayToDelete(null);
      loadHolidays(true);
    } catch (err) {
      toast.error("Failed to delete holiday: " + err.message);
    }
  };

  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch =
      (h.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.date || "").includes(searchQuery) ||
      (h.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === "active") return h.enabled !== false;
    if (filterStatus === "disabled") return h.enabled === false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <FiCalendar className="text-blue-600 dark:text-blue-400" />
            University Holiday Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage official university holidays. Active holidays automatically deactivate routine slots in SUBTools and STC.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadHolidays(true)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Refresh"
          >
            <FiRefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            Add Holiday
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search holiday name, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Holidays</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Holiday Table / Cards */}
      <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <FiRefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-sm">Loading university holidays...</p>
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FiCalendar className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No holidays scheduled</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add Holiday" to schedule university off-days.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Holiday Date</th>
                  <th className="px-6 py-3.5">Title & Occasion</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHolidays.map((h) => {
                  const isFuture = new Date(h.date) >= new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FiClock className="text-blue-500 text-xs" />
                          <span>{h.date}</span>
                          {isFuture && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {h.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {h.description || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(h)}
                          className="cursor-pointer transition hover:opacity-80"
                        >
                          {h.enabled !== false ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <FiCheckCircle className="w-3 h-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="danger" className="flex items-center gap-1">
                              <FiXCircle className="w-3 h-3" /> Disabled
                            </Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(h)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition"
                            title="Edit Holiday"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setHolidayToDelete(h);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                            title="Delete Holiday"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingHoliday ? "Edit University Holiday" : "Add University Holiday"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Holiday Title / Occasion *
            </label>
            <input
              type="text"
              placeholder="e.g. Independence Day, Eid-ul-Fitr"
              {...register("name")}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date (YYYY-MM-DD) *
            </label>
            <input
              type="date"
              {...register("date")}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white"
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Optional remarks about the holiday..."
              {...register("description")}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="holiday_enabled"
              {...register("enabled")}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="holiday_enabled" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Active (Deactivates routine classes on this date)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : editingHoliday ? "Update Holiday" : "Schedule Holiday"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Holiday"
        message={`Are you sure you want to delete "${holidayToDelete?.name}" on ${holidayToDelete?.date}?`}
      />
    </div>
  );
};

export default HolidayManagement;
