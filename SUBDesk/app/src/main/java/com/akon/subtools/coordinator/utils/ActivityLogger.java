package com.akon.subtools.coordinator.utils;

import com.akon.subtools.coordinator.data.repository.SessionManager;
import org.json.JSONObject;

public class ActivityLogger {

    public static void logAction(SessionManager sessionManager, String action, String details) {
        if (sessionManager == null) return;
        try {
            long now = System.currentTimeMillis();
            String device = android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL;

            // Supabase primary audit log
            if (SupabaseAuthBridge.isConfigured()) {
                JSONObject json = new JSONObject();
                json.put("id", java.util.UUID.randomUUID().toString());
                json.put("user_id", sessionManager.getUid());
                json.put("action", action != null ? action : "coordinator_action");

                JSONObject detailsObj = new JSONObject();
                detailsObj.put("message", details != null ? details : "");
                detailsObj.put("userName", sessionManager.getName());
                detailsObj.put("email", sessionManager.getEmail());
                detailsObj.put("department", sessionManager.getDepartment());
                detailsObj.put("activeRole", sessionManager.getActiveRole());
                detailsObj.put("device", device);
                json.put("details", detailsObj);

                String isoNow = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date(now));
                json.put("created_at", isoNow);

                SupabaseAuthBridge.insertRecord("activity_logs", json, null);
            }
        } catch (Exception ignored) {}
    }
}
