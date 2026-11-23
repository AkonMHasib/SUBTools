package com.akon.subtools.coordinator.utils;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;

public class CrashLogManager {

    private static final String PREF_NAME = "subtools_crash_prefs";
    private static final String KEY_CRASH_LOG = "last_crash_log";
    private static final String KEY_CRASH_TIME = "last_crash_time";

    public static void init(Context context) {
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            String stackTrace = Log.getStackTraceString(throwable);
            Log.e("CRASH_LOG_HANDLER", "System Exception on thread " + thread.getName() + ":\n" + stackTrace);

            try {
                SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
                prefs.edit()
                        .putString(KEY_CRASH_LOG, "Thread: " + thread.getName() + "\n\n" + stackTrace)
                        .putLong(KEY_CRASH_TIME, System.currentTimeMillis())
                        .commit();
            } catch (Exception ignored) {}

            try {
                android.content.Intent intent = new android.content.Intent(context, com.akon.subtools.coordinator.ui.CrashLogActivity.class);
                intent.putExtra("crash_log", "Thread: " + thread.getName() + "\n\n" + stackTrace);
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK);
                context.startActivity(intent);
            } catch (Exception e) {
                Log.e("CRASH_LOG_HANDLER", "Failed to launch CrashLogActivity", e);
            }
        });
    }

    public static void checkForCrashLog(Activity activity) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;

        SharedPreferences prefs = activity.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String log = prefs.getString(KEY_CRASH_LOG, null);
        if (log == null || log.trim().isEmpty()) return;

        long crashTime = prefs.getLong(KEY_CRASH_TIME, 0);
        String timeStr = crashTime > 0 ? new java.text.SimpleDateFormat("dd MMM yyyy, hh:mm:ss a", java.util.Locale.US).format(new java.util.Date(crashTime)) : "Recently";

        ScrollView scrollView = new ScrollView(activity);
        int padding = (int) (16 * activity.getResources().getDisplayMetrics().density);
        scrollView.setPadding(padding, padding, padding, padding);

        TextView textView = new TextView(activity);
        textView.setText(log);
        textView.setTextSize(11f);
        textView.setTextColor(android.graphics.Color.parseColor("#DC2626"));
        textView.setTypeface(android.graphics.Typeface.MONOSPACE);
        textView.setTextIsSelectable(true);
        scrollView.addView(textView);

        new AlertDialog.Builder(activity)
                .setTitle("⚠️ Crash Log (" + timeStr + ")")
                .setView(scrollView)
                .setPositiveButton("COPY LOG", (dialog, which) -> {
                    ClipboardManager clipboard = (ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
                    ClipData clip = ClipData.newPlainText("Crash Log", log);
                    if (clipboard != null) {
                        clipboard.setPrimaryClip(clip);
                        Toast.makeText(activity, "Crash log copied to clipboard!", Toast.LENGTH_SHORT).show();
                    }
                    prefs.edit().remove(KEY_CRASH_LOG).remove(KEY_CRASH_TIME).apply();
                })
                .setNegativeButton("DISMISS", (dialog, which) -> {
                    prefs.edit().remove(KEY_CRASH_LOG).remove(KEY_CRASH_TIME).apply();
                    dialog.dismiss();
                })
                .setCancelable(false)
                .show();
    }
}
