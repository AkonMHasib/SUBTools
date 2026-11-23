// Subject Management Redux Slice
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { subjectsApi } from "../../api/subjectsApi";
import { fetchDashboardData } from "./dashboardSlice";
import { normalizeDept } from "../../utils/academic";

import CacheManager from "../../services/CacheManager";

const getCachedSubjects = () => {
  const cached = CacheManager.get("subjects");
  if (cached?.data && Array.isArray(cached.data)) {
    return cached.data;
  }
  return [];
};

const initialList = getCachedSubjects();

const initialState = {
  list: initialList,
  filteredList: initialList,
  searchQuery: "",
  filters: {
    department: "All",
  },
  loading: false,
  error: null,
  success: false,
  cacheUpdatedAt: Date.now(),
};

export const fetchSubjects = createAsyncThunk(
  "subjects/fetchAll",
  async (options = {}, { rejectWithValue }) => {
    const { forceRefresh = false } = options;
    try {
      if (!forceRefresh) {
        const cached = CacheManager.get("subjects");
        if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0 && !cached.isExpired) {
          return cached.data;
        }
      }
      const data = await subjectsApi.getAll();
      CacheManager.set("subjects", data);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch subjects");
    }
  },
);

export const createSubject = createAsyncThunk(
  "subjects/create",
  async (subjectData, { dispatch, rejectWithValue }) => {
    try {
      const res = await subjectsApi.create(subjectData);
      CacheManager.invalidate("subjects");
      CacheManager.invalidate("dashboard_stats");
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to create subject");
    }
  },
);

export const updateSubject = createAsyncThunk(
  "subjects/update",
  async ({ code, updatedData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await subjectsApi.update(code, updatedData);
      CacheManager.invalidate("subjects");
      CacheManager.invalidate("dashboard_stats");
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update subject");
    }
  },
);

export const deleteSubject = createAsyncThunk(
  "subjects/delete",
  async (code, { dispatch, rejectWithValue }) => {
    try {
      await subjectsApi.delete(code);
      CacheManager.invalidate("subjects");
      CacheManager.invalidate("dashboard_stats");
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return code;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete subject");
    }
  },
);

const subjectSlice = createSlice({
  name: "subjects",
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
    clearSubjectStatus: (state) => {
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjects.pending, (state, action) => {
        state.loading = state.list.length === 0 || action.meta.arg?.forceRefresh;
        state.error = null;
      })
      .addCase(fetchSubjects.fulfilled, (state, action) => {
        state.loading = false;
        if (JSON.stringify(state.list) !== JSON.stringify(action.payload)) {
          state.list = action.payload;
          applyFiltersAndSearch(state);
          writeSubjectsCache(action.payload);
        }
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(fetchSubjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSubject.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createSubject.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const targetCode = String(action.payload.code || action.payload.id || "");
        const index = state.list.findIndex(
          (s) => String(s.code || s.id || "") === targetCode,
        );
        if (index !== -1) {
          state.list[index] = action.payload;
        } else {
          state.list.unshift(action.payload);
        }
        applyFiltersAndSearch(state);
        writeSubjectsCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(createSubject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSubject.fulfilled, (state, action) => {
        const targetCode = String(action.payload.code || action.payload.id || "");
        const index = state.list.findIndex(
          (s) => String(s.code || s.id || "") === targetCode,
        );
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        applyFiltersAndSearch(state);
        state.success = true;
        writeSubjectsCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(deleteSubject.fulfilled, (state, action) => {
        const targetCode = String(action.payload || "");
        state.list = state.list.filter(
          (s) => String(s.code || s.id || s.docId || "") !== targetCode,
        );
        applyFiltersAndSearch(state);
        state.success = true;
        writeSubjectsCache(state.list);
        state.cacheUpdatedAt = Date.now();
      });
  },
});



function applyFiltersAndSearch(state) {
  const searchLower = (state.searchQuery || "").trim().toLowerCase();
  state.filteredList = state.list.filter((subj) => {
    const name = String(subj.name || subj.title || subj.subject_name || "");
    const code = String(subj.code || subj.course_code || subj.subject_code || "");
    const matchesSearch =
      !searchLower ||
      name.toLowerCase().includes(searchLower) ||
      code.toLowerCase().includes(searchLower);

    const matchesDept =
      !state.filters.department ||
      state.filters.department === "All" ||
      normalizeDept(subj.department) === normalizeDept(state.filters.department);

    return matchesSearch && matchesDept;
  });
}

export const { setSearchQuery, setFilters, clearSubjectStatus } = subjectSlice.actions;
export default subjectSlice.reducer;
