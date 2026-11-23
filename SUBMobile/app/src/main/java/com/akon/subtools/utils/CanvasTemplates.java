package com.akon.subtools.utils;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import com.akon.subtools.models.User;

class DottedGreenTemplate implements CoverPageTemplate {
    @Override
    public String getName() { return "Dotted Border (Green)"; }

    @Override
    public String getDescription() { return "Green-themed template with dashed border framing."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.parseColor("#10B981"));
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(2f);
        borderPaint.setPathEffect(new DashPathEffect(new float[]{8, 8}, 0));

        Paint textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setAntiAlias(true);

        canvas.drawRect(25, 25, pageWidth - 25, pageHeight - 25, borderPaint);

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

        // Header
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(19f);
        textPaint.setFakeBoldText(true);
        textPaint.setColor(Color.parseColor("#065F46"));
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 95, textPaint);

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);
        textPaint.setColor(Color.BLACK);
        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());
        canvas.drawText(deptTitle.toUpperCase(), pageWidth / 2f, 118, textPaint);

        Paint linePaint = new Paint();
        linePaint.setColor(Color.parseColor("#10B981"));
        linePaint.setStrokeWidth(1.5f);
        canvas.drawLine(50, 138, pageWidth - 50, 138, linePaint);

        // Info
        textPaint.setTextAlign(Paint.Align.LEFT);
        textPaint.setTextSize(12f);
        int startY = 220;
        int lineGap = 28;

        String[][] details = {
            {"Course Code:", subjectCode},
            {"Course Title:", subjectName},
            {"Number:", assignmentNum},
            {"Title:", assignmentTitle},
            {"Submission Date:", submissionDate}
        };

        for (int i = 0; i < details.length; i++) {
            textPaint.setFakeBoldText(false);
            canvas.drawText(details[i][0], 60, startY + (lineGap * i), textPaint);
            textPaint.setFakeBoldText(true);
            canvas.drawText(details[i][1], 185, startY + (lineGap * i), textPaint);
        }

        canvas.drawLine(50, startY + (lineGap * 5), pageWidth - 50, startY + (lineGap * 5), linePaint);

        int columnsY = startY + (lineGap * 6);

        // Submitted By
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

        // Submitted To
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

class FormalTableTemplate implements CoverPageTemplate {
    @Override
    public String getName() { return "Formal Table"; }

    @Override
    public String getDescription() { return "Structured table grid layout for formal presentations."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        Paint textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setAntiAlias(true);

        Paint tablePaint = new Paint();
        tablePaint.setColor(Color.BLACK);
        tablePaint.setStyle(Paint.Style.STROKE);
        tablePaint.setStrokeWidth(1.5f);

        // Table Borders
        int left = 45, right = pageWidth - 45, top = 45, bottom = pageHeight - 45;
        canvas.drawRect(left, top, right, bottom, tablePaint);

        // Divider lines
        canvas.drawLine(left, 140, right, 140, tablePaint);
        canvas.drawLine(left, 410, right, 410, tablePaint);
        canvas.drawLine(left, 600, right, 600, tablePaint);
        canvas.drawLine(pageWidth / 2f, 600, pageWidth / 2f, bottom, tablePaint);

        // Draw University Logo
        try {
            java.io.InputStream is = context.getAssets().open("images/coverpage/sub_logo.png");
            Bitmap logo = android.graphics.BitmapFactory.decodeStream(is);
            if (logo != null) {
                float logoSize = 35f;
                float logoLeft = (pageWidth - logoSize) / 2f;
                float logoTop = 50f;
                canvas.drawBitmap(logo, null, new RectF(logoLeft, logoTop, logoLeft + logoSize, logoTop + logoSize), null);
                logo.recycle();
            }
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Top Cell - Uni details
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(18f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 100, textPaint);

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);
        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());
        canvas.drawText(deptTitle.toUpperCase(), pageWidth / 2f, 122, textPaint);

        // Middle Section - Assignment Info
        textPaint.setTextAlign(Paint.Align.LEFT);
        textPaint.setTextSize(12f);
        int startY = 190;
        int lineGap = 32;

        String[][] details = {
            {"Course Code:", subjectCode},
            {"Course Title:", subjectName},
            {"Assignment No. / Title:", "No. " + assignmentNum + " : " + assignmentTitle},
            {"Submission Date:", submissionDate}
        };

        for (int i = 0; i < details.length; i++) {
            textPaint.setFakeBoldText(false);
            canvas.drawText(details[i][0], 70, startY + (lineGap * i), textPaint);
            textPaint.setFakeBoldText(true);
            canvas.drawText(details[i][1], 230, startY + (lineGap * i), textPaint);
        }

        // Columns labels
        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("SUBMITTED BY:", 70, 440, textPaint);
        canvas.drawText("SUBMITTED TO:", pageWidth / 2f + 30, 440, textPaint);

