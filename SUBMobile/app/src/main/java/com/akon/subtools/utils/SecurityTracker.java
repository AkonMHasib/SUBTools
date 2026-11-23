package com.akon.subtools.utils;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.os.Build;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class SecurityTracker {

    /**
     * Asynchronously track device parameters and public IP address without requiring special runtime permissions.
     */
    public static void trackSession(Context context, String uid) {
        if (uid == null || uid.trim().isEmpty()) return;

        new Thread(() -> {
            String ip = "Unknown";
            try {
                URL url = new URL("https://api.ipify.org?format=json");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(4000);
                conn.setReadTimeout(4000);
                conn.setRequestMethod("GET");
                if (conn.getResponseCode() == HttpURLConnection.HTTP_OK) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    reader.close();
                    JsonObject obj = JsonParser.parseString(sb.toString()).getAsJsonObject();
                    if (obj.has("ip") && !obj.get("ip").isJsonNull()) {
                        ip = obj.get("ip").getAsString();
                    }
                }
                conn.disconnect();
            } catch (Exception ignored) {}

            String appVersion = "Unknown";
            if (context != null) {
                try {
                    PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
                    appVersion = pInfo.versionName;
                } catch (Exception ignored) {}
            }

            long now = System.currentTimeMillis();

            // 1. Update Supabase primary
            if (SupabaseAuthBridge.isConfigured()) {
                org.json.JSONObject patch = new org.json.JSONObject();
                try {
                    patch.put("last_ip", ip);
                    patch.put("lastIp", ip);
                    patch.put("device_manufacturer", Build.MANUFACTURER != null ? Build.MANUFACTURER : "Unknown");
                    patch.put("deviceManufacturer", Build.MANUFACTURER != null ? Build.MANUFACTURER : "Unknown");
                    patch.put("device_model", Build.MODEL != null ? Build.MODEL : "Unknown");
                    patch.put("deviceModel", Build.MODEL != null ? Build.MODEL : "Unknown");
                    patch.put("android_version", Build.VERSION.RELEASE != null ? Build.VERSION.RELEASE : "Unknown");
                    patch.put("androidVersion", Build.VERSION.RELEASE != null ? Build.VERSION.RELEASE : "Unknown");
                    patch.put("last_login_at", now);
                    patch.put("lastLoginAt", now);
                    patch.put("app_version", appVersion);
                    patch.put("appVersion", appVersion);
                    patch.put("updated_at", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date(now)));
                } catch (Exception ignored) {}
                SupabaseAuthBridge.updateUserAuthMetadata(patch, null);

                // Activity logs
                org.json.JSONObject logObj = new org.json.JSONObject();
                try {
                    logObj.put("id", java.util.UUID.randomUUID().toString());
                    logObj.put("user_id", uid);
                    logObj.put("action", "session_start");
                    logObj.put("ip_address", ip);

                    org.json.JSONObject detailsObj = new org.json.JSONObject();
                    detailsObj.put("manufacturer", Build.MANUFACTURER != null ? Build.MANUFACTURER : "");
                    detailsObj.put("model", Build.MODEL != null ? Build.MODEL : "");
                    detailsObj.put("android_version", Build.VERSION.RELEASE != null ? Build.VERSION.RELEASE : "");
                    detailsObj.put("app_version", appVersion != null ? appVersion : "");
                    logObj.put("details", detailsObj);

                    String isoNow = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date(now));
                    logObj.put("created_at", isoNow);
                } catch (Exception ignored) {}
                SupabaseAuthBridge.insertRecord("activity_logs", logObj, null);
            }
        }).start();
    }
}
