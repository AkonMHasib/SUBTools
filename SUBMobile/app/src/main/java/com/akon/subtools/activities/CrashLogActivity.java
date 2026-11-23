package com.akon.subtools.activities;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Bundle;
import android.widget.Button;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class CrashLogActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String crashLog = getIntent().getStringExtra("crash_log");
        if (crashLog == null || crashLog.trim().isEmpty()) {
            crashLog = "No detailed crash log available.";
        }

        android.widget.LinearLayout rootLayout = new android.widget.LinearLayout(this);
        rootLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(android.graphics.Color.parseColor("#0F172A"));
        int padding = (int) (16 * getResources().getDisplayMetrics().density);
        rootLayout.setPadding(padding, padding, padding, padding);

        TextView title = new TextView(this);
        title.setText("⚠️ SYSTEM CRASH DETECTED");
        title.setTextColor(android.graphics.Color.parseColor("#EF4444"));
        title.setTextSize(18f);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        rootLayout.addView(title);

        TextView subTitle = new TextView(this);
        subTitle.setText("An unexpected exception caused the app to crash. Full stack trace is below:");
        subTitle.setTextColor(android.graphics.Color.parseColor("#94A3B8"));
        subTitle.setTextSize(12f);
        subTitle.setPadding(0, 8, 0, 16);
        rootLayout.addView(subTitle);

        ScrollView scrollView = new ScrollView(this);
        android.widget.LinearLayout.LayoutParams scrollParams = new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f);
        scrollView.setLayoutParams(scrollParams);
        scrollView.setBackgroundColor(android.graphics.Color.parseColor("#1E293B"));
        scrollView.setPadding(padding, padding, padding, padding);

        TextView logView = new TextView(this);
        logView.setText(crashLog);
        logView.setTextColor(android.graphics.Color.parseColor("#FCA5A5"));
        logView.setTextSize(11f);
        logView.setTypeface(android.graphics.Typeface.MONOSPACE);
        logView.setTextIsSelectable(true);
        scrollView.addView(logView);
        rootLayout.addView(scrollView);

        android.widget.LinearLayout buttonLayout = new android.widget.LinearLayout(this);
        buttonLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        buttonLayout.setPadding(0, 16, 0, 0);

        Button btnCopy = new Button(this);
        btnCopy.setText("COPY CRASH LOG");
        btnCopy.setBackgroundColor(android.graphics.Color.parseColor("#DC2626"));
        btnCopy.setTextColor(android.graphics.Color.WHITE);
        String finalCrashLog = crashLog;
        btnCopy.setOnClickListener(v -> {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = ClipData.newPlainText("Crash Log", finalCrashLog);
            if (clipboard != null) {
                clipboard.setPrimaryClip(clip);
                Toast.makeText(this, "Crash log copied to clipboard!", Toast.LENGTH_SHORT).show();
            }
        });
        buttonLayout.addView(btnCopy);

        Button btnRestart = new Button(this);
        btnRestart.setText("RESTART APP");
        btnRestart.setBackgroundColor(android.graphics.Color.parseColor("#334155"));
        btnRestart.setTextColor(android.graphics.Color.WHITE);
        android.widget.LinearLayout.LayoutParams restartParams = new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        restartParams.setMarginStart((int) (12 * getResources().getDisplayMetrics().density));
        btnRestart.setLayoutParams(restartParams);
        btnRestart.setOnClickListener(v -> {
            getSharedPreferences("subtools_crash_prefs", MODE_PRIVATE).edit().clear().apply();
            android.content.Intent intent = new android.content.Intent(this, SplashActivity.class);
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        });
        buttonLayout.addView(btnRestart);

        rootLayout.addView(buttonLayout);
        setContentView(rootLayout);
    }
}
