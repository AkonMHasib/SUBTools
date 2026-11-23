package com.akon.subtools.coordinator.ui.main;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.navigation.NavController;
import androidx.navigation.fragment.NavHostFragment;

import com.akon.subtools.coordinator.R;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.databinding.ActivityMainBinding;
import com.akon.subtools.coordinator.ui.auth.LoginActivity;

public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;
    private SessionManager sessionManager;
    private NavController navController;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        sessionManager = new SessionManager(this);

        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        setupHeaderUI();
        setupNavigation();

        // Sync latest user profile & department from Firestore
        new com.akon.subtools.coordinator.data.repository.AuthRepository(sessionManager).syncUserProfile(this, () -> setupHeaderUI());

        // Check for prior crash logs
        com.akon.subtools.coordinator.utils.CrashLogManager.checkForCrashLog(this);

        // Check for STC In-App Version Updates
        com.akon.subtools.coordinator.utils.AppUpdateManager.checkForUpdates(this);

        // Schedule & check GPS link expiry reminders (2-day, 1-day, day-of)
        com.akon.subtools.coordinator.utils.GpsExpiryReminderScheduler.scheduleDailyCheck(this);
        com.akon.subtools.coordinator.utils.GpsExpiryReminderScheduler.checkOnStartup(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        setupHeaderUI();
    }

    private void setupHeaderUI() {
        String fullName = sessionManager.getName();
        String firstName = "Admin";
        if (fullName != null && !fullName.trim().isEmpty()) {
            String clean = fullName.trim();
            String[] parts = clean.split("\\s+");
            if (parts.length > 0) {
                firstName = parts[0];
                if ((firstName.equalsIgnoreCase("Dr.") || firstName.equalsIgnoreCase("Prof.") || firstName.equalsIgnoreCase("Mr.") || firstName.equalsIgnoreCase("Ms.")) && parts.length > 1) {
                    firstName = parts[1];
                }
            }
        }

        binding.txtActiveRoleBadge.setText("Admin");
        binding.txtDeptBadge.setVisibility(android.view.View.GONE);

        binding.btnSignOut.setOnClickListener(v -> {
            new androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("Sign Out")
                    .setMessage("Are you sure you want to sign out from STC?")
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Sign Out", (dialog, which) -> signOutUser())
                    .show();
        });
    }

    private void setupNavigation() {
        // Single unified workspace navigation menu (Dashboard, Routine, Subjects, Notices, Transport)
        binding.bottomNavigation.getMenu().clear();
        binding.bottomNavigation.inflateMenu(R.menu.menu_unified_admin_nav);

        NavHostFragment navHostFragment = (NavHostFragment) getSupportFragmentManager()
                .findFragmentById(R.id.nav_host_fragment);
        if (navHostFragment != null) {
            navController = navHostFragment.getNavController();
            binding.bottomNavigation.setOnItemSelectedListener(item -> {
                androidx.navigation.NavOptions navOptions = new androidx.navigation.NavOptions.Builder()
                        .setLaunchSingleTop(true)
                        .setPopUpTo(R.id.navigation_dashboard, false)
                        .build();
                try {
                    navController.navigate(item.getItemId(), null, navOptions);
                    return true;
                } catch (Exception ignored) {
                    return false;
                }
            });
        }
    }

    public void signOutUser() {
        com.akon.subtools.coordinator.utils.AppCache.clear();
        sessionManager.clearSession();
        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
