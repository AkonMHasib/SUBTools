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

public class StudentRepository {

    public interface DataCallback<T> {
        void onSuccess(T data);
        void onError(String errorMessage);
    }

    private static final String CACHE_PREFIX = "students_";

    public StudentRepository() {}

    public void getDepartmentStudents(String department, DataCallback<List<User>> callback) {
        getDepartmentStudents(department, false, callback);
    }

    public void getDepartmentStudents(String department, boolean forceRefresh, DataCallback<List<User>> callback) {
        boolean isAll = DepartmentUtils.isAllDepartments(department);
        String deptCode = isAll ? "ALL" : DepartmentUtils.getDepartmentCode(department);
        String cacheKey = CACHE_PREFIX + "dept_" + deptCode;
        java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<List<User>>(){}.getType();
        if (!forceRefresh) {
            List<User> cached = AppCache.get(cacheKey, type);
            if (cached != null && !cached.isEmpty()) {
                callback.onSuccess(cached);
                return;
            }
        } else {
            AppCache.invalidate(cacheKey);
        }

        String query = "select=*&order=full_name.asc";

        SupabaseAuthBridge.queryTable("users", query, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                List<User> students = new ArrayList<>();
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject doc = arr.getJSONObject(i);
                        User user = User.fromJson(doc);
                        if (user != null) {
                            // Filter out staff/coordinators if role is non-student
                            if (user.getRole() == null || "student".equalsIgnoreCase(user.getRole()) || user.getRole().isEmpty()) {
                                if (isAll) {
                                    students.add(user);
                                } else {
                                    String uDeptCode = DepartmentUtils.getDepartmentCode(user.getDepartment());
                                    if (deptCode.equalsIgnoreCase(uDeptCode)) {
                                        students.add(user);
                                    }
                                }
                            }
                        }
                    }
                    AppCache.put(cacheKey, students, AppCache.TTL_MEDIUM);
                    callback.onSuccess(students);
                } catch (Exception e) {
                    callback.onError("Failed to parse students: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to load students from Supabase: " + errorMessage);
            }
        });
    }

    public void updateStudentProfile(String uid, String dob, String city, String area, String phone, String bloodGroup, boolean allowDonation, DataCallback<Void> callback) {
        try {
            JSONObject updates = new JSONObject();
            updates.put("dob", dob);
            updates.put("city", city);
            updates.put("area", area);
            updates.put("location", area + ", " + city);
            updates.put("phone", phone);
            updates.put("blood_group", bloodGroup);
            updates.put("bloodGroup", bloodGroup);
            updates.put("allow_blood_donation", allowDonation);
            updates.put("allowBloodDonation", allowDonation);

            String filter = "id=eq." + URLEncoder.encode(uid, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.updateRecord("users", filter, updates, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidatePrefix(CACHE_PREFIX);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to update student profile: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error preparing update: " + e.getMessage());
        }
    }

    public void updateStudentStatus(String uid, String status, DataCallback<Void> callback) {
        try {
            JSONObject updates = new JSONObject();
            updates.put("status", status);

            String filter = "id=eq." + URLEncoder.encode(uid, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.updateRecord("users", filter, updates, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidatePrefix(CACHE_PREFIX);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to update status: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error preparing update: " + e.getMessage());
        }
    }

    public void toggleStudentVerification(String uid, boolean isVerified, DataCallback<Void> callback) {
        try {
            JSONObject updates = new JSONObject();
            updates.put("manually_verified", isVerified);
            updates.put("manuallyVerified", isVerified);
            updates.put("email_verified", isVerified);
            updates.put("emailVerified", isVerified);

            String filter = "id=eq." + URLEncoder.encode(uid, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.updateRecord("users", filter, updates, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidatePrefix(CACHE_PREFIX);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to update verification status: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error preparing update: " + e.getMessage());
        }
    }
}
