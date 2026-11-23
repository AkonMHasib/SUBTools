// Role & Permissions API Layer (100% Pure Supabase DatabaseService)
import FirestoreService from "../services/FirestoreService";
import CacheManager from "../services/CacheManager";

export const roleApi = {
  // Canonical 3-Role System Definitions
  SYSTEM_ROLES: [
    { id: "super_admin", label: "Super Admin", description: "Full system access & admin management", isSystem: true },
    { id: "admin", label: "Admin", description: "Full administration (Department, Academics & Transport)", isSystem: true },
    { id: "student", label: "Student", description: "Standard student access", isSystem: false },
  ],

  // Fine-Grained System Permissions Registry
  PERMISSIONS_LIST: [
    { key: "users.read", label: "Read Users", group: "User Management" },
    { key: "users.create", label: "Create Users", group: "User Management" },
    { key: "users.update", label: "Update Users", group: "User Management" },
    { key: "users.delete", label: "Delete Users", group: "User Management" },

    { key: "routine.read", label: "Read Class Routine", group: "Routines" },
    { key: "routine.create", label: "Create Routine", group: "Routines" },
    { key: "routine.update", label: "Update Routine", group: "Routines" },
    { key: "routine.delete", label: "Delete Routine", group: "Routines" },

    { key: "subjects.manage", label: "Manage Subjects", group: "Academic" },
    { key: "faculty.manage", label: "Manage Faculty", group: "Academic" },
    { key: "slides.manage", label: "Manage Slides", group: "Academic" },
    { key: "exam.manage", label: "Manage Exam Routines", group: "Academic" },

    { key: "notice.publish", label: "Publish Notices", group: "Communication" },
    { key: "notice.moderate", label: "Moderate Notices", group: "Communication" },

    { key: "transport.manage", label: "Manage Transport & GPS", group: "Operations" },
    { key: "reports.view", label: "View Reports & Logs", group: "Auditing" },
    { key: "system.settings", label: "System Settings", group: "System" },
  ],

  // Default Role-to-Permissions Matrix
  ROLE_PERMISSION_MATRIX: {
    super_admin: [
      "users.read", "users.create", "users.update", "users.delete",
      "routine.read", "routine.create", "routine.update", "routine.delete",
      "subjects.manage", "faculty.manage", "slides.manage", "exam.manage",
      "notice.publish", "notice.moderate",
      "transport.manage", "reports.view", "system.settings"
    ],
    admin: [
      "users.read", "users.update",
      "routine.read", "routine.create", "routine.update", "routine.delete",
      "subjects.manage", "faculty.manage", "slides.manage", "exam.manage",
      "notice.publish", "notice.moderate",
      "transport.manage", "reports.view"
    ],
    student: [
      "routine.read"
    ]
  },

  getAllUsers: async () => {
    return await FirestoreService.getCachedCollection("users", { forceRefresh: true });
  },

  getAllAdmins: async () => {
    const allUsers = await FirestoreService.getCachedCollection("users", { forceRefresh: true });
    return allUsers.filter((u) => {
      const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
      return roles.includes("admin") || roles.includes("super_admin") || u.isAdmin === true;
    });
  },

  updateUserRoles: async (uid, roles = [], activeRole = "") => {
    if (!uid) throw new Error("User ID is required");
    const sanitizedRoles = Array.from(new Set(roles.map((r) => r.trim().toLowerCase())));
    const hasAdmin = sanitizedRoles.includes("admin") || sanitizedRoles.includes("super_admin");

    const payload = {
      roles: sanitizedRoles,
      isAdmin: hasAdmin,
      isSuperAdmin: sanitizedRoles.includes("super_admin"),
      updatedAt: new Date().toISOString(),
    };

    await FirestoreService.setDocument("users", uid, payload, true);
    CacheManager.invalidate("users");
    CacheManager.invalidate("admins");
    return payload;
  },

  getUserRoles: async (uid) => {
    if (!uid) return [];
    const userDoc = await FirestoreService.getDocument("users", uid);
    if (!userDoc) return [];
    return userDoc.roles || (userDoc.role ? [userDoc.role] : ["student"]);
  },

  savePermissionMatrix: async (updatedMatrix) => {
    try {
      await FirestoreService.setDocument("system_settings", "permission_matrix", {
        matrix: updatedMatrix,
        updatedAt: new Date().toISOString()
      });
    } catch (_) {}
    roleApi.ROLE_PERMISSION_MATRIX = { ...roleApi.ROLE_PERMISSION_MATRIX, ...updatedMatrix };
    return roleApi.ROLE_PERMISSION_MATRIX;
  },

  loadPermissionMatrix: async () => {
    try {
      const docData = await FirestoreService.getDocument("system_settings", "permission_matrix");
      if (docData?.matrix || docData?.settings?.matrix) {
        roleApi.ROLE_PERMISSION_MATRIX = docData.matrix || docData.settings.matrix;
      }
    } catch (_) {}
    return roleApi.ROLE_PERMISSION_MATRIX;
  },

  getActivityLogs: async (maxCount = 50) => {
    try {
      return await FirestoreService.getCachedCollection("activityLogs");
    } catch (err) {
      return [];
    }
  },

  deleteAdmin: async (uid, email = "") => {
    if (!uid && !email) throw new Error("Administrator UID or email is required");

    // 1. Delete matching administrator document from Supabase PostgreSQL users table
    try {
      if (uid) {
        await FirestoreService.deleteDocument("users", uid);
      }
      if (email) {
        const { SUPABASE_URL, supabaseHeaders } = await import("../supabase/config");
        await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
          method: "DELETE",
          headers: supabaseHeaders(),
        });
      }
    } catch (_) {}

    // 2. Also ensure if student user record remains, all administrative privileges and roles are completely revoked
    try {
      const targetId = uid || email;
      await FirestoreService.setDocument("users", targetId, {
        role: "student",
        roles: ["student"],
        isAdmin: false,
        isSuperAdmin: false,
        updatedAt: new Date().toISOString(),
      }, true);
    } catch (_) {}

    CacheManager.invalidate("admins");
    CacheManager.invalidate("users");
    return { success: true, uid };
  }
};

export default roleApi;
