package com.akon.subtools.utils;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Online User Presence & Heartbeat Tracker.
 * Keeps user lastSeen / lastActive updated in Supabase users table so admin panel
 * can accurately calculate real-time online users.
 */
public class OnlineTracker {
    private static final long HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000L; // 3 minutes
    private static Handler heartbeatHandler;
    private static Runnable heartbeatRunnable;
    private static boolean isTracking = false;
    private static String currentTrackedUid = null;

    /**
     * Call on Activity onStart / onResume to register online presence
     * and start periodic heartbeat.
     */
    public static void startTracking() {
        startTracking(currentTrackedUid);
    }

    public static void startTracking(String explicitUid) {
        if (explicitUid != null && !explicitUid.trim().isEmpty()) {
            currentTrackedUid = explicitUid.trim();
        }
        if (currentTrackedUid == null || currentTrackedUid.isEmpty()) {
            // Fallback: resolve from Supabase cached token / preferences
            String resolvedUid = SupabaseAuthBridge.getCurrentUserId();
            if (resolvedUid != null && !resolvedUid.trim().isEmpty()) {
                currentTrackedUid = resolvedUid.trim();
            }
        }
        if (currentTrackedUid == null || currentTrackedUid.isEmpty()) return;

        final String activeUid = currentTrackedUid;
        markOnline(activeUid, true);

        if (heartbeatHandler == null) {
            heartbeatHandler = new Handler(Looper.getMainLooper());
        }

        if (!isTracking) {
            isTracking = true;
            heartbeatRunnable = new Runnable() {
                @Override
                public void run() {
                    if (isTracking) {
                        markOnline(activeUid, true);
                        heartbeatHandler.postDelayed(this, HEARTBEAT_INTERVAL_MS);
                    }
                }
            };
            heartbeatHandler.postDelayed(heartbeatRunnable, HEARTBEAT_INTERVAL_MS);
        }
    }

    /**
     * Call on Activity onStop to mark departure and cancel heartbeat.
     */
    public static void stopTracking() {
        isTracking = false;
        if (heartbeatHandler != null && heartbeatRunnable != null) {
            heartbeatHandler.removeCallbacks(heartbeatRunnable);
        }
        if (currentTrackedUid != null) {
            markOnline(currentTrackedUid, false);
        }
    }

    /**
     * Update user's presence state and timestamps in Supabase.
     * Records lightweight heartbeats in activity_logs to avoid overwriting student profile metadata.
     */
    public static void markOnline(String uid, boolean online) {
        if (uid == null || uid.trim().isEmpty()) return;
        long now = System.currentTimeMillis();

        if (SupabaseAuthBridge.isConfigured()) {
            JSONObject logObj = new JSONObject();
            try {
                logObj.put("id", java.util.UUID.randomUUID().toString());
                logObj.put("user_id", uid.trim());
                logObj.put("action", online ? "heartbeat" : "session_end");
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                logObj.put("timestamp", sdf.format(new Date(now)));

                JSONObject details = new JSONObject();
                details.put("online", online);
                details.put("client", "android_app");
                details.put("last_seen", now);
                logObj.put("details", details);
            } catch (Exception ignored) {}

            SupabaseAuthBridge.insertRecord("activity_logs", logObj, null);
        }
    }
}
