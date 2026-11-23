package com.akon.subtools.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.navigation.Navigation;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.R;
import com.akon.subtools.adapters.NoticeAdapter;
import com.akon.subtools.adapters.RoutineAdapter;
import com.akon.subtools.databinding.FragmentHomeBinding;
import com.akon.subtools.models.Notice;
import com.akon.subtools.models.Routine;
import com.akon.subtools.models.User;
import com.akon.subtools.viewmodels.AuthViewModel;
import com.akon.subtools.viewmodels.NoticeViewModel;
import com.akon.subtools.viewmodels.RoutineViewModel;
import com.bumptech.glide.Glide;
import com.akon.subtools.utils.CacheManager;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class HomeFragment extends Fragment {
    private FragmentHomeBinding binding;
    private AuthViewModel authViewModel;
    private RoutineViewModel routineViewModel;
    private NoticeViewModel noticeViewModel;

    private RoutineAdapter routineAdapter;
    private NoticeAdapter noticeAdapter;

    private final List<Routine> todayClassesList = new ArrayList<>();
    private final List<Notice> importantNoticesList = new ArrayList<>();

    private User currentUser;
    private boolean hasShownSubjectWarning = false;
    private final android.os.Handler mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentHomeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        authViewModel = new ViewModelProvider(requireActivity()).get(AuthViewModel.class);
        routineViewModel = new ViewModelProvider(this).get(RoutineViewModel.class);
        noticeViewModel = new ViewModelProvider(this).get(NoticeViewModel.class);

        setupRecyclerViews();
        setupObservers();
        setupListeners();
        setupHomepageAd();

        // Check if user is cached locally and immediately bind UI so it never appears blank
        currentUser = authViewModel.getUserLiveData().getValue();
        if (currentUser == null && getContext() != null) {
            currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(getContext());
        }
        if (currentUser != null) {
            updateProfileUI(currentUser);
            if (currentUser.getSubjects() == null || currentUser.getSubjects().isEmpty()) {
                binding.cardNoSubjectsWarning.setVisibility(View.VISIBLE);
            } else {
                binding.cardNoSubjectsWarning.setVisibility(View.GONE);
            }
            routineViewModel.loadRoutinesForUser(currentUser.getDepartment(), currentUser.getAcademicLevel());
        }

        noticeViewModel.loadNotices();
        authViewModel.checkCurrentUserSession();
        setupHolidayHeroCard();
        setupExamHeroCard();
    }

    private void setupHolidayHeroCard() {
        if (binding == null || binding.cardHolidayHero == null) return;

        new com.akon.subtools.repository.HolidayRepository().fetchHolidays(new com.akon.subtools.repository.HolidayRepository.HolidayCallback() {
            @Override
            public void onSuccess(List<com.akon.subtools.models.Holiday> holidays) {
                if (binding == null || holidays == null || holidays.isEmpty()) {
                    mainHandler.post(() -> {
                        if (binding != null && binding.cardHolidayHero != null) {
                            binding.cardHolidayHero.setVisibility(View.GONE);
                        }
                    });
                    return;
                }

                Calendar now = Calendar.getInstance();
                now.set(Calendar.HOUR_OF_DAY, 0);
                now.set(Calendar.MINUTE, 0);
                now.set(Calendar.SECOND, 0);
                now.set(Calendar.MILLISECOND, 0);
                long todayStart = now.getTimeInMillis();

                com.akon.subtools.models.Holiday selected = null;
                String dateLabel = "Today";

                // First check for holiday active today
                for (com.akon.subtools.models.Holiday h : holidays) {
                    if (h.getDate() != null) {
                        java.util.Date parsed = parseExamDate(h.getDate());
                        if (parsed != null) {
                            Calendar hCal = Calendar.getInstance();
                            hCal.setTime(parsed);
                            hCal.set(Calendar.HOUR_OF_DAY, 0);
                            hCal.set(Calendar.MINUTE, 0);
                            hCal.set(Calendar.SECOND, 0);
                            hCal.set(Calendar.MILLISECOND, 0);
                            if (hCal.getTimeInMillis() == todayStart) {
                                selected = h;
                                dateLabel = "Today";
                                break;
                            }
                        }
                    }
                }

                // If no holiday today, check if upcoming holiday is within next 7 days
                if (selected == null) {
                    for (com.akon.subtools.models.Holiday h : holidays) {
                        if (h.getDate() != null) {
                            java.util.Date parsed = parseExamDate(h.getDate());
                            if (parsed != null && parsed.getTime() > todayStart) {
                                long diffDays = (parsed.getTime() - todayStart) / (24L * 60L * 60L * 1000L);
                                if (diffDays <= 7) {
                                    selected = h;
                                    dateLabel = diffDays == 1 ? "Tomorrow" : "In " + diffDays + " days (" + h.getDate() + ")";
                                    break;
                                }
                            }
                        }
                    }
                }

                final com.akon.subtools.models.Holiday finalHoliday = selected;
                final String finalDateLabel = dateLabel;

                mainHandler.post(() -> {
                    if (binding == null || binding.cardHolidayHero == null) return;
                    if (finalHoliday != null) {
                        binding.txtHolidayName.setText(finalHoliday.getName() != null ? finalHoliday.getName() : "University Holiday");
                        binding.txtHolidayDateLabel.setText(finalDateLabel);
                        binding.txtHolidayDesc.setText(finalHoliday.getDescription() != null && !finalHoliday.getDescription().trim().isEmpty()
                                ? finalHoliday.getDescription().trim()
                                : "No classes scheduled. Enjoy your holiday!");
                        binding.cardHolidayHero.setVisibility(View.VISIBLE);
                    } else {
                        binding.cardHolidayHero.setVisibility(View.GONE);
                    }
                });
            }

            @Override
            public void onFailure(Exception e) {
                mainHandler.post(() -> {
                    if (binding != null && binding.cardHolidayHero != null) {
                        binding.cardHolidayHero.setVisibility(View.GONE);
                    }
                });
            }
        });
    }

    private static class ExamHeroItem {
        String courseCode;
        String courseTitle;
        String examDate;
        String examTime;
        String room;
        String examType;
        long timeMs;
    }

    private static java.util.Date parseExamDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return null;
        String[] formats = {"yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy", "yyyy/MM/dd", "MM/dd/yyyy", "d/M/yyyy", "d-M-yyyy"};
        for (String fmt : formats) {
            try {
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat(fmt, java.util.Locale.US);
                sdf.setLenient(false);
                return sdf.parse(dateStr.trim());
            } catch (Exception ignored) {}
        }
        return null;
    }

    private static String getFriendlyDateLabel(long examTimeMs) {
        java.util.Calendar calNow = java.util.Calendar.getInstance();
        calNow.set(java.util.Calendar.HOUR_OF_DAY, 0);
        calNow.set(java.util.Calendar.MINUTE, 0);
        calNow.set(java.util.Calendar.SECOND, 0);
        calNow.set(java.util.Calendar.MILLISECOND, 0);
        long todayStart = calNow.getTimeInMillis();

        long diffDays = (examTimeMs - todayStart) / (24L * 60L * 60L * 1000L);
        if (diffDays == 0) return "Today";
        if (diffDays == 1) return "Tomorrow";
        if (diffDays > 1 && diffDays <= 7) return "In " + diffDays + " days";
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("dd MMM yyyy", java.util.Locale.US);
        return sdf.format(new java.util.Date(examTimeMs));
    }

    private void setupExamHeroCard() {
        if (binding == null || binding.cardExamRoutineHero == null) return;

        View.OnClickListener openExamListener = v -> {
            try {
                androidx.navigation.NavOptions navOptions = new androidx.navigation.NavOptions.Builder()
                        .setLaunchSingleTop(true)
                        .setEnterAnim(R.anim.slide_in_right)
                        .setExitAnim(R.anim.slide_out_left)
                        .setPopEnterAnim(R.anim.slide_in_left)
                        .setPopExitAnim(R.anim.slide_out_right)
                        .build();
                Navigation.findNavController(requireView()).navigate(R.id.navigation_exam_routine, null, navOptions);
            } catch (Exception ignored) {}
        };
        binding.cardExamRoutineHero.setOnClickListener(openExamListener);
        binding.btnHeroViewExam.setOnClickListener(openExamListener);

        java.util.Calendar calNow = java.util.Calendar.getInstance();
        calNow.set(java.util.Calendar.HOUR_OF_DAY, 0);
        calNow.set(java.util.Calendar.MINUTE, 0);
        calNow.set(java.util.Calendar.SECOND, 0);
        calNow.set(java.util.Calendar.MILLISECOND, 0);
        long todayStart = calNow.getTimeInMillis();

        java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
            // 1. Try Supabase Primary
            org.json.JSONArray sbArr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("exam_routines", "select=*");
            if (sbArr != null && sbArr.length() > 0) {
                List<ExamHeroItem> items = new ArrayList<>();
                String userDept = currentUser != null ? currentUser.getDepartment() : "";
                List<String> userSubjects = (currentUser != null && currentUser.getSubjects() != null) ? currentUser.getSubjects() : new ArrayList<>();

                for (int i = 0; i < sbArr.length(); i++) {
                    org.json.JSONObject row = sbArr.optJSONObject(i);
                    if (row == null) continue;
                    org.json.JSONObject data = row.optJSONObject("data");
                    if (data == null) data = row;

                    String dept = data.optString("department", row.optString("department", ""));
                    String courseCode = data.optString("courseCode", row.optString("course_code", ""));
                    String courseTitle = data.optString("courseTitle", row.optString("course_title", ""));
                    String examDate = data.optString("examDate", row.optString("exam_date", ""));
                    String examTime = data.optString("examTime", row.optString("exam_time", "TBA"));
                    String room = data.optString("room", "TBA");
                    String examType = data.optString("examType", row.optString("exam_type", "Exam"));

                    boolean deptMatch = dept.isEmpty() || "ALL".equalsIgnoreCase(dept) || userDept == null || userDept.isEmpty() || dept.equalsIgnoreCase(userDept);
                    boolean subjectMatch = false;
                    for (String s : userSubjects) {
                        if (s != null && !s.isEmpty() && courseCode.toUpperCase().contains(s.toUpperCase())) {
                            subjectMatch = true;
                            break;
                        }
                    }

                    if (deptMatch || subjectMatch) {
                        java.util.Date parsed = parseExamDate(examDate);
                        if (parsed != null && parsed.getTime() >= todayStart) {
                            ExamHeroItem item = new ExamHeroItem();
                            item.courseCode = courseCode;
                            item.courseTitle = courseTitle;
                            item.examDate = examDate;
                            item.examTime = examTime;
                            item.room = room;
                            item.examType = examType;
                            item.timeMs = parsed.getTime();
                            items.add(item);
                        }
                    }
                }

                if (!items.isEmpty()) {
                    items.sort(java.util.Comparator.comparingLong(a -> a.timeMs));
                    ExamHeroItem soonest = items.get(0);
                    mainHandler.post(() -> renderExamHeroCard(soonest));

                    // Schedule advance notifications for upcoming exams, CTs, and quizzes
                    List<com.akon.subtools.models.ExamRoutine> examList = new ArrayList<>();
                    for (ExamHeroItem it : items) {
                        com.akon.subtools.models.ExamRoutine er = new com.akon.subtools.models.ExamRoutine();
                        er.setCourseCode(it.courseCode);
                        er.setCourseTitle(it.courseTitle);
                        er.setExamDate(it.examDate);
                        er.setExamTime(it.examTime);
                        er.setRoom(it.room);
                        er.setExamType(it.examType);
                        examList.add(er);
                    }
                    com.akon.subtools.alarms.ExamAlarmScheduler.scheduleExamAlarms(getContext(), examList);
                    return;
                }
            }

            // If no exams found in Supabase, hide the hero card
            mainHandler.post(() -> {
                if (binding != null && binding.cardExamRoutineHero != null) {
                    binding.cardExamRoutineHero.setVisibility(View.GONE);
                }
            });
        });
    }

    private void renderExamHeroCard(ExamHeroItem item) {
        if (binding == null || binding.cardExamRoutineHero == null) return;
        String typeLower = (item.examType != null ? item.examType : "").toLowerCase();
        boolean isCT = typeLower.contains("ct") || typeLower.contains("quiz") || typeLower.contains("class test") || typeLower.contains("test");

        if (binding.txtHeroBadgeLabel != null) {
            binding.txtHeroBadgeLabel.setText(isCT ? "📝 UPCOMING CT / QUIZ" : "📅 UPCOMING EXAM");
        }

        binding.txtHeroExamType.setText(item.examType != null ? item.examType : "Exam");
        binding.txtHeroExamCourse.setText((!item.courseCode.isEmpty() ? item.courseCode + ": " : "") + item.courseTitle);

        String friendly = getFriendlyDateLabel(item.timeMs);
        binding.txtHeroExamDetails.setText("📅 " + friendly + " (" + item.examDate + ") • ⏰ " + item.examTime + " • Room " + item.room);
        binding.cardExamRoutineHero.setVisibility(View.VISIBLE);
    }

    private com.akon.subtools.repository.AdRepository.AdSubscription homeAdRegistration;

    private void setupHomepageAd() {
        if (binding == null || binding.cardHomeAd == null || binding.imgHomeAd == null) return;

        com.akon.subtools.repository.AdRepository adRepository = new com.akon.subtools.repository.AdRepository();
        homeAdRegistration = adRepository.listenToAd("homepage", adBanner -> {
            if (binding == null || getContext() == null) return;

            if (adBanner != null && adBanner.isEnabled() && adBanner.getImageUrl() != null && !adBanner.getImageUrl().trim().isEmpty()) {
                String imageUrl = adBanner.getImageUrl().trim();
                String targetUrl = adBanner.getTargetUrl();

                binding.cardHomeAd.setVisibility(View.VISIBLE);
                Glide.with(HomeFragment.this)
                        .load(imageUrl)
                        .centerCrop()
                        .into(binding.imgHomeAd);

                if (targetUrl != null && !targetUrl.trim().isEmpty()) {
                    binding.cardHomeAd.setClickable(true);
                    binding.cardHomeAd.setOnClickListener(v -> {
                        // Record ad click analytics across both system/ads and admin/app_update
                        adRepository.recordAdClick("homepage");

                        try {
                            String url = targetUrl.trim();
                            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                                url = "https://" + url;
                            }
                            android.content.Intent browserIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url));
                            startActivity(browserIntent);
                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Unable to open link", Toast.LENGTH_SHORT).show();
                        }
                    });
                } else {
                    binding.cardHomeAd.setOnClickListener(null);
                    binding.cardHomeAd.setClickable(false);
                }
            } else {
                binding.cardHomeAd.setVisibility(View.GONE);
            }
        });
    }

    private void setupRecyclerViews() {
        binding.recyclerTodayClasses.setLayoutManager(new LinearLayoutManager(getContext()));
        routineAdapter = new RoutineAdapter(todayClassesList, false);
        binding.recyclerTodayClasses.setAdapter(routineAdapter);

        binding.recyclerNotices.setLayoutManager(new LinearLayoutManager(getContext()));
        noticeAdapter = new NoticeAdapter(importantNoticesList, true, notice -> {
            com.akon.subtools.utils.DialogHelper.showModernNoticeDialog(getContext(), notice);
        });
        binding.recyclerNotices.setAdapter(noticeAdapter);
    }

    private void setupObservers() {
        authViewModel.getUserLiveData().observe(getViewLifecycleOwner(), user -> {
            binding.swipeRefresh.setRefreshing(false);
            if (user != null) {
                currentUser = user;
                updateProfileUI(user);

                // Show inline hard card warning on homepage when no subjects are added
                if (user.getSubjects() == null || user.getSubjects().isEmpty()) {
                    binding.cardNoSubjectsWarning.setVisibility(View.VISIBLE);
                } else {
                    binding.cardNoSubjectsWarning.setVisibility(View.GONE);
                }
                
                // Load routine & notices matching student constraints
                routineViewModel.loadRoutinesForUser(user.getDepartment(), user.getAcademicLevel());
                noticeViewModel.loadNotices();
                refreshTodayClassesList();
                setupExamHeroCard();
            }
        });

        routineViewModel.getRoutineList().observe(getViewLifecycleOwner(), allRoutines -> {
            if (allRoutines != null) {
                if (currentUser == null && getContext() != null) {
                    currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(getContext());
                }
                if (currentUser != null) {
                    refreshTodayClassesList();
                    List<Routine> personal = routineViewModel.filterPersonalizedRoutine(
                            allRoutines,
                            currentUser.getDepartment(),
                            currentUser.getAcademicLevel(),
                            currentUser.getSection(),
                            currentUser.getSubjects(),
                            currentUser.getCompletedSubjects()
                    );
                    com.akon.subtools.alarms.ClassAlarmScheduler.scheduleAlarms(getContext(), personal);
                }
            }
        });

        noticeViewModel.getNoticesList().observe(getViewLifecycleOwner(), allNotices -> {
            if (allNotices != null) {
                if (currentUser == null && getContext() != null) {
                    currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(getContext());
                }
                String dept = (currentUser != null && currentUser.getDepartment() != null) ? currentUser.getDepartment() : "ALL";
                List<Notice> personalNotices = noticeViewModel.filterNotices(allNotices, dept);
                
                // Display only the last 3 notices
                importantNoticesList.clear();
                if (personalNotices != null) {
                    for (int i = 0; i < Math.min(3, personalNotices.size()); i++) {
                        importantNoticesList.add(personalNotices.get(i));
                    }
                }
                
                noticeAdapter.notifyDataSetChanged();
                boolean hasNotices = !importantNoticesList.isEmpty();
                binding.emptyNoticesText.setVisibility(hasNotices ? View.GONE : View.VISIBLE);
                if (binding.layoutSectionNotices != null) {
                    binding.layoutSectionNotices.setVisibility(hasNotices ? View.VISIBLE : View.GONE);
                }
            }
        });

        routineViewModel.getError().observe(getViewLifecycleOwner(), this::handleError);
        noticeViewModel.getError().observe(getViewLifecycleOwner(), this::handleError);
    }

    private java.util.Date parseNoticeDate(String dateStr) {
        if (dateStr == null) return null;
        String[] formats = {"dd/MM/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "yyyy/MM/dd"};
        for (String f : formats) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(f, Locale.ENGLISH);
                sdf.setLenient(false);
                return sdf.parse(dateStr.trim());
            } catch (Exception e) {
                // Try next
            }
        }
        return null;
    }

    private void handleError(String error) {
        if (error != null) {
            com.akon.subtools.utils.DialogHelper.showWarningDialog(getContext(), "Sync Error", error);
        }
    }

    private String getMd5Hash(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
            byte[] messageDigest = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : messageDigest) {
                String hex = Integer.toHexString(0xFF & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            return "";
        }
    }

    private void updateProfileUI(User user) {
        if (user == null || binding == null) return;
        binding.textStudentName.setText(user.getName() != null && !user.getName().trim().isEmpty() ? user.getName() : "Student");

        if (user.getName() != null && !user.getName().trim().isEmpty()) {
            binding.txtHomeAvatarInitial.setText(
                    String.valueOf(user.getName().trim().charAt(0)).toUpperCase());
        } else {
            binding.txtHomeAvatarInitial.setText("S");
        }

        String pUrl = user.getPhotoURL();
        if ((pUrl == null || pUrl.trim().isEmpty()) && getContext() != null) {
            User cached = new com.akon.subtools.utils.CacheManager(getContext()).getObject("user_profile", User.class);
            if (cached != null && cached.getPhotoURL() != null && !cached.getPhotoURL().trim().isEmpty()) {
                pUrl = cached.getPhotoURL();
            }
        }

        if (getContext() != null) {
            com.akon.subtools.utils.ImageHelper.loadProfileImage(
                    getContext(),
                    pUrl,
                    binding.profileAvatar,
                    binding.cardHomeAvatarPlaceholder,
                    binding.cardHomeAvatar
            );
        }
    }

    private void setupListeners() {
        binding.swipeRefresh.setOnRefreshListener(() -> {
            authViewModel.checkCurrentUserSession();
            routineViewModel.refreshRoutines();
            noticeViewModel.refreshNotices();
        });

        binding.btnAddSubjectsNow.setOnClickListener(v -> {
            androidx.navigation.NavOptions navOptions = new androidx.navigation.NavOptions.Builder()
                    .setLaunchSingleTop(true)
                    .setEnterAnim(R.anim.slide_in_right)
                    .setExitAnim(R.anim.slide_out_left)
                    .setPopEnterAnim(R.anim.slide_in_left)
                    .setPopExitAnim(R.anim.slide_out_right)
                    .build();
            try {
                Navigation.findNavController(requireActivity(), R.id.nav_host_fragment).navigate(R.id.navigation_subjects, null, navOptions);
            } catch (Exception e) {
                try {
                    Navigation.findNavController(v).navigate(R.id.navigation_subjects, null, navOptions);
                } catch (Exception ignored) {}
            }
        });
    }

    private String getTodayDayName() {
        Calendar cal = Calendar.getInstance();
        return new SimpleDateFormat("EEEE", Locale.ENGLISH).format(cal.getTime());
    }


    private boolean isClassPassed(String endTimeStr) {
        if (endTimeStr == null || endTimeStr.isEmpty()) return false;
        try {
            // Expecting format like "10:30 AM" or "01:00 PM"
            String cleanTime = endTimeStr.trim().toUpperCase();
            int hour = 0;
            int minute = 0;
            if (cleanTime.contains("AM") || cleanTime.contains("PM")) {
                boolean isPm = cleanTime.contains("PM");
                String justTime = cleanTime.replace("AM", "").replace("PM", "").trim();
                String[] parts = justTime.split(":");
                if (parts.length >= 2) {
                    hour = Integer.parseInt(parts[0]);
                    minute = Integer.parseInt(parts[1]);
                    if (isPm && hour < 12) {
                        hour += 12;
                    } else if (!isPm && hour == 12) {
                        hour = 0;
                    }
                }
            } else {
                String[] parts = cleanTime.split(":");
                if (parts.length >= 2) {
                    hour = Integer.parseInt(parts[0]);
                    minute = Integer.parseInt(parts[1]);
                }
            }
            
            Calendar now = Calendar.getInstance();
            int currentHour = now.get(Calendar.HOUR_OF_DAY);
            int currentMinute = now.get(Calendar.MINUTE);
            
            if (currentHour > hour) {
                return true;
            } else if (currentHour == hour) {
                return currentMinute >= minute;
            }
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false; // Safely default to not hidden
        }
    }

    private final android.os.Handler timeHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable timeRunnable = new Runnable() {
        @Override
        public void run() {
            refreshTodayClassesList();
            timeHandler.postDelayed(this, 30000);
        }
    };

    @Override
    public void onResume() {
        super.onResume();
        timeHandler.post(timeRunnable);
    }

    @Override
    public void onPause() {
        super.onPause();
        timeHandler.removeCallbacks(timeRunnable);
    }

    private void refreshTodayClassesList() {
        if (currentUser == null && getContext() != null) {
            currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(getContext());
        }
        if (currentUser == null) return;
        List<Routine> allRoutinesVal = routineViewModel.getRoutineList().getValue();
        if (allRoutinesVal == null) return;

        List<Routine> personal = routineViewModel.filterPersonalizedRoutine(
                allRoutinesVal,
                currentUser.getDepartment(),
                currentUser.getAcademicLevel(),
                currentUser.getSection(),
                currentUser.getSubjects(),
                currentUser.getCompletedSubjects()
        );
        
        String todayName = getTodayDayName();
        todayClassesList.clear();
        java.util.Set<String> todayKeys = new java.util.HashSet<>();
        for (Routine r : personal) {
            if (r == null) continue;
            if (com.akon.subtools.utils.AcademicHelper.isSameDay(todayName, r.getDay())) {
                if (!isClassPassed(r.getEndTime())) {
                    String key = (r.getId() != null && !r.getId().trim().isEmpty())
                            ? r.getId().trim()
                            : (r.getCode() + "_" + r.getDay() + "_" + r.getStartTime() + "_" + r.getEndTime() + "_" + r.getClassroom());
                    if (!todayKeys.contains(key)) {
                        todayKeys.add(key);
                        todayClassesList.add(r);
                    }
                }
            }
        }
        
        // Sort classes chronologically by start time ascending
        todayClassesList.sort((a, b) -> Integer.compare(
                com.akon.subtools.utils.AcademicHelper.parseTimeToMinutes(a.getStartTime()),
                com.akon.subtools.utils.AcademicHelper.parseTimeToMinutes(b.getStartTime())
        ));
        
        routineAdapter.notifyDataSetChanged();
        boolean hasClasses = !todayClassesList.isEmpty();
        binding.emptyClassesText.setVisibility(hasClasses ? View.GONE : View.VISIBLE);
        if (binding.layoutSectionClasses != null) {
            binding.layoutSectionClasses.setVisibility(hasClasses ? View.VISIBLE : View.GONE);
        }

        // Mandatory Holiday / Weekend Notice on Thursday and Friday if no rescheduled classes exist
        checkAndApplyWeekendNotice(hasClasses);
    }

    private void checkAndApplyWeekendNotice(boolean hasClasses) {
        if (binding == null || binding.cardHolidayHero == null) return;
        Calendar cal = Calendar.getInstance();
        int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
        boolean isWeekendOffDay = (dayOfWeek == Calendar.THURSDAY || dayOfWeek == Calendar.FRIDAY);

        if (isWeekendOffDay) {
            if (!hasClasses) {
                // No rescheduled class on Thursday/Friday: display mandatory holiday notice
                String dayName = dayOfWeek == Calendar.THURSDAY ? "Thursday" : "Friday";
                binding.txtHolidayBadge.setText("🎉 UNIVERSITY OFF-DAY");
                binding.txtHolidayName.setText("Weekly Off-Day (" + dayName + ")");
                binding.txtHolidayDateLabel.setText("Today");
                binding.txtHolidayDesc.setText("No classes scheduled today. Enjoy your university weekend!");
                binding.cardHolidayHero.setVisibility(View.VISIBLE);
            } else {
                // If user has rescheduled class on off day, classes are displayed and holiday card shouldn't override
                setupHolidayHeroCard();
            }
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        if (homeAdRegistration != null) {
            homeAdRegistration.remove();
            homeAdRegistration = null;
        }
        binding = null;
    }
}
