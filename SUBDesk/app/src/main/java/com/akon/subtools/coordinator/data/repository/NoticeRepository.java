package com.akon.subtools.coordinator.data.repository;

import com.akon.subtools.coordinator.data.model.Notice;
import com.akon.subtools.coordinator.utils.AppCache;
import com.akon.subtools.coordinator.utils.DateUtils;
import com.akon.subtools.coordinator.utils.DepartmentUtils;
import com.akon.subtools.coordinator.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class NoticeRepository {

    public interface DataCallback<T> {
        void onSuccess(T data);
        void onError(String errorMessage);
    }

    private static final String CACHE_PREFIX = "notices_";
    private static final String CACHE_KEY_ALL = "notices_all";
    private static final String CACHE_KEY_SCHEDULED = "notices_scheduled";

    public NoticeRepository() {}

    public void getNotices(String department, DataCallback<List<Notice>> callback) {
        getNotices(department, false, callback);
    }

    public void getNotices(String department, boolean forceRefresh, DataCallback<List<Notice>> callback) {
        String deptCode = DepartmentUtils.getDepartmentCode(department);
        String cacheKey = CACHE_PREFIX + deptCode;
        java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<List<Notice>>(){}.getType();

        if (!forceRefresh) {
            List<Notice> cached = AppCache.get(cacheKey, type);
            if (cached != null && !cached.isEmpty()) {
                callback.onSuccess(cached);
                return;
            }
        } else {
            AppCache.invalidate(cacheKey);
        }

        SupabaseAuthBridge.queryTable("notices", "select=*&order=created_at.desc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                List<Notice> notices = new ArrayList<>();
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.getJSONObject(i);
                        Notice notice = Notice.fromJson(obj);
                        if (notice == null) continue;

                        String docDept = notice.getDepartment();
                        if (docDept == null || docDept.trim().isEmpty()) {
                            docDept = notice.getTargetDept();
                        }

                        String docCode = docDept != null && !docDept.trim().isEmpty() ? DepartmentUtils.getDepartmentCode(docDept) : "ALL";
                        boolean isGeneral = docDept == null || docDept.trim().isEmpty()
                                || "ALL".equalsIgnoreCase(docCode)
                                || "GENERAL".equalsIgnoreCase(docCode)
                                || "GLOBAL".equalsIgnoreCase(docCode)
                                || "UNIVERSITY".equalsIgnoreCase(docCode)
                                || "ALL DEPARTMENTS".equalsIgnoreCase(docDept.trim());

                        boolean matches = isGeneral || (deptCode != null && deptCode.equalsIgnoreCase(docCode));
                        if (matches) {
                            notices.add(notice);
                        }
                    }
                    AppCache.put(cacheKey, notices, AppCache.TTL_MEDIUM);
                    callback.onSuccess(notices);
                } catch (Exception e) {
                    callback.onError("Failed to parse notices: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to fetch notices: " + errorMessage);
            }
        });
    }

    public void getAllNotices(DataCallback<List<Notice>> callback) {
        getAllNotices(false, callback);
    }

    public void getAllNotices(boolean forceRefresh, DataCallback<List<Notice>> callback) {
        java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<List<Notice>>(){}.getType();
        if (!forceRefresh) {
            List<Notice> cached = AppCache.get(CACHE_KEY_ALL, type);
            if (cached != null && !cached.isEmpty()) {
                callback.onSuccess(cached);
                return;
            }
        } else {
            AppCache.invalidate(CACHE_KEY_ALL);
        }

        SupabaseAuthBridge.queryTable("notices", "select=*&order=created_at.desc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                List<Notice> notices = new ArrayList<>();
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.getJSONObject(i);
                        Notice notice = Notice.fromJson(obj);
                        if (notice != null) {
                            notices.add(notice);
                        }
                    }
                    AppCache.put(CACHE_KEY_ALL, notices, AppCache.TTL_MEDIUM);
                    callback.onSuccess(notices);
                } catch (Exception e) {
                    callback.onError("Failed to parse notices: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to fetch all notices: " + errorMessage);
            }
        });
    }

    public void getScheduledNotices(DataCallback<List<Notice>> callback) {
        java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<List<Notice>>(){}.getType();
        List<Notice> cached = AppCache.get(CACHE_KEY_SCHEDULED, type);
        if (cached != null && !cached.isEmpty()) {
            callback.onSuccess(cached);
            return;
        }

        SupabaseAuthBridge.queryTable("notices", "select=*&status=eq.scheduled&order=created_at.desc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                List<Notice> notices = new ArrayList<>();
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.getJSONObject(i);
                        Notice notice = Notice.fromJson(obj);
                        if (notice != null) {
                            notices.add(notice);
                        }
                    }
                    AppCache.put(CACHE_KEY_SCHEDULED, notices, AppCache.TTL_SHORT);
                    callback.onSuccess(notices);
                } catch (Exception e) {
                    callback.onError("Failed to parse scheduled notices: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to fetch scheduled notices: " + errorMessage);
            }
        });
    }

    public void createNotice(Notice notice, DataCallback<Void> callback) {
        if (notice.getId() == null || notice.getId().isEmpty()) {
            notice.setId(UUID.randomUUID().toString());
        }
        notice.setDepartment(DepartmentUtils.getDepartmentCode(notice.getDepartment()));
        notice.setTargetDept(notice.getDepartment());
        if (notice.getStatus() == null || notice.getStatus().isEmpty()) {
            notice.setStatus("live");
        }
        if (notice.getPublishDate() == null || notice.getPublishDate().isEmpty()) {
            notice.setPublishDate(DateUtils.getCurrentDateString());
        }

        JSONObject payload = notice.toSupabaseJson();
        SupabaseAuthBridge.insertRecord("notices", payload, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                AppCache.invalidatePrefix(CACHE_PREFIX);
                AppCache.invalidate(CACHE_KEY_ALL);
                callback.onSuccess(null);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to save notice: " + errorMessage);
            }
        });
    }

    public void publishScheduledNotice(Notice notice, DataCallback<Void> callback) {
        notice.setStatus("live");
        createNotice(notice, callback);
    }

    public void deleteScheduledNotice(String noticeId, DataCallback<Void> callback) {
        deleteNotice(noticeId, callback);
    }

    public void updateNotice(Notice notice, DataCallback<Void> callback) {
        if (notice.getId() == null || notice.getId().trim().isEmpty()) {
            callback.onError("Invalid notice ID for update.");
            return;
        }
        notice.setDepartment(DepartmentUtils.getDepartmentCode(notice.getDepartment()));
        JSONObject payload = notice.toSupabaseJson();

        SupabaseAuthBridge.insertRecord("notices", payload, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                AppCache.invalidatePrefix(CACHE_PREFIX);
                AppCache.invalidate(CACHE_KEY_ALL);
                callback.onSuccess(null);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to update notice: " + errorMessage);
            }
        });
    }

    public void setNoticeStatus(String noticeId, String newStatus, DataCallback<Void> callback) {
        if (noticeId == null || noticeId.trim().isEmpty()) {
            callback.onError("Invalid notice ID.");
            return;
        }

        try {
            JSONObject patch = new JSONObject();
            patch.put("status", newStatus);
            String filter = "id=eq." + URLEncoder.encode(noticeId, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.updateRecord("notices", filter, patch, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidatePrefix(CACHE_PREFIX);
                    AppCache.invalidate(CACHE_KEY_ALL);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to update notice status: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error preparing update: " + e.getMessage());
        }
    }

    public void deleteNotice(String noticeId, DataCallback<Void> callback) {
        if (noticeId == null || noticeId.trim().isEmpty()) {
            callback.onError("Invalid notice ID.");
            return;
        }

        try {
            String filter = "id=eq." + URLEncoder.encode(noticeId, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.deleteRecord("notices", filter, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidatePrefix(CACHE_PREFIX);
                    AppCache.invalidate(CACHE_KEY_ALL);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to delete notice: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error deleting notice: " + e.getMessage());
        }
    }
}
