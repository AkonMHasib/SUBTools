package com.akon.subtools.coordinator.utils;

import com.akon.subtools.coordinator.data.model.BusRoute;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class GpsReminderUtils {

    public static class ReminderStatus {
        public String statusText;
        public String shortStatus;
        public int daysElapsed;
        public int daysRemaining;
        public int overdueDays;
        public boolean isDue;
        public boolean isOverdue;
        public String lastUpdatedStr;
        public String updatedBy;
        public String nextReminderStr;
    }

    public static ReminderStatus getStatus(BusRoute bus) {
        ReminderStatus status = new ReminderStatus();
        if (bus == null || bus.getGpsUrl() == null || bus.getGpsUrl().trim().isEmpty()) {
            status.statusText = "No GPS URL Set";
            status.shortStatus = "No GPS URL Set";
            status.lastUpdatedStr = "Never";
            status.updatedBy = "N/A";
            status.nextReminderStr = "N/A";
            status.isDue = false;
            status.isOverdue = false;
            status.daysElapsed = 0;
            status.daysRemaining = 20;
            status.overdueDays = 0;
            return status;
        }

        String lastUpdatedRaw = bus.getLastGpsUrlUpdatedAt();
        Date lastUpdatedDate = parseIsoDate(lastUpdatedRaw);
        if (lastUpdatedDate == null) {
            status.statusText = "🔴 GPS URL Overdue";
            status.shortStatus = "⚠ Update Required";
            status.lastUpdatedStr = "Never";
            status.updatedBy = (bus.getLastGpsUrlUpdatedBy() != null && !bus.getLastGpsUrlUpdatedBy().isEmpty())
                    ? bus.getLastGpsUrlUpdatedBy() : "Admin";
            status.nextReminderStr = "Overdue";
            status.isDue = true;
            status.isOverdue = true;
            status.daysElapsed = 25;
            status.daysRemaining = 0;
            status.overdueDays = 5;
            return status;
        }

        long nowMs = System.currentTimeMillis();
        long diffMs = Math.max(0, nowMs - lastUpdatedDate.getTime());
        int daysElapsed = (int) (diffMs / (1000 * 60 * 60 * 24));

        Date nextReminderDate = parseIsoDate(bus.getNextGpsReminderAt());
        if (nextReminderDate == null) {
            nextReminderDate = new Date(lastUpdatedDate.getTime() + (20L * 24 * 60 * 60 * 1000));
        }

        int daysRemaining = Math.max(0, 20 - daysElapsed);
        int overdueDays = Math.max(0, daysElapsed - 20);

        SimpleDateFormat displayFormat = new SimpleDateFormat("dd MMM yyyy", Locale.US);
        displayFormat.setTimeZone(TimeZone.getTimeZone("Asia/Dhaka"));

        status.lastUpdatedStr = displayFormat.format(lastUpdatedDate);
        status.nextReminderStr = displayFormat.format(nextReminderDate);
        status.updatedBy = (bus.getLastGpsUrlUpdatedBy() != null && !bus.getLastGpsUrlUpdatedBy().isEmpty())
                ? bus.getLastGpsUrlUpdatedBy() : "Admin";

        status.daysElapsed = daysElapsed;
        status.daysRemaining = daysRemaining;
        status.overdueDays = overdueDays;

        if (daysElapsed > 20) {
            status.isDue = true;
            status.isOverdue = true;
            status.statusText = "🔴 " + overdueDays + " " + (overdueDays == 1 ? "day" : "days") + " overdue";
            status.shortStatus = "🔴 " + overdueDays + "d overdue";
        } else if (daysElapsed == 20) {
            status.isDue = true;
            status.isOverdue = false;
            status.statusText = "🔴 Due Today";
            status.shortStatus = "🔴 Due Today";
        } else if (daysRemaining <= 3) {
            status.isDue = (daysRemaining <= 2);
            status.isOverdue = false;
            status.statusText = "🟡 " + daysRemaining + " " + (daysRemaining == 1 ? "day" : "days") + " remaining";
            status.shortStatus = "🟡 " + daysRemaining + "d remaining";
        } else {
            status.isDue = false;
            status.isOverdue = false;
            status.statusText = "✓ Up to Date (" + daysRemaining + " days remaining)";
            status.shortStatus = "✓ Up to Date (" + daysRemaining + "d remaining)";
        }

        return status;
    }

    private static Date parseIsoDate(String isoStr) {
        if (isoStr == null || isoStr.trim().isEmpty()) return null;
        String clean = isoStr.trim();
        String[] formats = {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd",
            "dd MMM yyyy"
        };
        for (String fmt : formats) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(fmt, Locale.US);
                sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                return sdf.parse(clean);
            } catch (Exception ignored) {}
        }
        return null;
    }

    public static String formatIsoNow() {
        SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        isoFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
        return isoFormat.format(new Date());
    }

    public static String formatIsoDaysFromNow(int days) {
        SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        isoFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
        return isoFormat.format(new Date(System.currentTimeMillis() + (days * 24L * 60 * 60 * 1000)));
    }
}
