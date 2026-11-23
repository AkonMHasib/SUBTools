package com.akon.subtools.coordinator.data.repository;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

public class SessionManager {
    private static final String PREF_NAME = "subtools_coordinator_session";
    private static final String KEY_IS_LOGGED_IN = "is_logged_in";
    private static final String KEY_UID = "uid";
    private static final String KEY_NAME = "name";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_DEPARTMENT = "department";
    private static final String KEY_ROLE = "role";
    private static final String KEY_ACTIVE_ROLE = "active_role";
    private static final String KEY_ROLES_CSV = "roles_csv";
    private static final String KEY_PHONE = "phone";
    private static final String KEY_STUDENT_ID = "student_id";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final String KEY_REFRESH_TOKEN = "refresh_token";

    private static volatile SharedPreferences sharedPrefsInstance;
    private final SharedPreferences prefs;

    public SessionManager(Context context) {
        if (sharedPrefsInstance == null) {
            synchronized (SessionManager.class) {
                if (sharedPrefsInstance == null) {
                    sharedPrefsInstance = initPreferences(context.getApplicationContext());
                }
            }
        }
        this.prefs = sharedPrefsInstance;
    }

    private static SharedPreferences initPreferences(Context context) {
        try {
            MasterKey masterKey = new MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();

            return EncryptedSharedPreferences.create(
                    context,
                    PREF_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception e) {
            // Fallback to standard shared preferences if EncryptedSharedPreferences unavailable
            return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        }
    }

    public void saveSession(String uid, String name, String email, String department, String role, String phone) {
        saveSession(uid, name, email, department, role, java.util.Collections.singletonList(role), role, phone);
    }

    public void saveSession(String uid, String name, String email, String department, String role, java.util.List<String> roles, String activeRole, String phone) {
        saveSession(uid, name, email, department, role, roles, activeRole, phone, null, null, null);
    }

    public void saveSession(String uid, String name, String email, String department, String role, java.util.List<String> roles, String activeRole, String phone, String accessToken, String refreshToken) {
        saveSession(uid, name, email, department, role, roles, activeRole, phone, null, accessToken, refreshToken);
    }

    public void saveSession(String uid, String name, String email, String department, String role, java.util.List<String> roles, String activeRole, String phone, String studentId, String accessToken, String refreshToken) {
        SharedPreferences.Editor editor = prefs.edit();
        editor.putBoolean(KEY_IS_LOGGED_IN, true);
        editor.putString(KEY_UID, uid);
        editor.putString(KEY_NAME, name);
        editor.putString(KEY_EMAIL, email);
        editor.putString(KEY_DEPARTMENT, department);
        editor.putString(KEY_ROLE, role);
        editor.putString(KEY_ACTIVE_ROLE, activeRole != null ? activeRole : role);
        editor.putString(KEY_ROLES_CSV, roles != null ? android.text.TextUtils.join(",", roles) : (role != null ? role : ""));
        editor.putString(KEY_PHONE, phone);
        if (studentId != null && !studentId.trim().isEmpty()) {
            editor.putString(KEY_STUDENT_ID, studentId.trim());
        }
        if (accessToken != null && !accessToken.trim().isEmpty()) {
            editor.putString(KEY_ACCESS_TOKEN, accessToken.trim());
            com.akon.subtools.coordinator.utils.SupabaseAuthBridge.setCachedAccessToken(accessToken.trim());
        }
        if (refreshToken != null && !refreshToken.trim().isEmpty()) {
            editor.putString(KEY_REFRESH_TOKEN, refreshToken.trim());
        }
        editor.apply();
    }

    public boolean isLoggedIn() {
        return prefs.getBoolean(KEY_IS_LOGGED_IN, false);
    }

    public String getUid() {
        return prefs.getString(KEY_UID, "");
    }

    public String getName() {
        String name = prefs.getString(KEY_NAME, "");
        if (name != null && !name.trim().isEmpty() && !"User".equalsIgnoreCase(name.trim()) && !"Coordinator".equalsIgnoreCase(name.trim())) {
            return name.trim();
        }
        String email = getEmail();
        if (email != null && email.contains("@")) {
            String prefix = email.split("@")[0].trim().replaceAll("\\.\\d+$", "").replaceAll("\\d+$", "").replaceAll("[._-]+", " ");
            if (!prefix.isEmpty()) {
                return formatTitleCase(prefix);
            }
        }
        return "Admin";
    }

    private String formatTitleCase(String text) {
        if (text == null || text.trim().isEmpty()) return "";
        String[] parts = text.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty()) {
                if ("arch".equalsIgnoreCase(p) || "cse".equalsIgnoreCase(p) || "eee".equalsIgnoreCase(p)) {
                    continue;
                }
                sb.append(Character.toUpperCase(p.charAt(0)))
                  .append(p.substring(1).toLowerCase())
                  .append(" ");
            }
        }
        String result = sb.toString().trim();
        return result.isEmpty() ? text.trim() : result;
    }
    public String getUserName() { return getName(); }

    public String getEmail() {
        return prefs.getString(KEY_EMAIL, "");
    }
    public String getUserEmail() { return getEmail(); }

    public String getDepartment() {
        String dept = prefs.getString(KEY_DEPARTMENT, "");
        if (dept == null || dept.trim().isEmpty() || "GENERAL".equalsIgnoreCase(dept.trim()) || "ALL".equalsIgnoreCase(dept.trim()) || "ALL DEPARTMENTS".equalsIgnoreCase(dept.trim())) {
            String email = getEmail();
            String inferred = com.akon.subtools.coordinator.utils.DepartmentUtils.inferDepartmentFromEmail(email);
            if (inferred != null && !inferred.isEmpty()) {
                prefs.edit().putString(KEY_DEPARTMENT, inferred).apply();
                return inferred;
            }
            return "CSE";
        }
        return dept.trim();
    }

    public void setDepartment(String department) {
        if (department != null && !department.trim().isEmpty()
                && !"GENERAL".equalsIgnoreCase(department.trim())
                && !"ALL".equalsIgnoreCase(department.trim())) {
            prefs.edit().putString(KEY_DEPARTMENT, department.trim()).apply();
        }
    }

    public String getRole() {
        return prefs.getString(KEY_ROLE, "admin");
    }

    public String getActiveRole() {
        return prefs.getString(KEY_ACTIVE_ROLE, getRole());
    }

    public void setActiveRole(String activeRole) {
        prefs.edit().putString(KEY_ACTIVE_ROLE, activeRole != null ? activeRole.trim().toLowerCase() : getRole()).apply();
    }

    public java.util.List<String> getRoles() {
        String csv = prefs.getString(KEY_ROLES_CSV, getRole());
        if (csv == null || csv.trim().isEmpty()) {
            return java.util.Collections.singletonList(getRole());
        }
        String[] parts = csv.split(",");
        java.util.List<String> list = new java.util.ArrayList<>();
        for (String p : parts) {
            if (p != null && !p.trim().isEmpty()) {
                list.add(p.trim().toLowerCase());
            }
        }
        return list.isEmpty() ? java.util.Collections.singletonList(getRole()) : list;
    }

    public java.util.List<String> getDistinctWorkspaceRoles() {
        java.util.List<String> workspaceRoles = new java.util.ArrayList<>();
        for (String role : getRoles()) {
            if (("admin".equalsIgnoreCase(role) || "super_admin".equalsIgnoreCase(role))
                    && !workspaceRoles.contains(role.toLowerCase())) {
                workspaceRoles.add(role.toLowerCase());
            }
        }
        return workspaceRoles;
    }

    public int getDistinctWorkspaceRoleCount() {
        return getDistinctWorkspaceRoles().size();
    }

    public boolean hasPermission(String permission) {
        return true;
    }

    public boolean isCoordinator() {
        return isAdmin();
    }

    public boolean isModerator() {
        return isAdmin();
    }

    public boolean isAdmin() {
        String role = getActiveRole();
        if ("admin".equalsIgnoreCase(role) || "super_admin".equalsIgnoreCase(role) 
                || "superadmin".equalsIgnoreCase(role) || "administrator".equalsIgnoreCase(role)) return true;
        for (String r : getRoles()) {
            if (r != null) {
                String clean = r.trim().toLowerCase();
                if ("admin".equals(clean) || "super_admin".equals(clean) 
                        || "superadmin".equals(clean) || "administrator".equals(clean) || "super admin".equals(clean)) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean isSuperAdmin() {
        String role = getActiveRole();
        if ("super_admin".equalsIgnoreCase(role) || "superadmin".equalsIgnoreCase(role)) return true;
        for (String r : getRoles()) {
            if (r != null) {
                String clean = r.trim().toLowerCase();
                if ("super_admin".equals(clean) || "superadmin".equals(clean) || "super admin".equals(clean)) {
                    return true;
                }
            }
        }
        return false;
    }

    public String getDisplayRoleName() {
        if (isSuperAdmin()) return "Super Admin";
        if (isAdmin()) return "Admin";
        return "Admin";
    }

    public String getPhone() {
        return prefs.getString(KEY_PHONE, "");
    }

    public String getStudentId() {
        return prefs.getString(KEY_STUDENT_ID, "");
    }

    public void setStudentId(String studentId) {
        prefs.edit().putString(KEY_STUDENT_ID, studentId != null ? studentId.trim() : "").apply();
    }

    public String getAccessToken() {
        return prefs.getString(KEY_ACCESS_TOKEN, "");
    }

    public String getRefreshToken() {
        return prefs.getString(KEY_REFRESH_TOKEN, "");
    }

    public void setTokens(String accessToken, String refreshToken) {
        SharedPreferences.Editor editor = prefs.edit();
        if (accessToken != null) editor.putString(KEY_ACCESS_TOKEN, accessToken);
        if (refreshToken != null) editor.putString(KEY_REFRESH_TOKEN, refreshToken);
        editor.apply();
        if (accessToken != null && !accessToken.trim().isEmpty()) {
            com.akon.subtools.coordinator.utils.SupabaseAuthBridge.setCachedAccessToken(accessToken.trim());
        }
    }

    public void clearSession() {
        SharedPreferences.Editor editor = prefs.edit();
        editor.clear();
        editor.apply();
        com.akon.subtools.coordinator.utils.SupabaseAuthBridge.setCachedAccessToken(null);
    }
}
