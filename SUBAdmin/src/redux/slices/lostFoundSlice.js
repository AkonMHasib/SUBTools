import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { lostFoundApi } from "../../api/lostFoundApi";

const LOSTFOUND_CACHE_KEY = "subtools_lostfound_cache";
const LOSTFOUND_CACHE_TTL_MS = 5 * 60 * 1000;

const readLostFoundCache = (ignoreExpiration = false) => {
  try {
    const rawCache = localStorage.getItem(LOSTFOUND_CACHE_KEY);
    if (!rawCache) return null;
    const parsedCache = JSON.parse(rawCache);
    if (!ignoreExpiration && Date.now() - parsedCache?.cachedAt > LOSTFOUND_CACHE_TTL_MS) {
      return null;
    }
    return parsedCache;
  } catch (error) {
    return null;
  }
};

const writeLostFoundCache = (payload) => {
  try {
    localStorage.setItem(
      LOSTFOUND_CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        payload,
      }),
    );
  } catch (error) {}
};

const applyFiltersAndSearch = (state) => {
  let list = Array.isArray(state.list) ? state.list : [];
  let filtered = [...list];
  const query = (state.searchQuery || "").toLowerCase().trim();

  // Apply search query (matches title, description, location, reporterName)
  if (query) {
    filtered = filtered.filter(
      (item) =>
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query) ||
        item.reporterName?.toLowerCase().includes(query)
    );
  }

  // Apply Type filter
  if (state.filters.type !== "All") {
    filtered = filtered.filter((item) => item.type === state.filters.type);
  }

  // Apply Status filter
  if (state.filters.status !== "All") {
    filtered = filtered.filter((item) => item.status === state.filters.status);
  }

  state.filteredList = filtered;
};

const initialCache = readLostFoundCache(true);
const rawInitialList = initialCache?.payload;
const initialList = Array.isArray(rawInitialList) ? rawInitialList : [];

const initialState = {
  list: initialList,
  filteredList: initialList,
  pendingList: [],
  searchQuery: "",
  filters: {
    type: "All",
    status: "All",
  },
  loading: false,
  error: null,
  success: false,
  cacheUpdatedAt: initialCache?.cachedAt || null,
};

export const fetchLostFoundItems = createAsyncThunk(
  "lostFound/fetchAll",
  async (options = {}, { rejectWithValue }) => {
    const { forceRefresh = false } = options;
    try {
      if (!forceRefresh) {
        const cached = readLostFoundCache();
        if (cached?.payload) {
          return cached.payload;
        }
      }
      const data = await lostFoundApi.getAll();
      writeLostFoundCache(data);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch lost and found items");
    }
  }
);

export const fetchPendingLostFoundItems = createAsyncThunk(
  "lostFound/fetchPending",
  async (_, { rejectWithValue }) => {
    try {
      return await lostFoundApi.getPendingItems();
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch pending items");
    }
  }
);

export const approveLostFoundItem = createAsyncThunk(
  "lostFound/approve",
  async (id, { rejectWithValue }) => {
    try {
      return await lostFoundApi.approveLostFoundItem(id);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to approve item");
    }
  }
);

export const rejectLostFoundItem = createAsyncThunk(
  "lostFound/reject",
  async (id, { rejectWithValue }) => {
    try {
      return await lostFoundApi.rejectLostFoundItem(id);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to reject item");
    }
  }
);

export const createLostFoundItem = createAsyncThunk(
  "lostFound/create",
  async (itemData, { rejectWithValue }) => {
    try {
      return await lostFoundApi.create(itemData);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to create lost and found item");
    }
  }
);

export const updateLostFoundItem = createAsyncThunk(
  "lostFound/update",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      return await lostFoundApi.update(id, updatedData);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update lost and found item");
    }
  }
);

export const deleteLostFoundItem = createAsyncThunk(
  "lostFound/delete",
  async (id, { rejectWithValue }) => {
    try {
      await lostFoundApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete lost and found item");
    }
  }
);

const lostFoundSlice = createSlice({
  name: "lostFound",
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      applyFiltersAndSearch(state);
    },
    setTypeFilter: (state, action) => {
      state.filters.type = action.payload;
      applyFiltersAndSearch(state);
    },
    setStatusFilter: (state, action) => {
      state.filters.status = action.payload;
      applyFiltersAndSearch(state);
    },
    clearLostFoundStatus: (state) => {
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Items
      .addCase(fetchLostFoundItems.pending, (state, action) => {
        state.loading = state.list.length === 0 || action.meta.arg?.forceRefresh;
        state.error = null;
      })
      .addCase(fetchLostFoundItems.fulfilled, (state, action) => {
        state.loading = false;
        const validList = Array.isArray(action.payload) ? action.payload : [];
        if (JSON.stringify(state.list) !== JSON.stringify(validList)) {
          state.list = validList;
          applyFiltersAndSearch(state);
          writeLostFoundCache(validList);
        }
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(fetchLostFoundItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Item
      .addCase(createLostFoundItem.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createLostFoundItem.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.list = [action.payload, ...(Array.isArray(state.list) ? state.list : [])];
        applyFiltersAndSearch(state);
        writeLostFoundCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(createLostFoundItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Item
      .addCase(updateLostFoundItem.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateLostFoundItem.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const targetId = String(action.payload.id || action.payload.docId || "");
        state.list = (Array.isArray(state.list) ? state.list : []).map((item) =>
          String(item.id || item.docId || "") === targetId ? action.payload : item
        );
        applyFiltersAndSearch(state);
        writeLostFoundCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(updateLostFoundItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Item
      .addCase(deleteLostFoundItem.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteLostFoundItem.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const targetId = String(action.payload || "");
        state.list = (Array.isArray(state.list) ? state.list : []).filter((item) => String(item.id || item.docId || "") !== targetId);
        applyFiltersAndSearch(state);
        writeLostFoundCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(deleteLostFoundItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Pending Items
      .addCase(fetchPendingLostFoundItems.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchPendingLostFoundItems.fulfilled, (state, action) => {
        state.pendingList = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchPendingLostFoundItems.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Approve Pending Item
      .addCase(approveLostFoundItem.fulfilled, (state, action) => {
        state.pendingList = state.pendingList.filter((item) => item.id !== action.payload);
      })

      // Reject Pending Item
      .addCase(rejectLostFoundItem.fulfilled, (state, action) => {
        state.pendingList = state.pendingList.filter((item) => item.id !== action.payload);
      });
  },
});

export const {
  setSearchQuery,
  setTypeFilter,
  setStatusFilter,
  clearLostFoundStatus,
} = lostFoundSlice.actions;

export default lostFoundSlice.reducer;
