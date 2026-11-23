package com.akon.subtools.repository;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.akon.subtools.cache.BackgroundSyncManager;
import com.akon.subtools.cache.RoomRepository;
import com.akon.subtools.models.Faculty;

import java.util.ArrayList;
import java.util.List;

public class FacultyRepository {
    private final Context context;
    private final RoomRepository roomRepository;
    private final BackgroundSyncManager syncManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public FacultyRepository(Context context) {
        this.context = context.getApplicationContext();
        this.roomRepository = RoomRepository.getInstance(this.context);
        this.syncManager = BackgroundSyncManager.getInstance(this.context);
    }

    public interface FacultyCallback {
        void onSuccess(List<Faculty> facultyList);
        void onFailure(Exception e);
    }

    public void getCachedFaculty(String department, FacultyCallback callback) {
        roomRepository.getFaculty(department, cached -> mainHandler.post(() -> {
            if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());
        }));
    }

    /**
     * Offline-first fetch:
     * 1. Returns cached faculty directory from Room instantly.
     * 2. Checks 7-day cache validity in background; performs silent sync if expired/missing.
     */
    public void getFacultyByDepartment(String department, FacultyCallback callback) {
        getCachedFaculty(department, new FacultyCallback() {
            @Override
            public void onSuccess(List<Faculty> cached) {
                if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());

                boolean forceRefresh = (cached == null || cached.isEmpty());
                syncManager.syncFacultyIfExpired(department, forceRefresh, () -> {
                    if (callback != null) {
                        getCachedFaculty(department, new FacultyCallback() {
                            @Override
                            public void onSuccess(List<Faculty> updated) {
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
                syncManager.syncFacultyIfExpired(department, true, () -> getCachedFaculty(department, callback));
            }
        });
    }

    /**
     * Manual refresh for SwipeRefreshLayout.
     */
    public void refreshFaculty(String department, FacultyCallback callback) {
        syncManager.syncFacultyIfExpired(department, true, () -> getCachedFaculty(department, callback));
    }
}
