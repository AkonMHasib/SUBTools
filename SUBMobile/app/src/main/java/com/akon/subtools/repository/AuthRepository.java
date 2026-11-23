package com.akon.subtools.repository;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.akon.subtools.database.AppDatabase;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

public class AuthRepository {
    private final Context context;
    private final AppDatabase database;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public AuthRepository(Context context) {
        this.context = context.getApplicationContext();
        this.database = AppDatabase.getDatabase(this.context);
    }

    public interface AuthCallback<T> {
        void onSuccess(T result);
        void onFailure(Exception e);
    }

    public void login(String loginInput, String password, AuthCallback<User> callback) {
        if (loginInput == null || loginInput.trim().isEmpty()) {
            callback.onFailure(new Exception("Login identifier cannot be empty"));
            return;
        }

        String identifier = loginInput.trim();

        if (!SupabaseAuthBridge.isConfigured()) {
            callback.onFailure(new Exception("Supabase authentication is not configured."));
            return;
        }

        SupabaseAuthBridge.authenticateDirect(identifier, password, new SupabaseAuthBridge.DirectAuthCallback() {
            @Override
            public void onSuccess(String accessToken, String uid, String email, JSONObject appMetadata, JSONObject userMetadata) {
                fetchUserProfile(uid, email, userMetadata, callback);
            }

            @Override
            public void onFailure(String errorMessage) {
                callback.onFailure(new Exception(errorMessage));
            }
        });
    }

    public void signup(User user, String password, AuthCallback<User> callback) {
        if (user == null || user.getEmail() == null || password == null) {
            callback.onFailure(new Exception("Invalid signup data"));
            return;
        }

        if (!SupabaseAuthBridge.isConfigured()) {
            callback.onFailure(new Exception("Supabase is not configured"));
            return;
        }

        Executors.newSingleThreadExecutor().execute(() -> {
            String studentId = user.getStudentId() != null ? user.getStudentId().trim().toUpperCase() : "";
            String email = user.getEmail().trim().toLowerCase();

            // Check student ID
            if (!studentId.isEmpty()) {
                JSONArray existingId = SupabaseAuthBridge.queryTable("users", "student_id=eq." + studentId);
                if (existingId != null && existingId.length() > 0) {
                    mainHandler.post(() -> callback.onFailure(new Exception("Student ID is already registered.")));
                    return;
                }
            }

            // Check email
            JSONArray existingEmail = SupabaseAuthBridge.queryTable("users", "email=eq." + email);
            if (existingEmail != null && existingEmail.length() > 0) {
                mainHandler.post(() -> callback.onFailure(new Exception("University Email is already registered.")));
                return;
            }

            // Direct Supabase GoTrue Signup
            SupabaseAuthBridge.signUpDirect(email, password, user.toSupabaseJson(), new SupabaseAuthBridge.DirectAuthCallback() {
                @Override
                public void onSuccess(String accessToken, String uid, String resolvedEmail, JSONObject appMetadata, JSONObject userMetadata) {
                    user.setUid(uid);
                    AppDatabase.databaseWriteExecutor.execute(() -> {
                        database.userDao().insertUser(user);
                    });
                    mainHandler.post(() -> callback.onSuccess(user));
                }

                @Override
                public void onFailure(String errorMessage) {
                    mainHandler.post(() -> callback.onFailure(new Exception(errorMessage)));
                }
            });
        });
    }

