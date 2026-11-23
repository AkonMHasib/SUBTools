package com.akon.subtools.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class CacheManager {
    private static final String PREF_NAME = "subtools_local_cache";
    private static final long CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours

    private final SharedPreferences prefs;
    private final Gson gson;

    public CacheManager(Context context) {
        this.prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        this.gson = new Gson();
    }

    public SharedPreferences getPrefs() {
        return prefs;
    }

    private String getTimestampKey(String key) {
        return key + "_timestamp";
    }

    public boolean isCacheExpired(String key) {
        long timestamp = prefs.getLong(getTimestampKey(key), 0);
        return (System.currentTimeMillis() - timestamp) > CACHE_EXPIRY_MS;
    }

    public void clearCache(String key) {
        prefs.edit().remove(key).remove(getTimestampKey(key)).apply();
    }

    public void clearAll() {
        prefs.edit().clear().apply();
    }

    // Save Generic Object / List
    public <T> void save(String key, T data) {
        String json = gson.toJson(data);
        prefs.edit()
             .putString(key, json)
             .putLong(getTimestampKey(key), System.currentTimeMillis())
             .apply();
    }

    // Retrieve Object
    public <T> T getObject(String key, Class<T> clazz) {
        String json = prefs.getString(key, null);
        if (json == null) return null;
        try {
            return gson.fromJson(json, clazz);
        } catch (Exception e) {
            return null;
        }
    }

    /** Alias for {@link #getObject(String, Class)}. */
    public <T> T get(String key, Class<T> clazz) {
        return getObject(key, clazz);
    }

    // Retrieve List
    public <T> List<T> getList(String key, Type typeOfT) {
        String json = prefs.getString(key, null);
        if (json == null) return new ArrayList<>();
        try {
            return gson.fromJson(json, typeOfT);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
