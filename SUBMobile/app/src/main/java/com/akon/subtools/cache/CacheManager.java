package com.akon.subtools.cache;

import android.content.Context;
import android.util.Log;

import com.akon.subtools.database.AppDatabase;
import com.akon.subtools.models.CacheMetadata;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CacheManager {
    private static final String TAG = "SUBTools_Cache";
    private static volatile CacheManager INSTANCE;

    private final Context context;
    private final AppDatabase database;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private CacheManager(Context context) {
        this.context = context.getApplicationContext();
        this.database = AppDatabase.getDatabase(this.context);
    }

    public static CacheManager getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (CacheManager.class) {
                if (INSTANCE == null) {
                    INSTANCE = new CacheManager(context);
                }
            }
        }
        return INSTANCE;
    }

    public interface CacheCheckCallback {
        void onResult(CacheValidator.CacheStatus status, CacheMetadata metadata);
    }

    public void checkCacheStatus(String cacheKey, CacheCheckCallback callback) {
        executor.execute(() -> {
            try {
                CacheMetadata metadata = database.cacheMetadataDao().getMetadata(cacheKey);
                CacheValidator.CacheStatus status = CacheValidator.validate(metadata, cacheKey);
                if (callback != null) {
                    callback.onResult(status, metadata);
                }
            } catch (Exception e) {
                Log.e("CacheManager", "Error checking cache status for " + cacheKey, e);
                if (callback != null) {
                    callback.onResult(CacheValidator.CacheStatus.EXPIRED, null);
                }
            }
        });
    }

    public CacheValidator.CacheStatus checkCacheStatusSync(String cacheKey) {
        try {
            CacheMetadata metadata = database.cacheMetadataDao().getMetadata(cacheKey);
            return CacheValidator.validate(metadata, cacheKey);
        } catch (Exception e) {
            Log.e("CacheManager", "Error checking cache status sync for " + cacheKey, e);
            return CacheValidator.CacheStatus.EXPIRED;
        }
    }

    public void updateCacheMetadata(String cacheKey, String dataHash) {
        executor.execute(() -> {
            long now = System.currentTimeMillis();
            long duration = CacheValidator.getExpiryDuration(cacheKey);
            long expiresAt = (duration == Long.MAX_VALUE) ? Long.MAX_VALUE : (now + duration);

            CacheMetadata metadata = new CacheMetadata(
                    cacheKey,
                    now,
                    expiresAt,
                    CacheValidator.CURRENT_CACHE_VERSION,
                    dataHash != null ? dataHash : ""
            );
            database.cacheMetadataDao().insertMetadata(metadata);
            logDebug("CACHE UPDATED: Key=" + cacheKey + ", ExpiresIn=" + (duration / 60000) + "m");
        });
    }

    public void invalidateCache(String cacheKey) {
        executor.execute(() -> {
            database.cacheMetadataDao().deleteMetadata(cacheKey);
            logDebug("CACHE INVALIDATED: Key=" + cacheKey);
        });
    }

    public void clearAllCache() {
        executor.execute(() -> {
            database.cacheMetadataDao().clearAllMetadata();
            logDebug("ALL CACHE CLEARED");
        });
    }

    public static void logDebug(String message) {
        // Debug logging suppressed in production
    }
}
