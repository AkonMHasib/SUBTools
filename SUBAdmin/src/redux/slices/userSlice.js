// User Management Redux Slice
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../api/usersApi";
import { fetchDashboardData } from "./dashboardSlice";
import { normalizeDept } from "../../utils/academic";
import CacheManager from "../../services/CacheManager";

const getCachedUsers = () => {
  const cached = CacheManager.get("users");
  if (cached?.data && Array.isArray(cached.data)) {
    return cached.data;
  }
  return [];
};

const initialList = getCachedUsers();

const initialState = {
  list: initialList,
  filteredList: initialList,
  searchQuery: "",
  filters: {
    department: "All",
    status: "All",
    bloodGroup: "All",
  },
  selectedUser: null,
  loading: false,
  error: null,
  success: false,
  lastAction: null,
  cacheUpdatedAt: Date.now(),
};

function applyFiltersAndSearch(state) {
  const rawList = Array.isArray(state.list) ? state.list : [];
  const searchLower = (state.searchQuery || "").toLowerCase();

  state.filteredList = rawList.filter((user) => {
    if (!user) return false;

    // Search
    const nameMatch = user.name ? user.name.toLowerCase().includes(searchLower) : false;
    const idMatch = user.studentId
      ? String(user.studentId).toLowerCase().includes(searchLower)
      : false;
    const emailMatch = user.email ? user.email.toLowerCase().includes(searchLower) : false;
    const phoneMatch = user.phone ? String(user.phone).includes(searchLower) : false;

    const matchesSearch = !searchLower || nameMatch || idMatch || emailMatch || phoneMatch;

    // Department Filter
    const matchesDept =
      !state.filters.department ||
      state.filters.department === "All" ||
      normalizeDept(user.department) === normalizeDept(state.filters.department);

    // Status Filter
    const matchesStatus =
      !state.filters.status ||
      state.filters.status === "All" ||
      user.status === state.filters.status;

    // Blood Group Filter
    const matchesBlood =
      !state.filters.bloodGroup ||
      state.filters.bloodGroup === "All" ||
      user.bloodGroup === state.filters.bloodGroup;

    return matchesSearch && matchesDept && matchesStatus && matchesBlood;
  });
}

export const fetchUsers = createAsyncThunk(
  "users/fetchAll",
  async (options = {}, { rejectWithValue }) => {
    const { forceRefresh = false } = options;
    try {
      if (!forceRefresh) {
        const cached = CacheManager.get("users");
        if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0 && !cached.isExpired) {
          return cached.data;
        }
      }
      const data = await usersApi.getAll();
      CacheManager.set("users", data);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch users");
    }
  },
);

export const createUser = createAsyncThunk(
  "users/create",
  async (userData, { dispatch, rejectWithValue }) => {
    try {
      const res = await usersApi.create(userData);
      CacheManager.invalidate("users");
      CacheManager.invalidate("dashboard_stats");
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to add user");
    }
  },
);

export const inviteAdmin = createAsyncThunk(
  "users/inviteAdmin",
  async (adminData, { dispatch, rejectWithValue }) => {
    try {
      const res = await usersApi.inviteAdmin(adminData);
      CacheManager.invalidate("users");
      CacheManager.invalidate("admins");
      CacheManager.invalidate("dashboard_stats");
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to invite administrator");
    }
  },
);

export const updateUser = createAsyncThunk(
  "users/update",
  async ({ studentId, updatedData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await usersApi.update(studentId, updatedData);
      CacheManager.invalidate("users");
      CacheManager.invalidate("dashboard_stats");
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update user");
    }
  },
);

export const deleteUser = createAsyncThunk(
  "users/delete",
  async (studentId, { dispatch, rejectWithValue }) => {
    try {
      await usersApi.delete(studentId);
      CacheManager.invalidate("users");
      CacheManager.invalidate("dashboard_stats");
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return studentId;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete user");
    }
  },
);

export const toggleUserBan = createAsyncThunk(
  "users/toggleBan",
  async ({ studentId, isBanned }, { dispatch, rejectWithValue }) => {
    try {
      const res = isBanned ? await usersApi.unban(studentId) : await usersApi.ban(studentId);
      CacheManager.invalidate("users");
      CacheManager.invalidate("dashboard_stats");
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to toggle ban status");
    }
  },
);

export const manuallyVerifyUser = createAsyncThunk(
  "users/verify",
  async (studentId, { dispatch, rejectWithValue }) => {
    try {
      const res = await usersApi.verify(studentId);
      CacheManager.invalidate("users");
      CacheManager.invalidate("dashboard_stats");
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return { studentId };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to manually verify student");
    }
  },
);

const userSlice = createSlice({
  name: "users",
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
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    clearUserStatus: (state) => {
      state.error = null;
      state.success = false;
      state.lastAction = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state, action) => {
        state.loading = state.list.length === 0 || action.meta.arg?.forceRefresh;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        if (JSON.stringify(state.list) !== JSON.stringify(action.payload)) {
          state.list = action.payload;
          applyFiltersAndSearch(state);
          writeUsersCache(action.payload);
        }
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create User
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.lastAction = "create";
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.list.unshift(action.payload);
        applyFiltersAndSearch(state);
        writeUsersCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Invite Admin
      .addCase(inviteAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.lastAction = "inviteAdmin";
      })
      .addCase(inviteAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.list.unshift(action.payload);
        applyFiltersAndSearch(state);
        writeUsersCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(inviteAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.lastAction = "update";
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.list.findIndex((u) => u.studentId === action.payload.studentId);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        applyFiltersAndSearch(state);
        state.success = true;
        writeUsersCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.lastAction = "delete";
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        const targetId = String(action.payload || "");
        state.list = state.list.filter(
          (u) =>
            String(u.studentId || "") !== targetId &&
            String(u.id || "") !== targetId &&
            String(u.uid || "") !== targetId &&
            String(u.docId || "") !== targetId,
        );
        applyFiltersAndSearch(state);
        state.success = true;
        writeUsersCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      // Toggle Ban
      .addCase(toggleUserBan.fulfilled, (state, action) => {
        const index = state.list.findIndex((u) => u.studentId === action.payload.studentId);
        if (index !== -1) {
          state.list[index] = {
            ...state.list[index],
            status: action.payload.status,
            disabled: action.payload.status === "Banned",
          };
        }
        applyFiltersAndSearch(state);
        writeUsersCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      // Manually Verify User
      .addCase(manuallyVerifyUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.lastAction = "update";
      })
      .addCase(manuallyVerifyUser.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.list.findIndex((u) => u.studentId === action.payload.studentId);
        if (index !== -1) {
          state.list[index] = {
            ...state.list[index],
            manuallyVerified: true,
            emailVerified: true,
          };
        }
        applyFiltersAndSearch(state);
        state.success = true;
        writeUsersCache(state.list);
        state.cacheUpdatedAt = Date.now();
      })
      .addCase(manuallyVerifyUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSearchQuery, setFilters, setSelectedUser, clearUserStatus } = userSlice.actions;
export default userSlice.reducer;
