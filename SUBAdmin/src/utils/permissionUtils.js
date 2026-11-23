// Centralized Permission & Role Utilities for SUBAdmin
export const SUPER_ADMIN_EMAILS = [
  "akonmhasib@gmail.com",
  "subtools.admin@gmail.com",
  "hasiburrahman@gmail.com",
  "akonszone@gmail.com",
];

/**
 * Normalizes legacy roles into the 3 official roles: super_admin, admin, student.
 */
export const normalizeRole = (role) => {
  if (!role) return "student";
  const r = String(role).toLowerCase().trim();
  if (r === "super_admin") return "super_admin";
  if (r === "admin" || r === "coordinator" || r === "moderator") return "admin";
  return "student";
};

/**
 * Checks if an email belongs to a super admin.
 */
export const isSuperAdminEmail = (email) => {
  if (!email) return false;
  const eLower = String(email).toLowerCase().trim();
  return SUPER_ADMIN_EMAILS.includes(eLower);
};

/**
 * Checks if a user has a specific role (supports multiple roles per user).
 */
export const hasRole = (user, targetRole) => {
  if (!user || !targetRole) return false;
  const normalizedTarget = normalizeRole(targetRole);
  if (normalizeRole(user.role) === normalizedTarget) return true;
  if (normalizeRole(user.activeRole) === normalizedTarget) return true;
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  return roles.map(normalizeRole).includes(normalizedTarget);
};

/**
 * Determines if a user has Super Admin privileges.
 */
export const isSuperAdmin = (user) => {
  if (!user) return false;
  if (user.role === "super_admin" || user.activeRole === "super_admin") return true;
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  if (roles.includes("super_admin")) return true;
  if (isSuperAdminEmail(user.email)) return true;
  return false;
};

/**
 * Determines if a user has Admin privileges.
 */
export const isAdmin = (user) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (user.role === "admin" || user.activeRole === "admin") return true;
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  return roles.some((r) => ["admin", "coordinator", "moderator"].includes(String(r).toLowerCase()));
};

/**
 * Determines if a user has Student privileges.
 * Super Admin is NEVER a student (per strict role separation).
 */
export const isStudent = (user) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return false;
  if (user.role === "student" || user.activeRole === "student") return true;
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  if (roles.some((r) => String(r).toLowerCase().trim() === "student")) return true;
  // If user has a studentId and is not super admin
  if (user.studentId || user.student_id) return true;
  return false;
};

/**
 * Checks if a user has multiple roles: both Admin and Student.
 * Super Admin is NEVER dual-role.
 */
export const hasBothStudentAndAdmin = (user) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return false;

  const roles = Array.isArray(user.roles)
    ? user.roles.map((r) => String(r).toLowerCase().trim())
    : user.role
      ? [String(user.role).toLowerCase().trim()]
      : [];

  const hasAdminRole =
    roles.some((r) => ["admin", "coordinator", "moderator"].includes(r)) ||
    ["admin", "coordinator", "moderator"].includes(String(user.role || "").toLowerCase().trim());

  if (!hasAdminRole) return false;

  const hasStudentRole =
    roles.includes("student") ||
    String(user.role || "").toLowerCase().trim() === "student" ||
    Boolean(user.studentId || user.student_id);

  return Boolean(hasAdminRole && hasStudentRole);
};

/**
 * Pure Admin: has admin privileges, but is NOT super admin and NOT dual-role student.
 */
export const isPureAdmin = (user) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return false;
  return isAdmin(user) && !hasBothStudentAndAdmin(user);
};

/**
 * Returns an array of normalized roles assigned to the user.
 * Supports multi-role users (e.g. admin & student).
 */
export const getUserRoles = (user) => {
  if (!user) return ["student"];
  const rawRoles = new Set();
  if (user.role) rawRoles.add(String(user.role).toLowerCase().trim());
  if (user.activeRole) rawRoles.add(String(user.activeRole).toLowerCase().trim());
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => rawRoles.add(String(r).toLowerCase().trim()));
  }
  // If user has a studentId or no specific role, include student
  if (user.studentId || rawRoles.size === 0) {
    rawRoles.add("student");
  }

  const normalized = new Set();
  rawRoles.forEach((r) => {
    if (r === "super_admin") normalized.add("super_admin");
    else if (["admin", "coordinator", "moderator"].includes(r)) normalized.add("admin");
    else if (r === "student") normalized.add("student");
  });

  if (normalized.size === 0) {
    normalized.add("student");
  }

  return Array.from(normalized);
};

/**
 * Checks if a user has a specific permission key.
 */
export const hasPermission = (user, permKey) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (isAdmin(user)) return true;
  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  return userPerms.includes(permKey);
};

/**
 * Returns current active portal mode for user ('student' | 'admin').
 * - Super Admin: always 'admin' (never student portal)
 * - Pure Admin: always 'admin' (never student portal)
 * - Multi-Role (Admin + Student): defaults to 'student', can switch to 'admin'
 * - Pure Student: always 'student'
 */
export const getActivePortalMode = (user) => {
  if (!user) return "student";
  if (isSuperAdmin(user)) return "admin";
  if (isPureAdmin(user)) return "admin";

  if (hasBothStudentAndAdmin(user)) {
    const stored = localStorage.getItem("subtools_active_portal_mode");
    if (stored === "admin" || stored === "student") {
      return stored;
    }
    return "student";
  }

  return "student";
};

/**
 * Persists the active portal mode for strict route authorization.
 */
export const setActivePortalMode = (mode) => {
  if (mode === "student" || mode === "admin") {
    localStorage.setItem("subtools_active_portal_mode", mode);
  }
};

