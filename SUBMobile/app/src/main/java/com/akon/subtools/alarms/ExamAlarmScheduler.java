package com.akon.subtools.alarms;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.akon.subtools.models.ExamRoutine;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executors;

public class ExamAlarmScheduler {

    public static void scheduleExamAlarms(Context context, List<ExamRoutine> exams) {
        if (context == null || exams == null || exams.isEmpty()) return;

        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (alarmManager == null) return;

                long now = System.currentTimeMillis();

                for (ExamRoutine exam : exams) {
                    if (exam == null || exam.getExamDate() == null || exam.getExamDate().trim().isEmpty()) continue;

                    Date parsedDate = parseExamDate(exam.getExamDate());
                    if (parsedDate == null) continue;

                    int[] hm = parseHourMinute(exam.getExamTime());
                    Calendar examCal = Calendar.getInstance();
                    examCal.setTime(parsedDate);
                    examCal.set(Calendar.HOUR_OF_DAY, hm[0]);
                    examCal.set(Calendar.MINUTE, hm[1]);
                    examCal.set(Calendar.SECOND, 0);
                    examCal.set(Calendar.MILLISECOND, 0);

                    long examStartMs = examCal.getTimeInMillis();
                    if (examStartMs <= now) {
                        continue; // Exam already started or passed
                    }

                    String baseKey = (exam.getId() != null && !exam.getId().isEmpty())
                            ? exam.getId()
                            : (exam.getCourseCode() + "_" + exam.getExamDate() + "_" + exam.getExamType());

                    // 1. Reminder 1: Night before at 8:00 PM (20:00)
                    Calendar nightBefore = (Calendar) examCal.clone();
                    nightBefore.add(Calendar.DAY_OF_YEAR, -1);
                    nightBefore.set(Calendar.HOUR_OF_DAY, 20);
                    nightBefore.set(Calendar.MINUTE, 0);
                    nightBefore.set(Calendar.SECOND, 0);
                    nightBefore.set(Calendar.MILLISECOND, 0);

                    long nightBeforeMs = nightBefore.getTimeInMillis();
                    if (nightBeforeMs > now) {
                        int reqCode = Math.abs((baseKey + "_night_before").hashCode());
                        scheduleSingleAlarm(context, alarmManager, reqCode, nightBeforeMs, exam, true);
                    }

                    // 2. Reminder 2: 2 hours before the exam on exam day
                    long twoHoursBeforeMs = examStartMs - (2 * 60 * 60 * 1000L);
                    if (twoHoursBeforeMs > now) {
                        int reqCode = Math.abs((baseKey + "_2h_before").hashCode());
                        scheduleSingleAlarm(context, alarmManager, reqCode, twoHoursBeforeMs, exam, false);
                    }
                }
            } catch (Exception ignored) {}
        });
    }

    private static void scheduleSingleAlarm(Context context, AlarmManager alarmManager, int reqCode, long triggerTimeMs, ExamRoutine exam, boolean isDayBefore) {
        Intent intent = new Intent(context, ExamAlarmReceiver.class);
        intent.putExtra("exam_type", exam.getExamType());
        intent.putExtra("course_code", exam.getCourseCode());
        intent.putExtra("course_title", exam.getCourseTitle());
        intent.putExtra("exam_date", exam.getExamDate());
        intent.putExtra("exam_time", exam.getExamTime());
        intent.putExtra("room", exam.getRoom());
        intent.putExtra("is_day_before", isDayBefore);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, reqCode, intent, flags);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent);
            }
        } catch (Exception e) {
            try {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent);
            } catch (Exception ignored) {}
        }
    }

    private static Date parseExamDate(String dateStr) {
        if (dateStr == null) return null;
        String[] formats = {
                "yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy", "yyyy/MM/dd",
                "dd MMM yyyy", "dd MMMM yyyy", "MMM dd, yyyy", "MMMM dd, yyyy",
                "d/M/yyyy", "d-M-yyyy"
        };
        for (String f : formats) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(f, Locale.ENGLISH);
                sdf.setLenient(false);
                return sdf.parse(dateStr.trim());
            } catch (Exception ignored) {}
        }
        return null;
    }

    private static int[] parseHourMinute(String timeStr) {
        int hour = 10;
        int minute = 0;
        if (timeStr == null || timeStr.trim().isEmpty()) return new int[]{hour, minute};
        try {
            String clean = timeStr.trim().toUpperCase();
            if (clean.contains("AM") || clean.contains("PM")) {
                boolean isPm = clean.contains("PM");
                String just = clean.replace("AM", "").replace("PM", "").trim();
                String[] parts = just.split(":");
                if (parts.length >= 2) {
                    hour = Integer.parseInt(parts[0].trim());
                    minute = Integer.parseInt(parts[1].trim());
                    if (isPm && hour < 12) hour += 12;
                    else if (!isPm && hour == 12) hour = 0;
                }
            } else if (clean.contains(":")) {
                String[] parts = clean.split(":");
                hour = Integer.parseInt(parts[0].trim());
                minute = Integer.parseInt(parts[1].trim());
            }
        } catch (Exception ignored) {}
        return new int[]{hour, minute};
    }
}
