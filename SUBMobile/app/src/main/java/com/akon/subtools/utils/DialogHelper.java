package com.akon.subtools.utils;

import android.content.Context;
import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;

import com.akon.subtools.R;
import com.akon.subtools.models.Notice;

public class DialogHelper {

    public static void showWarningDialog(Context context, String title, String message) {
        if (context == null) return;
        new AlertDialog.Builder(context)
                .setTitle(title)
                .setMessage(message)
                .setPositiveButton("OK", null)
                .show();
    }

    public static void showModernNoticeDialog(Context context, Notice notice) {
        showModernNoticeDialog(context, notice, null);
    }

    public static void showModernNoticeDialog(Context context, Notice notice, Runnable onDismiss) {
        if (context == null) return;
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        View view = LayoutInflater.from(context).inflate(R.layout.layout_notice_detail_dialog, null);

        TextView textTitle = view.findViewById(R.id.dialog_text_title);
        TextView textContent = view.findViewById(R.id.dialog_text_content);
        TextView textDate = view.findViewById(R.id.dialog_text_date);
        TextView textSender = view.findViewById(R.id.dialog_text_sender);
        TextView badgePriority = view.findViewById(R.id.dialog_badge_priority);
        Button btnClose = view.findViewById(R.id.dialog_btn_close);

        textTitle.setText(notice.getTitle());
        textContent.setText(notice.getContent());
        textDate.setText(notice.getDate());
        textSender.setText(notice.getFormattedCreatorInfo());

        String priority = notice.getPriority() != null ? notice.getPriority() : "Normal";
        badgePriority.setText(priority.toUpperCase());

        int badgeColorRes;
        if ("Critical".equalsIgnoreCase(priority)) {
            badgeColorRes = R.color.priority_critical;
        } else if ("High".equalsIgnoreCase(priority)) {
            badgeColorRes = R.color.priority_high;
        } else {
            badgeColorRes = R.color.priority_normal;
        }
        int color = ContextCompat.getColor(context, badgeColorRes);
        badgePriority.setBackgroundTintList(ColorStateList.valueOf(color));

        // Handle Image Attachment
        android.widget.ImageView imageAttachment = view.findViewById(R.id.dialog_image_attachment);
        String imgUrl = notice.getImageUrl();
        if (imageAttachment != null) {
            if (imgUrl != null && !imgUrl.trim().isEmpty()) {
                imageAttachment.setVisibility(View.VISIBLE);
                com.bumptech.glide.Glide.with(context)
                        .load(imgUrl)
                        .into(imageAttachment);
            } else {
                imageAttachment.setVisibility(View.GONE);
            }
        }

        // Handle PDF Attachment
        Button btnOpenPdf = view.findViewById(R.id.dialog_btn_open_pdf);
        String pdfUrl = notice.getPdfUrl();
        if (btnOpenPdf != null) {
            if (pdfUrl != null && !pdfUrl.trim().isEmpty()) {
                btnOpenPdf.setVisibility(View.VISIBLE);
                btnOpenPdf.setOnClickListener(v -> {
                    try {
                        android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(pdfUrl));
                        context.startActivity(intent);
                    } catch (Exception e) {
                        showWarningDialog(context, "Unable to Open PDF", "Could not launch PDF link. Please ensure a browser app is installed.");
                    }
                });
            } else {
                btnOpenPdf.setVisibility(View.GONE);
            }
        }

        builder.setView(view);
        AlertDialog dialog = builder.create();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        if (onDismiss != null) {
            dialog.setOnDismissListener(d -> onDismiss.run());
        }

        btnClose.setOnClickListener(v -> dialog.dismiss());
        dialog.show();
    }

    private static AlertDialog maintenanceDialog = null;

    public static void showMaintenanceDialog(android.app.Activity activity, String message, Runnable onRetry) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;
        if (maintenanceDialog != null && maintenanceDialog.isShowing()) return;

        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        View view = LayoutInflater.from(activity).inflate(R.layout.layout_maintenance_dialog, null);

        TextView txtMsg = view.findViewById(R.id.dialog_maintenance_message);
        if (message != null && !message.trim().isEmpty()) {
            txtMsg.setText(message.trim());
        }

        view.findViewById(R.id.dialog_btn_retry_maintenance).setOnClickListener(v -> {
            if (maintenanceDialog != null) {
                maintenanceDialog.dismiss();
                maintenanceDialog = null;
            }
            if (onRetry != null) onRetry.run();
        });

        builder.setView(view);
        builder.setCancelable(false);
        maintenanceDialog = builder.create();

        if (maintenanceDialog.getWindow() != null) {
            maintenanceDialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        maintenanceDialog.show();
    }

    public static void dismissMaintenanceDialog() {
        if (maintenanceDialog != null && maintenanceDialog.isShowing()) {
            maintenanceDialog.dismiss();
            maintenanceDialog = null;
        }
    }
}