        // Student Info
        textPaint.setTextSize(11f);
        textPaint.setFakeBoldText(false);
        canvas.drawText(student.getName(), 70, 475, textPaint);
        canvas.drawText("ID: " + student.getStudentId(), 70, 498, textPaint);
        canvas.drawText("Batch: " + student.getBatch(), 70, 521, textPaint);

        // Teacher Info
        float lastTeacherY = CoverPageTemplate.drawTeacherNames(canvas, teacherName, pageWidth / 2f + 30, 475, 16f, textPaint);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), pageWidth / 2f + 30, lastTeacherY + 16, textPaint);
        canvas.drawText("State University of Bangladesh", pageWidth / 2f + 30, lastTeacherY + 32, textPaint);
    }
}

class HeaderFooterTemplate implements CoverPageTemplate {
    @Override
    public String getName() { return "Header & Footer"; }

    @Override
    public String getDescription() { return "Solid accent bands at the header and footer margins."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        Paint textPaint = new Paint();
        textPaint.setAntiAlias(true);

        Paint bandPaint = new Paint();
        bandPaint.setColor(Color.parseColor("#1E3A8A")); // Dark blue band
        bandPaint.setStyle(Paint.Style.FILL);

        // Header Band
        canvas.drawRect(25, 25, pageWidth - 25, 135, bandPaint);

        // Footer Band
        canvas.drawRect(25, pageHeight - 90, pageWidth - 25, pageHeight - 25, bandPaint);

        // Draw University Logo
        try {
            java.io.InputStream is = context.getAssets().open("images/coverpage/sub_logo.png");
            Bitmap logo = android.graphics.BitmapFactory.decodeStream(is);
            if (logo != null) {
                float logoSize = 35f;
                float logoLeft = (pageWidth - logoSize) / 2f;
                float logoTop = 32f;
                canvas.drawBitmap(logo, null, new RectF(logoLeft, logoTop, logoLeft + logoSize, logoTop + logoSize), null);
                logo.recycle();
            }
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Header Text
        textPaint.setColor(Color.WHITE);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(18f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 90, textPaint);

        textPaint.setTextSize(11f);
        textPaint.setFakeBoldText(false);
        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());
        canvas.drawText(deptTitle.toUpperCase(), pageWidth / 2f, 115, textPaint);

        // Footer Text
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH  •  ESTD. 2002", pageWidth / 2f, pageHeight - 50, textPaint);

        // Middle Info
        textPaint.setColor(Color.BLACK);
        textPaint.setTextAlign(Paint.Align.LEFT);
        textPaint.setTextSize(13f);
        int startY = 220;
        int lineGap = 32;

        String[][] details = {
            {"Course Code:", subjectCode},
            {"Course Title:", subjectName},
            {"Assignment No:", assignmentNum},
            {"Assignment Title:", assignmentTitle},
            {"Submission Date:", submissionDate}
        };

        for (int i = 0; i < details.length; i++) {
            textPaint.setFakeBoldText(false);
            canvas.drawText(details[i][0], 60, startY + (lineGap * i), textPaint);
            textPaint.setFakeBoldText(true);
            canvas.drawText(details[i][1], 195, startY + (lineGap * i), textPaint);
        }

        Paint linePaint = new Paint();
        linePaint.setColor(Color.parseColor("#1E3A8A"));
        linePaint.setStrokeWidth(1.5f);
        canvas.drawLine(50, startY + (lineGap * 5) + 10, pageWidth - 50, startY + (lineGap * 5) + 10, linePaint);

        int columnsY = startY + (lineGap * 6) + 20;

        // Submitted By
        textPaint.setColor(Color.BLACK);
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

        // Submitted To
        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("Submitted To:", 330, columnsY, textPaint);
        textPaint.setFakeBoldText(false);
        textPaint.setTextSize(11f);
        float lastTeacherY = CoverPageTemplate.drawTeacherNames(canvas, teacherName, 330, columnsY + 18, 16f, textPaint);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), 330, lastTeacherY + 16, textPaint);
        canvas.drawText("State University of Bangladesh", 330, lastTeacherY + 32, textPaint);
    }
}

class ModernGreenTemplate implements CoverPageTemplate {
    @Override
    public String getName() { return "Modern Green"; }

    @Override
    public String getDescription() { return "Emerald themed border brackets styling."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        Paint textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setAntiAlias(true);

        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.parseColor("#059669")); // Green
        borderPaint.setStyle(Paint.Style.STROKE);
        
        borderPaint.setStrokeWidth(1f);
        canvas.drawRect(25, 25, pageWidth - 25, pageHeight - 25, borderPaint);

        // Corner L-shapes
        Paint cornerPaint = new Paint();
        cornerPaint.setColor(Color.parseColor("#059669"));
        cornerPaint.setStrokeWidth(3f);
        canvas.drawLine(20, 20, 45, 20, cornerPaint);
        canvas.drawLine(20, 20, 20, 45, cornerPaint);
        canvas.drawLine(pageWidth - 20, 20, pageWidth - 45, 20, cornerPaint);
        canvas.drawLine(pageWidth - 20, 20, pageWidth - 20, 45, cornerPaint);

