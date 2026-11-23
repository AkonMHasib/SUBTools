package com.akon.subtools.alarms;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.akon.subtools.models.User;
import com.akon.subtools.database.AppDatabase;
import com.akon.subtools.utils.NotificationHelper;
import java.util.Calendar;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class BirthdayScheduler {
    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void scheduleDailyCheck(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, BirthdayReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                8888,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);

        // If midnight has already passed today, schedule for tomorrow
        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            calendar.getTimeInMillis(),
                            pendingIntent
                    );
                } else {
                    alarmManager.setAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            calendar.getTimeInMillis(),
                            pendingIntent
                    );
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.getTimeInMillis(),
                        pendingIntent
                );
            } else {
                alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        calendar.getTimeInMillis(),
                        pendingIntent
                );
            }
        } catch (Exception e) {
            try {
                alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        calendar.getTimeInMillis(),
                        pendingIntent
                );
            } catch (Exception ignored) {}
        }
    }

    public static void checkBirthdayOnStartup(Context context, User user) {
        if (user == null || user.getDob() == null || user.getDob().isEmpty()) return;

        executor.execute(() -> {
            Calendar today = Calendar.getInstance();
            int currentYear = today.get(Calendar.YEAR);
            int currentMonth = today.get(Calendar.MONTH) + 1;
            int currentDay = today.get(Calendar.DAY_OF_MONTH);

            String dobStr = user.getDob().trim();
            String[] parts = dobStr.split("/");
            if (parts.length < 2) return;

            try {
                int dobDay = Integer.parseInt(parts[0]);
                int dobMonth = Integer.parseInt(parts[1]);

                if (dobDay == currentDay && dobMonth == currentMonth) {
                    if (user.getLastBirthdayWishedYear() != currentYear) {
                        String wish = getBirthdayWish(user);
                        NotificationHelper.showBirthdayNotification(context, wish);

                        user.setLastBirthdayWishedYear(currentYear);
                        AppDatabase.getDatabase(context).userDao().insertUser(user);

                        if (user.getUid() != null && !user.getUid().isEmpty()) {
                            try {
                                org.json.JSONObject updateJson = new org.json.JSONObject();
                                updateJson.put("last_birthday_wished_year", currentYear);
                                updateJson.put("lastBirthdayWishedYear", currentYear);
                                org.json.JSONArray bArr = new org.json.JSONArray();
                                if (user.getUsedBirthdayMessages() != null) {
                                    for (String m : user.getUsedBirthdayMessages()) bArr.put(m);
                                }
                                updateJson.put("used_birthday_messages", bArr);
                                updateJson.put("usedBirthdayMessages", bArr);

                                com.akon.subtools.utils.SupabaseAuthBridge.getInstance(context)
                                        .updateRecord("users", "id=eq." + user.getUid(), updateJson, null);
                            } catch (Exception ignored) {}
                        }
                    }
                }
            } catch (Exception ignored) {}
        });
    }

    private static String getBirthdayWish(User user) {
        String name = user.getName() != null ? user.getName() : "Student";
        String firstName = name.split(" ")[0];

        boolean isMale = "Male".equalsIgnoreCase(user.getGender());
        int msgIndex = user.selectUnusedBirthdayMessageIndex(5);

        String[] maleWishes = {
            "🎉 Happy Birthday, " + firstName + "!\n\nToday marks another step toward becoming the man you're meant to be. May this year bring you confidence, success in your studies and career, financial growth, loyal friends, and someone who truly loves and respects you. Never stop believing in yourself—you have great things ahead.\n\n— From Akon M Hasib",
            "🥳 Happy Birthday, " + firstName + "!\n\nMay your dreams become plans, your plans become achievements, and your achievements inspire others. Wishing you strength during challenges, wisdom in every decision, a successful career, and a love story that brings peace and happiness into your life.\n\n— From Akon M Hasib",
            "🎂 Happy Birthday, " + firstName + "!\n\nAnother year means another opportunity to grow stronger, smarter, and more successful. May your hard work always pay off, your family stay proud of you, your heart find genuine love, and your future exceed every expectation.\n\n— From Akon M Hasib",
            "🎈 Happy Birthday, " + firstName + "!\n\nMay this new chapter be filled with exciting opportunities, unforgettable adventures, good health, and endless success. Keep working hard, stay humble, and never settle for less than the life you deserve.\n\n— From Akon M Hasib",
            "🎊 Happy Birthday, " + firstName + "!\n\nThe future belongs to those who refuse to give up. May you achieve every goal you set, build a meaningful career, find true happiness, and meet someone who stands beside you through every season of life. Have an amazing birthday!\n\n— From Akon M Hasib"
        };

        String[] femaleWishes = {
            "🌸 Happy Birthday, " + firstName + "!\n\nYour smile, kindness, and beautiful spirit make the world a brighter place. May this year bring you happiness, a successful career, wonderful memories, meaningful relationships, and a life filled with love and laughter.\n\n— From Akon M Hasib",
            "🎉 Happy Birthday, " + firstName + "!\n\nMay your confidence continue to shine as brightly as your beautiful heart. Wishing you success in everything you pursue, endless joy, supportive friends, and someone who truly appreciates, respects, and loves you.\n\n— From Akon M Hasib",
            "🎂 Happy Birthday, " + firstName + "!\n\nToday is all about celebrating you. May your dreams come true, your future be brighter than ever, your career flourish, and your life be filled with genuine love, peace, and unforgettable moments.\n\n— From Akon M Hasib",
            "🌷 Happy Birthday, " + firstName + "!\n\nMay your elegance, confidence, and inner beauty continue to inspire everyone around you. Wishing you success, happiness, good health, and a relationship filled with trust, respect, and endless smiles.\n\n— From Akon M Hasib",
            "🎈 Happy Birthday, " + firstName + "!\n\nMay every new year make you stronger, wiser, happier, and even more confident. Wishing you a fulfilling career, beautiful memories, lasting friendships, and a lifetime of love, happiness, and success. Enjoy your special day!\n\n— From Akon M Hasib"
        };

        if (isMale) {
            return maleWishes[msgIndex];
        } else {
            return femaleWishes[msgIndex];
        }
    }
}
