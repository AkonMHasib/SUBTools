package com.akon.subtools.coordinator.data.repository;

import com.akon.subtools.coordinator.data.model.Subject;
import com.akon.subtools.coordinator.utils.AppCache;
import com.akon.subtools.coordinator.utils.DepartmentUtils;
import com.akon.subtools.coordinator.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class SubjectRepository {

    public interface DataCallback<T> {
        void onSuccess(T data);
        void onError(String errorMessage);
    }

    private static final String CACHE_PREFIX = "subjects_";

    public SubjectRepository() {}

    public void getSubjectsForDepartment(String department, DataCallback<List<Subject>> callback) {
        getSubjectsForDepartment(department, false, callback);
    }

    public void getSubjectsForDepartment(String department, boolean forceRefresh, DataCallback<List<Subject>> callback) {
        if (DepartmentUtils.isAllDepartments(department)) {
            getAllSubjects(forceRefresh, callback);
            return;
        }

        String targetCode = DepartmentUtils.getDepartmentCode(department);

        getAllSubjects(forceRefresh, new DataCallback<List<Subject>>() {
            @Override
            public void onSuccess(List<Subject> allSubjects) {
                List<Subject> filtered = new ArrayList<>();
                if (allSubjects != null) {
                    for (Subject s : allSubjects) {
                        if (s != null) {
                            String sDept = s.getDepartment() != null ? s.getDepartment() : "";
                            String sCode = DepartmentUtils.getDepartmentCode(sDept);
                            if (targetCode.equalsIgnoreCase(sCode) || "ALL".equalsIgnoreCase(targetCode)) {
                                filtered.add(s);
                            }
                        }
                    }
                }
                callback.onSuccess(filtered);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError(errorMessage);
            }
        });
    }

    public void getAllSubjects(DataCallback<List<Subject>> callback) {
        getAllSubjects(false, callback);
    }

    public void getAllSubjects(boolean forceRefresh, DataCallback<List<Subject>> callback) {
        String cacheKey = CACHE_PREFIX + "all";
        java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<List<Subject>>(){}.getType();
        if (!forceRefresh) {
            List<Subject> cached = AppCache.get(cacheKey, type);
            if (cached != null && !cached.isEmpty()) {
                callback.onSuccess(cached);
                return;
            }
        } else {
            AppCache.invalidate(cacheKey);
        }

        SupabaseAuthBridge.queryTable("subjects", "select=*&order=code.asc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                List<Subject> subjects = new ArrayList<>();
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.getJSONObject(i);
                        Subject s = Subject.fromJson(obj);
                        if (s != null) {
                            subjects.add(s);
                        }
                    }
                    AppCache.put(cacheKey, subjects, AppCache.TTL_LONG);
                    callback.onSuccess(subjects);
                } catch (Exception e) {
                    callback.onError("Failed to parse subjects: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to fetch subjects: " + errorMessage);
            }
        });
    }

    public void addSubject(Subject subject, DataCallback<Void> callback) {
        if (subject == null) {
            callback.onError("Subject cannot be null");
            return;
        }

        JSONObject payload = subject.toSupabaseJson();
        SupabaseAuthBridge.insertRecord("subjects", payload, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                AppCache.invalidatePrefix(CACHE_PREFIX);
                callback.onSuccess(null);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to add subject: " + errorMessage);
            }
        });
    }

    public void updateSubject(Subject subject, DataCallback<Void> callback) {
        if (subject == null || subject.getCode() == null || subject.getCode().isEmpty()) {
            callback.onError("Invalid subject code for update.");
            return;
        }

        try {
            JSONObject payload = subject.toSupabaseJson();
            String filter = "id=eq." + URLEncoder.encode(subject.getCode().trim(), StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.updateRecord("subjects", filter, payload, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidatePrefix(CACHE_PREFIX);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to update subject: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error preparing subject update: " + e.getMessage());
        }
    }

    public void deleteSubject(String subjectCode, DataCallback<Void> callback) {
        if (subjectCode == null || subjectCode.isEmpty()) {
            callback.onError("Invalid subject code for deletion.");
            return;
        }

        try {
            String filter = "id=eq." + URLEncoder.encode(subjectCode, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.deleteRecord("subjects", filter, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidatePrefix(CACHE_PREFIX);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to delete subject: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error deleting subject: " + e.getMessage());
        }
    }
}
