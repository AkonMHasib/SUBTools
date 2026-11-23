package com.akon.subtools.utils;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.appcompat.app.AlertDialog;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

public class AppUpdateManager {

    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    public static void checkForUpdates(Activity activity) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;

        if (SupabaseAuthBridge.isConfigured()) {
            Executors.newSingleThreadExecutor().execute(() -> {
                checkSupabaseUpdate(activity);
            });
        }
    }

    private static boolean checkSupabaseUpdate(Activity activity) {
        try {
            URL url = new URL(SupabaseAuthBridge.SUPABASE_URL.trim() + "/rest/v1/system_settings?id=eq.app_update&select=data");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("apikey", SupabaseAuthBridge.SUPABASE_ANON_KEY.trim());
            conn.setRequestProperty("Authorization", "Bearer " + SupabaseAuthBridge.SUPABASE_ANON_KEY.trim());
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                InputStream is = conn.getInputStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                JSONArray arr = new JSONArray(sb.toString());
                if (arr.length() > 0) {
                    JSONObject row = arr.getJSONObject(0);
                    JSONObject data = row.optJSONObject("data");
                    if (data != null) {
                        return processJsonUpdate(activity, data);
                    }
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    public static long getAppVersionCode(Activity activity) {
        try {
            android.content.pm.PackageInfo pInfo = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                return pInfo.getLongVersionCode();
            } else {
                return pInfo.versionCode;
            }
        } catch (Exception e) {
            return 1;
        }
    }

    private static boolean processJsonUpdate(Activity activity, JSONObject data) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return false;

        long latestCode = data.optLong("latestVersionCode", data.optLong("versionCode", 0));
        if (latestCode <= 0) return false;

        long currentCode = getAppVersionCode(activity);
        if (latestCode > currentCode) {
            String versionName = data.optString("latestVersionName", data.optString("versionName", "v" + latestCode));
            String apkUrl = data.optString("apkUrl", data.optString("downloadUrl", ""));
            String notes = data.optString("updateNotes", data.optString("notes", "Performance improvements and new features are available."));
            boolean isForce = data.optBoolean("forceUpdate", false);

            mainHandler.post(() -> showUpdateDialog(activity, versionName, notes, apkUrl, isForce));
            return true;
        }
        return false;
    }

    private static void showUpdateDialog(Activity activity, String versionName, String notes, String apkUrl, boolean isForce) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;

        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        builder.setTitle("New Update Available (" + versionName + ") 🚀");
        builder.setMessage("What's New:\n\n" + notes + "\n\nPlease update to the latest version for the best experience.");

        builder.setPositiveButton("UPDATE NOW", (dialog, which) -> {
            if (apkUrl != null && !apkUrl.trim().isEmpty()) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl.trim()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    activity.startActivity(intent);
                } catch (Exception e) {
                    android.widget.Toast.makeText(activity, "Unable to open update link. Please check your browser.", android.widget.Toast.LENGTH_LONG).show();
                }
            }
        });

        if (!isForce) {
            builder.setNegativeButton("LATER", (dialog, which) -> dialog.dismiss());
            builder.setCancelable(true);
        } else {
            builder.setCancelable(false);
        }

        AlertDialog dialog = builder.create();
        dialog.setCanceledOnTouchOutside(!isForce);
        dialog.show();
    }
}