        // Draw University Logo
        try {
            java.io.InputStream is = context.getAssets().open("images/coverpage/sub_logo.png");
            Bitmap logo = android.graphics.BitmapFactory.decodeStream(is);
            if (logo != null) {
                float logoSize = 35f;
                float logoLeft = (pageWidth - logoSize) / 2f;
                float logoTop = 32f;
                canvas.drawBitmap(logo, null, new RectF(logoLeft, logoTop, logoLeft + logoSize, logoTop + logoSize), null);
                logo.recycle();
            }
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Header
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(18f);
        textPaint.setFakeBoldText(true);
        textPaint.setColor(Color.parseColor("#065F46"));
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 95, textPaint);

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);
        textPaint.setColor(Color.BLACK);
        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());
        canvas.drawText(deptTitle.toUpperCase(), pageWidth / 2f, 118, textPaint);

        Paint linePaint = new Paint();
        linePaint.setColor(Color.parseColor("#059669"));
        linePaint.setStrokeWidth(1f);
        canvas.drawLine(60, 140, pageWidth - 60, 140, linePaint);

        // Subject
        textPaint.setTextSize(14f);
        textPaint.setFakeBoldText(true);
        canvas.drawText(subjectCode + " : " + subjectName, pageWidth / 2f, 180, textPaint);

        // Details Card Box
        Paint boxPaint = new Paint();
        boxPaint.setColor(Color.parseColor("#ECFDF5"));
        boxPaint.setStyle(Paint.Style.FILL);
        canvas.drawRect(60, 220, pageWidth - 60, 410, boxPaint);

        Paint boxBorderPaint = new Paint();
        boxBorderPaint.setColor(Color.parseColor("#059669"));
        boxBorderPaint.setStyle(Paint.Style.STROKE);
        boxBorderPaint.setStrokeWidth(1f);
        canvas.drawRect(60, 220, pageWidth - 60, 410, boxBorderPaint);

        // Info inside box
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(18f);
        textPaint.setFakeBoldText(true);
        canvas.drawText(examType.toUpperCase(), pageWidth / 2f, 255, textPaint);

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);
        canvas.drawText("Number: " + assignmentNum, pageWidth / 2f, 290, textPaint);
        canvas.drawText("Title: " + assignmentTitle, pageWidth / 2f, 320, textPaint);
        canvas.drawText("Submission Date: " + submissionDate, pageWidth / 2f, 350, textPaint);

        // Columns
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

class ProFramedTemplate implements CoverPageTemplate {
    @Override
    public String getName() { return "Pro Framed"; }

    @Override
    public String getDescription() { return "Thin double border frame with standard classic look."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        Paint textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setAntiAlias(true);

        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.BLACK);
        borderPaint.setStyle(Paint.Style.STROKE);
        
        borderPaint.setStrokeWidth(1.5f);
        canvas.drawRect(25, 25, pageWidth - 25, pageHeight - 25, borderPaint);

        borderPaint.setStrokeWidth(0.5f);
        canvas.drawRect(30, 30, pageWidth - 30, pageHeight - 30, borderPaint);

        // Draw University Logo
        try {
            java.io.InputStream is = context.getAssets().open("images/coverpage/sub_logo.png");
            Bitmap logo = android.graphics.BitmapFactory.decodeStream(is);
            if (logo != null) {
                float logoSize = 35f;
                float logoLeft = (pageWidth - logoSize) / 2f;
                float logoTop = 32f;
                canvas.drawBitmap(logo, null, new RectF(logoLeft, logoTop, logoLeft + logoSize, logoTop + logoSize), null);
                logo.recycle();
            }
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Header
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(19f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 95, textPaint);

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);
        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());
        canvas.drawText(deptTitle.toUpperCase(), pageWidth / 2f, 118, textPaint);

        Paint linePaint = new Paint();
        linePaint.setColor(Color.BLACK);
        linePaint.setStrokeWidth(1.5f);
        canvas.drawLine(50, 138, pageWidth - 50, 138, linePaint);

        // Info
        textPaint.setTextAlign(Paint.Align.LEFT);
        textPaint.setTextSize(12f);
        int startY = 220;
        int lineGap = 28;

        String[][] details = {
            {"Course Code:", subjectCode},
            {"Course Title:", subjectName},
            {"Number:", assignmentNum},
            {"Title:", assignmentTitle},
            {"Submission Date:", submissionDate}
        };

        for (int i = 0; i < details.length; i++) {
            textPaint.setFakeBoldText(false);
            canvas.drawText(details[i][0], 60, startY + (lineGap * i), textPaint);
            textPaint.setFakeBoldText(true);
            canvas.drawText(details[i][1], 180, startY + (lineGap * i), textPaint);
        }

        canvas.drawLine(50, startY + (lineGap * 5), pageWidth - 50, startY + (lineGap * 5), linePaint);

        int columnsY = startY + (lineGap * 6);

        // Submitted By
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

        // Submitted To
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

