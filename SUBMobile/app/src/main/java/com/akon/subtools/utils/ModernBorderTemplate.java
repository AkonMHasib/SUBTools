package com.akon.subtools.utils;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;

import com.akon.subtools.models.User;

public class ModernBorderTemplate implements CoverPageTemplate {

    @Override
    public String getName() {
        return "Modern Border";
    }

    @Override
    public String getDescription() {
        return "Double border framing with decorative corner bracket elements.";
    }

    @Override
    public void drawCoverPage(
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

        Paint textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setAntiAlias(true);
        if (customTypeface != null) {
            textPaint.setTypeface(customTypeface);
        }

        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.BLACK);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(1f);

        // ==========================
        // Outer & Inner Borders
        // ==========================

        canvas.drawRect(25, 25, pageWidth - 25, pageHeight - 25, borderPaint);
        canvas.drawRect(30, 30, pageWidth - 30, pageHeight - 30, borderPaint);

        // ==========================
        // Corner Brackets
        // ==========================

        Paint cornerPaint = new Paint();
        cornerPaint.setColor(Color.BLACK);
        cornerPaint.setStrokeWidth(3f);

        // Top Left
        canvas.drawLine(20, 20, 45, 20, cornerPaint);
        canvas.drawLine(20, 20, 20, 45, cornerPaint);

        // Top Right
        canvas.drawLine(pageWidth - 20, 20, pageWidth - 45, 20, cornerPaint);
        canvas.drawLine(pageWidth - 20, 20, pageWidth - 20, 45, cornerPaint);

        // Bottom Left
        canvas.drawLine(20, pageHeight - 20, 45, pageHeight - 20, cornerPaint);
        canvas.drawLine(20, pageHeight - 20, 20, pageHeight - 45, cornerPaint);

        // Bottom Right
        canvas.drawLine(pageWidth - 20, pageHeight - 20, pageWidth - 45, pageHeight - 20, cornerPaint);
        canvas.drawLine(pageWidth - 20, pageHeight - 20, pageWidth - 20, pageHeight - 45, cornerPaint);

        // ==========================
        // University Logo
        // ==========================

        try {
            java.io.InputStream is = context.getAssets().open("images/coverpage/sub_logo.png");

            Bitmap logo = BitmapFactory.decodeStream(is);

            if (logo != null) {

                float logoSize = 35f;

                float left = (pageWidth - logoSize) / 2f;
                float top = 36f;

                canvas.drawBitmap(
                        logo,
                        null,
                        new RectF(left, top, left + logoSize, top + logoSize),
                        null
                );

                logo.recycle();
            }

            is.close();

        } catch (Exception e) {
            e.printStackTrace();
        }

        // ==========================
        // Header
        // ==========================

        textPaint.setTextAlign(Paint.Align.CENTER);

        textPaint.setTextSize(19f);
        textPaint.setFakeBoldText(true);
        canvas.drawText(
                "STATE UNIVERSITY OF BANGLADESH",
                pageWidth / 2f,
                95,
                textPaint
        );

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);

        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());

        canvas.drawText(
                deptTitle.toUpperCase(),
                pageWidth / 2f,
                118,
                textPaint
        );

        // Divider

        Paint linePaint = new Paint();
        linePaint.setColor(Color.BLACK);
        linePaint.setStrokeWidth(1f);

        canvas.drawLine(
                60,
                140,
                pageWidth - 60,
                140,
                linePaint
        );

        // ==========================
        // Subject
        // ==========================

        textPaint.setTextSize(14f);
        textPaint.setFakeBoldText(true);

        canvas.drawText(
                subjectCode + " : " + subjectName,
                pageWidth / 2f,
                180,
                textPaint
        );

        // ==========================
        // Assignment Box
        // ==========================

        Paint boxPaint = new Paint();
        boxPaint.setColor(Color.parseColor("#F9FAFB"));
        boxPaint.setStyle(Paint.Style.FILL);

        canvas.drawRect(
                60,
                220,
                pageWidth - 60,
                410,
                boxPaint
        );

        Paint boxBorderPaint = new Paint();
        boxBorderPaint.setColor(Color.BLACK);
        boxBorderPaint.setStyle(Paint.Style.STROKE);
        boxBorderPaint.setStrokeWidth(1f);

        canvas.drawRect(
                60,
                220,
                pageWidth - 60,
                410,
                boxBorderPaint
        );

        // ==========================
        // Assignment Details
        // ==========================

        textPaint.setTextAlign(Paint.Align.CENTER);

        textPaint.setTextSize(18f);
        textPaint.setFakeBoldText(true);

        canvas.drawText(
                examType.toUpperCase(),
                pageWidth / 2f,
                255,
                textPaint
        );

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);

        canvas.drawText(
                "Number: " + assignmentNum,
                pageWidth / 2f,
                290,
                textPaint
        );

        canvas.drawText(
                "Title: " + assignmentTitle,
                pageWidth / 2f,
                320,
                textPaint
        );

        canvas.drawText(
                "Submission Date: " + submissionDate,
                pageWidth / 2f,
                350,
                textPaint
        );

        // ==========================
        // Student & Teacher
        // ==========================

        int columnsY = 465;

        textPaint.setTextAlign(Paint.Align.LEFT);

        // Submitted By
        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("Submitted By:", 65, columnsY, textPaint);
        textPaint.setFakeBoldText(false);
        textPaint.setTextSize(11f);
        canvas.drawText(student.getName(), 65, columnsY + 18, textPaint);
        canvas.drawText("ID: " + student.getStudentId(), 65, columnsY + 36, textPaint);
        String batchStr = "Batch: " + student.getBatch();
        if (section != null && !section.trim().isEmpty()) {
            batchStr += " (Sec: " + section.trim() + ")";
        }
        canvas.drawText(batchStr, 65, columnsY + 54, textPaint);

        // Submitted To
        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("Submitted To:", 335, columnsY, textPaint);
        textPaint.setFakeBoldText(false);
        textPaint.setTextSize(11f);
        float lastTeacherY = CoverPageTemplate.drawTeacherNames(canvas, teacherName, 335, columnsY + 18, 16f, textPaint);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), 335, lastTeacherY + 16, textPaint);
        canvas.drawText("State University of Bangladesh", 335, lastTeacherY + 32, textPaint);
    }
}