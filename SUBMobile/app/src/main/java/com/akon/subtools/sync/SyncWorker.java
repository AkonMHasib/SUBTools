package com.akon.subtools.sync;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.akon.subtools.database.AppDatabase;
import com.akon.subtools.models.Bus;
import com.akon.subtools.models.Notice;
import com.akon.subtools.models.Route;
import com.akon.subtools.models.Routine;
import com.akon.subtools.models.Subject;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class SyncWorker extends Worker {
    private static final String PREF_CACHED_NOTICE_VERSION = "cached_notice_version";
    private static final String PREF_LAST_NOTICE_SYNC = "last_notice_sync_timestamp";
    private static final String PREF_LAST_GLOBAL_SYNC = "last_global_sync_timestamp";

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    public static boolean isSyncRequired(long lastSyncTime) {
        long now = System.currentTimeMillis();
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.set(java.util.Calendar.HOUR_OF_DAY, 6);
        cal.set(java.util.Calendar.MINUTE, 0);
        cal.set(java.util.Calendar.SECOND, 0);
        cal.set(java.util.Calendar.MILLISECOND, 0);
        long today6AM = cal.getTimeInMillis();

        if (now >= today6AM) {
            return lastSyncTime < today6AM;
        } else {
            return lastSyncTime < (today6AM - 24 * 60 * 60 * 1000L);
        }
    }

    @NonNull
    @Override
    public Result doWork() {
        AppDatabase database = AppDatabase.getDatabase(getApplicationContext());
        User localUser = database.userDao().getUser();
        if (localUser == null || localUser.getUid() == null || localUser.getUid().trim().isEmpty()) {
            localUser = AppDatabase.getLocalUser(getApplicationContext());
            if (localUser != null && localUser.getUid() != null && !localUser.getUid().trim().isEmpty()) {
                database.userDao().insertUser(localUser);
            }
        }
        if (localUser == null || localUser.getUid() == null || localUser.getUid().trim().isEmpty()) {
            return Result.success(); // User not logged in, skip sync
        }
        String uid = localUser.getUid().trim();

        SharedPreferences prefs = getApplicationContext().getSharedPreferences("sync_prefs", Context.MODE_PRIVATE);

        try {
            long lastGlobalSync = prefs.getLong(PREF_LAST_GLOBAL_SYNC, 0);
            boolean cacheEmpty = database.routineDao().getAllRoutines().isEmpty()
                    || database.noticeDao().getAllNotices().isEmpty()
                    || database.subjectDao().getAllSubjects().isEmpty();
            boolean globalSyncRequired = cacheEmpty || isSyncRequired(lastGlobalSync);

            if (globalSyncRequired && SupabaseAuthBridge.isConfigured()) {
                // 1. Sync User Profile & Academic Calendar config
                JSONArray userArr = SupabaseAuthBridge.queryTable("users", "id=eq." + uid);
                if (userArr != null && userArr.length() > 0) {
                    User user = User.fromJson(userArr.getJSONObject(0));
                    if (user != null) {
                        boolean modified = com.akon.subtools.utils.AcademicHelper.checkAndApplyProgression(user);
                        if (modified) {
                            JSONObject patch = new JSONObject();
                            patch.put("semester", user.getSemester());
                            patch.put("trimester", user.getTrimester());
                            patch.put("academic_level", user.getAcademicLevel());
                            patch.put("academicLevel", user.getAcademicLevel());
                            patch.put("batch_status", user.getBatchStatus());
                            SupabaseAuthBridge.updateUserAuthMetadata(patch, null);
                        }
                        database.userDao().insertUser(user);
                    }
                }

                // 2. Sync Routine
                List<Routine> routines = new ArrayList<>();
                JSONArray rArr = SupabaseAuthBridge.queryTable("routines", "select=*");
                if (rArr != null) {
                    for (int i = 0; i < rArr.length(); i++) {
                        Routine r = Routine.fromJson(rArr.getJSONObject(i));
                        if (r != null) routines.add(r);
                    }
                }
                if (!routines.isEmpty()) {
                    database.routineDao().clearRoutines();
                    database.routineDao().insertRoutines(routines);
                }

                // Schedule class reminders alarms in background
                User cachedUser = database.userDao().getUserById(uid);
                if (cachedUser != null) {
                    List<Routine> personal = com.akon.subtools.utils.AcademicHelper.filterPersonalizedRoutine(
                            routines,
                            cachedUser.getDepartment(),
                            cachedUser.getAcademicLevel(),
                            cachedUser.getSection(),
                            cachedUser.getSubjects(),
                            cachedUser.getCompletedSubjects()
                    );
                    com.akon.subtools.alarms.ClassAlarmScheduler.scheduleAlarms(getApplicationContext(), personal);
                }

                // Schedule upcoming exam / CT / quiz reminders
                try {
                    JSONArray examArr = SupabaseAuthBridge.queryTable("exam_routines", "select=*");
                    if (examArr != null && examArr.length() > 0) {
                        List<com.akon.subtools.models.ExamRoutine> examList = new ArrayList<>();
                        for (int i = 0; i < examArr.length(); i++) {
                            com.akon.subtools.models.ExamRoutine er = com.akon.subtools.models.ExamRoutine.fromJson(examArr.getJSONObject(i));
                            if (er != null) examList.add(er);
                        }
                        com.akon.subtools.alarms.ExamAlarmScheduler.scheduleExamAlarms(getApplicationContext(), examList);
                    }
                } catch (Exception ignored) {}

                // 4. Sync Subjects
                List<Subject> subjects = new ArrayList<>();
                JSONArray sArr = SupabaseAuthBridge.queryTable("subjects", "select=*");
                if (sArr != null) {
                    for (int i = 0; i < sArr.length(); i++) {
                        Subject s = Subject.fromJson(sArr.getJSONObject(i));
                        if (s != null) subjects.add(s);
                    }
                }
                if (!subjects.isEmpty()) {
                    database.subjectDao().clearSubjects();
                    database.subjectDao().insertSubjects(subjects);
                }

                // Update global sync preference
                prefs.edit().putLong(PREF_LAST_GLOBAL_SYNC, System.currentTimeMillis()).apply();

                com.akon.subtools.cache.CacheManager cacheMgr = com.akon.subtools.cache.CacheManager.getInstance(getApplicationContext());
                cacheMgr.updateCacheMetadata(com.akon.subtools.cache.CacheValidator.KEY_USER_PROFILE, "synced");
                cacheMgr.updateCacheMetadata(com.akon.subtools.cache.CacheValidator.KEY_ROUTINE, "synced");
                cacheMgr.updateCacheMetadata(com.akon.subtools.cache.CacheValidator.KEY_SUBJECTS, "synced");
            }

            // 5. Sync Transport Fleet (10 AM everyday sync)
            long lastTransportSync = prefs.getLong("last_transport_sync_timestamp", 0);
            if (com.akon.subtools.viewmodels.TransportViewModel.isTransportSyncRequired(lastTransportSync) && SupabaseAuthBridge.isConfigured()) {
                JSONArray busArr = SupabaseAuthBridge.queryTable("buses", "select=*");
                if (busArr != null) {
                    List<Bus> buses = new ArrayList<>();
                    for (int i = 0; i < busArr.length(); i++) {
                        Bus b = Bus.fromJson(busArr.getJSONObject(i));
                        if (b != null) buses.add(b);
                    }
                    if (!buses.isEmpty()) {
                        database.busDao().clearBuses();
                        database.busDao().insertBuses(buses);
                    }
                }

                JSONArray routeArr = SupabaseAuthBridge.queryTable("routes", "select=*");
                if (routeArr != null) {
                    List<Route> routes = new ArrayList<>();
                    for (int i = 0; i < routeArr.length(); i++) {
                        Route r = Route.fromJson(routeArr.getJSONObject(i));
                        if (r != null) routes.add(r);
                    }
                    if (!routes.isEmpty()) {
                        database.routeDao().clearRoutes();
                        database.routeDao().insertRoutes(routes);
                    }
                }

                prefs.edit().putLong("last_transport_sync_timestamp", System.currentTimeMillis()).apply();
                com.akon.subtools.cache.CacheManager.getInstance(getApplicationContext()).updateCacheMetadata(com.akon.subtools.cache.CacheValidator.KEY_BUS_ROUTES, "synced");
            }

            // 3. Sync Notices from Supabase
            if (SupabaseAuthBridge.isConfigured()) {
                JSONArray configArr = SupabaseAuthBridge.queryTable("system_settings", "id=eq.notice_config&select=data");
                int remoteVer = 0;
                if (configArr != null && configArr.length() > 0) {
                    JSONObject row = configArr.getJSONObject(0);
                    JSONObject data = row.optJSONObject("data");
                    if (data != null) {
                        remoteVer = data.optInt("noticeVersion", data.optInt("notice_version", 0));
                    }
                }

                int localVer = prefs.getInt(PREF_CACHED_NOTICE_VERSION, -1);

                if (remoteVer != localVer || localVer == -1 || database.noticeDao().getAllNotices().isEmpty()) {
                    JSONArray noticeArr = SupabaseAuthBridge.queryTable("notices", "select=*&order=created_at.desc");
                    List<Notice> notices = new ArrayList<>();
                    if (noticeArr != null) {
                        for (int i = 0; i < noticeArr.length(); i++) {
                            Notice n = Notice.fromJson(noticeArr.getJSONObject(i));
                            if (n != null) notices.add(n);
                        }
                    }

                    List<Notice> existing = database.noticeDao().getAllNotices();
                    Set<String> existingIds = new HashSet<>();
                    if (existing != null) {
                        for (Notice n : existing) {
                            if (n.getId() != null) existingIds.add(n.getId());
                        }
                    }

                    database.noticeDao().clearNotices();
                    database.noticeDao().insertNotices(notices);

                    if (existing != null && !existing.isEmpty()) {
                        User currentUser = database.userDao().getUserById(uid);
                        for (Notice n : notices) {
                            if (n.getId() != null && !existingIds.contains(n.getId())) {
                                String dept = n.getDepartment() != null ? n.getDepartment().trim() : "";
                                boolean isGlobal = dept.isEmpty() || "All Departments".equalsIgnoreCase(dept)
                                        || "All".equalsIgnoreCase(dept) || "ALL".equalsIgnoreCase(dept)
                                        || "Global".equalsIgnoreCase(dept);
                                boolean isMyDept = currentUser != null && currentUser.getDepartment() != null
                                        && currentUser.getDepartment().trim().equalsIgnoreCase(dept);
                                if (isGlobal || isMyDept) {
                                    com.akon.subtools.utils.NotificationHelper.showNoticeNotification(getApplicationContext(), n);
                                }
                            }
                        }
                    }
                    
                    prefs.edit()
                         .putInt(PREF_CACHED_NOTICE_VERSION, remoteVer)
                         .putLong(PREF_LAST_NOTICE_SYNC, System.currentTimeMillis())
                         .apply();
                    com.akon.subtools.cache.CacheManager.getInstance(getApplicationContext()).updateCacheMetadata(com.akon.subtools.cache.CacheValidator.KEY_NOTICES, "synced");
                }
            }

            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }
}
