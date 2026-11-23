// Auth Redux Slice with Async Thunks
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../api/authApi';

// Initial state, pulling cached user if available
const savedUser = localStorage.getItem('subtools_user');
const savedToken = localStorage.getItem('subtools_token');

const initialState = {
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken || null,
  loading: false,
  error: null,
  success: false
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ identifier, email, password }, { rejectWithValue }) => {
    try {
      const data = await authApi.login(identifier || email, password);
      if (data && data.requires2FA) {
        return data; // returns 2FA challenge to UI
      }
      localStorage.setItem('subtools_user', JSON.stringify(data));
      localStorage.setItem('subtools_token', data.token);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to login');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      if (typeof authApi.logout === 'function') {
        await authApi.logout();
      }
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      localStorage.removeItem('subtools_user');
      localStorage.removeItem('subtools_token');
      localStorage.removeItem('subtools_supabase_token');
      localStorage.removeItem('subtools_refresh_token');
      localStorage.removeItem('subtools_active_portal_mode');
    }
    return true;
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (email, { rejectWithValue }) => {
    try {
      return await authApi.forgotPassword(email);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to send password reset');
    }
  }
);

export const updateAdminProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const data = await authApi.updateProfile(profileData);
      const currentUser = JSON.parse(localStorage.getItem('subtools_user') || '{}');
      const pUrl = profileData.photo_url || profileData.photoURL || currentUser.photo_url || currentUser.photoURL || '';
      const updatedUser = {
        ...currentUser,
        ...profileData,
        photo_url: pUrl,
        photoURL: pUrl,
      };
      localStorage.setItem('subtools_user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update profile');
    }
  }
);

export const syncUserSession = createAsyncThunk(
  'auth/syncSession',
  async (firebaseUser, { rejectWithValue }) => {
    try {
      if (!firebaseUser) return null;
      return await authApi.fetchUserProfile(firebaseUser);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to sync session');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthStatus: (state) => {
      state.error = null;
      state.success = false;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      if (action.payload?.token) {
        state.token = action.payload.token;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.requires2FA) {
          // Awaiting 2FA code in UI
          return;
        }
        state.user = action.payload;
        state.token = action.payload?.token || state.token;
        state.success = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Sync Session
      .addCase(syncUserSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload;
          state.token = action.payload.token || state.token;
        }
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.loading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.loading = false;
        state.error = null;
      })
      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Profile
      .addCase(updateAdminProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.success = true;
      });
  }
});

export const { clearAuthStatus, setUser } = authSlice.actions;
export default authSlice.reducer;
