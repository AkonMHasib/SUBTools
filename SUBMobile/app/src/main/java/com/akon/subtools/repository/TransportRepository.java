package com.akon.subtools.repository;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.akon.subtools.cache.BackgroundSyncManager;
import com.akon.subtools.cache.RoomRepository;
import com.akon.subtools.models.Bus;
import com.akon.subtools.models.Route;

import java.util.ArrayList;
import java.util.List;

public class TransportRepository {
    private final Context context;
    private final RoomRepository roomRepository;
    private final BackgroundSyncManager syncManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public TransportRepository(Context context) {
        this.context = context.getApplicationContext();
        this.roomRepository = RoomRepository.getInstance(this.context);
        this.syncManager = BackgroundSyncManager.getInstance(this.context);
    }

    public interface BusesCallback {
        void onSuccess(List<Bus> buses);
        void onFailure(Exception e);
    }

    public interface RoutesCallback {
        void onSuccess(List<Route> routes);
        void onFailure(Exception e);
    }

    /**
     * Offline-first fetch:
     * 1. Returns cached buses from Room instantly.
     * 2. Checks 7-day cache validity in background; performs silent sync if expired/missing.
     */
    public void getAllBuses(BusesCallback callback) {
        getCachedBuses(new BusesCallback() {
            @Override
            public void onSuccess(List<Bus> cached) {
                if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());

                boolean forceRefresh = (cached == null || cached.isEmpty());
                syncManager.syncTransportIfExpired(forceRefresh, () -> {
                    if (callback != null) {
                        getCachedBuses(new BusesCallback() {
                            @Override
                            public void onSuccess(List<Bus> updated) {
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
                syncManager.syncTransportIfExpired(true, () -> getCachedBuses(callback));
            }
        });
    }

    /**
     * Offline-first fetch:
     * 1. Returns cached routes from Room instantly.
     * 2. Checks 7-day cache validity in background; performs silent sync if expired/missing.
     */
    public void getAllRoutes(RoutesCallback callback) {
        getCachedRoutes(new RoutesCallback() {
            @Override
            public void onSuccess(List<Route> cached) {
                if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());

                boolean forceRefresh = (cached == null || cached.isEmpty());
                syncManager.syncTransportIfExpired(forceRefresh, () -> {
                    if (callback != null) {
                        getCachedRoutes(new RoutesCallback() {
                            @Override
                            public void onSuccess(List<Route> updated) {
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
                syncManager.syncTransportIfExpired(true, () -> getCachedRoutes(callback));
            }
        });
    }

    /**
     * Manual refresh for SwipeRefreshLayout / forced sync.
     */
    public void refreshTransport(Runnable onComplete) {
        syncManager.forceSyncTransportFromFirestore(onComplete);
    }

    public void getCachedBuses(BusesCallback callback) {
        roomRepository.getBuses(cached -> mainHandler.post(() -> {
            if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());
        }));
    }

    public void getCachedRoutes(RoutesCallback callback) {
        roomRepository.getRoutes(cached -> mainHandler.post(() -> {
            if (callback != null) callback.onSuccess(cached != null ? cached : new ArrayList<>());
        }));
    }
}
