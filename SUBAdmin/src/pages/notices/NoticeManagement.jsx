import { isSuperAdmin } from "../../utils/permissionUtils";
import { DEPARTMENTS, normalizeDepartment } from "../../utils/academic";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  FiFileText,
  FiSend,
  FiTrash2,
  FiCalendar,
  FiUser,
  FiClock,
  FiZap,
  FiCheckCircle,
  FiList,
  FiAlertCircle,
} from "react-icons/fi";
import Badge from "../../components/common/Badge";
import noticeApi from "../../api/noticeApi";
import {
  fetchNotices,
  fetchScheduledNotices,
  createNotice,
  createScheduledNotice,
  deleteNotice as deleteNoticeAction,
  deleteScheduledNotice as deleteScheduledNoticeAction,
  publishScheduledNotice,
  syncRealtimeNotices,
  setActiveTab,
  getNoticeTime,
} from "../../redux/slices/noticeSlice";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import { uploadImageToImgBB } from "../../utils/imageUpload";

const schema = yup.object().shape({
  title: yup.string().min(5, "Title must be at least 5 characters").required("Title is required"),
  content: yup
    .string()
    .min(15, "Content must be at least 15 characters")
    .required("Content is required"),
  priority: yup
    .string()
    .oneOf(["Normal", "High", "Critical"], "Select a priority")
    .required("Priority is required"),
  targetDept: yup.string().required("Target department is required"),
  type: yup
    .string()
    .oneOf(["Alert", "In-App Popup"], "Select a notification type")
    .required("Notification Type is required"),
});

