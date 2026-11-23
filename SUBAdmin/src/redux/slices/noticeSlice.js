// Notice Management Redux Slice with Smart Caching & Pre-hydration
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { noticeApi } from "../../api/noticeApi";

const NOTICES_CACHE_KEY = "subtools_notices_cache";
const SCHEDULED_CACHE_KEY = "subtools_scheduled_notices_cache";
const CACHE_TTL_MS = 5 * 60 * 1000;

export const getNoticeTime = (item) => {
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

const readCache = (key, ignoreExpiration = false) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!ignoreExpiration && Date.now() - parsed?.cachedAt > CACHE_TTL_MS) {
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
};

const writeCache = (key, payload) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        cachedAt: Date.now(),
        payload,
      }),
    );
  } catch (e) {}
};

const initialNoticesCache = readCache(NOTICES_CACHE_KEY, true);
const initialScheduledCache = readCache(SCHEDULED_CACHE_KEY, true);

const initialLiveList = Array.isArray(initialNoticesCache?.payload)
  ? [...initialNoticesCache.payload].sort((a, b) => getNoticeTime(b) - getNoticeTime(a))
  : [];

const initialSchedList = Array.isArray(initialScheduledCache?.payload)
  ? [...initialScheduledCache.payload].sort((a, b) => getNoticeTime(b) - getNoticeTime(a))
  : [];

const initialState = {
  list: initialLiveList,
  scheduledList: initialSchedList,
  activeTab: "live",
  loading: false,
  error: null,
  success: false,
  publishingId: null,
  deletingId: null,
  cacheUpdatedAt: initialNoticesCache?.cachedAt || null,
};

export const fetchNotices = createAsyncThunk(
  "notices/fetchAll",
  async (options = {}, { rejectWithValue }) => {
    const { forceRefresh = false } = options;
    try {
      if (!forceRefresh) {
        const cached = readCache(NOTICES_CACHE_KEY);
        if (cached?.payload) {
          return cached.payload.sort((a, b) => getNoticeTime(b) - getNoticeTime(a));
        }
      }
      const data = await noticeApi.getAll(forceRefresh);
      const sorted = (data || []).sort((a, b) => getNoticeTime(b) - getNoticeTime(a));
      writeCache(NOTICES_CACHE_KEY, sorted);
      return sorted;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to fetch notices");
    }
  },
);

export const fetchScheduledNotices = createAsyncThunk(
  "notices/fetchScheduled",
  async (options = {}, { rejectWithValue }) => {
    const { forceRefresh = false } = options;
    try {
      if (!forceRefresh) {
        const cached = readCache(SCHEDULED_CACHE_KEY);
        if (cached?.payload) {
          return cached.payload.sort((a, b) => getNoticeTime(b) - getNoticeTime(a));
        }
      }
      const data = await noticeApi.getScheduled(forceRefresh);
      const sorted = (data || []).sort((a, b) => getNoticeTime(b) - getNoticeTime(a));
      writeCache(SCHEDULED_CACHE_KEY, sorted);
      return sorted;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to fetch scheduled notices");
    }
  },
);

export const createNotice = createAsyncThunk(
  "notices/create",
  async (noticeData, { rejectWithValue }) => {
    try {
      const created = await noticeApi.create(noticeData);
      return created;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to publish notice");
    }
  },
);

export const createScheduledNotice = createAsyncThunk(
  "notices/createScheduled",
  async (noticeData, { rejectWithValue }) => {
    try {
      const created = await noticeApi.createScheduled(noticeData);
      return created;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to schedule notice");
    }
  },
);

export const deleteNotice = createAsyncThunk("notices/delete", async (id, { rejectWithValue }) => {
  try {
    await noticeApi.delete(id);
    return id;
  } catch (error) {
    return rejectWithValue(error?.message || "Failed to delete notice");
  }
});

export const deleteScheduledNotice = createAsyncThunk(
  "notices/deleteScheduled",
  async (id, { rejectWithValue }) => {
    try {
      await noticeApi.deleteScheduled(id);
      return id;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to delete scheduled notice");
    }
  },
);

