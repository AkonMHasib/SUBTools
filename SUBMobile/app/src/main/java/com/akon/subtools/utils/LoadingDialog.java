package com.akon.subtools.utils;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;

import com.akon.subtools.R;

public class LoadingDialog {
    private final AlertDialog dialog;
    private final TextView textMessage;

    public LoadingDialog(Context context, String message) {
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        View view = LayoutInflater.from(context).inflate(R.layout.layout_loading_dialog, null);
        textMessage = view.findViewById(R.id.text_message);
        textMessage.setText(message);

        builder.setView(view);
        builder.setCancelable(false);
        dialog = builder.create();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }
    }

    public void show() {
        if (!dialog.isShowing()) {
            dialog.show();
        }
    }

    public void dismiss() {
        if (dialog.isShowing()) {
            dialog.dismiss();
        }
    }
}
