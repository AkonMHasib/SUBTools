// Dashboard Redux Slice
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { dashboardApi } from "../../api/dashboardApi";
import { adminApi } from "../api/adminApi";

const DASHBOARD_CACHE_KEY = "subtools_dashboard_cache";
const DASHBOARD_CACHE_TTL_MS = 30 * 1000; // 30s smart cache

const defaultStats = {
  totalUsers: 0,
  activeUsers: 0,
  bannedUsers: 0,
  onlineUsers: 0,
  totalFaculty: 0,
  totalSubjects: 0,
  totalCoverPagesGenerated: 0,
  totalBuses: 0,
  totalRoutes: 0,
  totalClassRoutines: 0,
  totalAdClicks: 0,
  navAdClicks: 0,
  homeAdClicks: 0,
};

const readDashboardCache = () => {
  try {
    const rawCache = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!rawCache) return null;

    const parsedCache = JSON.parse(rawCache);
    if (!parsedCache?.cachedAt || Date.now() - parsedCache.cachedAt > DASHBOARD_CACHE_TTL_MS) {
      return null;
    }

    return parsedCache;
  } catch (error) {
    return null;
  }
};

const writeDashboardCache = (payload) => {
  try {
    localStorage.setItem(
      DASHBOARD_CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        payload,
      }),
    );
  } catch (error) {
    // Ignore cache write failures and keep dashboard functional.
  }
};

const initialCache = readDashboardCache();

const initialState = {
  stats: initialCache?.payload?.stats || defaultStats,
  registrationTrend: initialCache?.payload?.registrationTrend || [],
  coverPageStats: initialCache?.payload?.coverPageStats || [],
  deptDistribution: initialCache?.payload?.deptDistribution || [],
  activities: initialCache?.payload?.activities || [],
  loading: false,
  error: null,
  cacheUpdatedAt: initialCache?.cachedAt || null,
};

export const fetchDashboardData = createAsyncThunk(
  "dashboard/fetchData",
  async (options = {}, { rejectWithValue, dispatch }) => {
    const { forceRefresh = true } = options;
    dispatch(adminApi.util.invalidateTags(["Dashboard"]));

    try {
      if (!forceRefresh) {
        const cached = readDashboardCache();
        if (cached?.payload) {
          return cached.payload;
        }
      }

      const [stats, trend, coverPage, dept, activities] = await Promise.all([
        dashboardApi.getStats(true),
        dashboardApi.getRegistrationTrend(true),
        dashboardApi.getCoverPageStats(true),
        dashboardApi.getDeptDistribution(true),
        dashboardApi.getActivities(),
      ]);

      const payload = {
        stats,
        registrationTrend: trend,
        coverPageStats: coverPage,
        deptDistribution: dept,
        activities,
      };

      writeDashboardCache(payload);
      return payload;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch dashboard data");
    }
  },
);

export const clearDashboardCache = createAsyncThunk("dashboard/clearCache", async () => {
  try {
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
  } catch (error) {
    // Ignore cache clear failures.
  }

  return true;
});

export const purgeDashboardCache = () => {
  try {
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
  } catch (_) {}
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    ...initialState,
    refreshing: false,
  },
  reducers: {
    addLocalActivity: (state, action) => {
      state.activities.unshift({
        id: `act-${Date.now()}`,
        type: "info",
        text: action.payload,
        time: "Just now",
        user: "Admin",
      });
      if (state.activities.length > 20) {
        state.activities.pop();
      }
    },
    invalidateCache: (state) => {
      state.cacheUpdatedAt = null;
      purgeDashboardCache();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = false;
        state.refreshing = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.stats = action.payload.stats;
        state.registrationTrend = action.payload.registrationTrend;
        state.coverPageStats = action.payload.coverPageStats;
        state.deptDistribution = action.payload.deptDistribution;
        state.activities = action.payload.activities;
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(clearDashboardCache.fulfilled, (state) => {
        state.cacheUpdatedAt = null;
        state.error = null;
      });
  },
});

export const { addLocalActivity } = dashboardSlice.actions;
export default dashboardSlice.reducer;