export const publishScheduledNotice = createAsyncThunk(
  "notices/publishScheduled",
  async (item, { rejectWithValue }) => {
    try {
      const published = await noticeApi.publishScheduled(item);
      return { scheduledId: item.id, published };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to publish scheduled notice");
    }
  },
);

const noticeSlice = createSlice({
  name: "notices",
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    syncRealtimeNotices: (state, action) => {
      if (Array.isArray(action.payload)) {
        const sorted = [...action.payload].sort((a, b) => getNoticeTime(b) - getNoticeTime(a));
        state.list = sorted;
        writeCache(NOTICES_CACHE_KEY, sorted);
      }
    },
    clearNoticeError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Live
      .addCase(fetchNotices.pending, (state) => {
        if (!state.list.length) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchNotices.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(fetchNotices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Scheduled
      .addCase(fetchScheduledNotices.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchScheduledNotices.fulfilled, (state, action) => {
        state.scheduledList = action.payload;
      })
      // Create Live
      .addCase(createNotice.pending, (state) => {
        state.loading = true;
      })
      .addCase(createNotice.fulfilled, (state, action) => {
        state.loading = false;
        state.list = [action.payload, ...state.list]
          .filter(
            (notice, index, list) => list.findIndex((item) => item?.id === notice?.id) === index,
          )
          .sort((a, b) => getNoticeTime(b) - getNoticeTime(a));
        writeCache(NOTICES_CACHE_KEY, state.list);
      })
      .addCase(createNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Scheduled
      .addCase(createScheduledNotice.fulfilled, (state, action) => {
        state.scheduledList = [action.payload, ...state.scheduledList].sort(
          (a, b) => getNoticeTime(b) - getNoticeTime(a),
        );
        writeCache(SCHEDULED_CACHE_KEY, state.scheduledList);
      })
      // Delete Live
      .addCase(deleteNotice.pending, (state, action) => {
        state.deletingId = action.meta.arg;
      })
      .addCase(deleteNotice.fulfilled, (state, action) => {
        state.deletingId = null;
        state.list = state.list.filter((n) => n.id !== action.payload);
        writeCache(NOTICES_CACHE_KEY, state.list);
      })
      .addCase(deleteNotice.rejected, (state, action) => {
        state.deletingId = null;
        state.error = action.payload;
      })
      // Delete Scheduled
      .addCase(deleteScheduledNotice.pending, (state, action) => {
        state.deletingId = action.meta.arg;
      })
      .addCase(deleteScheduledNotice.fulfilled, (state, action) => {
        state.deletingId = null;
        state.scheduledList = state.scheduledList.filter((n) => n.id !== action.payload);
        writeCache(SCHEDULED_CACHE_KEY, state.scheduledList);
      })
      .addCase(deleteScheduledNotice.rejected, (state, action) => {
        state.deletingId = null;
        state.error = action.payload;
      })
      // Publish Scheduled
      .addCase(publishScheduledNotice.pending, (state, action) => {
        state.publishingId = action.meta.arg.id;
      })
      .addCase(publishScheduledNotice.fulfilled, (state, action) => {
        state.publishingId = null;
        state.scheduledList = state.scheduledList.filter(
          (n) => n.id !== action.payload.scheduledId,
        );
        state.list = [action.payload.published, ...state.list].sort(
          (a, b) => getNoticeTime(b) - getNoticeTime(a),
        );
        writeCache(NOTICES_CACHE_KEY, state.list);
        writeCache(SCHEDULED_CACHE_KEY, state.scheduledList);
        state.activeTab = "live";
      })
      .addCase(publishScheduledNotice.rejected, (state, action) => {
        state.publishingId = null;
        state.error = action.payload;
      });
  },
});

export const { setActiveTab, syncRealtimeNotices, clearNoticeError } = noticeSlice.actions;
export default noticeSlice.reducer;
