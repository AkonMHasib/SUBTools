import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PrivateRoute from "./PrivateRoute";
import DashboardLayout from "../layouts/DashboardLayout";

// Student Dashboard for authenticated students at root /
const StudentDashboard = lazy(() => import("../pages/student/StudentDashboard"));

// Lazy loading all pages for optimized code splitting
const Login = lazy(() => import("../pages/auth/Login"));
const Signup = lazy(() => import("../pages/auth/Signup"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const UserManagement = lazy(() => import("../pages/users/UserManagement"));
const SubjectManagement = lazy(() => import("../pages/subjects/SubjectManagement"));
const ClassRoutine = lazy(() => import("../pages/routines/ClassRoutine"));
const TransportModule = lazy(() => import("../pages/transport/TransportModule"));
const Settings = lazy(() => import("../pages/settings/Settings"));
const Profile = lazy(() => import("../pages/profile/Profile"));
const NoticeManagement = lazy(() => import("../pages/notices/NoticeManagement"));
const FacultyManagement = lazy(() => import("../pages/faculty/FacultyManagement"));
const ExamRoutineManagement = lazy(() => import("../pages/exams/ExamRoutineManagement"));
const SlidesManagement = lazy(() => import("../pages/slides/SlidesManagement"));
const RbacManagement = lazy(() => import("../pages/admin/RbacManagement"));
const AdsManagement = lazy(() => import("../pages/admin/AdsManagement"));
const AdsAnalytics = lazy(() => import("../pages/admin/AdsAnalytics"));

const CoverPages = lazy(() => import("../pages/coverpages/CoverPages"));
const LostFoundManagement = lazy(() => import("../pages/lostfound/LostFoundManagement"));
const ActivityLogs = lazy(() => import("../pages/activity/ActivityLogs"));
const SubletManagement = lazy(() => import("../pages/community/SubletManagement"));
const TuitionManagement = lazy(() => import("../pages/community/TuitionManagement"));
const HolidayManagement = lazy(() => import("../pages/holidays/HolidayManagement"));

// Full Screen Page Loading Indicator
const PageLoader = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-4 tracking-wider uppercase">
      Loading SUBTools...
    </span>
  </div>
);

import { isSuperAdmin, isAdmin, isPureAdmin, hasBothStudentAndAdmin, getActivePortalMode } from "../utils/permissionUtils";

export const AppRoutes = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdminUser = isSuperAdmin(user);
  const isAdminUser = isAdmin(user);
  const isPureAdminUser = isPureAdmin(user);
  const isDualRoleUser = hasBothStudentAndAdmin(user);
  const activePortalMode = getActivePortalMode(user);
  const location = useLocation();
  const navigate = useNavigate();

  // Automatically catch Supabase password recovery tokens (#access_token=...&type=recovery or ?token_hash=...)
  // and route directly to /reset-password preserving tokens
  useEffect(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const isRecovery =
      (hash && (hash.includes("type=recovery") || hash.includes("access_token="))) ||
      (search && (search.includes("type=recovery") || search.includes("token_hash=") || search.includes("code=")));

    if (isRecovery && !location.pathname.includes("/reset-password")) {
      navigate(`/reset-password${search}${hash}`, { replace: true });
    }
  }, [location, navigate]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root route:
            - Unauthenticated -> Login
            - Super Admin -> /admin/dashboard (never student portal)
            - Pure Admin -> /admin/dashboard (never student portal)
            - Dual-role (Admin + Student) -> /admin/dashboard if mode is admin, else Student Portal
            - Pure Student -> Student Portal */}
        <Route
          path="/"
          element={
            !user ? (
              <Login />
            ) : isSuperAdminUser || isPureAdminUser ? (
              <Navigate to="/admin/dashboard" replace />
            ) : isDualRoleUser ? (
              <StudentDashboard />
            ) : (
              <StudentDashboard />
            )
          }
        />

        {/* Dedicated Student Portal Page Routes:
            - Unauthenticated -> /login
            - Super Admin -> /admin/dashboard (cannot access student portal)
            - Pure Admin -> /admin/dashboard (cannot access student portal)
            - Dual-role (Admin + Student) & Student -> StudentDashboard */}
        <Route
          path="/portal"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : isSuperAdminUser ? (
              <Navigate to="/admin/dashboard" replace />
            ) : isPureAdminUser ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <StudentDashboard />
            )
          }
        />
        <Route
          path="/portal/*"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : isSuperAdminUser ? (
              <Navigate to="/admin/dashboard" replace />
            ) : isPureAdminUser ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <StudentDashboard />
            )
          }
        />

        {/* Direct Auth routes */}
        <Route
          path="/login"
          element={
            user ? (
              isSuperAdminUser || isPureAdminUser ? (
                <Navigate to="/admin/dashboard" replace />
              ) : isDualRoleUser ? (
                <Navigate to="/portal" replace />
              ) : (
                <Navigate to="/portal" replace />
              )
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/admin/login"
          element={
            user ? (
              isSuperAdminUser || isPureAdminUser ? (
                <Navigate to="/admin/dashboard" replace />
              ) : isDualRoleUser ? (
                <Navigate to="/portal" replace />
              ) : (
                <Navigate to="/portal" replace />
              )
            ) : (
              <Login />
            )
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />
        <Route
          path="/signup"
          element={
            user ? (
              isSuperAdminUser || (isAdminUser && activePortalMode === "admin") ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Signup />
            )
          }
        />

        {/* Admin Dashboard Layout and Nested Protected Routes under /admin */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={isAdminUser ? <UserManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="subjects" element={isAdminUser ? <SubjectManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="routines" element={isAdminUser ? <ClassRoutine /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="exam-routine" element={isAdminUser ? <ExamRoutineManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="slides" element={isAdminUser ? <SlidesManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="transport" element={isAdminUser ? <TransportModule /> : <Navigate to="/admin/dashboard" replace />} />

          <Route path="settings" element={isSuperAdminUser ? <Settings /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="ads" element={isSuperAdminUser ? <AdsManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="ads-analytics" element={isSuperAdminUser ? <AdsAnalytics /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notices" element={<NoticeManagement />} />
          <Route path="faculty" element={isAdminUser ? <FacultyManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="cover-pages" element={isSuperAdminUser ? <CoverPages /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="lost-found" element={isAdminUser ? <LostFoundManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="sublets" element={isAdminUser ? <SubletManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="tuitions" element={isAdminUser ? <TuitionManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="activity-logs" element={isSuperAdminUser ? <ActivityLogs /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="holidays" element={isSuperAdminUser ? <HolidayManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="rbac" element={isSuperAdminUser ? <RbacManagement /> : <Navigate to="/admin/dashboard" replace />} />
          <Route path="admin-management" element={<Navigate to="/admin/rbac?tab=admins" replace />} />
          <Route path="role-management" element={<Navigate to="/admin/rbac" replace />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* Backward Compatibility Redirects for legacy root-level admin paths */}
        <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/users" element={<Navigate to="/admin/users" replace />} />
        <Route path="/subjects" element={<Navigate to="/admin/subjects" replace />} />
        <Route path="/routines" element={<Navigate to="/admin/routines" replace />} />
        <Route path="/exam-routine" element={<Navigate to="/admin/exam-routine" replace />} />
        <Route path="/slides" element={<Navigate to="/admin/slides" replace />} />
        <Route path="/transport" element={<Navigate to="/admin/transport" replace />} />
        <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
        <Route path="/ads" element={<Navigate to="/admin/ads" replace />} />
        <Route path="/ads-analytics" element={<Navigate to="/admin/ads-analytics" replace />} />
        <Route path="/profile" element={<Navigate to="/admin/profile" replace />} />
        <Route path="/notices" element={<Navigate to="/admin/notices" replace />} />
        <Route path="/faculty" element={<Navigate to="/admin/faculty" replace />} />
        <Route path="/cover-pages" element={<Navigate to="/admin/cover-pages" replace />} />
        <Route path="/lost-found" element={<Navigate to="/admin/lost-found" replace />} />
        <Route path="/sublets" element={<Navigate to="/admin/sublets" replace />} />
        <Route path="/tuitions" element={<Navigate to="/admin/tuitions" replace />} />
        <Route path="/activity-logs" element={<Navigate to="/admin/activity-logs" replace />} />
        <Route path="/holidays" element={<Navigate to="/admin/holidays" replace />} />
        <Route path="/rbac" element={<Navigate to="/admin/rbac" replace />} />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
