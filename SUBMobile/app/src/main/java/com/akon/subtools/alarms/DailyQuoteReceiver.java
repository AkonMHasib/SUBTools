package com.akon.subtools.alarms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.akon.subtools.database.AppDatabase;
import com.akon.subtools.database.QuoteDao;
import com.akon.subtools.models.Quote;
import com.akon.subtools.utils.NotificationHelper;

public class DailyQuoteReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        // Re-schedule alarm for tomorrow's 6:00 AM
        DailyQuoteScheduler.scheduleDailyQuoteAlarm(context);

        AppDatabase.databaseWriteExecutor.execute(() -> {
            if (!com.akon.subtools.utils.QuoteDisplayManager.canShowQuoteToday(context)) {
                return;
            }

            AppDatabase.performSeed(context);
            AppDatabase db = AppDatabase.getDatabase(context);
            QuoteDao dao = db.quoteDao();

            // Pick a purely random quote directly
            Quote quote = dao.getRandomQuote();
            if (quote != null) {
                com.akon.subtools.utils.QuoteDisplayManager.recordQuoteDisplay(context);
                NotificationHelper.showDailyQuoteNotification(context, quote);
            }
        });
    }
}
