package com.akon.subtools.utils;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.pdf.PdfDocument;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.akon.subtools.models.User;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class PdfGenerator {

    public interface PdfCallback {
        void onSuccess(File file);
        void onFailure(Exception e);
    }

    public static String getFullDepartmentName(String deptCode) {
        if (deptCode == null) return "Computer Science & Engineering";
        String upper = deptCode.toUpperCase().trim();
        if (upper.contains("CSE") || upper.contains("COMPUTER SCIENCE & ENGINEERING")) {
            return "Computer Science & Engineering";
        } else if (upper.contains("EEE") || upper.contains("ELECTRICAL")) {
            return "Electrical & Electronic Engineering";
        } else if (upper.contains("BBA") || upper.contains("BUSINESS")) {
            return "Business Administration";
        } else if (upper.contains("LAW")) {
            return "Law";
        } else if (upper.contains("PHARM")) {
            return "Pharmacy";
        } else if (upper.contains("ENG") || upper.contains("ENGLISH")) {
            return "English";
        } else if (upper.contains("MPH") || upper.contains("PUBLIC HEALTH")) {
            return "Public Health";
        }
        return deptCode;
    }

    private static String loadHtmlFromAssets(Context context, String assetPath) throws IOException {
        InputStream is = context.getAssets().open(assetPath);
        int size = is.available();
        byte[] buffer = new byte[size];
        is.read(buffer);
        is.close();
        return new String(buffer, "UTF-8");
    }

    public static String getFontFileName(String fontName) {
        if (fontName == null) return "Poppins-Regular.ttf";
        String clean = fontName.trim().toLowerCase();
        switch (clean) {
            case "roboto": return "Roboto-Regular.ttf";
            case "inter": return "Inter-Regular.ttf";
            case "source sans pro": return "SourceSansPro-Regular.ttf";
            case "arial": return "Arial-Regular.ttf";
            case "montserrat": return "Montserrat-Regular.ttf";
            case "bebas neue": return "BebasNeue-Regular.ttf";
            case "league spartan": return "LeagueSpartan-Regular.ttf";
            case "playfair display": return "PlayfairDisplay-Regular.ttf";
            case "oswald": return "Oswald-Regular.ttf";
            case "space grotesk": return "SpaceGrotesk-Regular.ttf";
            case "cormorant garamond": return "CormorantGaramond-Regular.ttf";
            case "poppins":
            default:
                return "Poppins-Regular.ttf";
        }
    }

    public static void generateAssignmentCover(
            Context context,
            User student,
            String subjectCode,
            String subjectName,
            String teacherName,
            String assignmentTitle,
            String assignmentNum,
            String examType,
            String submissionDate,
            String section,
            String templateName,
            String fontName,
            PdfCallback callback
    ) {
        new Handler(Looper.getMainLooper()).post(() -> {
            generateAssignmentCoverCanvasFallback(context, student, subjectCode, subjectName, teacherName, assignmentTitle, assignmentNum, examType, submissionDate, section, templateName, fontName, callback);
        });
    }

    public static void generateHtmlCoverPage(
            Context context,
            User student,
            String subjectCode,
            String subjectName,
            String teacherName,
            String assignmentTitle,
            String assignmentNum,
            String examType,
            String submissionDate,
            String templateFileName,
            String fontName,
            PdfCallback callback
    ) {
        try {
            String fontFileName = getFontFileName(fontName);
            String fontCss = "<style>"
                    + "@font-face { font-family: 'SelectedCustomFont'; src: url('fonts/" + fontFileName + "') format('truetype'); }"
                    + "* { font-family: 'SelectedCustomFont', sans-serif !important; }"
                    + "</style>";

            String htmlContent = loadHtmlFromAssets(context, "templates/" + templateFileName);
            if (htmlContent.contains("</head>")) {
                htmlContent = htmlContent.replace("</head>", fontCss + "</head>");
            } else {
                htmlContent = fontCss + htmlContent;
            }

            htmlContent = htmlContent.replace("{{course_code}}", subjectCode != null ? subjectCode : "")
                    .replace("{{course_title}}", subjectName != null ? subjectName : "")
                    .replace("{{assignment_number}}", assignmentNum != null ? assignmentNum : "01")
                    .replace("{{assignment_topic}}", assignmentTitle != null ? assignmentTitle : "")
                    .replace("{{by_name}}", student.getName() != null ? student.getName() : "")
                    .replace("{{by_id}}", student.getStudentId() != null ? student.getStudentId() : "")
                    .replace("{{by_department}}", DepartmentHelper.getCoverPageDeptName(student.getDepartment()))
                    .replace("{{submission_date}}", submissionDate != null ? submissionDate : "")
                    .replace("{{teacher_name}}", teacherName != null ? teacherName : "")
                    .replace("{{SUBMITTED_TO_SECTION}}",
                            "<div class=\"section\"><div class=\"green\">Submitted To</div><div><strong>" + (teacherName != null ? teacherName : "") + "</strong></div><div>State University of Bangladesh</div></div>");

            WebView webView = new WebView(context);
            webView.getSettings().setJavaScriptEnabled(true);
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    try {
                        PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
                        if (printManager != null) {
                            String jobName = "SUB_Cover_Page_Print";
                            PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
                            printManager.print(jobName, printAdapter, new PrintAttributes.Builder()
                                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                    .build());
                            callback.onSuccess(null);
                        } else {
                            callback.onFailure(new Exception("PrintManager unavailable"));
                        }
                    } catch (Exception e) {
                        callback.onFailure(e);
                    }
                }
            });

            webView.loadDataWithBaseURL("file:///android_asset/templates/", htmlContent, "text/html", "UTF-8", null);
        } catch (Exception e) {
            callback.onFailure(e);
        }
    }

    private static void generateAssignmentCoverCanvasFallback(
            Context context,
            User student,
            String subjectCode,
            String subjectName,
            String teacherName,
            String assignmentTitle,
            String assignmentNum,
            String examType,
            String submissionDate,
            String section,
            String templateName,
            String fontName,
            PdfCallback callback
    ) {
        File pdfDir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
        if (pdfDir != null && !pdfDir.exists()) {
            pdfDir.mkdirs();
        }
        String rawDept = (student != null && student.getDepartment() != null) ? student.getDepartment() : "";
        String deptCode = DepartmentHelper.getDeptCode(rawDept);
        if (deptCode.isEmpty()) deptCode = "DEPT";

        String rawSubj = (subjectName != null && !subjectName.trim().isEmpty())
                ? subjectName
                : (subjectCode != null && !subjectCode.trim().isEmpty() ? subjectCode : "Subject");
        String cleanSubj = rawSubj.replaceAll("[^a-zA-Z0-9]", "_").replaceAll("_+", "_");

        String rawTitle = (assignmentTitle != null && !assignmentTitle.trim().isEmpty())
                ? assignmentTitle
                : (assignmentNum != null && !assignmentNum.trim().isEmpty() ? "Assignment_" + assignmentNum : "Assignment");
        String cleanTitle = rawTitle.replaceAll("[^a-zA-Z0-9]", "_").replaceAll("_+", "_");

        String fileName = "SUBTools_" + deptCode + "_" + cleanSubj + "_" + cleanTitle + ".pdf";
        File file = new File(pdfDir, fileName);

        try {
            int pageWidth = 595;
            int pageHeight = 842;

            PdfDocument document = new PdfDocument();
            PdfDocument.PageInfo pageInfo = new PdfDocument.PageInfo.Builder(pageWidth, pageHeight, 1).create();
            PdfDocument.Page page = document.startPage(pageInfo);
            Canvas canvas = page.getCanvas();

            CoverPageTemplate template;
            if ("Modern Minimalist".equalsIgnoreCase(templateName) || "Modern Minimal".equalsIgnoreCase(templateName)) {
                template = new MinimalTemplate();
            } else if ("Double Border Elite".equalsIgnoreCase(templateName) || "Modern Border".equalsIgnoreCase(templateName)) {
                template = new ModernBorderTemplate();
            } else if ("Emerald Dotted Border".equalsIgnoreCase(templateName) || "Dotted Border (Green)".equalsIgnoreCase(templateName)) {
                template = new DottedGreenTemplate();
            } else if ("Formal Grid Table".equalsIgnoreCase(templateName) || "Formal Table".equalsIgnoreCase(templateName)) {
                template = new FormalTableTemplate();
            } else if ("Header & Footer Accent".equalsIgnoreCase(templateName) || "Header & Footer".equalsIgnoreCase(templateName)) {
                template = new HeaderFooterTemplate();
            } else if ("Modern Green Horizon".equalsIgnoreCase(templateName) || "Modern Green".equalsIgnoreCase(templateName)) {
                template = new ModernGreenTemplate();
            } else if ("Pro Academic Frame".equalsIgnoreCase(templateName) || "Pro Framed".equalsIgnoreCase(templateName)) {
                template = new ProFramedTemplate();
            } else if ("Clean Simple Layout".equalsIgnoreCase(templateName) || "Simple Layout".equalsIgnoreCase(templateName)) {
                template = new SimpleLayoutTemplate();
            } else if ("Watermark Crest Edition".equalsIgnoreCase(templateName) || "Watermark Layout".equalsIgnoreCase(templateName)) {
                template = new WatermarkLayoutTemplate();
            } else if ("Dark Emerald Premium".equalsIgnoreCase(templateName) || "Cyber Dark / Minimal Emerald".equalsIgnoreCase(templateName)) {
                template = new CyberDarkTemplate();
            } else if ("Nordic Elegant Edition".equalsIgnoreCase(templateName) || "Nordic Elegant".equalsIgnoreCase(templateName)) {
                template = new NordicElegantTemplate();
            } else if ("Teal Gradient Wave".equalsIgnoreCase(templateName)) {
                template = new TealWaveTemplate();
            } else if ("Corporate Executive Suite".equalsIgnoreCase(templateName) || "Corporate Executive".equalsIgnoreCase(templateName)) {
                template = new CorporateExecutiveTemplate();
            } else {
                template = new ClassicTemplate();
            }

            android.graphics.Typeface customTypeface = null;
            try {
                String fontFileName = getFontFileName(fontName);
                customTypeface = android.graphics.Typeface.createFromAsset(context.getAssets(), "templates/fonts/" + fontFileName);
            } catch (Exception e) {
                customTypeface = android.graphics.Typeface.DEFAULT;
            }

            String originalDept = student.getDepartment();
            student.setDepartment(getFullDepartmentName(originalDept));
            try {
                template.drawCoverPage(
                        context,
                        canvas,
                        pageWidth,
                        pageHeight,
                        student,
                        subjectCode,
                        subjectName,
                        teacherName,
                        assignmentTitle,
                        assignmentNum,
                        examType,
                        submissionDate,
                        section,
                        customTypeface
                );
            } finally {
                student.setDepartment(originalDept);
            }

            document.finishPage(page);

            FileOutputStream fos = new FileOutputStream(file);
            document.writeTo(fos);
            document.close();
            fos.close();

            callback.onSuccess(file);
        } catch (Exception e) {
            callback.onFailure(e);
        }
    }

    public static void printPdf(Context context, File file) {
        PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
        if (printManager != null) {
            String jobName = "SUB_Cover_Page_Print";
            printManager.print(jobName, new PrintDocumentAdapter() {
                @Override
                public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                                     android.os.CancellationSignal cancellationSignal,
                                     LayoutResultCallback callback, Bundle extras) {
                    if (cancellationSignal.isCanceled()) {
                        callback.onLayoutCancelled();
                        return;
                    }
                    PrintDocumentInfo info = new PrintDocumentInfo.Builder(file.getName())
                            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                            .build();
                    callback.onLayoutFinished(info, true);
                }

                @Override
                public void onWrite(android.print.PageRange[] pages, android.os.ParcelFileDescriptor destination,
                                     android.os.CancellationSignal cancellationSignal,
                                     WriteResultCallback callback) {
                    java.io.InputStream input = null;
                    java.io.OutputStream output = null;
                    try {
                        input = new java.io.FileInputStream(file);
                        output = new java.io.FileOutputStream(destination.getFileDescriptor());
                        byte[] buf = new byte[1024];
                        int bytesRead;
                        while ((bytesRead = input.read(buf)) > 0) {
                            output.write(buf, 0, bytesRead);
                        }
                        callback.onWriteFinished(new android.print.PageRange[]{android.print.PageRange.ALL_PAGES});
                    } catch (Exception e) {
                        callback.onWriteFailed(e.getMessage());
                    } finally {
                        try {
                            if (input != null) input.close();
                            if (output != null) output.close();
                        } catch (IOException e) {
                            // ignore
                        }
                    }
                }
            }, new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .build());
        }
    }
}