    public void resendVerificationEmail(String uid, AuthCallback<Void> callback) {
        if (!SupabaseAuthBridge.isConfigured()) {
            callback.onFailure(new Exception("Supabase is not configured"));
            return;
        }

        AppDatabase.databaseWriteExecutor.execute(() -> {
            User user = database.userDao().getUserById(uid);
            if (user == null) user = database.userDao().getUser();
            if (user != null && user.getEmail() != null && !user.getEmail().isEmpty()) {
                long lastSent = user.getVerificationEmailSentAt();
                long now = System.currentTimeMillis();
                long oneDayMs = 24 * 60 * 60 * 1000L;

                if (now - lastSent < oneDayMs) {
                    long hoursLeft = (oneDayMs - (now - lastSent)) / (60 * 60 * 1000L);
                    mainHandler.post(() ->
                        callback.onFailure(new Exception("Verification email already sent. Please wait " + hoursLeft + " hours before requesting a resend.")));
                    return;
                }

                final User finalUser = user;
                SupabaseAuthBridge.sendPasswordReset(user.getEmail(), new SupabaseAuthBridge.SupabaseCallback() {
                    @Override
                    public void onSuccess(String responseBody) {
                        finalUser.setVerificationEmailSentAt(now);
                        AppDatabase.databaseWriteExecutor.execute(() -> database.userDao().insertUser(finalUser));
                        JSONObject patch = new JSONObject();
                        try {
                            patch.put("verification_email_sent_at", now);
                            patch.put("verificationEmailSentAt", now);
                        } catch (Exception ignored) {}
                        SupabaseAuthBridge.updateRecord("users", "id=eq." + uid, patch, null);
                        mainHandler.post(() -> callback.onSuccess(null));
                    }

                    @Override
                    public void onError(String error) {
                        mainHandler.post(() -> callback.onFailure(new Exception(error)));
                    }
                });
            } else {
                mainHandler.post(() -> callback.onFailure(new Exception("User profile not found.")));
            }
        });
    }

