package com.akon.subtools.coordinator.utils;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.google.gson.Gson;

import java.lang.reflect.Type;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * High-performance Memory & Persistent Disk Cache for STC.
 * Minimizes Firestore reads and ensures instant UI loading (0ms) from disk/memory.
 */
public final class AppCache {

    private static final String TAG = "AppCache";
    private static final String PREF_NAME = "stc_app_cache_prefs";
    private static final Gson gson = new Gson();

    /** 1 Hour — for faculty / notices */
    public static final long TTL_MEDIUM = 60 * 60 * 1000L;
    /** 15 Minutes — for routines & transport status */
    public static final long TTL_SHORT  = 15 * 60 * 1000L;
    /** 24 Hours — for static metadata like subjects, buildings & rooms */
    public static final long TTL_LONG   = 24 * 60 * 60 * 1000L;

    private static final Map<String, CacheEntry<?>> memoryStore =
            Collections.synchronizedMap(new HashMap<>());

    private static SharedPreferences diskPrefs;

    private AppCache() {}

    public static synchronized void init(Context context) {
        if (context != null && diskPrefs == null) {
            diskPrefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        }
    }

    // ── Write ──────────────────────────────────────────────────────────────

    public static <T> void put(String key, T value, long ttlMs) {
        if (key == null || value == null) return;
        memoryStore.put(key, new CacheEntry<>(value, ttlMs));

        if (diskPrefs != null) {
            try {
                long expiresAt = System.currentTimeMillis() + ttlMs;
                String json = (value instanceof String) ? (String) value : gson.toJson(value);
                diskPrefs.edit()
                        .putString(key, json)
                        .putLong(key + "_expires", expiresAt)
                        .apply();
            } catch (Exception e) {
                Log.w(TAG, "Disk cache write failed for key: " + key, e);
            }
        }
    }

    // ── Read ───────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public static <T> T get(String key) {
        if (key == null) return null;

        // 1. Memory Check
        CacheEntry<?> entry = memoryStore.get(key);
        if (entry != null) {
            if (entry.isExpired()) {
                memoryStore.remove(key);
            } else {
                return (T) entry.value;
            }
        }

        // 2. Disk Check (Only for plain String values)
        if (diskPrefs != null && diskPrefs.contains(key)) {
            long expiresAt = diskPrefs.getLong(key + "_expires", 0);
            if (System.currentTimeMillis() <= expiresAt) {
                String val = diskPrefs.getString(key, null);
                if (val != null && !val.startsWith("{") && !val.startsWith("[")) {
                    memoryStore.put(key, new CacheEntry<>(val, expiresAt - System.currentTimeMillis()));
                    return (T) val;
                }
            } else {
                diskPrefs.edit().remove(key).remove(key + "_expires").apply();
            }
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    public static <T> T get(String key, Class<T> clazz) {
        if (key == null || clazz == null) return null;

        CacheEntry<?> entry = memoryStore.get(key);
        if (entry != null && !entry.isExpired()) {
            return (T) entry.value;
        }

        if (diskPrefs != null && diskPrefs.contains(key)) {
            long expiresAt = diskPrefs.getLong(key + "_expires", 0);
            if (System.currentTimeMillis() <= expiresAt) {
                String json = diskPrefs.getString(key, null);
                if (json != null) {
                    try {
                        T val = (clazz == String.class) ? (T) json : gson.fromJson(json, clazz);
                        if (val != null) {
                            memoryStore.put(key, new CacheEntry<>(val, expiresAt - System.currentTimeMillis()));
                            return val;
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Disk cache parse failed for key: " + key, e);
                    }
                }
            } else {
                diskPrefs.edit().remove(key).remove(key + "_expires").apply();
            }
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    public static <T> T get(String key, Type typeOfT) {
        if (key == null || typeOfT == null) return null;

        CacheEntry<?> entry = memoryStore.get(key);
        if (entry != null && !entry.isExpired()) {
            return (T) entry.value;
        }

        if (diskPrefs != null && diskPrefs.contains(key)) {
            long expiresAt = diskPrefs.getLong(key + "_expires", 0);
            if (System.currentTimeMillis() <= expiresAt) {
                String json = diskPrefs.getString(key, null);
                if (json != null) {
                    try {
                        T val = gson.fromJson(json, typeOfT);
                        if (val != null) {
                            memoryStore.put(key, new CacheEntry<>(val, expiresAt - System.currentTimeMillis()));
                            return val;
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Disk cache parse failed for key: " + key, e);
                    }
                }
            } else {
                diskPrefs.edit().remove(key).remove(key + "_expires").apply();
            }
        }

        return null;
    }

    public static boolean has(String key) {
        return get(key) != null;
    }

    // ── Invalidation ───────────────────────────────────────────────────────

    public static void invalidate(String key) {
        if (key == null) return;
        memoryStore.remove(key);
        if (diskPrefs != null) {
            diskPrefs.edit().remove(key).remove(key + "_expires").apply();
        }
    }

    public static void invalidatePrefix(String prefix) {
        if (prefix == null) return;
        memoryStore.keySet().removeIf(k -> k.startsWith(prefix));
        if (diskPrefs != null) {
            SharedPreferences.Editor editor = diskPrefs.edit();
            for (String k : diskPrefs.getAll().keySet()) {
                if (k.startsWith(prefix)) {
                    editor.remove(k);
                }
            }
            editor.apply();
        }
    }

    public static void clear() {
        memoryStore.clear();
        if (diskPrefs != null) {
            diskPrefs.edit().clear().apply();
        }
    }

    // ── Internal entry class ───────────────────────────────────────────────

    private static final class CacheEntry<T> {
        final T value;
        final long expiresAt;

        CacheEntry(T value, long ttlMs) {
            this.value = value;
            this.expiresAt = System.currentTimeMillis() + ttlMs;
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }
}