export const NoticeManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isSuperAdminUser = isSuperAdmin(user);
  const adminDept = user?.department;

  const {
    list: notices,
    scheduledList: scheduled,
    loading,
    deletingId,
    publishingId,
    activeTab,
  } = useSelector((state) => state.notices);

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Schedule toggle state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("08:00");

  // Image Upload State
  const [noticeImageUrl, setNoticeImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadImageToImgBB(file);
      setNoticeImageUrl(uploadedUrl);
      toast.success("Image uploaded to ImgBB successfully!");
    } catch (err) {
      toast.error("Image upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    let unsubscribe = null;
    dispatch(fetchNotices({ forceRefresh: false }));
    dispatch(fetchScheduledNotices({ forceRefresh: false }));

    try {
      unsubscribe = noticeApi.subscribeLive((liveUpdates) => {
        if (liveUpdates && Array.isArray(liveUpdates)) {
          dispatch(syncRealtimeNotices(liveUpdates));
        }
      });
    } catch (_) {}

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: "",
      content: "",
      priority: "Normal",
      targetDept: isSuperAdminUser ? "All Departments" : adminDept || "CSE",
      type: "Alert",
    },
  });

  // PDF Link Attachment State & Validation
  const [pdfUrlInput, setPdfUrlInput] = useState("");

  const validatePdfUrl = (url) => {
    if (!url || !url.trim()) return true;
    const trimmed = url.trim().toLowerCase();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname;
      return (
        host === "drive.google.com" ||
        host === "docs.google.com" ||
        host === "1drv.ms" ||
        host === "onedrive.live.com" ||
        host.endsWith(".drive.google.com") ||
        host.endsWith(".docs.google.com") ||
        host.endsWith(".1drv.ms") ||
        host.endsWith(".onedrive.live.com")
      );
    } catch (e) {
      return false;
    }
  };

  const onSubmit = async (data) => {
    if (isScheduled && !scheduledDate) {
      toast.error("Please select a date for the scheduled notice.");
      return;
    }

    if (pdfUrlInput && !validatePdfUrl(pdfUrlInput)) {
      toast.error("Invalid PDF link! Only Google Drive or Microsoft OneDrive links are allowed.");
      return;
    }

    if (savingRef.current) return;
    savingRef.current = true;

    setSaving(true);
    try {
      const department = isSuperAdminUser ? data.targetDept : adminDept || "CSE";
      const cleanPdfUrl = pdfUrlInput.trim();
      const basePayload = {
        title: data.title,
        content: data.content,
        department,
        priority: data.priority,
        type: data.type,
        imageUrl: noticeImageUrl || "",
        attachmentUrl: noticeImageUrl || "",
        pdfUrl: cleanPdfUrl,
        pdfLink: cleanPdfUrl,
        pdfAttachment: cleanPdfUrl,
        sender: isSuperAdminUser ? "Super Admin" : `${adminDept} Dept Admin`,
      };

      if (isScheduled) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime || "08:00"}`);
        const scheduledFor = scheduledDateTime.getTime();
        const scheduledForLabel = scheduledDateTime.toLocaleString();

        const schedPayload = {
          ...basePayload,
          isScheduled: true,
          scheduledFor,
          scheduledForLabel,
        };
        await dispatch(createScheduledNotice(schedPayload)).unwrap();
        toast.success(`Notice scheduled for ${scheduledForLabel} ✓`);
        dispatch(setActiveTab("scheduled"));
      } else {
        const livePayload = {
          ...basePayload,
          date: new Date().toLocaleString(),
          createdAt: Date.now(),
        };
        await dispatch(createNotice(livePayload)).unwrap();
        toast.success("Notice broadcasted successfully.");
        dispatch(setActiveTab("live"));
      }

      reset({
        title: "",
        content: "",
        priority: "Normal",
        targetDept: isSuperAdminUser ? "All Departments" : adminDept || "CSE",
        type: "Alert",
      });
      setNoticeImageUrl("");
      setPdfUrlInput("");
      setIsScheduled(false);
      setScheduledDate("");
      setScheduledTime("08:00");
    } catch (error) {
      toast.error(error?.message || "Failed to save notice.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const deleteNotice = async (id) => {
    try {
      await dispatch(deleteNoticeAction(id)).unwrap();
      toast.info("Notice removed from the archive.");
    } catch (error) {
      toast.error(error?.message || "Failed to delete notice.");
    }
  };

  const deleteScheduled = async (id) => {
    try {
      await dispatch(deleteScheduledNoticeAction(id)).unwrap();
      toast.info("Scheduled notice cancelled.");
    } catch (error) {
      toast.error(error?.message || "Failed to cancel scheduled notice.");
    }
  };

  const publishScheduled = async (item) => {
    try {
      await dispatch(publishScheduledNotice(item)).unwrap();
      toast.success("Scheduled notice published now! Students will see it.");
      dispatch(setActiveTab("live"));
    } catch (error) {
      toast.error(error?.message || "Failed to publish scheduled notice.");
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case "Critical":
        return "danger";
      case "High":
        return "warning";
      default:
        return "info";
    }
  };

  const getNoticeTime = (item) => {
    if (!item) return 0;
    const raw = item.createdAt || item.created_at || item.date || item.timestamp;
    if (!raw) return 0;
    if (typeof raw === "number") return raw;
    if (typeof raw === "object" && typeof raw.seconds === "number") return raw.seconds * 1000;
    if (typeof raw?.toDate === "function") return raw.toDate().getTime();
    const parsed = new Date(raw).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
    if (typeof item.id === "string" && item.id.includes("-")) {
      const parts = item.id.split("-");
      const num = Number(parts[parts.length - 1]);
      if (!isNaN(num) && num > 1000000000000) return num;
    }
    return 0;
  };

  const isVisibleForDepartment = (notice) => {
    if (isSuperAdminUser) return true;
    const noticeDept = String(notice?.department || notice?.targetDept || "").trim();
    return (
      !noticeDept ||
      ["ALL", "GENERAL", "GLOBAL", "UNIVERSITY", "ALL DEPARTMENTS"].includes(
        noticeDept.toUpperCase(),
      ) ||
      normalizeDepartment(noticeDept) === normalizeDepartment(adminDept)
    );
  };

  const visibleNotices = notices.filter(isVisibleForDepartment);
  const orderedNotices = [...visibleNotices].sort((a, b) => getNoticeTime(b) - getNoticeTime(a));

  const visibleScheduled = scheduled.filter(isVisibleForDepartment);
  const orderedScheduled = [...visibleScheduled].sort(
    (a, b) => getNoticeTime(b) - getNoticeTime(a),
  );

  // Min date for date picker = today
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in">
      {/* ── Form Panel ──────────────────────────────────────────────────── */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-lg">
              <FiSend className="text-sm shrink-0" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">
                Broadcast Center
              </h2>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Send or schedule push alerts to students
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-5">
            {/* Title */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Notice Title
              </label>
              <input
                type="text"
                placeholder="e.g. Eid vacation announcement"
                {...register("title")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.title ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.title && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.title.message}
                </span>
              )}
            </div>

            {/* Message Body */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Message Body
              </label>
              <textarea
                rows={4}
                placeholder="Type your notice body here..."
                {...register("content")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.content ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors resize-none`}
              />
              {errors.content && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.content.message}
                </span>
              )}
            </div>

            {/* Notice Image Attachment (ImgBB Upload) */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Notice Banner Image (Optional)
              </label>

              {noticeImageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-2 flex items-center justify-between">
                  <img
                    src={noticeImageUrl}
                    alt="Notice Preview"
                    className="h-16 w-24 object-cover rounded-lg"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setNoticeImageUrl("")}
                      className="px-2.5 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-3 cursor-pointer bg-slate-50/50 dark:bg-slate-950/20 transition-all text-xs text-slate-500">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                  <span className="font-semibold">
                    {uploadingImage ? "Uploading to ImgBB..." : "📷 Attach Image (ImgBB API)"}
                  </span>
                </label>
              )}
            </div>

            {/* PDF Link Attachment */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center justify-between">
                <span>PDF Attachment Link (Optional)</span>
                <span className="text-[9px] font-normal text-slate-400">Drive / OneDrive Only</span>
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/... or https://1drv.ms/..."
                value={pdfUrlInput}
                onChange={(e) => setPdfUrlInput(e.target.value)}
                className={`bg-slate-50 dark:bg-slate-950/40 border rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none transition-colors ${
                  pdfUrlInput && !validatePdfUrl(pdfUrlInput)
                    ? "border-red-500 dark:border-red-500 focus:ring-1 focus:ring-red-500"
                    : pdfUrlInput && validatePdfUrl(pdfUrlInput)
                      ? "border-emerald-500 dark:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      : "border-slate-200 dark:border-slate-800 focus:border-blue-500"
                }`}
              />
              {pdfUrlInput && !validatePdfUrl(pdfUrlInput) && (
                <span className="text-[10px] text-red-500 dark:text-red-400 mt-1 font-semibold flex items-center gap-1">
                  ⚠️ Unsupported domain. Only Google Drive or Microsoft OneDrive links are allowed.
                </span>
              )}
              {pdfUrlInput && validatePdfUrl(pdfUrlInput) && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                  ✓ Valid PDF provider link.
                </span>
              )}
            </div>

            {/* Target */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Target Audience
              </label>
              <select
                disabled={!isSuperAdminUser}
                {...register("targetDept")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-60"
              >
                <option value="All Departments">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.code} value={dept.code}>
                    {dept.name} ({dept.code}) Students Only
                  </option>
                ))}
              </select>
              {!isSuperAdminUser && (
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                  Locked: Department Admins only broadcast to their branch.
                </span>
              )}
            </div>

            {/* Type */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Notification Type
              </label>
              <select
                {...register("type")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-350"
              >
                <option value="Alert">Alert Banner</option>
                <option value="In-App Popup">In-App Popup Modal</option>
              </select>
            </div>

            {/* Priority */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Alert Priority
              </label>
              <select
                {...register("priority")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <option value="Normal">Normal Notification</option>
                <option value="High">High Priority Alert</option>
                <option value="Critical">Critical Emergency</option>
              </select>
            </div>

            {/* ── Schedule Toggle ───────────────────────────────────────── */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsScheduled((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  isScheduled
                    ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400"
                    : "bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FiClock className="text-sm" />
                  Schedule for Later
                </span>
                <span
                  className={`w-8 h-4 rounded-full transition-colors ${isScheduled ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-700"} relative`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${isScheduled ? "right-0.5" : "left-0.5"}`}
                  />
                </span>
              </button>

              {isScheduled && (
                <div className="px-3 py-3 bg-violet-50/50 dark:bg-violet-950/10 space-y-2 border-t border-violet-100 dark:border-violet-900/30">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase">
                      Publish Date
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase">
                      Publish Time
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    />
                  </div>
                  <p className="text-[9px] text-violet-500 dark:text-violet-400 font-medium">
                    Notice will appear in the Scheduled queue. Click "Publish Now" when ready.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`w-full flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-70 disabled:cursor-not-allowed ${
                isScheduled
                  ? "bg-violet-600 hover:bg-violet-700 shadow-violet-500/10 text-white"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10 text-white"
              }`}
            >
              {isScheduled ? <FiClock className="text-xs" /> : <FiSend className="text-xs" />}
              <span>
                {saving ? "Saving..." : isScheduled ? "Schedule Notice" : "Broadcast Notice"}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* ── Board Panel ──────────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Notification Board
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Review sent notices and manage your scheduled queue.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
          <button
            onClick={() => dispatch(setActiveTab("live"))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "live"
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FiList size={11} />
            Live
            {orderedNotices.length > 0 && (
              <span className="bg-blue-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none">
                {orderedNotices.length}
              </span>
            )}
          </button>
          <button
            onClick={() => dispatch(setActiveTab("scheduled"))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "scheduled"
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FiClock size={11} />
            Scheduled
            {orderedScheduled.length > 0 && (
              <span className="bg-violet-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none">
                {orderedScheduled.length}
              </span>
            )}
          </button>
        </div>

        {/* Notice Cards */}
        <div className="space-y-4">
          {loading && !orderedNotices.length && activeTab === "live" ? (
            <LoadingSkeleton type="notice" count={3} />
          ) : loading && !orderedScheduled.length && activeTab === "scheduled" ? (
            <LoadingSkeleton type="notice" count={2} />
          ) : activeTab === "live" ? (
            orderedNotices.length > 0 ? (
              orderedNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative group flex flex-col justify-between"
                >
                  {(isSuperAdminUser || notice.department === adminDept) && (
                    <button
                      onClick={() => deleteNotice(notice.id)}
                      disabled={deletingId === notice.id}
                      className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      title="Delete Notice"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant={getPriorityVariant(notice.priority)}>{notice.priority}</Badge>
                      <Badge variant="secondary">{notice.department}</Badge>
                      <Badge variant={notice.type === "In-App Popup" ? "warning" : "primary"}>
                        {notice.type || "Alert"}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 pr-8 leading-snug">
                      {notice.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words font-medium">
                      {notice.content}
                    </p>

                    {(notice.imageUrl || notice.attachmentUrl) && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <img
                          src={notice.imageUrl || notice.attachmentUrl}
                          alt={notice.title}
                          className="w-full max-h-48 object-cover"
                        />
                      </div>
                    )}

                    {(notice.pdfUrl || notice.pdfLink || notice.pdfAttachment) && (
                      <div className="mt-3">
                        <a
                          href={notice.pdfUrl || notice.pdfLink || notice.pdfAttachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                        >
                          <FiFileText className="text-sm" />
                          <span>View PDF Document</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-4 pt-3 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <FiUser className="text-blue-500" />
                      <span>Publisher: {notice.sender}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <FiCalendar className="text-indigo-500" />
                      <span>{notice.date}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-20 text-center text-slate-400 dark:text-slate-500 font-bold">
                No notices published yet.
              </div>
            )
          ) : // Scheduled tab
          orderedScheduled.length > 0 ? (
            orderedScheduled.map((item) => {
              const isPast = item.scheduledFor && item.scheduledFor < Date.now();
              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs relative flex flex-col justify-between ${
                    isPast
                      ? "border-amber-300 dark:border-amber-700"
                      : "border-violet-200 dark:border-violet-900/60"
                  }`}
                >
                  {/* Actions */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      onClick={() => publishScheduled(item)}
                      disabled={publishingId === item.id}
                      title="Publish Now"
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                    >
                      {publishingId === item.id ? (
                        <span className="animate-spin w-2.5 h-2.5 border border-emerald-500 border-t-transparent rounded-full inline-block" />
                      ) : (
                        <FiZap size={10} />
                      )}
                      Publish Now
                    </button>
                    <button
                      onClick={() => deleteScheduled(item.id)}
                      disabled={deletingId === item.id}
                      title="Cancel Schedule"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>

                  <div>
                    {/* Scheduled time banner */}
                    <div
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold mb-3 px-2.5 py-1 rounded-lg ${
                        isPast
                          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                          : "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                      }`}
                    >
                      {isPast ? <FiAlertCircle size={10} /> : <FiClock size={10} />}
                      {isPast ? "Overdue — " : "Scheduled: "}
                      {item.scheduledForLabel || "—"}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant={getPriorityVariant(item.priority)}>{item.priority}</Badge>
                      <Badge variant="secondary">{item.department}</Badge>
                      <Badge variant={item.type === "In-App Popup" ? "warning" : "primary"}>
                        {item.type || "Alert"}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 pr-24 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words font-medium">
                      {item.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-4 pt-3 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <FiUser className="text-blue-500" />
                      <span>By: {item.sender}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <FiCheckCircle className="text-emerald-500" />
                      <span>Not yet published</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-20 text-center text-slate-400 dark:text-slate-500 font-bold">
              No scheduled notices in queue.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticeManagement;
