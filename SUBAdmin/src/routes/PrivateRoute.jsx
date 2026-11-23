// Private Route Guard Component for Admin Routes
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import {
  isAdmin,
  isSuperAdmin,
  isPureAdmin,
  hasBothStudentAndAdmin,
  getActivePortalMode,
  setActivePortalMode,
} from '../utils/permissionUtils';

export const PrivateRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  // If recovery token is in hash or search query, redirect to /reset-password
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const isRecovery =
    (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) ||
    (search && (search.includes('type=recovery') || search.includes('token_hash=') || search.includes('code=')));

  if (isRecovery) {
    return <Navigate to={`/reset-password${search}${hash}`} replace />;
  }

  // If unauthenticated, redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Super Admin always has full access to admin console
  if (isSuperAdmin(user)) {
    return children;
  }

  // 2. Pure Admin always has access to admin console
  if (isPureAdmin(user)) {
    return children;
  }

  // 3. Multi-role user (Admin + Student)
  if (hasBothStudentAndAdmin(user)) {
    // If navigating to admin route, activate admin mode
    setActivePortalMode("admin");
    return children;
  }

  // 4. Any other admin role check fallback
  if (isAdmin(user)) {
    setActivePortalMode("admin");
    return children;
  }

  // 5. Pure student lacks admin privileges -> redirect to student portal
  return <Navigate to="/portal" replace />;
};

export default PrivateRoute;
