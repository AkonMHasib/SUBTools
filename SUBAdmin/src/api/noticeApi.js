// Notice API Layer with Smart Caching, Supabase Primary & Realtime Sync Support
import DatabaseService from "../services/DatabaseService";
import RealtimeManager from "../services/RealtimeManager";
import ImageCacheManager from "../services/ImageCacheManager";
import { logAdminActivity } from "../utils/activityLogger";

const bumpNoticeVersion = async () => {
  try {
    await DatabaseService.setDocument("system", "notice_config", {
      noticeVersion: Date.now(),
      lastUpdated: new Date().toISOString(),
    });
  } catch (_) {}
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

const uniqueById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.id || `${item?.title || ""}:${item?.createdAt || item?.created_at || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const noticeApi = {
  getAll: async (forceRefresh = false) => {
    const list = await DatabaseService.getCachedCollection("notices", { forceRefresh });

    // Filter out scheduled notices (they belong in the scheduled tab until published)
    const publishedList = list.filter((n) => n.status !== "scheduled" && !n.isScheduled);

    // Preload cover images in background
    const images = publishedList
      .map((n) => n.imageUrl || n.attachment || (n.attachments && n.attachments[0]))
      .filter(Boolean);
    if (images.length > 0) {
      ImageCacheManager.preloadImages(images).catch(() => {});
    }

    return uniqueById(publishedList).sort((a, b) => getNoticeTime(b) - getNoticeTime(a));
  },

  subscribeLive: (onUpdateCallback) => {
    return RealtimeManager.subscribeToLiveNotices(onUpdateCallback);
  },

  create: async (noticeData) => {
    const id = noticeData.id || `notice-${Date.now()}`;
    const payload = {
      ...noticeData,
      id,
      status: noticeData.status || "published",
      content: noticeData.content || noticeData.description || noticeData.body || "",
      description: noticeData.description || noticeData.content || noticeData.body || "",
      body: noticeData.body || noticeData.content || noticeData.description || "",
      sender: noticeData.sender || noticeData.authorName || noticeData.author || "SUB Authority",
      authorName:
        noticeData.authorName || noticeData.sender || noticeData.author || "SUB Authority",
      author: noticeData.author || noticeData.sender || noticeData.authorName || "SUB Authority",
      imageUrl: noticeData.imageUrl || noticeData.attachmentUrl || noticeData.attachment || "",
      attachmentUrl: noticeData.attachmentUrl || noticeData.imageUrl || noticeData.attachment || "",
      createdAt: noticeData.createdAt || Date.now(),
      created_at: new Date().toISOString(),
    };

    await DatabaseService.setDocument("notices", id, payload);
    await bumpNoticeVersion();
    logAdminActivity("create", "notices", id, null, payload);
    return payload;
  },

  delete: async (id) => {
    let previousState = null;
    try {
      previousState = await DatabaseService.getDocument("notices", id);
    } catch (e) {}

    await DatabaseService.deleteDocument("notices", id);
    await bumpNoticeVersion();
    logAdminActivity("delete", "notices", id, previousState, null);
    return id;
  },

  // ── Scheduled Notices ──────────────────────────────────────────────────────
  getScheduled: async (forceRefresh = false) => {
    const list = await DatabaseService.getCachedCollection("notices", { forceRefresh });
    const scheduledList = list.filter((n) => n.status === "scheduled" || n.isScheduled);
    return uniqueById(scheduledList).sort((a, b) => (a.scheduledFor || 0) - (b.scheduledFor || 0));
  },

  createScheduled: async (noticeData) => {
    const id = noticeData.id || `sched-${Date.now()}`;
    const payload = {
      ...noticeData,
      id,
      status: "scheduled",
      isScheduled: true,
      content: noticeData.content || noticeData.description || noticeData.body || "",
      description: noticeData.description || noticeData.content || noticeData.body || "",
      body: noticeData.body || noticeData.content || noticeData.description || "",
      sender: noticeData.sender || noticeData.authorName || noticeData.author || "SUB Authority",
      authorName:
        noticeData.authorName || noticeData.sender || noticeData.author || "SUB Authority",
      author: noticeData.author || noticeData.sender || noticeData.authorName || "SUB Authority",
      createdAt: noticeData.createdAt || Date.now(),
      created_at: new Date().toISOString(),
    };
    await DatabaseService.setDocument("notices", id, payload);
    logAdminActivity("create", "notices", id, null, payload);
    return payload;
  },

  deleteScheduled: async (id) => {
    let previousState = null;
    try {
      previousState = await DatabaseService.getDocument("notices", id);
    } catch (e) {}

    await DatabaseService.deleteDocument("notices", id);
    logAdminActivity("delete", "notices", id, previousState, null);
    return id;
  },

  /** Moves a scheduled notice to the live `notices` collection */
  publishScheduled: async (scheduled) => {
    const payload = {
      ...scheduled,
      status: "published",
      isScheduled: false,
      date: new Date().toLocaleString(),
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await DatabaseService.setDocument("notices", scheduled.id, payload);
    await bumpNoticeVersion();
    logAdminActivity("update", "notices", scheduled.id, scheduled, payload);
    return payload;
  },
};

export default noticeApi;
