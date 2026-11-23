// Settings Redux Slice
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: localStorage.getItem('subtools_theme') || 'dark',
  supabaseSettings: {
    url: localStorage.getItem('sb_url') || import.meta.env.VITE_SUPABASE_URL || 'https://yxlnnmskctidhmusjypk.supabase.co',
    anonKey: localStorage.getItem('sb_anonKey') || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_n30MSDl93IlJn2xgOzp7GA_VwVi-t02',
    siteUrl: typeof window !== 'undefined' ? window.location.origin + '/' : 'https://sub-tools.vercel.app/',
  },
  appSettings: {
    appName: 'SUBTools Administration',
    appVersion: '1.2.0',
    maintenanceMode: false,
    restrictBannedUsers: true
  }
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = nextTheme;
      localStorage.setItem('subtools_theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    },
    updateSupabaseSettings: (state, action) => {
      state.supabaseSettings = { ...state.supabaseSettings, ...action.payload };
      if (action.payload.url) localStorage.setItem('sb_url', action.payload.url);
      if (action.payload.anonKey) localStorage.setItem('sb_anonKey', action.payload.anonKey);
    },
    updateAppSettings: (state, action) => {
      state.appSettings = { ...state.appSettings, ...action.payload };
    }
  }
});

export const { toggleTheme, updateSupabaseSettings, updateAppSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
