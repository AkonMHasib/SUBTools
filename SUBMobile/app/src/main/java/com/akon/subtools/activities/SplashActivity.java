package com.akon.subtools.activities;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.animation.AlphaAnimation;
import android.view.animation.DecelerateInterpolator;

import androidx.appcompat.app.AppCompatActivity;

import com.akon.subtools.databinding.ActivitySplashBinding;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.CacheManager;
import com.akon.subtools.database.AppDatabase;

public class SplashActivity extends AppCompatActivity {
    private ActivitySplashBinding binding;

    @SuppressWarnings("deprecation")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivitySplashBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        // Smooth fade-in animation for logo & text details
        AlphaAnimation fadeIn = new AlphaAnimation(0f, 1f);
        fadeIn.setInterpolator(new DecelerateInterpolator());
        fadeIn.setDuration(1200);
        try {
            String verName = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            binding.txtVersion.setText("v" + verName);
        } catch (Exception e) {
            binding.txtVersion.setText("v2.0.0");
        }

        binding.layoutContent.startAnimation(fadeIn);
        binding.txtDeveloper.startAnimation(fadeIn);
        binding.txtVersion.startAnimation(fadeIn);

        // Delay logic for redirection
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (isFinishing() || isDestroyed()) return;
            AppDatabase.databaseWriteExecutor.execute(() -> {
                User cachedUser = AppDatabase.getLocalUser(getApplicationContext());
                final boolean loggedIn = cachedUser != null && cachedUser.getUid() != null && !cachedUser.getUid().trim().isEmpty();
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    startActivity(new Intent(SplashActivity.this, loggedIn ? MainActivity.class : LoginActivity.class));
                    finish();
                    overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                });
            });
        }, 2000);
    }
}
