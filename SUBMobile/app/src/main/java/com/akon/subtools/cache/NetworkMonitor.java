package com.akon.subtools.cache;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;

public class NetworkMonitor {
    private static volatile NetworkMonitor INSTANCE;
    private final Context context;
    private final ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean isRegistered = false;
    private boolean wasOffline = true;

    private NetworkMonitor(Context context) {
        this.context = context.getApplicationContext();
        this.connectivityManager = (ConnectivityManager) this.context.getSystemService(Context.CONNECTIVITY_SERVICE);
    }

    public static NetworkMonitor getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (NetworkMonitor.class) {
                if (INSTANCE == null) {
                    INSTANCE = new NetworkMonitor(context);
                }
            }
        }
        return INSTANCE;
    }

    public void startMonitoring() {
        if (isRegistered || connectivityManager == null) return;

        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                CacheManager.logDebug("NETWORK AVAILABLE");
                if (wasOffline) {
                    wasOffline = false;
                    // Network recovered! Refresh ONLY expired caches silently
                    BackgroundSyncManager.getInstance(context).syncExpiredCachesSilently();
                }
            }

            @Override
            public void onLost(Network network) {
                CacheManager.logDebug("NETWORK LOST");
                wasOffline = true;
            }
        };

        try {
            connectivityManager.registerNetworkCallback(request, networkCallback);
            isRegistered = true;
        } catch (Exception ignored) {}
    }

    public void stopMonitoring() {
        if (!isRegistered || connectivityManager == null || networkCallback == null) return;
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback);
        } catch (Exception ignored) {}
        isRegistered = false;
    }

    public boolean isNetworkAvailable() {
        if (connectivityManager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Network network = connectivityManager.getActiveNetwork();
            if (network == null) return false;
            NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(network);
            return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } else {
            android.net.NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
            return activeNetworkInfo != null && activeNetworkInfo.isConnected();
        }
    }
}
