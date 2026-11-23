package com.akon.subtools.alarms;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.akon.subtools.models.Routine;

import java.util.Calendar;
import java.util.List;

public class ClassAlarmScheduler {
    private static final String TAG = "ClassAlarmScheduler";

    public static void scheduleAlarms(Context context, List<Routine> routines) {
        if (context == null || routines == null || routines.isEmpty()) return;

        java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
            try {
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (alarmManager == null) return;

                for (Routine r : routines) {
                    if (r == null || r.getStartTime() == null || r.getDay() == null) continue;

                    int intentId = getRoutineUniqueId(r);

                    // Cancel previous alarm if it exists
                    Intent intent = new Intent(context, ClassAlarmReceiver.class);
                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                            context,
                            intentId,
                            intent,
                            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
                    );
                    if (pendingIntent != null) {
                        alarmManager.cancel(pendingIntent);
                        pendingIntent.cancel();
                    }

                    // Calculate alarm time
                    Calendar alarmTime = getAlarmTimeForRoutine(r);
                    if (alarmTime == null) continue;

                    // Only schedule if the alarm time is in the future
                    if (alarmTime.getTimeInMillis() > System.currentTimeMillis()) {
                        Intent alarmIntent = new Intent(context, ClassAlarmReceiver.class);
                        alarmIntent.putExtra("subject", r.getSubject());
                        alarmIntent.putExtra("classroom", r.getFormattedLocation());
                        alarmIntent.putExtra("routine_id_hash", intentId);

                        PendingIntent playPendingIntent = PendingIntent.getBroadcast(
                                context,
                                intentId,
                                alarmIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );

                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                if (alarmManager.canScheduleExactAlarms()) {
                                    alarmManager.setExactAndAllowWhileIdle(
                                            AlarmManager.RTC_WAKEUP,
                                            alarmTime.getTimeInMillis(),
                                            playPendingIntent
                                    );
                                } else {
                                    alarmManager.setAndAllowWhileIdle(
                                            AlarmManager.RTC_WAKEUP,
                                            alarmTime.getTimeInMillis(),
                                            playPendingIntent
                                    );
                                }
                            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                alarmManager.setExactAndAllowWhileIdle(
                                        AlarmManager.RTC_WAKEUP,
                                        alarmTime.getTimeInMillis(),
                                        playPendingIntent
                                );
                            } else {
                                alarmManager.setExact(
                                        AlarmManager.RTC_WAKEUP,
                                        alarmTime.getTimeInMillis(),
                                        playPendingIntent
                                );
                            }
                        } catch (Exception e) {
                            try {
                                alarmManager.set(
                                        AlarmManager.RTC_WAKEUP,
                                        alarmTime.getTimeInMillis(),
                                        playPendingIntent
                                );
                            } catch (Exception ignored) {}
                        }
                    }
                }
            } catch (Exception ignored) {}
        });
    }

    private static int getRoutineUniqueId(Routine r) {
        String key = r.getDay() + "_" + r.getStartTime() + "_" + r.getCode();
        return Math.abs(key.hashCode());
    }

    private static Calendar getAlarmTimeForRoutine(Routine r) {
        String day = r.getDay();
        String startTimeStr = r.getStartTime();

        int targetDayOfWeek = getDayOfWeekInt(day);
        if (targetDayOfWeek == -1) return null;

        int startHour = 0;
        int startMinute = 0;
        try {
            String cleanTime = startTimeStr.trim().toUpperCase();
            if (cleanTime.contains("AM") || cleanTime.contains("PM")) {
                boolean isPm = cleanTime.contains("PM");
                String justTime = cleanTime.replace("AM", "").replace("PM", "").trim();
                String[] parts = justTime.split(":");
                startHour = Integer.parseInt(parts[0]);
                startMinute = Integer.parseInt(parts[1]);
                if (isPm && startHour < 12) {
                    startHour += 12;
                } else if (!isPm && startHour == 12) {
                    startHour = 0;
                }
            } else {
                String[] parts = cleanTime.split(":");
                startHour = Integer.parseInt(parts[0]);
                startMinute = Integer.parseInt(parts[1]);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }

        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, startHour);
        calendar.set(Calendar.MINUTE, startMinute);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);

        int currentDayOfWeek = calendar.get(Calendar.DAY_OF_WEEK);
        int daysDiff = targetDayOfWeek - currentDayOfWeek;
        if (daysDiff < 0) {
            daysDiff += 7;
        } else if (daysDiff == 0) {
            long alarmTimeMs = calendar.getTimeInMillis() - (30 * 60 * 1000L);
            if (alarmTimeMs <= System.currentTimeMillis()) {
                daysDiff = 7;
            }
        }
        calendar.add(Calendar.DAY_OF_YEAR, daysDiff);

        // Subtract 30 minutes
        calendar.add(Calendar.MINUTE, -30);

        return calendar;
    }

    private static int getDayOfWeekInt(String day) {
        if (day == null) return -1;
        switch (day.trim().toLowerCase()) {
            case "sunday": return Calendar.SUNDAY;
            case "monday": return Calendar.MONDAY;
            case "tuesday": return Calendar.TUESDAY;
            case "wednesday": return Calendar.WEDNESDAY;
            case "thursday": return Calendar.THURSDAY;
            case "friday": return Calendar.FRIDAY;
            case "saturday": return Calendar.SATURDAY;
            default: return -1;
        }
    }
}
