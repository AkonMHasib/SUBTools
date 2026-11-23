package com.akon.subtools.coordinator.utils;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.akon.subtools.coordinator.R;
import com.akon.subtools.coordinator.data.model.BusRoute;
import com.akon.subtools.coordinator.data.repository.TransportRepository;
import com.akon.subtools.coordinator.ui.main.MainActivity;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class GpsExpiryReceiver extends BroadcastReceiver {

    private static final String CHANNEL_ID = "stc_gps_expiry_channel";
    private static final String CHANNEL_NAME = "GPS Link Expiry Reminders";
    private static final String PREF_NAME = "stc_gps_reminder_prefs";

    @Override
    public void onReceive(Context context, Intent intent) {
        // Reschedule next daily check
        GpsExpiryReminderScheduler.scheduleDailyCheck(context);

        // Fetch bus routes and check for expiry
        new TransportRepository().getBusRoutes(true, new TransportRepository.DataCallback<List<BusRoute>>() {
            @Override
            public void onSuccess(List<BusRoute> data) {
                if (data == null) return;
                checkRoutesForExpiry(context, data);
            }

            @Override
            public void onError(String errorMessage) {}
        });
    }

    private void checkRoutesForExpiry(Context context, List<BusRoute> routes) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());

        for (BusRoute route : routes) {
            if (route == null || route.getGpsUrl() == null || route.getGpsUrl().trim().isEmpty()) {
                continue;
            }

            GpsReminderUtils.ReminderStatus status = GpsReminderUtils.getStatus(route);
            int remaining = status.daysRemaining;

            String routeName = route.getName() != null ? route.getName() : "Bus Route";
            String notifKey = route.getId() + "_" + today + "_" + remaining;

            if (prefs.getBoolean(notifKey, false)) {
                // Already notified today for this state
                continue;
            }

            if (remaining == 2) {
                showExpiryNotification(context, route.getId().hashCode(),
                        "⚠️ GPS Link Expiry Reminder",
                        "Bus GPS tracking for " + routeName + " expires in 2 days. Please renew the link.");
                prefs.edit().putBoolean(notifKey, true).apply();
            } else if (remaining == 1) {
                showExpiryNotification(context, route.getId().hashCode(),
                        "⚠️ GPS Link Expiry Tomorrow!",
                        "Bus GPS tracking for " + routeName + " expires tomorrow! Update the link soon.");
                prefs.edit().putBoolean(notifKey, true).apply();
            } else if (remaining == 0 || status.isDue || status.isOverdue) {
                showExpiryNotification(context, route.getId().hashCode(),
                        "🚨 GPS Link Expiry Urgent!",
                        "Bus GPS tracking for " + routeName + " expires TODAY! Students will lose live bus tracking.");
                prefs.edit().putBoolean(notifKey, true).apply();
            }
        }
    }

    private void showExpiryNotification(Context context, int notificationId, String title, String message) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Reminders when bus GPS tracking links are about to expire");
            manager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        intent.putExtra("navigate_to", "transport");

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pi = PendingIntent.getActivity(context, notificationId, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi);

        try {
            manager.notify(notificationId, builder.build());
        } catch (SecurityException ignored) {}
    }
}
