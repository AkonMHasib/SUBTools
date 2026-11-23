package com.akon.subtools.alarms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.akon.subtools.utils.NotificationHelper;

public class AcademicReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String type = intent.getStringExtra("type");
        String title = intent.getStringExtra("title");
        String courseCode = intent.getStringExtra("courseCode");
        String dueTime = intent.getStringExtra("dueTime");

        if (type == null) type = "Academic";
        if (title == null) title = "Upcoming Task";
        if (courseCode == null) courseCode = "Course";
        if (dueTime == null) dueTime = "Soon";

        NotificationHelper.showAcademicReminderNotification(context, type, title, courseCode, dueTime);
    }
}
