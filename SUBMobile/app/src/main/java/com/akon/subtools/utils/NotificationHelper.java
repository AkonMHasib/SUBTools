package com.akon.subtools.utils;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.akon.subtools.activities.MainActivity;
import com.akon.subtools.models.Notice;

public class NotificationHelper {
    private static final String CHANNEL_ID = "university_notices_channel";
    private static final String CHANNEL_NAME = "University Notices";
    private static final String CHANNEL_DESC = "Notifications for new university announcements";
    private static final String PREF_NOTIF_HISTORY = "subtools_notif_dedup";
    private static final String KEY_DISPLAYED_NOTICES = "displayed_notice_ids";

    public static boolean isNoticeAlreadyDisplayed(Context context, String noticeId) {
        if (context == null || noticeId == null || noticeId.trim().isEmpty()) return false;
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREF_NOTIF_HISTORY, Context.MODE_PRIVATE);
        java.util.Set<String> seen = prefs.getStringSet(KEY_DISPLAYED_NOTICES, null);
        return seen != null && seen.contains(noticeId.trim());
    }

    public static void markNoticeAsDisplayed(Context context, String noticeId) {
        if (context == null || noticeId == null || noticeId.trim().isEmpty()) return;
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREF_NOTIF_HISTORY, Context.MODE_PRIVATE);
        java.util.Set<String> seen = new java.util.HashSet<>(prefs.getStringSet(KEY_DISPLAYED_NOTICES, new java.util.HashSet<>()));
        if (seen.size() > 100) {
            seen.clear();
        }
        seen.add(noticeId.trim());
        prefs.edit().putStringSet(KEY_DISPLAYED_NOTICES, seen).apply();
    }

    public static void showNoticeNotification(Context context, Notice notice) {
        if (context == null || notice == null) return;
        String noticeId = notice.getId();
        if (noticeId != null && !noticeId.trim().isEmpty()) {
            if (isNoticeAlreadyDisplayed(context, noticeId)) {
                return; // Suppress duplicate notification
            }
            markNoticeAsDisplayed(context, noticeId);
        }
        createNotificationChannel(context);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("navigate_to", "notice");
        intent.putExtra("notice_id", notice.getId());
        intent.putExtra("notice_title", notice.getTitle());
        intent.putExtra("notice_content", notice.getContent());
        intent.putExtra("notice_department", notice.getDepartment());
        intent.putExtra("notice_priority", notice.getPriority());
        intent.putExtra("notice_date", notice.getDate());
        intent.putExtra("notice_sender", notice.getSender());

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 
                notice.getId() != null ? notice.getId().hashCode() : (int) System.currentTimeMillis(), 
                intent, 
                flags
        );

        String title = notice.getTitle() != null ? notice.getTitle() : "University Notice";
        String content = notice.getContent() != null ? notice.getContent() : "";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.akon.subtools.R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(content)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(notice.getId() != null ? notice.getId().hashCode() : (int) System.currentTimeMillis(), builder.build());
        } catch (SecurityException e) {
            // Permission is disabled on device, ignore silently
        }
    }

    public static void showBirthdayNotification(Context context, String wish) {
        if (context == null || wish == null) return;
        createNotificationChannel(context);

        // Birthday notification won't open the app; dismissable notification with full height BigTextStyle
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.akon.subtools.R.drawable.ic_notification)
                .setContentTitle("🎉 Happy Birthday!")
                .setContentText(wish)
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(wish)
                        .setBigContentTitle("🎉 Happy Birthday!")
                        .setSummaryText("Birthday Wish"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(false)
                .setAutoCancel(true);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(9999, builder.build());
        } catch (SecurityException e) {
            // Permission disabled
        }
    }

    public static void showDailyQuoteNotification(Context context, com.akon.subtools.models.Quote quote) {
        if (quote == null) return;
        createNotificationChannel(context);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(context, 7777, intent, flags);

        String author = (quote.getAuthor() != null && !quote.getAuthor().trim().isEmpty()) ? " — " + quote.getAuthor() : "";
        String fullText = "\"" + quote.getText() + "\"" + author;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.akon.subtools.R.drawable.ic_notification)
                .setContentTitle(getDynamicQuoteTitle())
                .setContentText(quote.getText())
                .setStyle(new NotificationCompat.BigTextStyle().bigText(fullText))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(7777, builder.build());
        } catch (SecurityException e) {
            // Permission disabled
        }
    }

    private static String getDynamicQuoteTitle() {
        int hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY);
        String[] titles;
        if (hour < 12) {
            titles = new String[]{
                    "🌅 Morning Inspiration",
                    "☀️ Morning Thought",
                    "✨ Morning Wisdom",
                    "💡 Daily Motivation"
            };
        } else {
            titles = new String[]{
                    "🌆 Evening Reflection",
                    "🌙 Evening Thought",
                    "✨ Daily Inspiration",
                    "🌟 Evening Wisdom"
            };
        }
        return titles[new java.util.Random().nextInt(titles.length)];
    }

    public static void showAcademicReminderNotification(Context context, String type, String title, String courseCode, String dueTime) {
        createNotificationChannel(context);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        intent.putExtra("navigate_to", "academic_reminders");

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(context, (int) System.currentTimeMillis(), intent, flags);

        String heading = "🔔 " + type + " Reminder: " + courseCode;
        String content = title + " is due at " + dueTime + ". Make sure you are prepared!";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.akon.subtools.R.drawable.ic_notification)
                .setContentTitle(heading)
                .setContentText(content)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify((int) System.currentTimeMillis(), builder.build());
        } catch (SecurityException ignored) {}
    }

    public static void showClassRoutineNotification(Context context, String subject, String classroom, String startTime) {
        if (context == null || subject == null) return;
        createNotificationChannel(context);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("navigate_to", "routine");

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        int notifId = (subject + startTime).hashCode();
        PendingIntent pendingIntent = PendingIntent.getActivity(context, notifId, intent, flags);

        String heading = "🔔 Upcoming Class: " + subject;
        String content = "Your class '" + subject + "' is starting at " + (startTime != null ? startTime : "soon") + ".\n📍 Room: " + (classroom != null ? classroom : "N/A");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.akon.subtools.R.drawable.ic_notification)
                .setContentTitle(heading)
                .setContentText(content)
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(content)
                        .setBigContentTitle(heading)
                        .setSummaryText("Class Routine Reminder"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(notifId, builder.build());
        } catch (SecurityException ignored) {}
    }

    public static void showExamNotification(Context context, String examType, String courseTitle, String courseCode, String examDate, String examTime, String room) {
        if (context == null) return;
        createNotificationChannel(context);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("navigate_to", "exam_routine");

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        int notifId = (courseCode + examDate + examType).hashCode();
        PendingIntent pendingIntent = PendingIntent.getActivity(context, notifId, intent, flags);

        String typeLabel = (examType != null && !examType.isEmpty()) ? examType : "Exam";
        String heading = "📝 Upcoming " + typeLabel + ": " + (!courseCode.isEmpty() ? courseCode : courseTitle);
        String details = (courseTitle != null && !courseTitle.isEmpty() ? courseTitle + "\n" : "")
                + "📅 Date: " + (examDate != null ? examDate : "TBA") + "\n"
                + "⏰ Time: " + (examTime != null ? examTime : "TBA") + "\n"
                + "📍 Location: Room " + (room != null && !room.isEmpty() ? room : "TBA");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.akon.subtools.R.drawable.ic_notification)
                .setContentTitle(heading)
                .setContentText(details)
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(details)
                        .setBigContentTitle(heading)
                        .setSummaryText(typeLabel + " Reminder"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(notifId, builder.build());
        } catch (SecurityException ignored) {}
    }

    public static void initChannels(Context context) {
        if (context == null) return;
        createNotificationChannel(context);
    }

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(CHANNEL_DESC);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
