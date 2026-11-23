package com.akon.subtools.viewmodels;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.models.Bus;
import com.akon.subtools.models.Route;
import com.akon.subtools.repository.TransportRepository;

import java.util.ArrayList;
import java.util.List;

public class TransportViewModel extends AndroidViewModel {
    private final TransportRepository transportRepository;
    private final MutableLiveData<List<Bus>> busesList = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<List<Route>> routesList = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();

    public TransportViewModel(@NonNull Application application) {
        super(application);
        this.transportRepository = new TransportRepository(application);
    }

    public LiveData<List<Bus>> getBusesList() { return busesList; }
    public LiveData<List<Route>> getRoutesList() { return routesList; }
    public LiveData<Boolean> getLoading() { return loading; }
    public LiveData<String> getError() { return error; }

    public static boolean isTransportSyncRequired(long lastSyncTime) {
        long now = System.currentTimeMillis();
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.set(java.util.Calendar.HOUR_OF_DAY, 10);
        cal.set(java.util.Calendar.MINUTE, 0);
        cal.set(java.util.Calendar.SECOND, 0);
        cal.set(java.util.Calendar.MILLISECOND, 0);
        long today10AM = cal.getTimeInMillis();

        if (now >= today10AM) {
            return lastSyncTime < today10AM;
        } else {
            return lastSyncTime < (today10AM - 24 * 60 * 60 * 1000L);
        }
    }

    public void loadTransportData() {
        // 1. Immediately display cached data from Room
        transportRepository.getCachedBuses(new TransportRepository.BusesCallback() {
            @Override
            public void onSuccess(List<Bus> buses) {
                if (buses != null && !buses.isEmpty()) {
                    busesList.postValue(buses);
                }
            }
            @Override
            public void onFailure(Exception e) {}
        });
        transportRepository.getCachedRoutes(new TransportRepository.RoutesCallback() {
            @Override
            public void onSuccess(List<Route> routes) {
                if (routes != null && !routes.isEmpty()) {
                    routesList.postValue(routes);
                }
            }
            @Override
            public void onFailure(Exception e) {}
        });

        // 2. Fetch fresh data from network and refresh Room & LiveData
        refreshTransportDataSilently();
    }

    private void refreshTransportDataSilently() {
        transportRepository.refreshTransport(() -> {
            transportRepository.getCachedBuses(new TransportRepository.BusesCallback() {
                @Override
                public void onSuccess(List<Bus> buses) {
                    if (buses != null) {
                        busesList.postValue(buses);
                    }
                }
                @Override
                public void onFailure(Exception e) {}
            });
            transportRepository.getCachedRoutes(new TransportRepository.RoutesCallback() {
                @Override
                public void onSuccess(List<Route> routes) {
                    if (routes != null) {
                        routesList.postValue(routes);
                    }
                    android.content.SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                    prefs.edit().putLong("last_transport_sync_timestamp", System.currentTimeMillis()).apply();
                }
                @Override
                public void onFailure(Exception e) {}
            });
        });
    }

    public void refreshTransportData() {
        loading.postValue(true);
        transportRepository.refreshTransport(() -> {
            loading.postValue(false);
            transportRepository.getCachedBuses(new TransportRepository.BusesCallback() {
                @Override
                public void onSuccess(List<Bus> buses) {
                    if (buses != null) {
                        busesList.postValue(buses);
                    }
                }
                @Override
                public void onFailure(Exception e) {}
            });
            transportRepository.getCachedRoutes(new TransportRepository.RoutesCallback() {
                @Override
                public void onSuccess(List<Route> routes) {
                    if (routes != null) {
                        routesList.postValue(routes);
                    }
                    android.content.SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                    prefs.edit().putLong("last_transport_sync_timestamp", System.currentTimeMillis()).apply();
                }
                @Override
                public void onFailure(Exception e) {}
            });
        });
    }
}