class SimpleLayoutTemplate implements CoverPageTemplate {
    @Override
    public String getName() { return "Simple Layout"; }

    @Override
    public String getDescription() { return "Borderless format focusing on clean spacing and modern typography."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        Paint textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setAntiAlias(true);

        // Draw University Logo
        try {
            java.io.InputStream is = context.getAssets().open("images/coverpage/sub_logo.png");
            Bitmap logo = android.graphics.BitmapFactory.decodeStream(is);
            if (logo != null) {
                float logoSize = 35f;
                float logoLeft = 50f;
                float logoTop = 32f;
                canvas.drawBitmap(logo, null, new RectF(logoLeft, logoTop, logoLeft + logoSize, logoTop + logoSize), null);
                logo.recycle();
            }
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Header
        textPaint.setTextAlign(Paint.Align.LEFT);
        textPaint.setTextSize(18f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", 50, 90, textPaint);

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);
        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());
        canvas.drawText(deptTitle.toUpperCase(), 50, 112, textPaint);

        // Divider
        Paint linePaint = new Paint();
        linePaint.setColor(Color.BLACK);
        linePaint.setStrokeWidth(1.5f);
        canvas.drawLine(50, 135, pageWidth - 50, 135, linePaint);

        // Content
        textPaint.setTextSize(12f);
        int startY = 220;
        int lineGap = 28;

        String[][] details = {
            {"Course Code:", subjectCode},
            {"Course Title:", subjectName},
            {"Number:", assignmentNum},
            {"Title:", assignmentTitle},
            {"Submission Date:", submissionDate}
        };

        for (int i = 0; i < details.length; i++) {
            textPaint.setFakeBoldText(false);
            canvas.drawText(details[i][0], 60, startY + (lineGap * i), textPaint);
            textPaint.setFakeBoldText(true);
            canvas.drawText(details[i][1], 180, startY + (lineGap * i), textPaint);
        }

        canvas.drawLine(50, startY + (lineGap * 5), pageWidth - 50, startY + (lineGap * 5), linePaint);

        int columnsY = startY + (lineGap * 6);

        // Submitted By
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

        // Submitted To
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

class WatermarkLayoutTemplate implements CoverPageTemplate {
    @Override
    public String getName() { return "Watermark Layout"; }

    @Override
    public String getDescription() { return "Faint diagonal watermark printed in the background."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        Paint textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setAntiAlias(true);

        // 1. Draw Watermark First
        Paint watermarkPaint = new Paint();
        watermarkPaint.setColor(Color.parseColor("#E5E7EB"));
        watermarkPaint.setAlpha(35); // faint
        watermarkPaint.setTextSize(26f);
        watermarkPaint.setFakeBoldText(true);
        watermarkPaint.setTextAlign(Paint.Align.CENTER);

        canvas.save();
        canvas.rotate(-35, pageWidth / 2f, pageHeight / 2f);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, pageHeight / 2f - 40, watermarkPaint);
        canvas.drawText("ESTD. 2002", pageWidth / 2f, pageHeight / 2f + 10, watermarkPaint);
        canvas.restore();

        // 2. Draw Normal content on top
        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.BLACK);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(1.5f);
        canvas.drawRect(25, 25, pageWidth - 25, pageHeight - 25, borderPaint);

        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(19f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 95, textPaint);

        textPaint.setTextSize(12f);
        textPaint.setFakeBoldText(false);
        String deptTitle = DepartmentHelper.getCoverPageDeptName(student.getDepartment());
        canvas.drawText(deptTitle.toUpperCase(), pageWidth / 2f, 118, textPaint);

        Paint linePaint = new Paint();
        linePaint.setColor(Color.BLACK);
        linePaint.setStrokeWidth(1.5f);
        canvas.drawLine(50, 138, pageWidth - 50, 138, linePaint);

        // Draw University Logo
        try {
            java.io.InputStream is = context.getAssets().open("images/coverpage/sub_logo.png");
            Bitmap logo = android.graphics.BitmapFactory.decodeStream(is);
            if (logo != null) {
                float logoSize = 35f;
                float logoLeft = (pageWidth - logoSize) / 2f;
                float logoTop = 32f;
                canvas.drawBitmap(logo, null, new RectF(logoLeft, logoTop, logoLeft + logoSize, logoTop + logoSize), null);
                logo.recycle();
            }
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Info
        textPaint.setTextAlign(Paint.Align.LEFT);
        textPaint.setTextSize(12f);
        int startY = 220;
        int lineGap = 28;

        String[][] details = {
            {"Course Code:", subjectCode},
            {"Course Title:", subjectName},
            {"Number:", assignmentNum},
            {"Title:", assignmentTitle},
            {"Submission Date:", submissionDate}
        };

        for (int i = 0; i < details.length; i++) {
            textPaint.setFakeBoldText(false);
            canvas.drawText(details[i][0], 60, startY + (lineGap * i), textPaint);
            textPaint.setFakeBoldText(true);
            canvas.drawText(details[i][1], 180, startY + (lineGap * i), textPaint);
        }

        canvas.drawLine(50, startY + (lineGap * 5), pageWidth - 50, startY + (lineGap * 5), linePaint);

        int columnsY = startY + (lineGap * 6);

        // Submitted By
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

        // Submitted To
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

class CyberDarkTemplate implements CoverPageTemplate {
    @Override public String getName() { return "Cyber Dark / Minimal Emerald"; }
    @Override public String getDescription() { return "Ultra-sleek dark accent template with emerald highlight badges."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        // Dark top accent banner
        Paint darkBar = new Paint();
        darkBar.setColor(Color.parseColor("#0F172A"));
        canvas.drawRect(0, 0, pageWidth, 120, darkBar);

        // Emerald accent line under dark bar
        Paint emeraldLine = new Paint();
        emeraldLine.setColor(Color.parseColor("#10B981"));
        emeraldLine.setStrokeWidth(5f);
        canvas.drawLine(0, 120, pageWidth, 120, emeraldLine);

        // Header Title in White on dark bar
        Paint headerText = new Paint(Paint.ANTI_ALIAS_FLAG);
        headerText.setColor(Color.WHITE);
        headerText.setTextAlign(Paint.Align.CENTER);
        headerText.setTextSize(18f);
        headerText.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 55, headerText);

        headerText.setTextSize(12f);
        headerText.setFakeBoldText(false);
        headerText.setColor(Color.parseColor("#94A3B8"));
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), pageWidth / 2f, 85, headerText);

        // Exam Type Badge
        Paint badgePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        badgePaint.setColor(Color.parseColor("#ECFDF5"));
        canvas.drawRoundRect(new RectF(pageWidth / 2f - 90, 150, pageWidth / 2f + 90, 185), 18, 18, badgePaint);

        Paint badgeText = new Paint(Paint.ANTI_ALIAS_FLAG);
        badgeText.setColor(Color.parseColor("#047857"));
        badgeText.setTextAlign(Paint.Align.CENTER);
        badgeText.setTextSize(12f);
        badgeText.setFakeBoldText(true);
        canvas.drawText((examType != null ? examType : "ASSIGNMENT").toUpperCase(), pageWidth / 2f, 172, badgeText);

        // Assignment Title & Course Info Box
        Paint boxPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        boxPaint.setColor(Color.parseColor("#F8FAFC"));
        canvas.drawRoundRect(new RectF(40, 220, pageWidth - 40, 420), 16, 16, boxPaint);

        Paint boxBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        boxBorder.setColor(Color.parseColor("#E2E8F0"));
        boxBorder.setStyle(Paint.Style.STROKE);
        boxBorder.setStrokeWidth(1.5f);
        canvas.drawRoundRect(new RectF(40, 220, pageWidth - 40, 420), 16, 16, boxBorder);

        Paint titlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        titlePaint.setColor(Color.parseColor("#0F172A"));
        titlePaint.setTextAlign(Paint.Align.CENTER);
        titlePaint.setTextSize(16f);
        titlePaint.setFakeBoldText(true);
        canvas.drawText(assignmentTitle != null ? assignmentTitle : "Untitled Assignment", pageWidth / 2f, 265, titlePaint);

        Paint bodyPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bodyPaint.setColor(Color.parseColor("#475569"));
        bodyPaint.setTextAlign(Paint.Align.CENTER);
        bodyPaint.setTextSize(11f);
        canvas.drawText("Course: " + (subjectCode != null ? subjectCode : "") + " - " + (subjectName != null ? subjectName : ""), pageWidth / 2f, 310, bodyPaint);
        canvas.drawText("Assignment No: " + (assignmentNum != null ? assignmentNum : "01") + "  |  Date: " + (submissionDate != null ? submissionDate : ""), pageWidth / 2f, 345, bodyPaint);

        // Two Column Submission Box
        int colY = 470;
        Paint cardBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        cardBg.setColor(Color.parseColor("#F1F5F9"));

        // Submitted To Card
        canvas.drawRoundRect(new RectF(40, colY, pageWidth / 2f - 10, colY + 220), 12, 12, cardBg);
        // Submitted By Card
        canvas.drawRoundRect(new RectF(pageWidth / 2f + 10, colY, pageWidth - 40, colY + 220), 12, 12, cardBg);

        Paint sectionHeader = new Paint(Paint.ANTI_ALIAS_FLAG);
        sectionHeader.setColor(Color.parseColor("#0F172A"));
        sectionHeader.setTextSize(13f);
        sectionHeader.setFakeBoldText(true);

        Paint sectionBody = new Paint(Paint.ANTI_ALIAS_FLAG);
        sectionBody.setColor(Color.parseColor("#334155"));
        sectionBody.setTextSize(10.5f);

        // Submitted To Details
        canvas.drawText("SUBMITTED TO", 55, colY + 35, sectionHeader);
        float lastTeacherY = CoverPageTemplate.drawTeacherNames(canvas, teacherName, 55, colY + 70, 16f, sectionBody);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), 55, lastTeacherY + 18, sectionBody);
        canvas.drawText("State University of Bangladesh", 55, lastTeacherY + 36, sectionBody);

        // Submitted By Details
        canvas.drawText("SUBMITTED BY", pageWidth / 2f + 25, colY + 35, sectionHeader);
        canvas.drawText("Name: " + student.getName(), pageWidth / 2f + 25, colY + 75, sectionBody);
        canvas.drawText("ID: " + student.getStudentId(), pageWidth / 2f + 25, colY + 105, sectionBody);
        canvas.drawText("Batch: " + student.getBatch(), pageWidth / 2f + 25, colY + 135, sectionBody);

        // Bottom Emerald Accent Bar
        canvas.drawRect(0, pageHeight - 15, pageWidth, pageHeight, emeraldLine);
    }
}