    public void forgotPassword(String email, AuthCallback<Void> callback) {
        if (!SupabaseAuthBridge.isConfigured()) {
            callback.onFailure(new Exception("Authentication provider unavailable"));
            return;
        }

        SupabaseAuthBridge.sendPasswordReset(email, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                mainHandler.post(() -> callback.onSuccess(null));
            }

            @Override
            public void onError(String error) {
                mainHandler.post(() -> callback.onFailure(new Exception(error)));
            }
        });
    }

    public void logout() {
        SupabaseAuthBridge.setCachedAccessToken(null);
        AppDatabase.clearCachedLocalUser();
        try {
            new com.akon.subtools.utils.CacheManager(context).clearAll();
        } catch (Exception ignored) {}
        AppDatabase.databaseWriteExecutor.execute(() -> {
            database.userDao().clearUser();
            database.routineDao().clearRoutines();
            database.noticeDao().clearNotices();
            database.busDao().clearBuses();
            database.routeDao().clearRoutes();
            database.subjectDao().clearSubjects();
        });
    }

    public void fetchUserProfile(String uid, AuthCallback<User> callback) {
        fetchUserProfile(uid, null, null, callback);
    }

    public void fetchUserProfile(String uid, String email, AuthCallback<User> callback) {
        fetchUserProfile(uid, email, null, callback);
    }

    public void fetchUserProfile(String uid, String email, JSONObject userMetadata, AuthCallback<User> callback) {
        if (!SupabaseAuthBridge.isConfigured()) {
            callback.onFailure(new Exception("Supabase is not configured"));
            return;
        }

        // Primary: Fetch authenticated user directly from Supabase GoTrue Auth (/auth/v1/user)
        SupabaseAuthBridge.fetchAuthUser(new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                try {
                    JSONObject authUserObj = new JSONObject(responseBody);
                    User user = User.fromJson(authUserObj);
                    if (user != null) {
                        if (uid != null && !uid.trim().isEmpty() && (user.getUid() == null || user.getUid().isEmpty())) {
                            user.setUid(uid);
                        }
                        if (userMetadata != null && (user.getPhotoURL() == null || user.getPhotoURL().trim().isEmpty())) {
                            String metaPhoto = User.extractPhotoUrl(userMetadata, null);
                            if (!metaPhoto.isEmpty()) {
                                user.setPhotoURL(metaPhoto);
                            }
                        }

                        // If subjects or completed subjects are empty, enrich from public.users view
                        if (user.getSubjects() == null || user.getSubjects().isEmpty()) {
                            enrichUserFromDatabase(user, uid, email, () -> parseAndValidateUserRoles(user, authUserObj, callback));
                            return;
                        }

                        parseAndValidateUserRoles(user, authUserObj, callback);
                        return;
                    }
                } catch (Exception ignored) {}

                enrichUserFromDatabase(null, uid, email, () -> fallbackToLocalUser(uid, email, callback));
            }

            @Override
            public void onError(String error) {
                enrichUserFromDatabase(null, uid, email, () -> fallbackToLocalUser(uid, email, callback));
            }
        });
    }

    private void enrichUserFromDatabase(User existingUser, String uid, String email, Runnable onComplete) {
        AppDatabase.databaseWriteExecutor.execute(() -> {
            try {
                String filter = null;
                if (uid != null && !uid.trim().isEmpty()) {
                    filter = "id=eq." + uid.trim();
                } else if (existingUser != null && existingUser.getUid() != null && !existingUser.getUid().trim().isEmpty()) {
                    filter = "id=eq." + existingUser.getUid().trim();
                } else if (email != null && !email.trim().isEmpty()) {
                    filter = "email=eq." + email.trim().toLowerCase();
                } else if (existingUser != null && existingUser.getEmail() != null && !existingUser.getEmail().trim().isEmpty()) {
                    filter = "email=eq." + existingUser.getEmail().trim().toLowerCase();
                }

                if (filter != null) {
                    JSONArray arr = SupabaseAuthBridge.queryTable("users", filter + "&select=*");
                    if (arr != null && arr.length() > 0) {
                        JSONObject row = arr.getJSONObject(0);
                        User dbUser = User.fromJson(row);
                        if (dbUser != null) {
                            if (existingUser != null) {
                                if ((existingUser.getSubjects() == null || existingUser.getSubjects().isEmpty()) && dbUser.getSubjects() != null && !dbUser.getSubjects().isEmpty()) {
                                    existingUser.setSubjects(dbUser.getSubjects());
                                }
                                if ((existingUser.getCompletedSubjects() == null || existingUser.getCompletedSubjects().isEmpty()) && dbUser.getCompletedSubjects() != null && !dbUser.getCompletedSubjects().isEmpty()) {
                                    existingUser.setCompletedSubjects(dbUser.getCompletedSubjects());
                                }
                                if (existingUser.getCompletedCredits() <= 0 && dbUser.getCompletedCredits() > 0) {
                                    existingUser.setCompletedCredits(dbUser.getCompletedCredits());
                                }
                                if ((existingUser.getStudentId() == null || existingUser.getStudentId().isEmpty()) && dbUser.getStudentId() != null) {
                                    existingUser.setStudentId(dbUser.getStudentId());
                                }
                                if ((existingUser.getDepartment() == null || existingUser.getDepartment().isEmpty()) && dbUser.getDepartment() != null) {
                                    existingUser.setDepartment(dbUser.getDepartment());
                                }
                            } else {
                                AppDatabase.setCachedLocalUser(dbUser);
                                try {
                                    new com.akon.subtools.utils.CacheManager(context).save("user_profile", dbUser);
                                } catch (Exception ignored) {}
                                database.userDao().insertUser(dbUser);
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
            onComplete.run();
        });
    }

    private void fallbackToLocalUser(String uid, String email, AuthCallback<User> callback) {
        AppDatabase.databaseWriteExecutor.execute(() -> {
            User user = null;
            if (uid != null && !uid.trim().isEmpty()) {
                user = database.userDao().getUserById(uid.trim());
            }
            if (user == null) {
                user = database.userDao().getUser();
            }
            if (user == null) {
                user = AppDatabase.getLocalUser(context);
            }

            final User finalUser = user;
            mainHandler.post(() -> {
                if (finalUser != null) {
                    callback.onSuccess(finalUser);
                } else {
                    callback.onFailure(new Exception("User profile could not be loaded from Supabase Auth."));
                }
            });
        });
    }

    private void parseAndValidateUserRoles(User user, JSONObject doc, AuthCallback<User> callback) {
        List<String> rolesList = new ArrayList<>(user.getRoles() != null ? user.getRoles() : new ArrayList<>());

        if (doc != null) {
            Object rRaw = doc.opt("roles");
            if (rRaw == null && doc.has("raw_app_meta_data")) {
                rRaw = doc.optJSONObject("raw_app_meta_data").opt("roles");
            }
            if (rRaw == null && doc.has("app_metadata")) {
                rRaw = doc.optJSONObject("app_metadata").opt("roles");
            }

            if (rRaw instanceof JSONArray) {
                JSONArray rArr = (JSONArray) rRaw;
                for (int i = 0; i < rArr.length(); i++) {
                    String clean = rArr.optString(i, "").trim().toLowerCase();
                    if (!clean.isEmpty() && !rolesList.contains(clean)) rolesList.add(clean);
                }
            } else if (rRaw instanceof String) {
                String s = ((String) rRaw).replace("{", "").replace("}", "").replace("[", "").replace("]", "").replace("\"", "");
                for (String part : s.split(",")) {
                    String clean = part.trim().toLowerCase();
                    if (!clean.isEmpty() && !rolesList.contains(clean)) rolesList.add(clean);
                }
            }
        }

        String userRole = user.getRole();
        if (userRole != null && !userRole.trim().isEmpty()) {
            for (String rPart : userRole.split(",")) {
                String clean = rPart.trim().toLowerCase();
                if (!clean.isEmpty() && !rolesList.contains(clean)) {
                    rolesList.add(clean);
                }
            }
        }

        if (rolesList.isEmpty()) {
            rolesList.add("student");
        }
        user.setRoles(rolesList);

        String status = user.getStatus();
        if (status != null) {
            String s = status.trim().toLowerCase();
            if (s.equals("banned") || s.equals("blocked") || s.equals("suspended") || s.equals("disabled")) {
                mainHandler.post(() -> callback.onFailure(new Exception("Your account is restricted or suspended. Please contact administrator.")));
                return;
            }
        }

        if (!user.hasStudentRole() && !user.hasAdminRole()) {
            user.setRole("student");
        }
        checkAndApplyAcademicCalendar(user, callback);
    }

    private void checkAndApplyAcademicCalendar(User user, AuthCallback<User> callback) {
        boolean modified = com.akon.subtools.utils.AcademicHelper.checkAndApplyProgression(user);
        if (modified) {
            JSONObject patch = new JSONObject();
            try {
                if (user.getSemester() != null && !user.getSemester().isEmpty()) {
                    patch.put("semester", user.getSemester());
                }
                if (user.getTrimester() != null && !user.getTrimester().isEmpty()) {
                    patch.put("trimester", user.getTrimester());
                }
                if (user.getAcademicLevel() != null && !user.getAcademicLevel().isEmpty()) {
                    patch.put("academic_level", user.getAcademicLevel());
                    patch.put("academicLevel", user.getAcademicLevel());
                    patch.put("term", user.getAcademicLevel());
                }
                if (user.getBatchStatus() != null && !user.getBatchStatus().isEmpty()) {
                    patch.put("batch_status", user.getBatchStatus());
                    patch.put("batchStatus", user.getBatchStatus());
                }
            } catch (Exception ignored) {}

            SupabaseAuthBridge.updateUserAuthMetadata(patch, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String responseBody) {
                    AppDatabase.setCachedLocalUser(user);
                    try {
                        new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                    } catch (Exception ignored) {}
                    AppDatabase.databaseWriteExecutor.execute(() -> database.userDao().insertUser(user));
                    mainHandler.post(() -> callback.onSuccess(user));
                }

                @Override
                public void onError(String error) {
                    AppDatabase.setCachedLocalUser(user);
                    try {
                        new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                    } catch (Exception ignored) {}
                    AppDatabase.databaseWriteExecutor.execute(() -> database.userDao().insertUser(user));
                    mainHandler.post(() -> callback.onSuccess(user));
                }
            });
        } else {
            AppDatabase.setCachedLocalUser(user);
            try {
                new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
            } catch (Exception ignored) {}
            AppDatabase.databaseWriteExecutor.execute(() -> {
                database.userDao().insertUser(user);
            });
            mainHandler.post(() -> callback.onSuccess(user));
        }
    }

    // Local DB Helpers
    public void getCachedUser(String uid, AuthCallback<User> callback) {
        AppDatabase.databaseWriteExecutor.execute(() -> {
            User cachedUser = database.userDao().getUserById(uid);
            mainHandler.post(() -> {
                if (callback != null) callback.onSuccess(cachedUser);
            });
        });
    }

    public void getActiveLocalUser(AuthCallback<User> callback) {
        AppDatabase.databaseWriteExecutor.execute(() -> {
            User user = database.userDao().getUser();
            if (user == null || user.getUid() == null || user.getUid().trim().isEmpty()) {
                user = AppDatabase.getLocalUser(context);
                if (user != null && user.getUid() != null && !user.getUid().trim().isEmpty()) {
                    try {
                        database.userDao().insertUser(user);
                    } catch (Exception ignored) {}
                }
            }
            final User finalUser = user;
            mainHandler.post(() -> {
                if (callback != null) callback.onSuccess(finalUser);
            });
        });
    }

    public String getCurrentUserId() {
        User user = AppDatabase.getLocalUser(context);
        return user != null ? user.getUid() : null;
    }
}
