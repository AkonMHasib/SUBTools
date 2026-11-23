import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { activityLogsApi } from "../../api/activityLogsApi";

const ACTIVITYLOGS_CACHE_KEY = "subtools_activitylogs_cache";
const ACTIVITYLOGS_CACHE_TTL_MS = 5 * 60 * 1000;

const readActivityLogsCache = (ignoreExpiration = false) => {
  try {
    const rawCache = localStorage.getItem(ACTIVITYLOGS_CACHE_KEY);
    if (!rawCache) return null;
    const parsedCache = JSON.parse(rawCache);
    if (!ignoreExpiration && Date.now() - parsedCache?.cachedAt > ACTIVITYLOGS_CACHE_TTL_MS) {
      return null;
    }
    return parsedCache;
  } catch (error) {
    return null;
  }
};

const writeActivityLogsCache = (payload) => {
  try {
    localStorage.setItem(
      ACTIVITYLOGS_CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        payload,
      }),
    );
  } catch (error) {}
};

const applyFiltersAndSearch = (state) => {
  let filtered = [...state.list];
  const query = state.searchQuery.toLowerCase().trim();

  if (query) {
    filtered = filtered.filter(
      (item) =>
        item.adminName?.toLowerCase().includes(query) ||
        item.adminEmail?.toLowerCase().includes(query) ||
        item.action?.toLowerCase().includes(query) ||
        item.targetCollection?.toLowerCase().includes(query) ||
        item.targetId?.toLowerCase().includes(query)
    );
  }

  state.filteredList = filtered;
};

const initialCache = readActivityLogsCache(true);
const initialList = initialCache?.payload || [];

const initialState = {
  list: initialList,
  filteredList: initialList,
  searchQuery: "",
  loading: false,
  error: null,
  success: false,
  cacheUpdatedAt: initialCache?.cachedAt || null,
};

export const fetchActivityLogs = createAsyncThunk(
  "activityLogs/fetchAll",
  async (options = {}, { rejectWithValue }) => {
    const { forceRefresh = false } = options;
    try {
      if (!forceRefresh) {
        const cached = readActivityLogsCache();
        if (cached?.payload) {
          return cached.payload;
        }
      }
      const data = await activityLogsApi.getAll();
      writeActivityLogsCache(data);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch activity logs");
    }
  }
);

export const revertActivityLog = createAsyncThunk(
  "activityLogs/revert",
  async (logId, { rejectWithValue }) => {
    try {
      await activityLogsApi.revert(logId);
      return logId;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to revert action");
    }
  }
);

const activityLogsSlice = createSlice({
  name: "activityLogs",
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      applyFiltersAndSearch(state);
    },
    clearActivityLogsStatus: (state) => {
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Logs
      .addCase(fetchActivityLogs.pending, (state, action) => {
        state.loading = state.list.length === 0 || action.meta.arg?.forceRefresh;
        state.error = null;
      })
      .addCase(fetchActivityLogs.fulfilled, (state, action) => {
        state.loading = false;
        if (JSON.stringify(state.list) !== JSON.stringify(action.payload)) {
          state.list = action.payload;
          applyFiltersAndSearch(state);
          writeActivityLogsCache(action.payload);
        }
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(fetchActivityLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Revert Log
      .addCase(revertActivityLog.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(revertActivityLog.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.list = state.list.map((log) =>
          log.id === action.payload ? { ...log, reverted: true } : log
        );
        applyFiltersAndSearch(state);
        writeActivityLogsCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(revertActivityLog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSearchQuery, clearActivityLogsStatus } = activityLogsSlice.actions;
export default activityLogsSlice.reducer;