class NordicElegantTemplate implements CoverPageTemplate {
    @Override public String getName() { return "Nordic Elegant"; }
    @Override public String getDescription() { return "Minimalist Scandinavian aesthetic with generous whitespace and elegant typography."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        Paint rulePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        rulePaint.setColor(Color.parseColor("#334155"));
        rulePaint.setStrokeWidth(1.5f);

        canvas.drawLine(50, 70, pageWidth - 50, 70, rulePaint);
        canvas.drawLine(50, 75, pageWidth - 50, 75, rulePaint);

        Paint uniTitle = new Paint(Paint.ANTI_ALIAS_FLAG);
        uniTitle.setColor(Color.parseColor("#0F172A"));
        uniTitle.setTextAlign(Paint.Align.CENTER);
        uniTitle.setTextSize(20f);
        uniTitle.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 115, uniTitle);

        Paint subTitle = new Paint(Paint.ANTI_ALIAS_FLAG);
        subTitle.setColor(Color.parseColor("#64748B"));
        subTitle.setTextAlign(Paint.Align.CENTER);
        subTitle.setTextSize(12f);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()).toUpperCase(), pageWidth / 2f, 140, subTitle);

        canvas.drawLine(50, 160, pageWidth - 50, 160, rulePaint);

        // Assignment Details Center Block
        Paint titleText = new Paint(Paint.ANTI_ALIAS_FLAG);
        titleText.setColor(Color.parseColor("#0F172A"));
        titleText.setTextAlign(Paint.Align.CENTER);
        titleText.setTextSize(18f);
        titleText.setFakeBoldText(true);
        canvas.drawText(assignmentTitle != null ? assignmentTitle : "Assignment Cover Page", pageWidth / 2f, 260, titleText);

        Paint courseText = new Paint(Paint.ANTI_ALIAS_FLAG);
        courseText.setColor(Color.parseColor("#475569"));
        courseText.setTextAlign(Paint.Align.CENTER);
        courseText.setTextSize(12f);
        canvas.drawText((subjectCode != null ? subjectCode : "") + " — " + (subjectName != null ? subjectName : ""), pageWidth / 2f, 295, courseText);
        canvas.drawText((examType != null ? examType : "Assignment") + " #" + (assignmentNum != null ? assignmentNum : "1"), pageWidth / 2f, 325, courseText);

        // Divider
        Paint dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotPaint.setColor(Color.parseColor("#94A3B8"));
        canvas.drawCircle(pageWidth / 2f, 370, 4, dotPaint);

        // Side-by-side minimal details
        Paint label = new Paint(Paint.ANTI_ALIAS_FLAG);
        label.setColor(Color.parseColor("#64748B"));
        label.setTextSize(11f);

        Paint val = new Paint(Paint.ANTI_ALIAS_FLAG);
        val.setColor(Color.parseColor("#0F172A"));
        val.setTextSize(11f);
        val.setFakeBoldText(true);

        int startY = 450;
        // Teacher column
        canvas.drawText("PREPARED FOR", 60, startY, label);
        float lastTeacherY = CoverPageTemplate.drawTeacherNames(canvas, teacherName, 60, startY + 25, 16f, val);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), 60, lastTeacherY + 18, label);
        canvas.drawText("State University of Bangladesh", 60, lastTeacherY + 36, label);

        // Student column
        canvas.drawText("PREPARED BY", pageWidth / 2f + 20, startY, label);
        canvas.drawText(student.getName(), pageWidth / 2f + 20, startY + 25, val);
        canvas.drawText("ID: " + student.getStudentId(), pageWidth / 2f + 20, startY + 45, label);
        canvas.drawText("Batch: " + student.getBatch(), pageWidth / 2f + 20, startY + 65, label);

        // Footer Date
        label.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("Date of Submission: " + (submissionDate != null ? submissionDate : "N/A"), pageWidth / 2f, pageHeight - 60, label);
        canvas.drawLine(50, pageHeight - 40, pageWidth - 50, pageHeight - 40, rulePaint);
    }
}

