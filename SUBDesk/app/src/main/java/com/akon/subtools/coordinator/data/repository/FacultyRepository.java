package com.akon.subtools.coordinator.data.repository;

import com.akon.subtools.coordinator.data.model.Faculty;
import com.akon.subtools.coordinator.utils.AppCache;
import com.akon.subtools.coordinator.utils.DepartmentUtils;
import com.akon.subtools.coordinator.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class FacultyRepository {

    public interface DataCallback<T> {
        void onSuccess(T data);
        void onError(String errorMessage);
    }

    private static final String CACHE_KEY = "faculty_all";

    public FacultyRepository() {}

    public void getDepartmentFaculty(String department, DataCallback<List<Faculty>> callback) {
        getDepartmentFaculty(department, false, callback);
    }

    public void getDepartmentFaculty(String department, boolean forceRefresh, DataCallback<List<Faculty>> callback) {
        java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<List<Faculty>>(){}.getType();
        if (!forceRefresh) {
            List<Faculty> cached = AppCache.get(CACHE_KEY, type);
            if (cached != null && !cached.isEmpty()) {
                callback.onSuccess(filterByDepartment(cached, department));
                return;
            }
        } else {
            AppCache.invalidate(CACHE_KEY);
        }

        // Fetch all faculty members from the Supabase 'faculty' table
        SupabaseAuthBridge.queryTable("faculty", "select=*&order=name.asc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                Map<String, Faculty> facultyMap = new HashMap<>();
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject doc = arr.getJSONObject(i);
                        Faculty faculty = Faculty.fromJson(doc);
                        if (faculty != null) {
                            cleanFacultyFields(faculty);
                            String key = faculty.getEmail() != null && !faculty.getEmail().isEmpty()
                                    ? faculty.getEmail().toLowerCase() : faculty.getId();
                            facultyMap.put(key, faculty);
                        }
                    }

                    // Also check 'users' table for additional faculty entries (roles: faculty, teacher, lecturer, professor)
                    SupabaseAuthBridge.queryTable("users", "select=*&role=in.(faculty,teacher,lecturer,professor)", new SupabaseAuthBridge.SupabaseCallback() {
                        @Override
                        public void onSuccess(String usersResponse) {
                            try {
                                JSONArray userArr = new JSONArray(usersResponse);
                                for (int j = 0; j < userArr.length(); j++) {
                                    JSONObject uDoc = userArr.getJSONObject(j);
                                    String email = uDoc.optString("email", "");
                                    String id = uDoc.optString("id", "");
                                    String key = !email.isEmpty() ? email.toLowerCase() : id;

                                    if (!facultyMap.containsKey(key)) {
                                        Faculty f = new Faculty();
                                        f.setId(id);
                                        f.setName(uDoc.optString("name", uDoc.optString("full_name", "")));
                                        f.setEmail(email);
                                        f.setPhone(uDoc.optString("phone", ""));
                                        f.setDepartment(uDoc.optString("department", ""));
                                        f.setDesignation(uDoc.optString("designation", "Faculty"));
                                        cleanFacultyFields(f);
                                        facultyMap.put(key, f);
                                    }
                                }
                            } catch (Exception ignored) {}

                            List<Faculty> result = new ArrayList<>(facultyMap.values());
                            AppCache.put(CACHE_KEY, result, AppCache.TTL_LONG);
                            callback.onSuccess(filterByDepartment(result, department));
                        }

                        @Override
                        public void onError(String error) {
                            List<Faculty> result = new ArrayList<>(facultyMap.values());
                            AppCache.put(CACHE_KEY, result, AppCache.TTL_MEDIUM);
                            callback.onSuccess(filterByDepartment(result, department));
                        }
                    });

                } catch (Exception e) {
                    callback.onError("Failed to parse faculty: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to fetch faculty: " + errorMessage);
            }
        });
    }

    public void getFacultyMembers(String department, DataCallback<List<Faculty>> callback) {
        getDepartmentFaculty(department, callback);
    }

    private void cleanFacultyFields(Faculty faculty) {
        if (faculty.getPhone() == null || faculty.getPhone().trim().isEmpty() ||
            faculty.getPhone().equalsIgnoreCase("N/A") || faculty.getPhone().equalsIgnoreCase("null")) {
            faculty.setPhone("");
        } else {
            faculty.setPhone(faculty.getPhone().trim());
        }

        if (faculty.getEmail() == null || faculty.getEmail().equalsIgnoreCase("N/A")) {
            faculty.setEmail("");
        }

        if (faculty.getRoomNo() == null || faculty.getRoomNo().equalsIgnoreCase("N/A")) {
            faculty.setRoomNo("");
        }
    }

    public void createFaculty(Faculty faculty, DataCallback<Void> callback) {
        if (faculty.getId() == null || faculty.getId().isEmpty()) {
            faculty.setId(UUID.randomUUID().toString());
        }
        JSONObject payload = faculty.toSupabaseJson();
        SupabaseAuthBridge.insertRecord("faculty", payload, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                AppCache.invalidate(CACHE_KEY);
                callback.onSuccess(null);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to create faculty: " + errorMessage);
            }
        });
    }

    public void updateFaculty(Faculty faculty, DataCallback<Void> callback) {
        if (faculty.getId() == null || faculty.getId().trim().isEmpty()) {
            callback.onError("Invalid faculty ID for update.");
            return;
        }
        JSONObject payload = faculty.toSupabaseJson();
        SupabaseAuthBridge.insertRecord("faculty", payload, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                AppCache.invalidate(CACHE_KEY);
                callback.onSuccess(null);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to update faculty: " + errorMessage);
            }
        });
    }

    public void deleteFaculty(String facultyId, DataCallback<Void> callback) {
        if (facultyId == null || facultyId.trim().isEmpty()) {
            callback.onError("Invalid faculty ID for deletion.");
            return;
        }

        try {
            String filter = "id=eq." + URLEncoder.encode(facultyId, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.deleteRecord("faculty", filter, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidate(CACHE_KEY);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to delete faculty: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error deleting faculty: " + e.getMessage());
        }
    }

    private List<Faculty> filterByDepartment(List<Faculty> list, String department) {
        if (DepartmentUtils.isAllDepartments(department)) return list;
        String filterCode = DepartmentUtils.getDepartmentCode(department);
        List<Faculty> filtered = new ArrayList<>();
        for (Faculty f : list) {
            String fCode = DepartmentUtils.getDepartmentCode(f.getDepartment());
            if (filterCode.equalsIgnoreCase(fCode) || fCode.isEmpty() || "ALL".equalsIgnoreCase(fCode)) {
                filtered.add(f);
            }
        }
        return filtered;
    }
}
