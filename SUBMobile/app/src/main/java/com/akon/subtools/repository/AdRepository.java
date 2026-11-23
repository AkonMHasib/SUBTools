package com.akon.subtools.repository;

import android.os.Handler;
import android.os.Looper;

import com.akon.subtools.models.AdBanner;
import com.akon.subtools.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.Executors;

public class AdRepository {
    private static final String DEFAULT_PARTNER_AD_IMAGE = "https://i.postimg.cc/6pfMCPG1/file-00000000b47481faaa6860e524de44fa.png";
    private static final String DEFAULT_PARTNER_AD_TARGET = "https://wa.me/8801754752096";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface AdCallback {
        void onAdLoaded(AdBanner adBanner);
    }

    public interface AdSubscription {
        void remove();
    }

    public AdRepository() {}

    /**
     * Fetch ad configuration for a specific placement (e.g. "homepage" or "nav_drawer").
     * Cross-synced with web portal StudentDashboard.jsx fallback hierarchy.
     */
    public AdSubscription listenToAd(String placementKey, AdCallback callback) {
        final boolean isHome = "homepage".equalsIgnoreCase(placementKey) || "homepage_ad".equalsIgnoreCase(placementKey);

        Executors.newSingleThreadExecutor().execute(() -> {
            boolean foundConfig = false;
            boolean isAdEnabled = false;
            String adImageUrl = "";
            String adTargetUrl = "";

            if (SupabaseAuthBridge.isConfigured()) {
                try {
                    JSONArray arr = SupabaseAuthBridge.queryTable("system_settings", "select=*");
                    if (arr != null && arr.length() > 0) {
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject row = arr.optJSONObject(i);
                            if (row == null) continue;

                            String rowId = row.optString("id", "");
                            // Prioritize the 'ads' document, fallback to 'app_update'
                            if (!"ads".equalsIgnoreCase(rowId) && !"app_update".equalsIgnoreCase(rowId) && !rowId.isEmpty()) {
                                continue;
                            }

                            JSONObject container = row.optJSONObject("settings");
                            if (container == null) container = row.optJSONObject("data");
                            if (container == null) container = row;

                            JSONObject targetAdObj = null;
                            if (isHome) {
                                targetAdObj = container.optJSONObject("homepage");
                                if (targetAdObj == null) targetAdObj = container.optJSONObject("homepage_ad");
                            } else {
                                targetAdObj = container.optJSONObject("nav_drawer");
                                if (targetAdObj == null) targetAdObj = container.optJSONObject("nav_drawer_ad");
                            }

                            if (targetAdObj != null) {
                                foundConfig = true;
                                isAdEnabled = targetAdObj.optBoolean("enabled", true);
                                adImageUrl = targetAdObj.optString("imageUrl", targetAdObj.optString("image_url", "")).trim();
                                adTargetUrl = targetAdObj.optString("targetUrl", targetAdObj.optString("target_url", "")).trim();
                                if ("ads".equalsIgnoreCase(rowId)) {
                                    // Primary source found, break
                                    break;
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            final AdBanner banner;
            if (foundConfig) {
                // Obey admin panel toggle strictly: if enabled is false or image is empty, do not show ad
                if (isAdEnabled && !adImageUrl.isEmpty()) {
                    banner = new AdBanner(adImageUrl, adTargetUrl, true);
                } else {
                    banner = new AdBanner("", "", false);
                }
            } else {
                // No configuration row found at all in database
                banner = new AdBanner("", "", false);
            }

            mainHandler.post(() -> {
                if (callback != null) callback.onAdLoaded(banner);
            });
        });

        return () -> {};
    }

    /**
     * Record ad click in Supabase activity_logs.
     */
    public static void recordAdClick(String placementKey) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                if (SupabaseAuthBridge.isConfigured()) {
                    JSONObject log = new JSONObject();
                    log.put("id", java.util.UUID.randomUUID().toString());
                    log.put("action", "ad_click");
                    String currentUserId = SupabaseAuthBridge.getCurrentUserId();
                    if (currentUserId != null && !currentUserId.isEmpty()) {
                        log.put("user_id", currentUserId);
                    }
                    JSONObject detailsObj = new JSONObject();
                    detailsObj.put("placement", placementKey);
                    log.put("details", detailsObj);
                    log.put("timestamp", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date()));
                    SupabaseAuthBridge.insertRecord("activity_logs", log, null);
                }
            } catch (Exception ignored) {}
        });
    }
}
