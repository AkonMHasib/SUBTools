package com.akon.subtools.utils;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class QuoteDisplayManager {

    private static final String PREF_NAME = "subtools_quote_tracker";
    private static final String KEY_DATE = "quote_last_date";
    private static final String KEY_COUNT = "quote_count_today";
    private static final int MAX_QUOTES_PER_DAY = 2;

    private static String getTodayString() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    public static synchronized boolean canShowQuoteToday(Context context) {
        if (context == null) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String today = getTodayString();
        String lastDate = prefs.getString(KEY_DATE, "");

        if (!today.equals(lastDate)) {
            // New day: reset counter
            prefs.edit()
                    .putString(KEY_DATE, today)
                    .putInt(KEY_COUNT, 0)
                    .apply();
            return true;
        }

        int currentCount = prefs.getInt(KEY_COUNT, 0);
        return currentCount < MAX_QUOTES_PER_DAY;
    }

    public static synchronized void recordQuoteDisplay(Context context) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String today = getTodayString();
        String lastDate = prefs.getString(KEY_DATE, "");

        int currentCount = 0;
        if (today.equals(lastDate)) {
            currentCount = prefs.getInt(KEY_COUNT, 0);
        }

        prefs.edit()
                .putString(KEY_DATE, today)
                .putInt(KEY_COUNT, currentCount + 1)
                .apply();
    }
}
