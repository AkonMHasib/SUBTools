package com.akon.subtools.utils;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import com.akon.subtools.models.User;

public class MinimalTemplate implements CoverPageTemplate {
    @Override
    public String getName() {
        return "Modern Minimal";
    }

    @Override
    public String getDescription() {
        return "A clean, borderless design with modern layouts and elegant alignments.";
    }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section, android.graphics.Typeface customTypeface) {
        Paint textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setAntiAlias(true);
        if (customTypeface != null) {
            textPaint.setTypeface(customTypeface);
        }

        Paint accentLinePaint = new Paint();
        accentLinePaint.setColor(Color.parseColor("#2563EB")); // Primary brand color accent line
        accentLinePaint.setStrokeWidth(3f);

        // Draw University Logo
        try {
            java.io.InputStream is = context.getAssets().open("images/coverpage/sub_logo.png");
            Bitmap logo = android.graphics.BitmapFactory.decodeStream(is);
            if (logo != null) {
                float logoSize = 30f;
                float left = 50f;
                float top = 15f;
                canvas.drawBitmap(logo, null, new RectF(left, top, left + logoSize, top + logoSize), null);
                logo.recycle();
            }
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Draw top brand line
        canvas.drawLine(50, 52, 150, 52, accentLinePaint);

        // University Name & Dept
        textPaint.setTextAlign(Paint.Align.LEFT);
        textPaint.setTextSize(18f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", 50, 85, textPaint);

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);
        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());
        canvas.drawText(deptTitle.toUpperCase(), 50, 105, textPaint);

        // Subject Code & Title
        textPaint.setTextSize(14f);
        textPaint.setFakeBoldText(true);
        canvas.drawText(subjectCode + " : " + subjectName, 50, 160, textPaint);

        // Main Document Info
        textPaint.setTextSize(26f);
        textPaint.setFakeBoldText(true);
        canvas.drawText(examType.toUpperCase(), 50, 250, textPaint);

        textPaint.setTextSize(13f);
        textPaint.setFakeBoldText(false);
        canvas.drawText("Number: " + assignmentNum, 50, 285, textPaint);
        canvas.drawText("Title: " + assignmentTitle, 50, 305, textPaint);
        canvas.drawText("Submission Date: " + submissionDate, 50, 325, textPaint);

        // Submitted columns
        int columnsY = 410;

        // Submitted By
        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("Submitted By:", 50, columnsY, textPaint);
        textPaint.setFakeBoldText(false);
        textPaint.setTextSize(11f);
        canvas.drawText(student.getName(), 50, columnsY + 18, textPaint);
        canvas.drawText("ID: " + student.getStudentId(), 50, columnsY + 34, textPaint);
        String batchStr = "Batch: " + student.getBatch();
        if (section != null && !section.trim().isEmpty()) {
            batchStr += " (Sec: " + section.trim() + ")";
        }
        canvas.drawText(batchStr, 50, columnsY + 50, textPaint);

        // Submitted To
        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("Submitted To:", 320, columnsY, textPaint);
        textPaint.setFakeBoldText(false);
        textPaint.setTextSize(11f);
        float lastTeacherY = CoverPageTemplate.drawTeacherNames(canvas, teacherName, 320, columnsY + 18, 16f, textPaint);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), 320, lastTeacherY + 16, textPaint);
        canvas.drawText("State University of Bangladesh", 320, lastTeacherY + 32, textPaint);
    }
}
