package com.akon.subtools.alarms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.akon.subtools.utils.NotificationHelper;

public class ExamAlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        String examType = intent.getStringExtra("exam_type");
        String courseCode = intent.getStringExtra("course_code");
        String courseTitle = intent.getStringExtra("course_title");
        String examDate = intent.getStringExtra("exam_date");
        String examTime = intent.getStringExtra("exam_time");
        String room = intent.getStringExtra("room");
        boolean isDayBefore = intent.getBooleanExtra("is_day_before", false);

        if (examType == null || examType.isEmpty()) examType = "Exam";
        if (courseCode == null) courseCode = "";
        if (courseTitle == null) courseTitle = "";

        if (isDayBefore) {
            NotificationHelper.showExamNotification(context, examType, courseTitle + " (Tomorrow)", courseCode, examDate, examTime, room);
        } else {
            NotificationHelper.showExamNotification(context, examType, courseTitle, courseCode, examDate, examTime, room);
        }
    }
}
