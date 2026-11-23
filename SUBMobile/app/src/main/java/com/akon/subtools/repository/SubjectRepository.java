package com.akon.subtools.repository;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.akon.subtools.cache.BackgroundSyncManager;
import com.akon.subtools.cache.RoomRepository;
import com.akon.subtools.models.Subject;

import java.util.ArrayList;
import java.util.List;

public class SubjectRepository {
    private final Context context;
    private final RoomRepository roomRepository;
    private final BackgroundSyncManager syncManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public SubjectRepository(Context context) {
        this.context = context.getApplicationContext();
        this.roomRepository = RoomRepository.getInstance(this.context);
        this.syncManager = BackgroundSyncManager.getInstance(this.context);
    }

    public interface SubjectCallback {
        void onSuccess(List<Subject> subjects);
        void onFailure(Exception e);
    }

    public void getSubjectsByDepartment(String dept, SubjectCallback callback) {
        getAllSubjects(callback);
    }

    /**
     * Offline-first fetch:
     * 1. Returns cached subjects from Room instantly.
     * 2. Checks 30-day cache validity in background; performs silent sync if expired/missing.
     */
    public void getAllSubjects(SubjectCallback callback) {
        getCachedSubjects(new SubjectCallback() {
            @Override
            public void onSuccess(List<Subject> cached) {
                if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());

                boolean forceRefresh = (cached == null || cached.isEmpty());
                syncManager.syncSubjectsIfExpired(forceRefresh, () -> {
                    if (callback != null) {
                        getCachedSubjects(new SubjectCallback() {
                            @Override
                            public void onSuccess(List<Subject> updated) {
                                mainHandler.post(() -> callback.onSuccess(updated != null ? updated : new ArrayList<>()));
                            }
                            @Override
                            public void onFailure(Exception e) {}
                        });
                    }
                });
            }

            @Override
            public void onFailure(Exception e) {
                syncManager.syncSubjectsIfExpired(true, () -> getCachedSubjects(callback));
            }
        });
    }

    /**
     * Manual refresh for SwipeRefreshLayout.
     */
    public void refreshSubjects(SubjectCallback callback) {
        syncManager.syncSubjectsIfExpired(true, () -> getCachedSubjects(callback));
    }

    public void getCachedSubjects(SubjectCallback callback) {
        roomRepository.getSubjects(cached -> mainHandler.post(() -> {
            if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());
        }));
    }
}
