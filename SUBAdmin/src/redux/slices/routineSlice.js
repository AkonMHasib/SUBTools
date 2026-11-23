// Routine Management Redux Slice
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { routineApi } from "../../api/routineApi";
import { fetchDashboardData } from "./dashboardSlice";
import { normalizeDept } from "../../utils/academic";

const ROUTINES_CACHE_KEY = "subtools_routines_cache";
const ROUTINES_CACHE_TTL_MS = 5 * 60 * 1000;

const readRoutinesCache = (ignoreExpiration = false) => {
  try {
    const rawCache = localStorage.getItem(ROUTINES_CACHE_KEY);
    if (!rawCache) return null;
    const parsedCache = JSON.parse(rawCache);
    if (!ignoreExpiration && Date.now() - parsedCache?.cachedAt > ROUTINES_CACHE_TTL_MS) {
      return null;
    }
    return parsedCache;
  } catch (error) {
    return null;
  }
};

const writeRoutinesCache = (payload) => {
  try {
    localStorage.setItem(
      ROUTINES_CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        payload,
      }),
    );
  } catch (error) {}
};

const initialCache = readRoutinesCache(true);
const initialList = initialCache?.payload || [];

const initialState = {
  list: initialList,
  filteredList: initialList,
  searchQuery: "",
  filters: {
    department: "All",
    day: "All",
    term: "All",
  },
  loading: false,
  error: null,
  success: false,
  cacheUpdatedAt: initialCache?.cachedAt || null,
};

export const fetchRoutines = createAsyncThunk(
  "routines/fetchAll",
  async (options = {}, { rejectWithValue }) => {
    const { forceRefresh = false } = options;
    try {
      if (!forceRefresh) {
        const cached = readRoutinesCache();
        if (cached?.payload) {
          return cached.payload;
        }
      }
      const data = await routineApi.getAll(forceRefresh);
      writeRoutinesCache(data);
      return data;
    } catch (err) {
      const cached = readRoutinesCache(true);
      if (cached?.payload && cached.payload.length > 0) {
        return cached.payload;
      }
      return rejectWithValue(err.message || "Failed to fetch routines");
    }
  },
);

export const createRoutine = createAsyncThunk(
  "routines/create",
  async (routineData, { dispatch, rejectWithValue }) => {
    try {
      const res = await routineApi.create(routineData);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to create routine");
    }
  },
);

export const updateRoutine = createAsyncThunk(
  "routines/update",
  async ({ id, updatedData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await routineApi.update(id, updatedData);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update routine");
    }
  },
);

export const deleteRoutine = createAsyncThunk(
  "routines/delete",
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await routineApi.delete(id);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete routine");
    }
  },
);

export const bulkDeleteRoutines = createAsyncThunk(
  "routines/bulkDelete",
  async (ids, { dispatch, rejectWithValue }) => {
    try {
      await routineApi.bulkDelete(ids);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return ids;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete selected routines");
    }
  },
);

export const bulkImportRoutines = createAsyncThunk(
  "routines/bulkImport",
  async ({ routines, department }, { dispatch, rejectWithValue }) => {
    try {
      const res = await routineApi.bulkImport(routines, department);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to import routines");
    }
  },
);

