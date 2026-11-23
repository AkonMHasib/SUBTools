package com.akon.subtools.repository;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.akon.subtools.cache.BackgroundSyncManager;
import com.akon.subtools.cache.RoomRepository;
import com.akon.subtools.models.Notice;

import java.util.ArrayList;
import java.util.List;

public class NoticeRepository {
    private final Context context;
    private final RoomRepository roomRepository;
    private final BackgroundSyncManager syncManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public NoticeRepository(Context context) {
        this.context = context.getApplicationContext();
        this.roomRepository = RoomRepository.getInstance(this.context);
        this.syncManager = BackgroundSyncManager.getInstance(this.context);
    }

    public interface NoticeCallback {
        void onSuccess(List<Notice> notices);
        void onFailure(Exception e);
    }

    public interface NoticeVersionCallback {
        void onSuccess(int version);
        void onFailure(Exception e);
    }

    /**
     * Offline-first fetch:
     * 1. Delivers Room cached notices instantly to UI.
     * 2. Checks cache validity in background; performs silent sync if expired/missing.
     */
    public void getAllNotices(NoticeCallback callback) {
        getCachedNotices(new NoticeCallback() {
            @Override
            public void onSuccess(List<Notice> cachedNotices) {
                if (callback != null) callback.onSuccess(cachedNotices != null ? cachedNotices : new ArrayList<>());

                boolean forceRefresh = (cachedNotices == null || cachedNotices.isEmpty());
                syncManager.syncNoticesIfExpired(forceRefresh, () -> {
                    if (callback != null) {
                        getCachedNotices(new NoticeCallback() {
                            @Override
                            public void onSuccess(List<Notice> updatedList) {
                                mainHandler.post(() -> callback.onSuccess(updatedList != null ? updatedList : new ArrayList<>()));
                            }
                            @Override
                            public void onFailure(Exception e) {}
                        });
                    }
                });
            }

            @Override
            public void onFailure(Exception e) {
                syncManager.syncNoticesIfExpired(true, () -> getCachedNotices(callback));
            }
        });
    }

    /**
     * Manual refresh for SwipeRefreshLayout.
     */
    public void refreshNotices(NoticeCallback callback) {
        syncManager.syncNoticesIfExpired(true, () -> getCachedNotices(callback));
    }

    public void getCachedNotices(NoticeCallback callback) {
        roomRepository.getNotices(cached -> mainHandler.post(() -> {
            if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());
        }));
    }

    public void getNoticeVersion(NoticeVersionCallback callback) {
        if (callback != null) {
            mainHandler.post(() -> callback.onSuccess(1));
        }
    }
}
