package com.akon.subtools.coordinator;

import android.app.Application;

public class SubToolsCoordinatorApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();

        androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(
                androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        );

        com.akon.subtools.coordinator.utils.CrashLogManager.init(this);
        com.akon.subtools.coordinator.utils.AppCache.init(this);

        // Restore cached Supabase token from encrypted session
        try {
            com.akon.subtools.coordinator.data.repository.SessionManager session = 
                    new com.akon.subtools.coordinator.data.repository.SessionManager(this);
            String token = session.getAccessToken();
            String refreshToken = session.getRefreshToken();
            if (token != null && !token.trim().isEmpty()) {
                if (!com.akon.subtools.coordinator.utils.SupabaseAuthBridge.isJwtExpired(token.trim())) {
                    com.akon.subtools.coordinator.utils.SupabaseAuthBridge.setCachedAccessToken(token.trim());
                } else if (refreshToken != null && !refreshToken.trim().isEmpty()) {
                    com.akon.subtools.coordinator.utils.SupabaseAuthBridge.refreshSession(refreshToken.trim(), new com.akon.subtools.coordinator.utils.SupabaseAuthBridge.TokenRefreshCallback() {
                        @Override
                        public void onSuccess(String newAccessToken, String newRefreshToken) {
                            session.setTokens(newAccessToken, newRefreshToken);
                        }
                        @Override
                        public void onError(String error) {}
                    });
                }
            }
        } catch (Exception ignored) {}
    }
}
