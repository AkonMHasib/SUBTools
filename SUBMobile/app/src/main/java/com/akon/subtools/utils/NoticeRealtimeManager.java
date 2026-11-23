package com.akon.subtools.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.akon.subtools.cache.RoomRepository;
import com.akon.subtools.models.Notice;

import org.json.JSONArray;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class NoticeRealtimeManager {
    private static volatile NoticeRealtimeManager INSTANCE;
    private final Context context;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> pollFuture;

    private NoticeRealtimeManager(Context context) {
        this.context = context.getApplicationContext();
    }

    public static NoticeRealtimeManager getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (NoticeRealtimeManager.class) {
                if (INSTANCE == null) {
                    INSTANCE = new NoticeRealtimeManager(context);
                }
            }
        }
        return INSTANCE;
    }

    public synchronized void startListening() {
        if (pollFuture != null && !pollFuture.isDone()) return;

        // Poll Supabase notices every 5 minutes (and run immediately on start)
        pollFuture = scheduler.scheduleWithFixedDelay(this::checkLatestNotices, 0, 5, TimeUnit.MINUTES);
    }

    private void checkLatestNotices() {
        if (!SupabaseAuthBridge.isConfigured()) return;

        try {
            SharedPreferences prefs = context.getSharedPreferences("notified_notices_prefs", Context.MODE_PRIVATE);
            boolean isFirstRun = !prefs.contains("has_initialized_notices");

            JSONArray sbArr = SupabaseAuthBridge.queryTable("notices", "select=*&status=neq.scheduled&order=created_at.desc&limit=10");
            if (sbArr != null && sbArr.length() > 0) {
                List<Notice> notices = new ArrayList<>();
                for (int i = 0; i < sbArr.length(); i++) {
                    Notice notice = Notice.fromJson(sbArr.optJSONObject(i));
                    if (notice != null && !"scheduled".equalsIgnoreCase(notice.getStatus())) {
                        notices.add(notice);
                        boolean alreadyNotified = prefs.getBoolean("notified_" + notice.getId(), false);
                        if (!alreadyNotified) {
                            prefs.edit().putBoolean("notified_" + notice.getId(), true).apply();
                            if (!isFirstRun) {
                                com.akon.subtools.models.User currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(context);
                                String dept = notice.getDepartment() != null ? notice.getDepartment().trim() : "";
                                boolean isGlobal = dept.isEmpty() || "All Departments".equalsIgnoreCase(dept)
                                        || "All".equalsIgnoreCase(dept) || "ALL".equalsIgnoreCase(dept)
                                        || "Global".equalsIgnoreCase(dept);
                                boolean isMyDept = currentUser != null && currentUser.getDepartment() != null
                                        && currentUser.getDepartment().trim().equalsIgnoreCase(dept);
                                if (isGlobal || isMyDept) {
                                    NotificationHelper.showNoticeNotification(context, notice);
                                }
                            }
                        }
                    }
                }

                if (isFirstRun) {
                    prefs.edit().putBoolean("has_initialized_notices", true).apply();
                }

                if (!notices.isEmpty()) {
                    RoomRepository.getInstance(context).saveNotices(notices, null);
                }
            }
        } catch (Exception ignored) {}
    }

    public synchronized void stopListening() {
        if (pollFuture != null) {
            pollFuture.cancel(false);
            pollFuture = null;
        }
    }

    public synchronized void shutdown() {
        stopListening();
        try {
            scheduler.shutdownNow();
        } catch (Exception ignored) {}
    }
}
