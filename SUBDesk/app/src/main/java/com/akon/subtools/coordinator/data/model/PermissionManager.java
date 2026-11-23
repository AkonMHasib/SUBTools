package com.akon.subtools.coordinator.data.model;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class PermissionManager {

    private static final Map<String, Set<String>> ROLE_PERMISSIONS = new HashMap<>();

    static {
        // Unified Admin & Super Admin Permissions (Merged Coordinator + Moderator Powers)
        Set<String> adminPerms = new HashSet<>(Arrays.asList(
                Permission.USERS_READ,
                Permission.ROUTINE_READ,
                Permission.ROUTINE_CREATE,
                Permission.ROUTINE_UPDATE,
                Permission.ROUTINE_DELETE,
                Permission.SUBJECTS_MANAGE,
                Permission.FACULTY_MANAGE,
                Permission.FACULTY_CREATE,
                Permission.FACULTY_DELETE,
                Permission.NOTICE_PUBLISH,
                Permission.TRANSPORT_MANAGE,
                Permission.NOTICE_MODERATE,
                Permission.COMMUNITY_MODERATE,
                Permission.REPORTS_VIEW
        ));
        ROLE_PERMISSIONS.put("admin", adminPerms);
        ROLE_PERMISSIONS.put("super_admin", adminPerms);
        ROLE_PERMISSIONS.put("coordinator", adminPerms);
        ROLE_PERMISSIONS.put("moderator", adminPerms);
    }

    public static Set<String> getPermissionsForRole(String role) {
        if (role == null) return Collections.emptySet();
        String normalized = role.trim().toLowerCase();
        if (normalized.equals("admin") || normalized.equals("super_admin") || normalized.equals("coordinator") || normalized.equals("moderator")) {
            return Collections.unmodifiableSet(ROLE_PERMISSIONS.get("admin"));
        }
        Set<String> perms = ROLE_PERMISSIONS.get(normalized);
        return perms != null ? Collections.unmodifiableSet(perms) : Collections.emptySet();
    }

    public static boolean hasPermission(String role, String permission) {
        if (role == null || permission == null) return false;
        Set<String> perms = ROLE_PERMISSIONS.get(role.trim().toLowerCase());
        return perms != null && perms.contains(permission);
    }

    public static boolean hasAnyPermission(String role, String... permissions) {
        if (role == null || permissions == null) return false;
        Set<String> perms = ROLE_PERMISSIONS.get(role.trim().toLowerCase());
        if (perms == null) return false;
        for (String p : permissions) {
            if (perms.contains(p)) return true;
        }
        return false;
    }
}
