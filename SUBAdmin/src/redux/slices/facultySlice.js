// Faculty Management Redux Slice
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { facultyApi } from "../../api/facultyApi";
import { fetchDashboardData } from "./dashboardSlice";
import { normalizeDept } from "../../utils/academic";

const FACULTY_CACHE_KEY = "subtools_faculty_cache";
const FACULTY_CACHE_TTL_MS = 5 * 60 * 1000;

const readFacultyCache = (ignoreExpiration = false) => {
  try {
    const rawCache = localStorage.getItem(FACULTY_CACHE_KEY);
    if (!rawCache) return null;
    const parsedCache = JSON.parse(rawCache);
    if (!ignoreExpiration && Date.now() - parsedCache?.cachedAt > FACULTY_CACHE_TTL_MS) {
      return null;
    }
    return parsedCache;
  } catch (error) {
    return null;
  }
};

const writeFacultyCache = (payload) => {
  try {
    localStorage.setItem(
      FACULTY_CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        payload,
      }),
    );
  } catch (error) {}
};

const initialCache = readFacultyCache(true);
const initialList = initialCache?.payload || [];

const initialState = {
  list: initialList,
  filteredList: initialList,
  searchQuery: "",
  filters: {
    department: "All",
    designation: "All",
    status: "All",
  },
  loading: false,
  error: null,
  success: false,
  cacheUpdatedAt: initialCache?.cachedAt || null,
};

export const fetchFaculty = createAsyncThunk(
  "faculty/fetchAll",
  async (options = {}, { rejectWithValue }) => {
    const { forceRefresh = false } = options;
    try {
      if (!forceRefresh) {
        const cached = readFacultyCache();
        if (cached?.payload) {
          return cached.payload;
        }
      }
      const data = await facultyApi.getAll();
      writeFacultyCache(data);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch faculty list");
    }
  },
);

export const createFaculty = createAsyncThunk(
  "faculty/create",
  async (facultyData, { dispatch, rejectWithValue }) => {
    try {
      const res = await facultyApi.create(facultyData);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to add faculty member");
    }
  },
);

export const updateFaculty = createAsyncThunk(
  "faculty/update",
  async ({ id, updatedData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await facultyApi.update(id, updatedData);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update faculty member");
    }
  },
);

export const deleteFaculty = createAsyncThunk(
  "faculty/delete",
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await facultyApi.delete(id);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete faculty member");
    }
  },
);

const facultySlice = createSlice({
  name: "faculty",
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      applyFiltersAndSearch(state);
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      applyFiltersAndSearch(state);
    },
    clearFacultyStatus: (state) => {
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFaculty.pending, (state, action) => {
        state.loading = state.list.length === 0 || action.meta.arg?.forceRefresh;
        state.error = null;
      })
      .addCase(fetchFaculty.fulfilled, (state, action) => {
        state.loading = false;
        if (JSON.stringify(state.list) !== JSON.stringify(action.payload)) {
          state.list = action.payload;
          applyFiltersAndSearch(state);
          writeFacultyCache(action.payload);
        }
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(fetchFaculty.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createFaculty.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createFaculty.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.list.findIndex((f) => f.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        } else {
          state.list.unshift(action.payload);
        }
        applyFiltersAndSearch(state);
        writeFacultyCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(createFaculty.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(updateFaculty.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateFaculty.fulfilled, (state, action) => {
        state.loading = false;
        const targetId = String(action.payload.id || action.payload.docId || "");
        const index = state.list.findIndex(
          (f) => String(f.id || f.docId || "") === targetId,
        );
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        applyFiltersAndSearch(state);
        state.success = true;
        writeFacultyCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(updateFaculty.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(deleteFaculty.fulfilled, (state, action) => {
        const targetId = String(action.payload || "");
        state.list = state.list.filter(
          (f) => String(f.id || f.docId || "") !== targetId,
        );
        applyFiltersAndSearch(state);
        state.success = true;
        writeFacultyCache(state.list);
        state.cacheUpdatedAt = Date.now();
      });
  },
});



function applyFiltersAndSearch(state) {
  const query = state.searchQuery.toLowerCase().trim();
  const rawDigitsQuery = query.replace(/[^0-9]/g, "");
  const dept = state.filters.department;
  const rank = state.filters.designation;
  const status = state.filters.status || "All";

  state.filteredList = state.list.filter((fac) => {
    const nameMatch = fac.name && fac.name.toLowerCase().includes(query);
    const emailMatch = fac.email && fac.email.toLowerCase().includes(query);
    const phoneRawMatch = fac.phone && fac.phone.toLowerCase().includes(query);
    const phoneDigitsMatch =
      rawDigitsQuery.length > 0 &&
      fac.phone &&
      fac.phone.replace(/[^0-9]/g, "").includes(rawDigitsQuery);

    const matchesSearch = !query || nameMatch || emailMatch || phoneRawMatch || phoneDigitsMatch;

    const matchesDept = dept === "All" || normalizeDept(fac.department) === normalizeDept(dept);
    const matchesRank = rank === "All" || fac.designation === rank;
    const matchesStatus = status === "All" || fac.status === status;

    return matchesSearch && matchesDept && matchesRank && matchesStatus;
  });
}

export const { setSearchQuery, setFilters, clearFacultyStatus } = facultySlice.actions;
export default facultySlice.reducer;
