// Redux Toolkit Store Configuration
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import dashboardReducer from "./slices/dashboardSlice";
import userReducer from "./slices/userSlice";
import subjectReducer from "./slices/subjectSlice";
import routineReducer from "./slices/routineSlice";
import transportReducer from "./slices/transportSlice";
import settingsReducer from "./slices/settingsSlice";
import facultyReducer from "./slices/facultySlice";
import lostFoundReducer from "./slices/lostFoundSlice";
import activityLogsReducer from "./slices/activityLogsSlice";
import noticeReducer from "./slices/noticeSlice";
import { adminApi } from "./api/adminApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    users: userReducer,
    subjects: subjectReducer,
    routines: routineReducer,
    transport: transportReducer,
    settings: settingsReducer,
    faculty: facultyReducer,
    lostFound: lostFoundReducer,
    activityLogs: activityLogsReducer,
    notices: noticeReducer,
    [adminApi.reducerPath]: adminApi.reducer,
  },
  // Ensure middleware is set up correctly for production
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(adminApi.middleware),
});

export default store;
