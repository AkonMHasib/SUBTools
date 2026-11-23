package com.akon.subtools.cache;

import com.akon.subtools.models.CacheMetadata;

public class CacheValidator {

    public enum CacheStatus {
        VALID,
        EXPIRED,
        MISSING,
        VERSION_MISMATCH
    }

    public static final int CURRENT_CACHE_VERSION = 1;

    // Cache Keys
    public static final String KEY_USER_PROFILE = "user_profile";
    public static final String KEY_NOTICES = "notices_v2";
    public static final String KEY_ROUTINE = "routine";
    public static final String KEY_FACULTY = "faculty";
    public static final String KEY_SUBJECTS = "subjects";
    public static final String KEY_ACADEMIC_CALENDAR = "academic_calendar";
    public static final String KEY_BUS_ROUTES = "bus_routes";
    public static final String KEY_DEPARTMENT_INFO = "department_info";
    public static final String KEY_STATIC_SETTINGS = "static_settings";

    public static long getExpiryDuration(String cacheKey) {
        if (cacheKey == null) return 30 * 60 * 1000L;

        if (cacheKey.startsWith(KEY_USER_PROFILE)) {
            return Long.MAX_VALUE; // Download once after login; refresh only on update
        } else if (cacheKey.startsWith(KEY_NOTICES)) {
            return 6 * 60 * 60 * 1000L; // 6 hours (backed by real-time listener)
        } else if (cacheKey.startsWith(KEY_ROUTINE)) {
            return 30 * 60 * 1000L; // 30 minutes (reduced from 24h for faster cross-app sync)
        } else if (cacheKey.startsWith(KEY_FACULTY)) {
            return 7 * 24 * 60 * 60 * 1000L; // 7 days
        } else if (cacheKey.startsWith(KEY_BUS_ROUTES)) {
            return 7 * 24 * 60 * 60 * 1000L; // 7 days
        } else if (cacheKey.startsWith(KEY_SUBJECTS)) {
            return 30L * 24 * 60 * 60 * 1000L; // 30 days
        } else if (cacheKey.startsWith(KEY_ACADEMIC_CALENDAR)) {
            return 30L * 24 * 60 * 60 * 1000L; // 30 days
        } else if (cacheKey.startsWith(KEY_DEPARTMENT_INFO)) {
            return 30L * 24 * 60 * 60 * 1000L; // 30 days
        } else if (cacheKey.startsWith(KEY_STATIC_SETTINGS)) {
            return 30L * 24 * 60 * 60 * 1000L; // 30 days
        }
        return 30 * 60 * 1000L;
    }

    public static CacheStatus validate(CacheMetadata metadata, String cacheKey) {
        if (metadata == null) {
            return CacheStatus.MISSING;
        }

        if (metadata.getVersion() < CURRENT_CACHE_VERSION) {
            return CacheStatus.VERSION_MISMATCH;
        }

        long now = System.currentTimeMillis();
        long expiryDuration = getExpiryDuration(cacheKey);

        if (expiryDuration == Long.MAX_VALUE) {
            return CacheStatus.VALID;
        }

        if (metadata.getExpiresAt() > 0 && now > metadata.getExpiresAt()) {
            return CacheStatus.EXPIRED;
        }

        if (metadata.getLastUpdated() > 0 && (now - metadata.getLastUpdated()) > expiryDuration) {
            return CacheStatus.EXPIRED;
        }

        return CacheStatus.VALID;
    }
}
