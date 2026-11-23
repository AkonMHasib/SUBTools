package com.akon.subtools.activities;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.GravityCompat;
import androidx.lifecycle.ViewModelProvider;
import androidx.navigation.NavController;
import androidx.navigation.fragment.NavHostFragment;

import com.akon.subtools.R;
import com.akon.subtools.adapters.DrawerExpandableAdapter;
import com.akon.subtools.databinding.ActivityMainBinding;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.CacheManager;
import com.akon.subtools.database.AppDatabase;
import com.akon.subtools.viewmodels.AuthViewModel;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private ActivityMainBinding binding;
    private AuthViewModel authViewModel;
    private NavController navController;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 1. Session Protection Check
        User localUser = AppDatabase.getLocalUser(this);
        if (localUser == null || localUser.getUid() == null || localUser.getUid().trim().isEmpty()) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        // Request POST_NOTIFICATIONS permission for Android 13+
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(this, 
                    android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                androidx.core.app.ActivityCompat.requestPermissions(this, 
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        authViewModel = new ViewModelProvider(this).get(AuthViewModel.class);

        // 2. Setup Navigation Host
        NavHostFragment navHostFragment = (NavHostFragment) getSupportFragmentManager()
                .findFragmentById(R.id.nav_host_fragment);
        if (navHostFragment != null) {
            navController = navHostFragment.getNavController();

            // Hook Hamburger toggle button
            binding.btnMenu.setOnClickListener(v -> {
                if (binding.drawerLayout.isDrawerOpen(GravityCompat.START)) {
                    binding.drawerLayout.closeDrawer(GravityCompat.START);
                } else {
                    binding.drawerLayout.openDrawer(GravityCompat.START);
                }
            });

            // Update app title dynamically on destination change
            navController.addOnDestinationChangedListener((controller, destination, arguments) -> {
                binding.textAppTitle.setText(destination.getLabel());
            });
        }

        // 3. Setup Custom Native Accordion Drawer
        setupExpandableDrawer();

        // Dynamically bind current app version to drawer footer
        try {
            String verName = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            binding.textDrawerVersion.setText("v" + verName);
        } catch (Exception e) {
            binding.textDrawerVersion.setText("v3.0.0");
        }

        // 4. Dynamic Drawer Header Binding
        View headerView = binding.navHeader.getRoot();
        if (headerView != null) {
            TextView txtName = headerView.findViewById(R.id.header_txt_name);
            TextView txtEmail = headerView.findViewById(R.id.header_txt_email);
            TextView txtInitial = headerView.findViewById(R.id.header_txt_initial);
            android.widget.ImageView imgAvatar = headerView.findViewById(R.id.header_img_avatar);
            View avatarCard = headerView.findViewById(R.id.header_avatar_card);
            View avatarPlaceholder = headerView.findViewById(R.id.header_avatar_placeholder);

            // Immediate initial binding from cache/Room so drawer is never blank
            User activeUser = authViewModel.getUserLiveData().getValue();
            if (activeUser == null) {
                activeUser = localUser;
            }
            if (activeUser != null) {
                bindDrawerUser(activeUser, txtName, txtEmail, txtInitial, imgAvatar, avatarCard, avatarPlaceholder);
            }

            authViewModel.getUserLiveData().observe(this, user -> {
                if (user != null) {
                    // Check if student account is banned or disabled
                    if ("Banned".equalsIgnoreCase(user.getStatus()) || "Disabled".equalsIgnoreCase(user.getStatus())) {
                        authViewModel.logout();
                        new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Account Suspended")
                                .setMessage("Your account has been restricted/banned by the administrator. Please contact university support.")
                                .setCancelable(false)
                                .setPositiveButton("OK", (d, w) -> {
                                    startActivity(new Intent(MainActivity.this, LoginActivity.class));
                                    finish();
                                })
                                .show();
                        return;
                    }

                    // Track Device and IP session non-intrusively
                    com.akon.subtools.utils.SecurityTracker.trackSession(MainActivity.this, user.getUid());

                    // Ensure user's UID is passed to OnlineTracker
                    com.akon.subtools.utils.OnlineTracker.startTracking(user.getUid());

                    bindDrawerUser(user, txtName, txtEmail, txtInitial, imgAvatar, avatarCard, avatarPlaceholder);
                    
                    // Schedule daily birthday alarm and perform startup verification
                    com.akon.subtools.alarms.BirthdayScheduler.scheduleDailyCheck(MainActivity.this);
                    com.akon.subtools.alarms.BirthdayScheduler.checkBirthdayOnStartup(MainActivity.this, user);

                    // Schedule daily 6:00 AM quote alarm
                    com.akon.subtools.alarms.DailyQuoteScheduler.scheduleDailyQuoteAlarm(MainActivity.this);

                    // Silently refresh expired caches after UI is loaded from Room
                    com.akon.subtools.cache.BackgroundSyncManager.getInstance(MainActivity.this).syncExpiredCachesSilently();
                }
            });
        }

        // Check for prior crash logs
        com.akon.subtools.utils.CrashLogManager.checkForCrashLog(this);

        // 5. Check for App Updates
        com.akon.subtools.utils.AppUpdateManager.checkForUpdates(this);

        // 6. Full-Screen 24-Hour Startup Ad (5s skippable)
        com.akon.subtools.utils.FullScreenAdManager.showAdIfEligible(this);

        // 7. Real-time Navigation Drawer Ad Listener
        setupNavDrawerAd();

        // 8. Real-time user statistics for the header.
        setupUserStats();

        // 9. First Login After Signup Facebook Group Reminder Popup
        checkPostSignupFacebookReminder();

        // 10. Handle Notification Deep Link Redirection
        handleDeepLinkIntent(getIntent());
    }

    private void bindDrawerUser(User user, TextView txtName, TextView txtEmail, TextView txtInitial, android.widget.ImageView imgAvatar, View avatarCard, View avatarPlaceholder) {
        if (user == null || isFinishing() || isDestroyed()) return;

        if (txtName != null) {
            txtName.setText(user.getName() != null && !user.getName().trim().isEmpty() ? user.getName() : "Student");
        }
        if (txtEmail != null) {
            String sub = "";
            if (user.getStudentId() != null && !user.getStudentId().trim().isEmpty()) {
                sub = "Student ID: " + user.getStudentId().trim();
            } else if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
                sub = user.getEmail().trim();
            }
            txtEmail.setText(sub);
        }

        String initial = "S";
        if (user.getName() != null && !user.getName().trim().isEmpty()) {
            initial = user.getName().trim().substring(0, 1).toUpperCase();
        }
        if (txtInitial != null) {
            txtInitial.setText(initial);
        }

        if (imgAvatar != null) {
            String pUrl = user.getPhotoURL();
            if ((pUrl == null || pUrl.trim().isEmpty())) {
                User cached = new com.akon.subtools.utils.CacheManager(this).getObject("user_profile", User.class);
                if (cached != null && cached.getPhotoURL() != null && !cached.getPhotoURL().trim().isEmpty()) {
                    pUrl = cached.getPhotoURL();
                }
            }
            com.akon.subtools.utils.ImageHelper.loadProfileImage(
                    MainActivity.this,
                    pUrl,
                    imgAvatar,
                    avatarPlaceholder != null ? avatarPlaceholder : txtInitial,
                    avatarCard
            );
        }
    }

    private com.akon.subtools.repository.AdRepository.AdSubscription navAdRegistration;
    private final android.os.Handler statsHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable statsRefreshRunnable = new Runnable() {
        @Override
        public void run() {
            setupUserStats();
            statsHandler.postDelayed(this, 60000); // Live refresh every 60 seconds
        }
    };

    private void setupUserStats() {
        // Supabase lightweight stats fetch using HEAD count=exact (0 byte payload)
        if (com.akon.subtools.utils.SupabaseAuthBridge.isConfigured()) {
            java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    int totalUsers = com.akon.subtools.utils.SupabaseAuthBridge.getTableCount("users", "select=id");
                    
                    // Match web portal heartbeat in activity_logs
                    java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US);
                    sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                    String onlineCutoffIso = sdf.format(new java.util.Date(System.currentTimeMillis() - 15 * 60 * 1000L));
                    
                    // Query unique online user count in past 15 min from activity_logs
                    int onlineUsers = 0;
                    try {
                        String queryUrl = "action=in.(heartbeat,session_start)&timestamp=gte." + 
                                java.net.URLEncoder.encode(onlineCutoffIso, "UTF-8") + "&select=user_id";
                        org.json.JSONArray arr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("activity_logs", queryUrl);
                        if (arr != null) {
                            java.util.HashSet<String> uniqueIds = new java.util.HashSet<>();
                            for (int i = 0; i < arr.length(); i++) {
                                org.json.JSONObject obj = arr.optJSONObject(i);
                                if (obj != null) {
                                    String uid = obj.optString("user_id", "").trim();
                                    if (!uid.isEmpty() && !uid.startsWith("test_")) {
                                        uniqueIds.add(uid);
                                    }
                                }
                            }
                            onlineUsers = uniqueIds.size();
                        }
                    } catch (Exception e) {
                        onlineUsers = 0;
                    }

                    // If the current app session is authenticated and user is actively inside the app, guarantee >= 1
                    if (onlineUsers <= 0 && authViewModel != null && authViewModel.getUserLiveData().getValue() != null) {
                        onlineUsers = 1;
                    }

                    if (totalUsers <= 0) totalUsers = Math.max(1, onlineUsers);
                    final int finalTotal = totalUsers;
                    final int finalOnline = Math.min(finalTotal, Math.max(1, onlineUsers));
                    runOnUiThread(() -> {
                        if (binding.txtTotalUsersCount != null) binding.txtTotalUsersCount.setText(String.valueOf(finalTotal));
                        if (binding.txtOnlineUsersCount != null) binding.txtOnlineUsersCount.setText(String.valueOf(finalOnline));
                    });
                } catch (Exception ignored) {}
            });
        }
    }

    private void setupNavDrawerAd() {
        if (binding.cardDrawerAd == null || binding.imgDrawerAd == null) return;
        
        com.akon.subtools.repository.AdRepository adRepository = new com.akon.subtools.repository.AdRepository();
        navAdRegistration = adRepository.listenToAd("nav_drawer", adBanner -> {
            if (isFinishing() || isDestroyed()) return;

            if (adBanner != null && adBanner.isEnabled() && adBanner.getImageUrl() != null && !adBanner.getImageUrl().trim().isEmpty()) {
                String imageUrl = adBanner.getImageUrl().trim();
                String targetUrl = adBanner.getTargetUrl();

                binding.cardDrawerAd.setVisibility(View.VISIBLE);
                com.bumptech.glide.Glide.with(getApplicationContext())
                        .load(imageUrl)
                        .fitCenter()
                        .into(binding.imgDrawerAd);

                if (targetUrl != null && !targetUrl.trim().isEmpty()) {
                    binding.cardDrawerAd.setClickable(true);
                    binding.cardDrawerAd.setOnClickListener(v -> {
                        // Track ad click
                        com.akon.subtools.repository.AdRepository.recordAdClick("nav_drawer");
                        try {
                            String url = targetUrl.trim();
                            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                                url = "https://" + url;
                            }
                            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(browserIntent);
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "Unable to open link", Toast.LENGTH_SHORT).show();
                        }
                    });
                } else {
                    binding.cardDrawerAd.setOnClickListener(null);
                    binding.cardDrawerAd.setClickable(false);
                }
            } else {
                binding.cardDrawerAd.setVisibility(View.GONE);
            }
        });
    }

    @Override
    protected void onStart() {
        super.onStart();
        com.akon.subtools.utils.OnlineTracker.startTracking();
    }

    @Override
    protected void onResume() {
        super.onResume();
        com.akon.subtools.utils.OnlineTracker.startTracking();
        checkRemoteBannedStatus();
        checkMaintenanceAndPopups();
        statsHandler.removeCallbacks(statsRefreshRunnable);
        statsHandler.post(statsRefreshRunnable);
    }

    @Override
    protected void onPause() {
        super.onPause();
        statsHandler.removeCallbacks(statsRefreshRunnable);
    }

    @Override
    protected void onStop() {
        super.onStop();
        com.akon.subtools.utils.OnlineTracker.stopTracking();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        statsHandler.removeCallbacks(statsRefreshRunnable);
        com.akon.subtools.utils.OnlineTracker.stopTracking();
        if (navAdRegistration != null) {
            navAdRegistration.remove();
            navAdRegistration = null;
        }
    }

    private void setupExpandableDrawer() {
        List<DrawerExpandableAdapter.GroupItem> groups = new ArrayList<>();

        // 1. Home (Standalone)
        groups.add(new DrawerExpandableAdapter.GroupItem("Home", R.drawable.ic_nav_home, R.id.navigation_home, null));

        // 2. Academics & Schedule
        List<DrawerExpandableAdapter.ChildItem> academicsChildren = new ArrayList<>();
        academicsChildren.add(new DrawerExpandableAdapter.ChildItem("Subject Manager", R.drawable.ic_nav_subjects, R.id.navigation_subjects, null));
        academicsChildren.add(new DrawerExpandableAdapter.ChildItem("Class Routine", R.drawable.ic_nav_routine, R.id.navigation_routine, null));
        academicsChildren.add(new DrawerExpandableAdapter.ChildItem("Exam Routine", R.drawable.ic_nav_routine, R.id.navigation_exam_routine, null));
        academicsChildren.add(new DrawerExpandableAdapter.ChildItem("Slides & Materials", R.drawable.ic_nav_subjects, R.id.navigation_slides, null));
        academicsChildren.add(new DrawerExpandableAdapter.ChildItem("Academic Reminders", R.drawable.ic_nav_routine, R.id.navigation_academic_reminders, null));
        academicsChildren.add(new DrawerExpandableAdapter.ChildItem("Cover Page Generator", R.drawable.ic_nav_cover_page, R.id.navigation_cover_page, null));
        groups.add(new DrawerExpandableAdapter.GroupItem("Academics & Schedule", R.drawable.ic_nav_routine, 0, academicsChildren));

        // 3. Campus & Notices
        List<DrawerExpandableAdapter.ChildItem> campusChildren = new ArrayList<>();
        campusChildren.add(new DrawerExpandableAdapter.ChildItem("Notices & Announcements", R.drawable.ic_nav_notices, R.id.navigation_notices, null));
        campusChildren.add(new DrawerExpandableAdapter.ChildItem("Faculty Directory", R.drawable.ic_nav_faculty, R.id.navigation_faculty, null));
        campusChildren.add(new DrawerExpandableAdapter.ChildItem("Transport Fleet", R.drawable.ic_nav_transport, R.id.navigation_transport, null));
        groups.add(new DrawerExpandableAdapter.GroupItem("Campus & Notices", R.drawable.ic_nav_notices, 0, campusChildren));

        // 4. Student Services
        List<DrawerExpandableAdapter.ChildItem> servicesChildren = new ArrayList<>();
        servicesChildren.add(new DrawerExpandableAdapter.ChildItem("Blood Donors", R.drawable.ic_nav_blood, R.id.navigation_blood_donor, null));
        servicesChildren.add(new DrawerExpandableAdapter.ChildItem("Lost & Found", R.drawable.ic_nav_lost_found, R.id.navigation_lost_found, null));
        servicesChildren.add(new DrawerExpandableAdapter.ChildItem("Tuition Finder", R.drawable.ic_tuition, R.id.navigation_tuition_finder, null));
        servicesChildren.add(new DrawerExpandableAdapter.ChildItem("Room Sharing & Sublets", R.drawable.ic_room, R.id.navigation_room_finder, null));
        groups.add(new DrawerExpandableAdapter.GroupItem("Student Services", R.drawable.ic_nav_lost_found, 0, servicesChildren));

        // 5. Profile & Support
        List<DrawerExpandableAdapter.ChildItem> supportChildren = new ArrayList<>();
        supportChildren.add(new DrawerExpandableAdapter.ChildItem("My Profile", R.drawable.ic_nav_profile, R.id.navigation_profile, null));
        supportChildren.add(new DrawerExpandableAdapter.ChildItem("Need to Talk?", R.drawable.ic_phone, R.id.navigation_need_to_talk, null));
        supportChildren.add(new DrawerExpandableAdapter.ChildItem("About Developer", R.drawable.ic_nav_dev, R.id.navigation_about_developer, null));
        supportChildren.add(new DrawerExpandableAdapter.ChildItem("Admins Directory", R.drawable.ic_nav_faculty, R.id.navigation_contributors, null));
        groups.add(new DrawerExpandableAdapter.GroupItem("Profile & Support", R.drawable.ic_nav_profile, 0, supportChildren));

        DrawerExpandableAdapter adapter = new DrawerExpandableAdapter(this, groups);
        binding.expandableNavigation.setAdapter(adapter);

        // Handle Single Group Expansion (Only 1 expanded group allowed at once)
        binding.expandableNavigation.setOnGroupExpandListener(groupPosition -> {
            for (int i = 0; i < groups.size(); i++) {
                if (i != groupPosition && binding.expandableNavigation.isGroupExpanded(i)) {
                    binding.expandableNavigation.collapseGroup(i);
                }
            }
        });

        // Handle Group Clicks
        binding.expandableNavigation.setOnGroupClickListener((parent, v, groupPosition, id) -> {
            DrawerExpandableAdapter.GroupItem group = groups.get(groupPosition);
            if (group.destinationId != 0) {
                for (int i = 0; i < groups.size(); i++) {
                    if (binding.expandableNavigation.isGroupExpanded(i)) {
                        binding.expandableNavigation.collapseGroup(i);
                    }
                }
                navigateToDestination(group.destinationId);
                return true;
            }
            return false; // allow default expand/collapse
        });

        // Handle Child Clicks
        binding.expandableNavigation.setOnChildClickListener((parent, v, groupPosition, childPosition, id) -> {
            DrawerExpandableAdapter.ChildItem child = groups.get(groupPosition).children.get(childPosition);
            navigateToDestination(child.destinationId);
            return true;
        });
    }

    private void navigateToDestination(int destId) {
        // 1. Close drawer smoothly
        binding.drawerLayout.closeDrawer(GravityCompat.START);

        if (navController != null && (navController.getCurrentDestination() == null || destId != navController.getCurrentDestination().getId())) {
            binding.getRoot().postDelayed(() -> {
                if (isFinishing() || isDestroyed() || navController == null) return;
                androidx.navigation.NavOptions navOptions = new androidx.navigation.NavOptions.Builder()
                        .setLaunchSingleTop(true)
                        .setEnterAnim(R.anim.slide_in_right)
                        .setExitAnim(R.anim.slide_out_left)
                        .setPopEnterAnim(R.anim.slide_in_left)
                        .setPopExitAnim(R.anim.slide_out_right)
                        .setPopUpTo(navController.getGraph().getStartDestinationId(), false)
                        .build();
                try {
                    navController.navigate(destId, null, navOptions);
                } catch (Exception ignored) {}
            }, 160);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    private void handleDeepLinkIntent(Intent intent) {
        if (intent == null) return;
        String navigateTo = intent.getStringExtra("navigate_to");
        if ("notice".equalsIgnoreCase(navigateTo)) {
            if (navController != null) {
                navController.navigate(R.id.navigation_notices);
            }
            String title = intent.getStringExtra("notice_title");
            String content = intent.getStringExtra("notice_content");
            if (title != null && content != null) {
                String id = intent.getStringExtra("notice_id");
                String dept = intent.getStringExtra("notice_department");
                String priority = intent.getStringExtra("notice_priority");
                String date = intent.getStringExtra("notice_date");
                String sender = intent.getStringExtra("notice_sender");

                com.akon.subtools.models.Notice notice = new com.akon.subtools.models.Notice(
                        id, title, content, dept, priority, "", date, sender
                );
                binding.getRoot().postDelayed(() -> {
                    if (!isFinishing() && !isDestroyed()) {
                        com.akon.subtools.utils.DialogHelper.showModernNoticeDialog(MainActivity.this, notice);
                    }
                }, 350);
            }
        }
    }

    private void checkPostSignupFacebookReminder() {
        android.content.SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
        boolean isFirstLogin = prefs.getBoolean("first_login_after_signup", false);
        if (isFirstLogin) {
            // Reset flag so it only shows once
            prefs.edit().putBoolean("first_login_after_signup", false).apply();

            new AlertDialog.Builder(this)
                    .setTitle("Join Our Official Community! 🚀")
                    .setMessage("Welcome to SUBTools!\n\nJoin our official Facebook Group to stay connected, discuss academic topics, get quick assistance, and share updates with fellow SUBians.")
                    .setPositiveButton("Join Facebook Group", (dialog, which) -> {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.facebook.com/groups/app.subtools"));
                            startActivity(intent);
                        } catch (Exception ignored) {}
                    })
                    .setNegativeButton("Later", null)
                    .show();
        }
    }


    private void checkMaintenanceAndPopups() {
        com.akon.subtools.utils.SupabaseAuthBridge.checkMaintenanceMode((isMaintenance, message) -> {
            if (isFinishing() || isDestroyed()) return;
            if (isMaintenance) {
                com.akon.subtools.utils.DialogHelper.showMaintenanceDialog(MainActivity.this, message, this::checkMaintenanceAndPopups);
            } else {
                com.akon.subtools.utils.DialogHelper.dismissMaintenanceDialog();
                checkInAppPopupNotices();
            }
        });
    }

    private void checkInAppPopupNotices() {
        com.akon.subtools.utils.SupabaseAuthBridge.queryTable("notices", "select=*&order=created_at.desc&limit=20", new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                if (isFinishing() || isDestroyed()) return;
                try {
                    org.json.JSONArray array = new org.json.JSONArray(responseBody);
                    android.content.SharedPreferences prefs = getSharedPreferences("popup_notice_prefs", MODE_PRIVATE);
                    java.util.Set<String> seenIds = new java.util.HashSet<>(prefs.getStringSet("seen_popup_ids", new java.util.HashSet<>()));

                    String userDept = "";
                    if (authViewModel != null && authViewModel.getUserLiveData().getValue() != null) {
                        userDept = authViewModel.getUserLiveData().getValue().getDepartment();
                    }

                    for (int i = 0; i < array.length(); i++) {
                        org.json.JSONObject obj = array.getJSONObject(i);
                        com.akon.subtools.models.Notice notice = com.akon.subtools.models.Notice.fromJson(obj);
                        if (notice != null && notice.isPopupNotice() && !notice.getId().isEmpty()) {
                            if (seenIds.contains(notice.getId())) {
                                continue;
                            }

                            String noticeDept = notice.getDepartment() != null ? notice.getDepartment().trim() : "ALL";
                            boolean deptMatch = noticeDept.isEmpty() || "ALL".equalsIgnoreCase(noticeDept)
                                    || userDept.isEmpty() || noticeDept.equalsIgnoreCase(userDept);

                            if (deptMatch) {
                                final String noticeId = notice.getId();
                                runOnUiThread(() -> {
                                    if (isFinishing() || isDestroyed()) return;
                                    com.akon.subtools.utils.DialogHelper.showModernNoticeDialog(MainActivity.this, notice, () -> {
                                        seenIds.add(noticeId);
                                        prefs.edit().putStringSet("seen_popup_ids", seenIds).apply();
                                    });
                                });
                                break; // Only show one active popup at a time to prevent modal stacking
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            @Override
            public void onError(String error) {}
        });
    }

    private void checkRemoteBannedStatus() {
        User localUser = AppDatabase.getLocalUser(this);
        if (localUser == null || localUser.getUid() == null || localUser.getUid().trim().isEmpty()) return;
        String uid = localUser.getUid();

        com.akon.subtools.utils.SupabaseAuthBridge.queryTable("users", "id=eq." + uid + "&select=id,status,is_banned,data", new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                try {
                    org.json.JSONArray arr = new org.json.JSONArray(responseBody);
                    if (arr.length() > 0) {
                        org.json.JSONObject u = arr.getJSONObject(0);
                        boolean isBanned = u.optBoolean("is_banned", false);
                        String status = u.optString("status", "");
                        org.json.JSONObject data = u.optJSONObject("data");
                        if (data != null) {
                            if (!isBanned) isBanned = data.optBoolean("is_banned", false);
                            if (status.isEmpty()) status = data.optString("status", "");
                        }

                        if (isBanned || "Banned".equalsIgnoreCase(status) || "Disabled".equalsIgnoreCase(status)) {
                            runOnUiThread(() -> {
                                if (isFinishing() || isDestroyed()) return;
                                if (authViewModel != null) {
                                    authViewModel.logout();
                                }
                                new AlertDialog.Builder(MainActivity.this)
                                        .setTitle("Account Suspended")
                                        .setMessage("Your account has been restricted/banned by the administrator. Please contact university support.")
                                        .setCancelable(false)
                                        .setPositiveButton("OK", (d, w) -> {
                                            startActivity(new Intent(MainActivity.this, LoginActivity.class));
                                            finish();
                                        })
                                        .show();
                            });
                        }
                    }
                } catch (Exception ignored) {}
            }

            @Override
            public void onError(String error) {}
        });
    }
}