const routineSlice = createSlice({
  name: "routines",
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
    clearRoutineStatus: (state) => {
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoutines.pending, (state, action) => {
        state.loading = state.list.length === 0 || action.meta.arg?.forceRefresh;
        state.error = null;
      })
      .addCase(fetchRoutines.fulfilled, (state, action) => {
        state.loading = false;
        if (JSON.stringify(state.list) !== JSON.stringify(action.payload)) {
          state.list = action.payload;
          applyFiltersAndSearch(state);
          writeRoutinesCache(action.payload);
        }
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(fetchRoutines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createRoutine.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createRoutine.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const targetId = String(action.payload.id || action.payload.docId || "");
        const index = state.list.findIndex((r) => String(r.id || r.docId || "") === targetId);
        if (index !== -1) {
          state.list[index] = action.payload;
        } else {
          state.list.unshift(action.payload);
        }
        applyFiltersAndSearch(state);
        writeRoutinesCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(createRoutine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateRoutine.fulfilled, (state, action) => {
        const targetId = String(action.payload.id || action.payload.docId || "");
        const index = state.list.findIndex((r) => String(r.id || r.docId || "") === targetId);
        if (index !== -1) {
          state.list[index] = { ...state.list[index], ...action.payload };
        } else {
          state.list.unshift(action.payload);
        }
        applyFiltersAndSearch(state);
        state.success = true;
        writeRoutinesCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(deleteRoutine.fulfilled, (state, action) => {
        const targetId = String(action.payload || "");
        state.list = state.list.filter(
          (r) => String(r.id || r.docId || "") !== targetId,
        );
        applyFiltersAndSearch(state);
        state.success = true;
        writeRoutinesCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(bulkDeleteRoutines.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(bulkDeleteRoutines.fulfilled, (state, action) => {
        state.loading = false;
        const deletedSet = new Set((action.payload || []).map(String));
        state.list = state.list.filter(
          (r) =>
            !deletedSet.has(String(r.id || "")) &&
            !deletedSet.has(String(r.docId || "")),
        );
        applyFiltersAndSearch(state);
        state.success = true;
        writeRoutinesCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(bulkDeleteRoutines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(bulkImportRoutines.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(bulkImportRoutines.fulfilled, (state, action) => {
        state.loading = false;
        const newItemsMap = new Map(action.payload.map((item) => [item.id, item]));
        const updatedList = state.list.filter((r) => !newItemsMap.has(r.id));
        state.list = [...action.payload, ...updatedList];
        applyFiltersAndSearch(state);
        state.success = true;
        writeRoutinesCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(bulkImportRoutines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});



export const isTermMatching = (routineTermRaw, filterTermRaw) => {
  if (!filterTermRaw || filterTermRaw === "All" || filterTermRaw === "All Terms") {
    return true;
  }

  const rotTermStr = String(routineTermRaw || "").trim();
  if (!rotTermStr || rotTermStr.toUpperCase() === "ALL" || rotTermStr.toUpperCase() === "ALL TERMS") {
    return true;
  }

  const cleanFilter = filterTermRaw.toUpperCase().trim();
  const cleanRot = rotTermStr.toUpperCase().trim();

  if (cleanFilter === "N/A" || cleanFilter === "NA") {
    return cleanRot === "N/A" || cleanRot === "NA" || cleanRot.includes("N/A");
  }

  const filterNumbers = (cleanFilter.match(/\d+/g) || []).map(Number);
  const rotNumbers = (cleanRot.match(/\d+/g) || []).map(Number);

  if (filterNumbers.length > 0) {
    if (rotNumbers.length > 0) {
      return filterNumbers.some((fn) => rotNumbers.includes(fn));
    }
  }

  return cleanRot.includes(cleanFilter) || cleanFilter.includes(cleanRot);
};

function applyFiltersAndSearch(state) {
  const searchLower = (state.searchQuery || "").toLowerCase();
  const cleanStr = (val) => String(val || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  state.filteredList = state.list.filter((rot) => {
    if (!rot) return false;
    const subjectMatch = rot.subject ? rot.subject.toLowerCase().includes(searchLower) : false;
    const codeMatch = rot.code ? rot.code.toLowerCase().includes(searchLower) : false;
    const classroomMatch = rot.classroom
      ? rot.classroom.toLowerCase().includes(searchLower)
      : false;

    let teachersMatch = false;
    if (Array.isArray(rot.teachers)) {
      teachersMatch = rot.teachers.some(
        (t) => typeof t === "string" && t.toLowerCase().includes(searchLower),
      );
    } else if (typeof rot.teachers === "string") {
      teachersMatch = rot.teachers.toLowerCase().includes(searchLower);
    }

    const matchesSearch =
      !searchLower || subjectMatch || codeMatch || classroomMatch || teachersMatch;

    const rotDept = rot.department || rot.dept || rot.departmentCode || "";
    const matchesDept =
      !state.filters.department ||
      state.filters.department === "All" ||
      !rotDept ||
      normalizeDept(rotDept) === normalizeDept(state.filters.department);

    const matchesDay =
      !state.filters.day ||
      state.filters.day === "All" ||
      (rot.day && cleanStr(rot.day).includes(cleanStr(state.filters.day)));

    const rotTerm = rot.academicLevel || rot.term || rot.academic_level || rot.termName || "";
    const matchesTerm = isTermMatching(rotTerm, state.filters.term);

    return matchesSearch && matchesDept && matchesDay && matchesTerm;
  });
}

export const { setSearchQuery, setFilters, clearRoutineStatus } = routineSlice.actions;
export default routineSlice.reducer;
