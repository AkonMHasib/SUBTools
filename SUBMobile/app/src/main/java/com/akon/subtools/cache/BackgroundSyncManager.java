package com.akon.subtools.cache;

import android.content.Context;

import com.akon.subtools.models.Bus;
import com.akon.subtools.models.Faculty;
import com.akon.subtools.models.Notice;
import com.akon.subtools.models.Route;
import com.akon.subtools.models.Routine;
import com.akon.subtools.models.Subject;
import com.akon.subtools.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class BackgroundSyncManager {
    private static volatile BackgroundSyncManager INSTANCE;

    private final Context context;
    private final CacheManager cacheManager;
    private final RoomRepository roomRepository;

    private BackgroundSyncManager(Context context) {
        this.context = context.getApplicationContext();
        this.cacheManager = CacheManager.getInstance(this.context);
        this.roomRepository = RoomRepository.getInstance(this.context);
    }

    public static BackgroundSyncManager getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (BackgroundSyncManager.class) {
                if (INSTANCE == null) {
                    INSTANCE = new BackgroundSyncManager(context);
                }
            }
        }
        return INSTANCE;
    }

    public void syncExpiredCachesSilently() {
        // Guard: Skip background sync operations if maintenance mode is active
        SupabaseAuthBridge.checkMaintenanceMode((isMaintenance, message) -> {
            if (isMaintenance) {
                return; // Prevent background network calls during maintenance
            }
            syncNoticesIfExpired(false, null);
            syncRoutineIfExpired(false, null);
            syncFacultyIfExpired(null, false, null);
            syncSubjectsIfExpired(false, null);
            syncTransportIfExpired(false, null);
        });
    }

    public void syncNoticesIfExpired(boolean forceRefresh, Runnable onComplete) {
        String key = CacheValidator.KEY_NOTICES;
        cacheManager.checkCacheStatus(key, (status, metadata) -> {
            if (forceRefresh || status != CacheValidator.CacheStatus.VALID) {
                java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                    org.json.JSONArray sbArr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("notices", "select=*&order=created_at.desc");
                    if (sbArr != null && sbArr.length() > 0) {
                        List<Notice> notices = new ArrayList<>();
                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < sbArr.length(); i++) {
                            org.json.JSONObject obj = sbArr.optJSONObject(i);
                            Notice notice = Notice.fromJson(obj);
                            if (notice != null) {
                                notices.add(notice);
                                sb.append(notice.getId()).append(notice.getTitle())
                                  .append(notice.getDepartment() != null ? notice.getDepartment() : "");
                            }
                        }
                        String hash = RoomRepository.computeHash(sb.toString());
                        if (metadata == null || !hash.equals(metadata.getDataHash()) || forceRefresh) {
                            roomRepository.saveNotices(notices, () -> {
                                cacheManager.updateCacheMetadata(key, hash);
                                if (onComplete != null) onComplete.run();
                            });
                        } else {
                            cacheManager.updateCacheMetadata(key, hash);
                            if (onComplete != null) onComplete.run();
                        }
                    } else if (onComplete != null) {
                        onComplete.run();
                    }
                });
            } else if (onComplete != null) {
                onComplete.run();
            }
        });
    }

    public void syncRoutineIfExpired(boolean forceRefresh, Runnable onComplete) {
        String key = CacheValidator.KEY_ROUTINE;
        cacheManager.checkCacheStatus(key, (status, metadata) -> {
            if (forceRefresh || status != CacheValidator.CacheStatus.VALID) {
                CacheManager.logDebug("SILENT BACKGROUND REFRESH: " + key + " (Status: " + status + ")");
                java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                    org.json.JSONArray sbArr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("routines", "select=*");
                    if (sbArr != null && sbArr.length() > 0) {
                        List<Routine> list = new ArrayList<>();
                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < sbArr.length(); i++) {
                            org.json.JSONObject obj = sbArr.optJSONObject(i);
                            Routine rot = Routine.fromJson(obj);
                            if (rot != null) {
                                list.add(rot);
                                sb.append(rot.getId())
                                  .append(rot.getCode())
                                  .append(rot.getSubject())
                                  .append(rot.getDepartment())
                                  .append(rot.getAcademicLevel())
                                  .append(rot.getDay())
                                  .append(rot.getStartTime())
                                  .append(rot.getEndTime())
                                  .append(rot.getTeachers() != null ? rot.getTeachers().toString() : "")
                                  .append(rot.getTower())
                                  .append(rot.getClassroom());
                            }
                        }
                        String hash = RoomRepository.computeHash(sb.toString());
                        if (metadata == null || !hash.equals(metadata.getDataHash()) || forceRefresh) {
                            roomRepository.saveRoutines(list, () -> {
                                cacheManager.updateCacheMetadata(key, hash);
                                if (onComplete != null) onComplete.run();
                            });
                        } else {
                            cacheManager.updateCacheMetadata(key, hash);
                            if (onComplete != null) onComplete.run();
                        }
                    } else if (onComplete != null) {
                        onComplete.run();
                    }
                });
            } else if (onComplete != null) {
                onComplete.run();
            }
        });
    }

    public void forceSyncRoutinesFromFirestore(Runnable onComplete) {
        String key = CacheValidator.KEY_ROUTINE;
        CacheManager.logDebug("FORCE SYNC ROUTINES (SUPABASE)");
        java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
            org.json.JSONArray sbArr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("routines", "select=*");
            if (sbArr != null && sbArr.length() > 0) {
                List<Routine> list = new ArrayList<>();
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < sbArr.length(); i++) {
                    org.json.JSONObject obj = sbArr.optJSONObject(i);
                    Routine rot = Routine.fromJson(obj);
                    if (rot != null) {
                        list.add(rot);
                        sb.append(rot.getId())
                          .append(rot.getCode())
                          .append(rot.getSubject())
                          .append(rot.getDepartment())
                          .append(rot.getAcademicLevel())
                          .append(rot.getDay())
                          .append(rot.getStartTime())
                          .append(rot.getEndTime())
                          .append(rot.getTeachers() != null ? rot.getTeachers().toString() : "")
                          .append(rot.getTower())
                          .append(rot.getClassroom());
                    }
                }
                String hash = RoomRepository.computeHash(sb.toString());
                roomRepository.saveRoutines(list, () -> {
                    cacheManager.updateCacheMetadata(key, hash);
                    if (onComplete != null) onComplete.run();
                });
            } else if (onComplete != null) {
                onComplete.run();
            }
        });
    }

    public void syncFacultyIfExpired(String department, boolean forceRefresh, Runnable onComplete) {
        String key = CacheValidator.KEY_FACULTY + (department != null ? "_" + department : "");
        cacheManager.checkCacheStatus(key, (status, metadata) -> {
            if (forceRefresh || status != CacheValidator.CacheStatus.VALID) {
                CacheManager.logDebug("SILENT BACKGROUND REFRESH: " + key + " (Status: " + status + ")");
                java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                    org.json.JSONArray facArr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("faculty", "select=*");
                    org.json.JSONArray usersArr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("users", "role=in.(teacher,faculty)&select=*");

                    if ((facArr != null && facArr.length() > 0) || (usersArr != null && usersArr.length() > 0)) {
                        java.util.Map<String, Faculty> map = new java.util.LinkedHashMap<>();
                        if (facArr != null) {
                            for (int i = 0; i < facArr.length(); i++) {
                                Faculty f = Faculty.fromJson(facArr.optJSONObject(i));
                                if (f != null && f.getId() != null && !f.getId().isEmpty()) {
                                    map.put(f.getId(), f);
                                }
                            }
                        }
                        if (usersArr != null) {
                            for (int i = 0; i < usersArr.length(); i++) {
                                org.json.JSONObject uObj = usersArr.optJSONObject(i);
                                if (uObj != null) {
                                    // Make sure it is not a student
                                    String r = uObj.optString("role", "").toLowerCase();
                                    if ("teacher".equals(r) || "faculty".equals(r)) {
                                        Faculty f = Faculty.fromJson(uObj);
                                        if (f != null && f.getId() != null && !f.getId().isEmpty()) {
                                            if (!map.containsKey(f.getId())) {
                                                map.put(f.getId(), f);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        List<Faculty> list = new ArrayList<>();
                        StringBuilder sb = new StringBuilder();
                        for (Faculty f : map.values()) {
                            if (department == null || department.trim().isEmpty() || "all".equalsIgnoreCase(department.trim())
                                    || (f.getDepartment() != null && f.getDepartment().equalsIgnoreCase(department.trim()))) {
                                list.add(f);
                                sb.append(f.getId()).append(f.getName());
                            }
                        }

                        String hash = RoomRepository.computeHash(sb.toString());
                        if (metadata == null || !hash.equals(metadata.getDataHash()) || forceRefresh) {
                            roomRepository.saveFaculty(department, list, () -> {
                                cacheManager.updateCacheMetadata(key, hash);
                                if (onComplete != null) onComplete.run();
                            });
                        } else {
                            cacheManager.updateCacheMetadata(key, hash);
                            if (onComplete != null) onComplete.run();
                        }
                    } else if (onComplete != null) {
                        onComplete.run();
                    }
                });
            } else if (onComplete != null) {
                onComplete.run();
            }
        });
    }

    public void syncSubjectsIfExpired(boolean forceRefresh, Runnable onComplete) {
        String key = CacheValidator.KEY_SUBJECTS;
        cacheManager.checkCacheStatus(key, (status, metadata) -> {
            if (forceRefresh || status != CacheValidator.CacheStatus.VALID) {
                CacheManager.logDebug("SILENT BACKGROUND REFRESH: " + key + " (Status: " + status + ")");
                java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                    org.json.JSONArray sbArr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("subjects", "select=*");
                    if (sbArr != null && sbArr.length() > 0) {
                        List<Subject> list = new ArrayList<>();
                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < sbArr.length(); i++) {
                            org.json.JSONObject obj = sbArr.optJSONObject(i);
                            Subject sub = Subject.fromJson(obj);
                            if (sub != null) {
                                list.add(sub);
                                sb.append(sub.getCode()).append(sub.getName());
                            }
                        }
                        String hash = RoomRepository.computeHash(sb.toString());
                        if (metadata == null || !hash.equals(metadata.getDataHash()) || forceRefresh) {
                            roomRepository.saveSubjects(list, () -> {
                                cacheManager.updateCacheMetadata(key, hash);
                                if (onComplete != null) onComplete.run();
                            });
                        } else {
                            cacheManager.updateCacheMetadata(key, hash);
                            if (onComplete != null) onComplete.run();
                        }
                    } else if (onComplete != null) {
                        onComplete.run();
                    }
                });
            } else if (onComplete != null) {
                onComplete.run();
            }
        });
    }

    public void syncTransportIfExpired(boolean forceRefresh, Runnable onComplete) {
        String key = CacheValidator.KEY_BUS_ROUTES;
        cacheManager.checkCacheStatus(key, (status, metadata) -> {
            if (forceRefresh || status != CacheValidator.CacheStatus.VALID) {
                CacheManager.logDebug("SILENT BACKGROUND REFRESH (SUPABASE): " + key + " (Status: " + status + ")");
                SupabaseAuthBridge.queryTable("buses", "select=*", new SupabaseAuthBridge.SupabaseCallback() {
                    @Override
                    public void onSuccess(String busesJson) {
                        List<Bus> buses = new ArrayList<>();
                        try {
                            JSONArray arr = new JSONArray(busesJson);
                            for (int i = 0; i < arr.length(); i++) {
                                Bus b = Bus.fromJson(arr.getJSONObject(i));
                                if (b != null) buses.add(b);
                            }
                        } catch (Exception ignored) {}

                        SupabaseAuthBridge.queryTable("routes", "select=*", new SupabaseAuthBridge.SupabaseCallback() {
                            @Override
                            public void onSuccess(String routesJson) {
                                List<Route> routes = new ArrayList<>();
                                try {
                                    JSONArray arr = new JSONArray(routesJson);
                                    for (int i = 0; i < arr.length(); i++) {
                                        Route r = Route.fromJson(arr.getJSONObject(i));
                                        if (r != null) routes.add(r);
                                    }
                                } catch (Exception ignored) {}

                                StringBuilder sb = new StringBuilder();
                                for (Bus b : buses) {
                                    sb.append(b.getId())
                                      .append(b.getGpsUrl() != null ? b.getGpsUrl() : "")
                                      .append(b.getDriverPhone() != null ? b.getDriverPhone() : "");
                                }
                                for (Route r : routes) {
                                    sb.append(r.getId()).append(r.getName() != null ? r.getName() : "");
                                }
                                String hash = RoomRepository.computeHash(sb.toString());
                                if (metadata == null || !hash.equals(metadata.getDataHash()) || forceRefresh) {
                                    roomRepository.saveBuses(buses, () -> {
                                        roomRepository.saveRoutes(routes, () -> {
                                            cacheManager.updateCacheMetadata(key, hash);
                                            if (onComplete != null) onComplete.run();
                                        });
                                    });
                                } else {
                                    cacheManager.updateCacheMetadata(key, hash);
                                    if (onComplete != null) onComplete.run();
                                }
                            }

                            @Override
                            public void onError(String error) {
                                if (onComplete != null) onComplete.run();
                            }
                        });
                    }

                    @Override
                    public void onError(String error) {
                        if (onComplete != null) onComplete.run();
                    }
                });
            } else if (onComplete != null) {
                onComplete.run();
            }
        });
    }

    public void forceSyncTransportFromFirestore(Runnable onComplete) {
        String key = CacheValidator.KEY_BUS_ROUTES;
        CacheManager.logDebug("FORCE SYNC TRANSPORT (SUPABASE)");
        SupabaseAuthBridge.queryTable("buses", "select=*", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String busesJson) {
                List<Bus> buses = new ArrayList<>();
                try {
                    JSONArray arr = new JSONArray(busesJson);
                    for (int i = 0; i < arr.length(); i++) {
                        Bus b = Bus.fromJson(arr.getJSONObject(i));
                        if (b != null) buses.add(b);
                    }
                } catch (Exception ignored) {}

                SupabaseAuthBridge.queryTable("routes", "select=*", new SupabaseAuthBridge.SupabaseCallback() {
                    @Override
                    public void onSuccess(String routesJson) {
                        List<Route> routes = new ArrayList<>();
                        try {
                            JSONArray arr = new JSONArray(routesJson);
                            for (int i = 0; i < arr.length(); i++) {
                                Route r = Route.fromJson(arr.getJSONObject(i));
                                if (r != null) routes.add(r);
                            }
                        } catch (Exception ignored) {}

                        StringBuilder sb = new StringBuilder();
                        for (Bus b : buses) {
                            sb.append(b.getId())
                              .append(b.getGpsUrl() != null ? b.getGpsUrl() : "")
                              .append(b.getDriverPhone() != null ? b.getDriverPhone() : "");
                        }
                        for (Route r : routes) {
                            sb.append(r.getId()).append(r.getName() != null ? r.getName() : "");
                        }
                        String hash = RoomRepository.computeHash(sb.toString());
                        roomRepository.saveBuses(buses, () -> {
                            roomRepository.saveRoutes(routes, () -> {
                                cacheManager.updateCacheMetadata(key, hash);
                                if (onComplete != null) onComplete.run();
                            });
                        });
                    }

                    @Override
                    public void onError(String error) {
                        if (onComplete != null) onComplete.run();
                    }
                });
            }

            @Override
            public void onError(String error) {
                if (onComplete != null) onComplete.run();
            }
        });
    }
}