class TealWaveTemplate implements CoverPageTemplate {
    @Override public String getName() { return "Teal Gradient Wave"; }
    @Override public String getDescription() { return "Vibrant teal banner with distinct pill badges and boxed info grid."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        Paint tealBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        tealBg.setColor(Color.parseColor("#0D9488"));
        canvas.drawRoundRect(new RectF(20, 20, pageWidth - 20, 130), 20, 20, tealBg);

        Paint uniTitle = new Paint(Paint.ANTI_ALIAS_FLAG);
        uniTitle.setColor(Color.WHITE);
        uniTitle.setTextAlign(Paint.Align.CENTER);
        uniTitle.setTextSize(18f);
        uniTitle.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 65, uniTitle);

        Paint deptText = new Paint(Paint.ANTI_ALIAS_FLAG);
        deptText.setColor(Color.parseColor("#CCFBF1"));
        deptText.setTextAlign(Paint.Align.CENTER);
        deptText.setTextSize(11.5f);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), pageWidth / 2f, 95, deptText);

        // Course Box
        Paint boxBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        boxBg.setColor(Color.parseColor("#F0FDFA"));
        canvas.drawRoundRect(new RectF(35, 170, pageWidth - 35, 340), 16, 16, boxBg);

        Paint boxStroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        boxStroke.setColor(Color.parseColor("#99F6E4"));
        boxStroke.setStyle(Paint.Style.STROKE);
        boxStroke.setStrokeWidth(1.5f);
        canvas.drawRoundRect(new RectF(35, 170, pageWidth - 35, 340), 16, 16, boxStroke);

        Paint titleText = new Paint(Paint.ANTI_ALIAS_FLAG);
        titleText.setColor(Color.parseColor("#0F766E"));
        titleText.setTextAlign(Paint.Align.CENTER);
        titleText.setTextSize(16f);
        titleText.setFakeBoldText(true);
        canvas.drawText(assignmentTitle != null ? assignmentTitle : "Course Assignment", pageWidth / 2f, 220, titleText);

        Paint subText = new Paint(Paint.ANTI_ALIAS_FLAG);
        subText.setColor(Color.parseColor("#115E59"));
        subText.setTextAlign(Paint.Align.CENTER);
        subText.setTextSize(11.5f);
        canvas.drawText((subjectCode != null ? subjectCode : "") + " — " + (subjectName != null ? subjectName : ""), pageWidth / 2f, 260, subText);
        canvas.drawText("Assignment #" + (assignmentNum != null ? assignmentNum : "1") + "  |  " + (examType != null ? examType : "Assignment"), pageWidth / 2f, 290, subText);

        // Submission Details Card
        int y = 380;
        Paint cardBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        cardBg.setColor(Color.WHITE);
        canvas.drawRoundRect(new RectF(35, y, pageWidth - 35, y + 260), 16, 16, cardBg);

        Paint cardBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        cardBorder.setColor(Color.parseColor("#E2E8F0"));
        cardBorder.setStyle(Paint.Style.STROKE);
        cardBorder.setStrokeWidth(1.5f);
        canvas.drawRoundRect(new RectF(35, y, pageWidth - 35, y + 260), 16, 16, cardBorder);

        Paint textHead = new Paint(Paint.ANTI_ALIAS_FLAG);
        textHead.setColor(Color.parseColor("#0F766E"));
        textHead.setTextSize(12f);
        textHead.setFakeBoldText(true);

        Paint textBody = new Paint(Paint.ANTI_ALIAS_FLAG);
        textBody.setColor(Color.parseColor("#334155"));
        textBody.setTextSize(11f);

        canvas.drawText("SUBMITTED TO", 60, y + 45, textHead);
        float lastTeacherY = CoverPageTemplate.drawTeacherNames(canvas, teacherName, 60, y + 75, 16f, textBody);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), 60, lastTeacherY + 18, textBody);

        canvas.drawText("SUBMITTED BY", pageWidth / 2f + 20, y + 45, textHead);
        canvas.drawText(student.getName(), pageWidth / 2f + 20, y + 75, textBody);
        canvas.drawText("ID: " + student.getStudentId(), pageWidth / 2f + 20, y + 100, textBody);
        canvas.drawText("Batch: " + student.getBatch(), pageWidth / 2f + 20, y + 125, textBody);

        Paint lineP = new Paint(Paint.ANTI_ALIAS_FLAG);
        lineP.setColor(Color.parseColor("#E2E8F0"));
        lineP.setStrokeWidth(1f);
        canvas.drawLine(60, y + 170, pageWidth - 60, y + 170, lineP);

        textBody.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("Date of Submission: " + (submissionDate != null ? submissionDate : "N/A"), pageWidth / 2f, y + 215, textBody);
    }
}

