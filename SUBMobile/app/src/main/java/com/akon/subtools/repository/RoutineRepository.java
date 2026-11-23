package com.akon.subtools.repository;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.akon.subtools.cache.BackgroundSyncManager;
import com.akon.subtools.cache.RoomRepository;
import com.akon.subtools.models.Routine;

import java.util.ArrayList;
import java.util.List;

public class RoutineRepository {
    private final Context context;
    private final RoomRepository roomRepository;
    private final BackgroundSyncManager syncManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public RoutineRepository(Context context) {
        this.context = context.getApplicationContext();
        this.roomRepository = RoomRepository.getInstance(this.context);
        this.syncManager = BackgroundSyncManager.getInstance(this.context);
    }

    public interface RoutineCallback {
        void onSuccess(List<Routine> routines);
        void onFailure(Exception e);
    }

    public void getRoutinesByDeptAndTerm(String dept, String term, RoutineCallback callback) {
        getAllRoutines(callback);
    }

    /**
     * Offline-first fetch:
     * 1. Returns cached routines from Room instantly.
     * 2. Checks cache validity in background (12-hour expiry); performs silent sync if expired/missing.
     */
    public void getAllRoutines(RoutineCallback callback) {
        getCachedRoutines(new RoutineCallback() {
            @Override
            public void onSuccess(List<Routine> cached) {
                if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());

                boolean forceRefresh = (cached == null || cached.isEmpty());
                syncManager.syncRoutineIfExpired(forceRefresh, () -> {
                    if (callback != null) {
                        getCachedRoutines(new RoutineCallback() {
                            @Override
                            public void onSuccess(List<Routine> updated) {
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
                syncManager.syncRoutineIfExpired(true, () -> getCachedRoutines(callback));
            }
        });
    }

    /**
     * Manual refresh for SwipeRefreshLayout.
     * Forces a Firestore fetch, saves to Room, then returns fresh data.
     */
    public void refreshRoutines(RoutineCallback callback) {
        syncManager.forceSyncRoutinesFromFirestore(() -> {
            // After Firestore save, read back from Room
            getCachedRoutines(callback);
        });
    }

    public void getCachedRoutines(RoutineCallback callback) {
        roomRepository.getRoutines(cached -> mainHandler.post(() -> {
            if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());
        }));
    }
}
