package com.akon.subtools.utils;

import android.content.Context;
import android.graphics.Canvas;
import com.akon.subtools.models.User;

public interface CoverPageTemplate {
    String getName();
    String getDescription();
    default void drawCoverPage(
            Context context,
            Canvas canvas,
            int pageWidth,
            int pageHeight,
            User student,
            String subjectCode,
            String subjectName,
            String teacherName,
            String assignmentTitle,
            String assignmentNum,
            String examType,
            String submissionDate,
            String section
    ) {
        drawCoverPage(context, canvas, pageWidth, pageHeight, student, subjectCode, subjectName, teacherName, assignmentTitle, assignmentNum, examType, submissionDate, section, null);
    }

    default void drawCoverPage(
            Context context,
            Canvas canvas,
            int pageWidth,
            int pageHeight,
            User student,
            String subjectCode,
            String subjectName,
            String teacherName,
            String assignmentTitle,
            String assignmentNum,
            String examType,
            String submissionDate,
            String section,
            android.graphics.Typeface customTypeface
    ) {
        drawCoverPage(context, canvas, pageWidth, pageHeight, student, subjectCode, subjectName, teacherName, assignmentTitle, assignmentNum, examType, submissionDate, section);
    }

    static java.util.List<String> splitTeachers(String teacherName) {
        java.util.List<String> list = new java.util.ArrayList<>();
        if (teacherName == null || teacherName.trim().isEmpty()) return list;
        String[] parts = teacherName.split("(?i)[,\\n\\r/]+|\\band\\b");
        for (String p : parts) {
            String trimmed = p.trim();
            if (!trimmed.isEmpty()) {
                list.add(trimmed);
            }
        }
        if (list.isEmpty() && !teacherName.trim().isEmpty()) {
            list.add(teacherName.trim());
        }
        return list;
    }

    static float drawTeacherNames(Canvas canvas, String teacherName, float x, float startY, float lineSpacing, android.graphics.Paint paint) {
        java.util.List<String> teachers = splitTeachers(teacherName);
        if (teachers.isEmpty()) {
            canvas.drawText("Course Faculty", x, startY, paint);
            return startY;
        }
        float currentY = startY;
        for (int i = 0; i < teachers.size(); i++) {
            canvas.drawText(teachers.get(i), x, currentY, paint);
            if (i < teachers.size() - 1) {
                currentY += lineSpacing;
            }
        }
        return currentY;
    }
}
