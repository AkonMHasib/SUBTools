package com.akon.subtools.coordinator.utils;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class DateUtils {

    public static String getTodayWeekday() {
        SimpleDateFormat sdf = new SimpleDateFormat("EEEE", Locale.US);
        return sdf.format(new Date());
    }

    public static String getCurrentDateString() {
        SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy", Locale.US);
        return sdf.format(new Date());
    }

    public static String getTodayIsoDate() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        return sdf.format(new Date());
    }

    public static String formatDateToDDMMYYYY(Object rawDate) {
        if (rawDate == null) return "N/A";

        if (rawDate instanceof Date) {
            SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy", Locale.US);
            return sdf.format((Date) rawDate);
        }

        String str = rawDate.toString().trim();
        if (str.isEmpty()) return "N/A";

        // If already DD/MM/YYYY
        if (str.matches("^\\d{2}[/\\-]\\d{2}[/\\-]\\d{4}$")) {
            return str.replace("-", "/");
        }

        // If YYYY-MM-DD
        if (str.matches("^\\d{4}[/\\-]\\d{2}[/\\-]\\d{2}$")) {
            try {
                SimpleDateFormat inFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                SimpleDateFormat outFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.US);
                Date date = inFormat.parse(str.replace("/", "-"));
                if (date != null) return outFormat.format(date);
            } catch (Exception ignored) {}
        }

        try {
            long millis = Long.parseLong(str);
            SimpleDateFormat outFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.US);
            return outFormat.format(new Date(millis));
        } catch (Exception ignored) {}

        return str;
    }

    public static String formatTime12Hour(int hourOfDay, int minute) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, hourOfDay);
        cal.set(Calendar.MINUTE, minute);
        SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.US);
        return sdf.format(cal.getTime());
    }
}
