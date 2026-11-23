package com.akon.subtools.coordinator.data.repository;

import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.utils.AppCache;
import com.akon.subtools.coordinator.utils.DepartmentUtils;
import com.akon.subtools.coordinator.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class AuthRepository {

    public interface AuthCallback {
        void onSuccess(User user);
        void onError(String errorMessage);
        void onRoleUnauthorized(String role);
    }

    private final SessionManager sessionManager;

    public AuthRepository(android.content.Context context) {
        this(new SessionManager(context));
    }

    public AuthRepository(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    public void login(String identifier, String password, AuthCallback callback) {
        if (identifier == null || identifier.trim().isEmpty()) {
            callback.onError("Please enter your email, phone number, or ID.");
            return;
        }

        String cleanIdentifier = identifier.trim();

        SupabaseAuthBridge.authenticateDirect(cleanIdentifier, password, new SupabaseAuthBridge.DirectAuthCallback() {
            @Override
            public void onSuccess(String accessToken, String refreshToken, String userId, String email, JSONObject appMetadata, JSONObject userMetadata) {
                hydrateUserSession(userId, email, appMetadata, userMetadata, accessToken, refreshToken, callback);
            }

            @Override
            public void onFailure(String errorMessage) {
                callback.onError(errorMessage);
            }
        });
    }

    public void hydrateUserSession(String uid, String email, JSONObject appMeta, JSONObject userMeta, AuthCallback callback) {
        hydrateUserSession(uid, email, appMeta, userMeta, null, null, callback);
    }

    public void hydrateUserSession(String uid, String email, JSONObject appMeta, JSONObject userMeta, String accessToken, String refreshToken, AuthCallback callback) {
        String query;
        try {
            query = "or=(id.eq." + URLEncoder.encode(uid, StandardCharsets.UTF_8.name()) + ",uid.eq." + URLEncoder.encode(uid, StandardCharsets.UTF_8.name()) + ")&select=*";
        } catch (Exception e) {
            query = "id=eq." + uid + "&select=*";
        }

        SupabaseAuthBridge.queryTable("users", query, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                JSONObject userDoc = null;
                try {
                    JSONArray arr = new JSONArray(response);
                    if (arr.length() > 0) {
                        userDoc = arr.getJSONObject(0);
                    }
                } catch (Exception ignored) {}

                if (userDoc == null && email != null && !email.trim().isEmpty()) {
                    try {
                        String emailQuery = "email=eq." + URLEncoder.encode(email.trim(), StandardCharsets.UTF_8.name()) + "&select=*";
                        SupabaseAuthBridge.queryTable("users", emailQuery, new SupabaseAuthBridge.SupabaseCallback() {
                            @Override
                            public void onSuccess(String emailResp) {
                                JSONObject docByEmail = null;
                                try {
                                    JSONArray eArr = new JSONArray(emailResp);
                                    if (eArr.length() > 0) docByEmail = eArr.getJSONObject(0);
                                } catch (Exception ignored) {}
                                processUserRecord(uid, email, docByEmail, appMeta, userMeta, accessToken, refreshToken, callback);
                            }

                            @Override
                            public void onError(String err) {
                                processUserRecord(uid, email, null, appMeta, userMeta, accessToken, refreshToken, callback);
                            }
                        });
                        return;
                    } catch (Exception ignored) {}
                }

                processUserRecord(uid, email, userDoc, appMeta, userMeta, accessToken, refreshToken, callback);
            }

            @Override
            public void onError(String errorMessage) {
                if (email != null && !email.trim().isEmpty()) {
                    try {
                        String emailQuery = "email=eq." + URLEncoder.encode(email.trim(), StandardCharsets.UTF_8.name()) + "&select=*";
                        SupabaseAuthBridge.queryTable("users", emailQuery, new SupabaseAuthBridge.SupabaseCallback() {
                            @Override
                            public void onSuccess(String emailResp) {
                                JSONObject userDoc = null;
                                try {
                                    JSONArray arr = new JSONArray(emailResp);
                                    if (arr.length() > 0) {
                                        userDoc = arr.getJSONObject(0);
                                    }
                                } catch (Exception ignored) {}
                                processUserRecord(uid, email, userDoc, appMeta, userMeta, accessToken, refreshToken, callback);
                            }

                            @Override
                            public void onError(String err) {
                                processUserRecord(uid, email, null, appMeta, userMeta, accessToken, refreshToken, callback);
                            }
                        });
                        return;
                    } catch (Exception ignored) {}
                }
                processUserRecord(uid, email, null, appMeta, userMeta, accessToken, refreshToken, callback);
            }
        });
    }

    private void processUserRecord(String uid, String email, JSONObject userDoc, JSONObject appMeta, JSONObject userMeta, AuthCallback callback) {
        processUserRecord(uid, email, userDoc, appMeta, userMeta, null, null, callback);
    }

    private void processUserRecord(String uid, String email, JSONObject userDoc, JSONObject appMeta, JSONObject userMeta, String accessToken, String refreshToken, AuthCallback callback) {
        User user = new User();
        user.setUid(uid);

        String userEmail = email;
        String name = null;
        String dept = null;
        String phone = null;
        List<String> rolesList = new ArrayList<>();
        boolean isSuperAdmin = false;
        boolean isAdmin = false;

        String studentId = null;
        if (userDoc != null) {
            User parsed = User.fromJson(userDoc);
            if (parsed != null) {
                if (parsed.getEmail() != null && !parsed.getEmail().isEmpty()) userEmail = parsed.getEmail();
                if (parsed.getName() != null && !parsed.getName().isEmpty()) name = parsed.getName();
                if (parsed.getDepartment() != null && !parsed.getDepartment().isEmpty()) dept = parsed.getDepartment();
                if (parsed.getPhone() != null && !parsed.getPhone().isEmpty()) phone = parsed.getPhone();
                if (parsed.getStudentId() != null && !parsed.getStudentId().isEmpty()) studentId = parsed.getStudentId();
                if (parsed.getRoles() != null) {
                    collectRolesFromAny(parsed.getRoles(), rolesList);
                }
            }
            if (studentId == null || studentId.isEmpty()) {
                studentId = userDoc.optString("student_id", userDoc.optString("studentId", ""));
            }
            // Check top-level JSON fields
            collectRolesFromAny(userDoc, rolesList);

            if (userDoc.optBoolean("is_super_admin", userDoc.optBoolean("isSuperAdmin", false))) {
                isSuperAdmin = true;
            }
            if (userDoc.optBoolean("is_admin", userDoc.optBoolean("isAdmin", false))) {
                isAdmin = true;
            }
        }

        // Check app_metadata and user_metadata
        if (appMeta != null) {
            collectRolesFromAny(appMeta, rolesList);
            if (appMeta.optBoolean("is_super_admin", appMeta.optBoolean("isSuperAdmin", false))) isSuperAdmin = true;
            if (appMeta.optBoolean("is_admin", appMeta.optBoolean("isAdmin", appMeta.optBoolean("claims_admin", false)))) isAdmin = true;
        }

        if (userMeta != null) {
            if (name == null || name.isEmpty()) {
                name = userMeta.optString("full_name", userMeta.optString("name", ""));
            }
            if (phone == null || phone.isEmpty()) {
                phone = userMeta.optString("phone", "");
            }
            if (dept == null || dept.isEmpty()) {
                dept = userMeta.optString("department", "");
            }
            if (studentId == null || studentId.isEmpty()) {
                studentId = userMeta.optString("student_id", userMeta.optString("studentId", ""));
            }
            collectRolesFromAny(userMeta, rolesList);

            if (userMeta.optBoolean("is_super_admin", userMeta.optBoolean("isSuperAdmin", false))) {
                isSuperAdmin = true;
            }
            if (userMeta.optBoolean("is_admin", userMeta.optBoolean("isAdmin", false))) {
                isAdmin = true;
            }
        }

        // Also check if current session already has admin status (preserve during background sync)
        if (sessionManager.isLoggedIn() && sessionManager.isAdmin()) {
            isAdmin = true;
            collectRolesFromAny(sessionManager.getRoles(), rolesList);
        }

        // Canonical Super Admin check across SUBTools ecosystem
        if (userEmail != null && !userEmail.trim().isEmpty()) {
            String cleanEmail = userEmail.trim().toLowerCase();
            if (cleanEmail.equals("akonmhasib@gmail.com") || cleanEmail.equals("subtools.admin@gmail.com")
                    || cleanEmail.equals("hasiburrahman@gmail.com") || cleanEmail.equals("akonszone@gmail.com")) {
                isSuperAdmin = true;
                isAdmin = true;
                if (!rolesList.contains("super_admin")) rolesList.add("super_admin");
                if (!rolesList.contains("admin")) rolesList.add("admin");
            }
        }

        // Strictly verify: Only users with 'admin' role (or super_admin) can log in
        // Supports multi-role arrays (e.g. ['admin', 'student'] or ['student', 'admin'])
        boolean hasAdminRole = containsAdminRole(rolesList) || isAdmin || isSuperAdmin;
        if (hasAdminRole) {
            if (!rolesList.contains("admin")) rolesList.add("admin");
        }

        if (!hasAdminRole) {
            sessionManager.clearSession();
            String primaryRole = !rolesList.isEmpty() ? rolesList.get(0) : "student";
            callback.onRoleUnauthorized(primaryRole);
            callback.onError("Access Denied: Only users with 'admin' role are permitted to log in to SUBDesk.");
            return;
        }

        if (name == null || name.trim().isEmpty()) {
            if (userEmail != null && userEmail.contains("@")) {
                name = userEmail.split("@")[0];
            } else {
                name = "Admin";
            }
        }

        user.setName(name.trim());
        user.setEmail(userEmail != null ? userEmail.trim() : "");
        user.setPhone(phone != null ? phone.trim() : "");
        user.setStudentId(studentId != null ? studentId.trim() : "");
        user.setRoles(rolesList);

        boolean isSuper = isSuperAdmin || rolesList.contains("super_admin") || rolesList.contains("superadmin");
        String activeRole = isSuper ? "super_admin" : "admin";
        user.setActiveRole(activeRole);
        user.setRole(activeRole);

        if (dept == null || dept.trim().isEmpty()) {
            dept = "CSE";
        }
        user.setDepartment(DepartmentUtils.getDepartmentCode(dept));

        sessionManager.saveSession(
                user.getUid(),
                user.getName(),
                user.getEmail(),
                user.getDepartment(),
                user.getRole(),
                user.getRoles(),
                user.getActiveRole(),
                user.getPhone(),
                user.getStudentId(),
                accessToken,
                refreshToken
        );

        callback.onSuccess(user);
    }

    public static void collectRolesFromAny(Object source, List<String> target) {
        if (source == null || target == null) return;

        if (source instanceof JSONArray) {
            JSONArray arr = (JSONArray) source;
            for (int i = 0; i < arr.length(); i++) {
                Object item = arr.opt(i);
                if (item != null) addRoleItem(item.toString(), target);
            }
            return;
        }

        if (source instanceof Iterable) {
            for (Object item : (Iterable<?>) source) {
                if (item != null) addRoleItem(item.toString(), target);
            }
            return;
        }

        if (source instanceof String) {
            String str = ((String) source).trim();
            if (str.isEmpty() || "null".equalsIgnoreCase(str)) return;

            if (str.startsWith("[") && str.endsWith("]")) {
                try {
                    JSONArray arr = new JSONArray(str);
                    collectRolesFromAny(arr, target);
                    return;
                } catch (Exception ignored) {}
            }

            if (str.startsWith("{") && str.endsWith("}")) {
                str = str.substring(1, str.length() - 1);
            }

            String cleanCsv = str.replace("\"", "").replace("'", "");
            for (String p : cleanCsv.split(",")) {
                addRoleItem(p, target);
            }
            return;
        }

        if (source instanceof JSONObject) {
            JSONObject obj = (JSONObject) source;
            if (obj.has("roles")) collectRolesFromAny(obj.opt("roles"), target);
            if (obj.has("role")) collectRolesFromAny(obj.opt("role"), target);
            if (obj.has("data")) {
                JSONObject data = obj.optJSONObject("data");
                if (data != null) {
                    if (data.has("roles")) collectRolesFromAny(data.opt("roles"), target);
                    if (data.has("role")) collectRolesFromAny(data.opt("role"), target);
                }
            }
        }
    }

    private static void addRoleItem(String raw, List<String> target) {
        if (raw == null) return;
        String clean = raw.replace("\"", "").replace("'", "").replace("[", "").replace("]", "").trim().toLowerCase();
        if (!clean.isEmpty() && !target.contains(clean)) {
            target.add(clean);
        }
    }

    public static boolean containsAdminRole(List<String> roles) {
        if (roles == null) return false;
        for (String r : roles) {
            if (r == null) continue;
            String clean = r.trim().toLowerCase();
            if ("admin".equals(clean) || "super_admin".equals(clean) || "superadmin".equals(clean)
                    || "administrator".equals(clean) || "super admin".equals(clean)) {
                return true;
            }
        }
        return false;
    }

    public void logout() {
        sessionManager.clearSession();
        AppCache.clear();
    }

    public void syncUserProfile(android.content.Context context, Runnable onComplete) {
        if (!sessionManager.isLoggedIn() || sessionManager.getUid().isEmpty()) {
            if (onComplete != null) onComplete.run();
            return;
        }

        String uid = sessionManager.getUid();
        String email = sessionManager.getEmail();

        hydrateUserSession(uid, email, null, null, new AuthCallback() {
            @Override
            public void onSuccess(User user) {
                AppCache.clear();
                if (onComplete != null) onComplete.run();
            }

            @Override
            public void onError(String errorMessage) {
                if (onComplete != null) onComplete.run();
            }

            @Override
            public void onRoleUnauthorized(String role) {
                // If user was already logged in as admin, don't kick them out on a silent sync failure
                if (!sessionManager.isAdmin()) {
                    sessionManager.clearSession();
                }
                if (onComplete != null) onComplete.run();
            }
        });
    }
}
