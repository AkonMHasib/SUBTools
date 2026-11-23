package com.akon.subtools.utils;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import com.akon.subtools.models.User;

public class ClassicTemplate implements CoverPageTemplate {
    @Override
    public String getName() {
        return "Classic SUB Cover";
    }

    @Override
    public String getDescription() {
        return "Traditional State University of Bangladesh cover page format with clean borders.";
    }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section, android.graphics.Typeface customTypeface) {
        // Setup Paint for border
        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.BLACK);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(2f);

        // Setup Paint for text
        Paint textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setAntiAlias(true);
        if (customTypeface != null) {
            textPaint.setTypeface(customTypeface);
        }

        // 1. Draw outer page borders (25pt margins)
        Rect borderRect = new Rect(25, 25, pageWidth - 25, pageHeight - 25);
        canvas.drawRect(borderRect, borderPaint);

        // Draw University Logo
        try {
            java.io.InputStream is = context.getAssets().open("images/coverpage/sub_logo.png");
            Bitmap logo = android.graphics.BitmapFactory.decodeStream(is);
            if (logo != null) {
                float logoSize = 35f;
                float left = (pageWidth - logoSize) / 2f;
                float top = 32f;
                canvas.drawBitmap(logo, null, new RectF(left, top, left + logoSize, top + logoSize), null);
                logo.recycle();
            }
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. University header
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(20f); // Fixed points size
        textPaint.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 90, textPaint);

        textPaint.setTextSize(13f);
        textPaint.setFakeBoldText(false);
        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());
        canvas.drawText(deptTitle.toUpperCase(), pageWidth / 2f, 115, textPaint);

        // Divider
        Paint linePaint = new Paint();
        linePaint.setColor(Color.BLACK);
        linePaint.setStrokeWidth(1.5f);
        canvas.drawLine(50, 135, pageWidth - 50, 135, linePaint);

        // 3. Specific details
        textPaint.setTextAlign(Paint.Align.LEFT);
        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);

        int startY = 220;
        int lineGap = 28;

        canvas.drawText("Course Code:", 60, startY, textPaint);
        textPaint.setFakeBoldText(true);
        canvas.drawText(subjectCode, 180, startY, textPaint);
        textPaint.setFakeBoldText(false);

        canvas.drawText("Course Title:", 60, startY + lineGap, textPaint);
        textPaint.setFakeBoldText(true);
        canvas.drawText(subjectName, 180, startY + lineGap, textPaint);
        textPaint.setFakeBoldText(false);

        canvas.drawText("Number:", 60, startY + (lineGap * 2), textPaint);
        textPaint.setFakeBoldText(true);
        canvas.drawText(assignmentNum, 180, startY + (lineGap * 2), textPaint);
        textPaint.setFakeBoldText(false);

        canvas.drawText("Title:", 60, startY + (lineGap * 3), textPaint);
        textPaint.setFakeBoldText(true);
        canvas.drawText(assignmentTitle, 180, startY + (lineGap * 3), textPaint);
        textPaint.setFakeBoldText(false);

        canvas.drawText("Submission Date:", 60, startY + (lineGap * 4), textPaint);
        textPaint.setFakeBoldText(true);
        canvas.drawText(submissionDate, 180, startY + (lineGap * 4), textPaint);
        textPaint.setFakeBoldText(false);

        // Divider
        canvas.drawLine(50, startY + (lineGap * 5), pageWidth - 50, startY + (lineGap * 5), linePaint);

        // 4. Submission Columns
        int columnsY = startY + (lineGap * 6);

        // Left Column: Submitted By
        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("Submitted By:", 60, columnsY, textPaint);
        textPaint.setFakeBoldText(false);
        textPaint.setTextSize(11f);
        canvas.drawText(student.getName(), 60, columnsY + 18, textPaint);
        canvas.drawText("ID: " + student.getStudentId(), 60, columnsY + 36, textPaint);
        String batchStr = "Batch: " + student.getBatch();
        if (section != null && !section.trim().isEmpty()) {
            batchStr += " (Sec: " + section.trim() + ")";
        }
        canvas.drawText(batchStr, 60, columnsY + 54, textPaint);

        // Right Column: Submitted To
        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("Submitted To:", 340, columnsY, textPaint);
        textPaint.setFakeBoldText(false);
        textPaint.setTextSize(11f);
        float lastTeacherY = CoverPageTemplate.drawTeacherNames(canvas, teacherName, 340, columnsY + 18, 16f, textPaint);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), 340, lastTeacherY + 16, textPaint);
        canvas.drawText("State University of Bangladesh", 340, lastTeacherY + 32, textPaint);
    }
}
