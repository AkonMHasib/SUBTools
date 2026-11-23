package com.akon.subtools;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.akon.subtools.sync.SyncWorker;

import java.util.concurrent.TimeUnit;

public class SUBToolsApplication extends Application {
    private static int activeActivities = 0;
    private static boolean wasBackgrounded = true;
    private static java.lang.ref.WeakReference<Activity> currentActivityRef = new java.lang.ref.WeakReference<>(null);

    @Override
    public void onCreate() {
        super.onCreate();

        // Auto light and dark mode based on device theme
        androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);

        com.akon.subtools.utils.CrashLogManager.init(this);
        com.akon.subtools.utils.SupabaseAuthBridge.init(this);

        // Initialize Offline-First Smart Caching & Network Monitoring
        com.akon.subtools.cache.CacheManager.getInstance(this);
        com.akon.subtools.cache.NetworkMonitor.getInstance(this).startMonitoring();
        com.akon.subtools.utils.NotificationHelper.initChannels(this);
        com.akon.subtools.utils.NoticeRealtimeManager.getInstance(this).startListening();

        setupPeriodicSync();
        setupLifecycleTracking();
    }

    private void setupPeriodicSync() {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest periodicSyncRequest = new PeriodicWorkRequest.Builder(
                SyncWorker.class, 3, TimeUnit.HOURS)
                .setConstraints(constraints)
                .build();

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "PeriodicDatabaseSync",
                ExistingPeriodicWorkPolicy.KEEP,
                periodicSyncRequest
        );
    }

    private void setupLifecycleTracking() {
        registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks() {
            @Override
            public void onActivityCreated(@NonNull Activity activity, @Nullable Bundle savedInstanceState) {
                currentActivityRef = new java.lang.ref.WeakReference<>(activity);
            }

            @Override
            public void onActivityStarted(@NonNull Activity activity) {
                currentActivityRef = new java.lang.ref.WeakReference<>(activity);
                if (activeActivities == 0 && wasBackgrounded) {
                    wasBackgrounded = false;
                    // App returned to foreground, run sync immediately in background
                    triggerImmediateSync();
                }
                activeActivities++;
            }

            @Override
            public void onActivityResumed(@NonNull Activity activity) {
                currentActivityRef = new java.lang.ref.WeakReference<>(activity);
            }

            @Override
            public void onActivityPaused(@NonNull Activity activity) {}

            @Override
            public void onActivityStopped(@NonNull Activity activity) {
                activeActivities--;
                if (activeActivities == 0) {
                    wasBackgrounded = true;
                    lastBackgroundTimestamp = System.currentTimeMillis();
                }
            }

            @Override
            public void onActivitySaveInstanceState(@NonNull Activity activity, @NonNull Bundle outState) {}

            @Override
            public void onActivityDestroyed(@NonNull Activity activity) {}
        });
    }

    private static long lastBackgroundTimestamp = 0;

    public void triggerImmediateSync() {
        long now = System.currentTimeMillis();
        // Rate-limit foreground sync: trigger ONLY if app was in background for at least 15 minutes
        if (lastBackgroundTimestamp > 0 && (now - lastBackgroundTimestamp < 15 * 60 * 1000L)) {
            return;
        }

        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        OneTimeWorkRequest immediateSyncRequest = new OneTimeWorkRequest.Builder(SyncWorker.class)
                .setConstraints(constraints)
                .build();

        WorkManager.getInstance(this).enqueueUniqueWork(
                "ImmediateDatabaseSync",
                ExistingWorkPolicy.REPLACE,
                immediateSyncRequest
        );
    }
}
