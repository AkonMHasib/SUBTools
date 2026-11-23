package com.akon.subtools.utils;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.CountDownTimer;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.akon.subtools.R;
import com.bumptech.glide.Glide;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.target.Target;

public class FullScreenAdManager {

    private static final String PREFS_NAME = "subtools_ad_prefs";
    private static final String KEY_LAST_AD_TIME = "last_fullscreen_ad_time";
    private static final long THROTTLE_DURATION_MS = 24 * 60 * 60 * 1000L; // 24 Hours

    private static final String KEY_LAST_AD_URL = "last_fullscreen_ad_url";

    public static void showAdIfEligible(Activity activity) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;

        final SharedPreferences prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Fetch active ad configuration from Supabase system_settings (matches admin panel fullscreen_ad)
        if (com.akon.subtools.utils.SupabaseAuthBridge.isConfigured()) {
            java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    org.json.JSONArray arr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("system_settings", "select=*");
                    if (arr != null && arr.length() > 0) {
                        for (int i = 0; i < arr.length(); i++) {
                            org.json.JSONObject row = arr.optJSONObject(i);
                            if (row == null) continue;

                            org.json.JSONObject data = row.optJSONObject("settings");
                            if (data == null) data = row.optJSONObject("data");
                            if (data == null) data = row;

                            org.json.JSONObject fsAd = data.optJSONObject("fullscreen_ad");
                            if (fsAd == null) fsAd = data.optJSONObject("fullscreen");

                            if (fsAd != null) {
                                boolean enabled = fsAd.optBoolean("enabled", true);
                                if (!enabled) {
                                    // Startup fullscreen ad explicitly turned off in admin panel
                                    return;
                                }
                                String imageUrl = fsAd.optString("imageUrl", fsAd.optString("image_url", "")).trim();
                                String targetUrl = fsAd.optString("targetUrl", fsAd.optString("target_url", "")).trim();
                                if (!imageUrl.isEmpty()) {
                                    long lastShown = prefs.getLong(KEY_LAST_AD_TIME, 0);
                                    String lastUrl = prefs.getString(KEY_LAST_AD_URL, "");
                                    long now = System.currentTimeMillis();

                                    // 24-hour rate limit per creative: show once per 24 hours unless a new creative URL was published in admin panel
                                    if (imageUrl.equals(lastUrl) && (now - lastShown < THROTTLE_DURATION_MS)) {
                                        return;
                                    }

                                    final String fImage = imageUrl;
                                    final String fTarget = targetUrl;
                                    activity.runOnUiThread(() -> displayAdDialog(activity, fImage, fTarget, prefs, now));
                                    return;
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {}
            });
        }
    }

    private static void displayAdDialog(Activity activity, String imageUrl, String targetUrl, SharedPreferences prefs, long now) {
        if (activity.isFinishing() || activity.isDestroyed()) return;

        Dialog dialog = new Dialog(activity);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_fullscreen_ad);
        dialog.setCancelable(true);

        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT);
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        }

        ImageView imgAd = dialog.findViewById(R.id.img_fullscreen_ad);
        ProgressBar progress = dialog.findViewById(R.id.progress_ad_loading);
        TextView btnSkip = dialog.findViewById(R.id.btn_skip_ad);
        TextView btnAction = dialog.findViewById(R.id.btn_ad_action);

        // Record shown timestamp and creative URL
        prefs.edit()
                .putLong(KEY_LAST_AD_TIME, now)
                .putString(KEY_LAST_AD_URL, imageUrl)
                .apply();

        // 5-second countdown timer
        CountDownTimer timer = new CountDownTimer(5000, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                int seconds = (int) (millisUntilFinished / 1000);
                if (btnSkip != null) {
                    btnSkip.setText("Skip (" + seconds + "s)");
                }
            }

            @Override
            public void onFinish() {
                if (btnSkip != null) {
                    btnSkip.setText("Skip ✕");
                }
                // Automatically dismiss after 5 seconds
                if (dialog.isShowing() && !activity.isFinishing() && !activity.isDestroyed()) {
                    try {
                        dialog.dismiss();
                    } catch (Exception ignored) {}
                }
            }
        };

        // Skippable click listener
        btnSkip.setOnClickListener(v -> {
            timer.cancel();
            try {
                dialog.dismiss();
            } catch (Exception ignored) {}
        });

        // Open target link
        View.OnClickListener openLinkListener = v -> {
            timer.cancel();
            try {
                dialog.dismiss();
            } catch (Exception ignored) {}
            // Record ad click
            com.akon.subtools.repository.AdRepository.recordAdClick("fullscreen_ad");
            if (targetUrl != null && !targetUrl.trim().isEmpty()) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl.trim()));
                    activity.startActivity(intent);
                } catch (Exception ignored) {}
            }
        };

        imgAd.setOnClickListener(openLinkListener);
        btnAction.setOnClickListener(openLinkListener);

        // Load image with Glide
        Glide.with(activity.getApplicationContext())
            .load(imageUrl)
            .listener(new RequestListener<android.graphics.drawable.Drawable>() {
                @Override
                public boolean onLoadFailed(GlideException e, Object model, Target<android.graphics.drawable.Drawable> target, boolean isFirstResource) {
                    progress.setVisibility(View.GONE);
                    return false;
                }

                @Override
                public boolean onResourceReady(android.graphics.drawable.Drawable resource, Object model, Target<android.graphics.drawable.Drawable> target, DataSource dataSource, boolean isFirstResource) {
                    progress.setVisibility(View.GONE);
                    timer.start();
                    return false;
                }
            })
            .into(imgAd);

        dialog.setOnDismissListener(d -> timer.cancel());

        try {
            dialog.show();
        } catch (Exception ignored) {}
    }
}