class CorporateExecutiveTemplate implements CoverPageTemplate {
    @Override public String getName() { return "Corporate Executive"; }
    @Override public String getDescription() { return "Sophisticated double-bar header layout with formal signature lines."; }

    @Override
    public void drawCoverPage(Context context, Canvas canvas, int pageWidth, int pageHeight, User student, String subjectCode, String subjectName, String teacherName, String assignmentTitle, String assignmentNum, String examType, String submissionDate, String section) {
        // Frame
        Paint framePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        framePaint.setColor(Color.parseColor("#1E293B"));
        framePaint.setStyle(Paint.Style.STROKE);
        framePaint.setStrokeWidth(3f);
        canvas.drawRect(25, 25, pageWidth - 25, pageHeight - 25, framePaint);

        Paint innerFrame = new Paint(Paint.ANTI_ALIAS_FLAG);
        innerFrame.setColor(Color.parseColor("#0EA5E9"));
        innerFrame.setStyle(Paint.Style.STROKE);
        innerFrame.setStrokeWidth(1f);
        canvas.drawRect(30, 30, pageWidth - 30, pageHeight - 30, innerFrame);

        // Header Title
        Paint titleP = new Paint(Paint.ANTI_ALIAS_FLAG);
        titleP.setColor(Color.parseColor("#0F172A"));
        titleP.setTextAlign(Paint.Align.CENTER);
        titleP.setTextSize(19f);
        titleP.setFakeBoldText(true);
        canvas.drawText("STATE UNIVERSITY OF BANGLADESH", pageWidth / 2f, 90, titleP);

        Paint subP = new Paint(Paint.ANTI_ALIAS_FLAG);
        subP.setColor(Color.parseColor("#0EA5E9"));
        subP.setTextAlign(Paint.Align.CENTER);
        subP.setTextSize(12f);
        subP.setFakeBoldText(true);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()).toUpperCase(), pageWidth / 2f, 118, subP);

        Paint ruleP = new Paint(Paint.ANTI_ALIAS_FLAG);
        ruleP.setColor(Color.parseColor("#E2E8F0"));
        ruleP.setStrokeWidth(1.5f);
        canvas.drawLine(50, 140, pageWidth - 50, 140, ruleP);

        // Title Block
        Paint mainTitle = new Paint(Paint.ANTI_ALIAS_FLAG);
        mainTitle.setColor(Color.parseColor("#0F172A"));
        mainTitle.setTextAlign(Paint.Align.CENTER);
        mainTitle.setTextSize(17f);
        mainTitle.setFakeBoldText(true);
        canvas.drawText(assignmentTitle != null ? assignmentTitle : "PROJECT REPORT", pageWidth / 2f, 230, mainTitle);

        Paint courseP = new Paint(Paint.ANTI_ALIAS_FLAG);
        courseP.setColor(Color.parseColor("#475569"));
        courseP.setTextAlign(Paint.Align.CENTER);
        courseP.setTextSize(11.5f);
        canvas.drawText("Course Code: " + (subjectCode != null ? subjectCode : "") + " | Course: " + (subjectName != null ? subjectName : ""), pageWidth / 2f, 265, courseP);
        canvas.drawText("Type: " + (examType != null ? examType : "Assignment") + " (No. " + (assignmentNum != null ? assignmentNum : "01") + ")", pageWidth / 2f, 290, courseP);

        // Details Block
        int startY = 380;
        Paint headerText = new Paint(Paint.ANTI_ALIAS_FLAG);
        headerText.setColor(Color.parseColor("#0F172A"));
        headerText.setTextSize(12f);
        headerText.setFakeBoldText(true);

        Paint bodyText = new Paint(Paint.ANTI_ALIAS_FLAG);
        bodyText.setColor(Color.parseColor("#334155"));
        bodyText.setTextSize(11f);

        canvas.drawText("SUBMITTED TO:", 60, startY, headerText);
        float lastTeacherY = CoverPageTemplate.drawTeacherNames(canvas, teacherName, 60, startY + 30, 16f, bodyText);
        canvas.drawText(DepartmentHelper.getCoverPageDeptName(student.getDepartment()), 60, lastTeacherY + 18, bodyText);
        canvas.drawText("State University of Bangladesh", 60, lastTeacherY + 36, bodyText);

        canvas.drawText("SUBMITTED BY:", pageWidth / 2f + 20, startY, headerText);
        canvas.drawText(student.getName(), pageWidth / 2f + 20, startY + 30, bodyText);
        canvas.drawText("Student ID: " + student.getStudentId(), pageWidth / 2f + 20, startY + 50, bodyText);
        canvas.drawText("Batch: " + student.getBatch(), pageWidth / 2f + 20, startY + 70, bodyText);

        // Signature Lines at bottom
        int sigY = pageHeight - 110;
        canvas.drawLine(60, sigY, 200, sigY, ruleP);
        bodyText.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("Student Signature", 130, sigY + 20, bodyText);

        canvas.drawLine(pageWidth - 200, sigY, pageWidth - 60, sigY, ruleP);
        canvas.drawText("Teacher Signature", pageWidth - 130, sigY + 20, bodyText);

        bodyText.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("Date of Submission: " + (submissionDate != null ? submissionDate : "N/A"), pageWidth / 2f, pageHeight - 45, bodyText);
    }
}
