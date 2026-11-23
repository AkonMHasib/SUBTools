package com.akon.subtools.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.R;
import com.akon.subtools.adapters.RoutineAdapter;
import com.akon.subtools.databinding.FragmentRoutineBinding;
import com.akon.subtools.models.Routine;
import com.akon.subtools.models.User;
import com.akon.subtools.viewmodels.AuthViewModel;
import com.akon.subtools.viewmodels.RoutineViewModel;
import com.google.android.material.tabs.TabLayout;

import java.util.ArrayList;
import java.util.List;

public class RoutineFragment extends Fragment {

    private FragmentRoutineBinding binding;
    private RoutineViewModel routineViewModel;
    private AuthViewModel authViewModel;

    private RoutineAdapter adapter;

    private final List<Routine> displayedRoutines = new ArrayList<>();
    private final List<Routine> allRoutines = new ArrayList<>();

    private User currentUser;
    private String routineSearchQuery = "";

    private final String[] daysOfWeek = {
            "All Days",
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
    };

    @Nullable
    @Override
    public View onCreateView(
            @NonNull LayoutInflater inflater,
            @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState
    ) {
        binding = FragmentRoutineBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(
            @NonNull View view,
            @Nullable Bundle savedInstanceState
    ) {
        super.onViewCreated(view, savedInstanceState);

        authViewModel = new ViewModelProvider(requireActivity()).get(AuthViewModel.class);
        routineViewModel = new ViewModelProvider(this).get(RoutineViewModel.class);

        setupTabLayout();
        setupRecyclerView();
        setupObservers();
        setupListeners();
        loadActiveHolidays();

        currentUser = authViewModel.getUserLiveData().getValue();
        if (currentUser == null && getContext() != null) {
            currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(getContext());
        }
        if (currentUser != null) {
            routineViewModel.loadRoutinesForUser(
                    currentUser.getDepartment() != null ? currentUser.getDepartment() : "",
                    currentUser.getAcademicLevel() != null ? currentUser.getAcademicLevel() : ""
            );
        }
        authViewModel.checkCurrentUserSession();
    }

    private List<com.akon.subtools.models.Holiday> activeHolidays = new ArrayList<>();

    private void loadActiveHolidays() {
        new com.akon.subtools.repository.HolidayRepository().fetchHolidays(new com.akon.subtools.repository.HolidayRepository.HolidayCallback() {
            @Override
            public void onSuccess(List<com.akon.subtools.models.Holiday> holidays) {
                activeHolidays = holidays != null ? holidays : new ArrayList<>();
                filterRoutinesList();
            }

            @Override
            public void onFailure(Exception e) {
                // Non-fatal, continue routine display
            }
        });
    }

    private void setupTabLayout() {

        for (String day : daysOfWeek) {
            binding.tabLayoutDays.addTab(
                    binding.tabLayoutDays.newTab().setText(day)
            );
        }

        binding.tabLayoutDays.addOnTabSelectedListener(
                new TabLayout.OnTabSelectedListener() {

                    @Override
                    public void onTabSelected(TabLayout.Tab tab) {
                        filterRoutinesList();
                    }

                    @Override
                    public void onTabUnselected(TabLayout.Tab tab) {
                    }

                    @Override
                    public void onTabReselected(TabLayout.Tab tab) {
                    }
                });

        TabLayout.Tab allDaysTab = binding.tabLayoutDays.getTabAt(0);
        if (allDaysTab != null) {
            allDaysTab.select();
        }
    }

    private int getTodayTabIndex() {
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        int day = calendar.get(java.util.Calendar.DAY_OF_WEEK);
        switch (day) {
            case java.util.Calendar.SUNDAY: return 1;
            case java.util.Calendar.MONDAY: return 2;
            case java.util.Calendar.TUESDAY: return 3;
            case java.util.Calendar.WEDNESDAY: return 4;
            case java.util.Calendar.THURSDAY: return 5;
            case java.util.Calendar.FRIDAY: return 6;
            case java.util.Calendar.SATURDAY: return 7;
            default: return 0;
        }
    }

    private void setupRecyclerView() {

        binding.recyclerRoutines.setLayoutManager(
                new LinearLayoutManager(getContext())
        );

        adapter = new RoutineAdapter(displayedRoutines);

        binding.recyclerRoutines.setAdapter(adapter);
    }

    private void setupObservers() {

        authViewModel.getUserLiveData().observe(getViewLifecycleOwner(), user -> {

            if (user == null) {
                return;
            }

            currentUser = user;

            String dept = user.getDepartment() != null
                    ? user.getDepartment()
                    : "";

            String term = user.getAcademicLevel() != null
                    ? user.getAcademicLevel()
                    : "";

            routineViewModel.loadRoutinesForUser(dept, term);

            filterRoutinesList();
        });

        routineViewModel.getRoutineList().observe(getViewLifecycleOwner(), routines -> {

            binding.swipeRefreshRoutine.setRefreshing(false);

            allRoutines.clear();

            if (routines != null) {
                allRoutines.addAll(routines);
                if (getContext() != null && currentUser != null) {
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

            filterRoutinesList();
        });

        // Loading indicator
        routineViewModel.getLoading().observe(getViewLifecycleOwner(), isLoading -> {

            binding.progressBar.setVisibility(
                    Boolean.TRUE.equals(isLoading)
                            ? View.VISIBLE
                            : View.GONE
            );

            if (!Boolean.TRUE.equals(isLoading)) {
                binding.swipeRefreshRoutine.setRefreshing(false);
            }
        });

        routineViewModel.getError().observe(getViewLifecycleOwner(), error -> {

            if (error != null && !error.trim().isEmpty()) {
                com.akon.subtools.utils.DialogHelper.showWarningDialog(
                        getContext(),
                        "Sync Error",
                        error
                );
            }
        });
    }


    private void setupListeners() {
        binding.swipeRefreshRoutine.setOnRefreshListener(() -> {
            routineViewModel.refreshRoutines();
        });

        binding.inputSearchRoutine.addTextChangedListener(new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                routineSearchQuery = s != null ? s.toString().trim().toLowerCase() : "";
                filterRoutinesList();
            }
            @Override public void afterTextChanged(android.text.Editable s) {}
        });
    }

    private void filterRoutinesList() {
        if (binding == null) {
            return;
        }
        if (currentUser == null && getContext() != null) {
            currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(getContext());
        }
        if (currentUser == null) {
            return;
        }

        List<Routine> personal =
                routineViewModel.filterPersonalizedRoutine(
                        allRoutines,
                        currentUser.getDepartment(),
                        currentUser.getAcademicLevel(),
                        currentUser.getSection(),
                        currentUser.getSubjects(),
                        currentUser.getCompletedSubjects()
                );

        int selectedPosition = binding.tabLayoutDays.getSelectedTabPosition();
        if (selectedPosition < 0) {
            selectedPosition = 0;
        }

        String selectedDay = daysOfWeek[selectedPosition];

        displayedRoutines.clear();
        java.util.Set<String> displayedKeys = new java.util.HashSet<>();
        List<Routine> todaysRoutinesForHero = new ArrayList<>();

        String todayDayName = daysOfWeek[getTodayTabIndex()];

        for (Routine routine : personal) {
            if (routine == null) continue;

            // Collect today's routines for hero banner
            if (com.akon.subtools.utils.AcademicHelper.isSameDay(todayDayName, routine.getDay())) {
                todaysRoutinesForHero.add(routine);
            }

            // Day filter
            boolean matchesDay = "All Days".equalsIgnoreCase(selectedDay)
                    || com.akon.subtools.utils.AcademicHelper.isSameDay(selectedDay, routine.getDay());

            if (!matchesDay) continue;

            // Search filter (UX-004)
            if (!routineSearchQuery.isEmpty()) {
                String code = routine.getCode() != null ? routine.getCode().toLowerCase() : "";
                String subject = routine.getSubject() != null ? routine.getSubject().toLowerCase() : "";
                String teacherStr = (routine.getTeachers() != null) ? android.text.TextUtils.join(" ", routine.getTeachers()).toLowerCase() : "";
                String room = routine.getClassroom() != null ? routine.getClassroom().toLowerCase() : "";

                boolean matchesSearch = code.contains(routineSearchQuery)
                        || subject.contains(routineSearchQuery)
                        || teacherStr.contains(routineSearchQuery)
                        || room.contains(routineSearchQuery);

                if (!matchesSearch) continue;
            }

            String key = (routine.getId() != null && !routine.getId().trim().isEmpty())
                    ? routine.getId().trim()
                    : (routine.getCode() + "_" + routine.getDay() + "_" + routine.getStartTime() + "_" + routine.getEndTime() + "_" + routine.getClassroom());
            if (!displayedKeys.contains(key)) {
                displayedKeys.add(key);
                displayedRoutines.add(routine);
            }
        }

        // Sort routines chronologically by start time ascending
        displayedRoutines.sort((a, b) -> Integer.compare(
                com.akon.subtools.utils.AcademicHelper.parseTimeToMinutes(a.getStartTime()),
                com.akon.subtools.utils.AcademicHelper.parseTimeToMinutes(b.getStartTime())
        ));

        String todayDateStr = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
        com.akon.subtools.models.Holiday todayHoliday = null;
        for (com.akon.subtools.models.Holiday h : activeHolidays) {
            if (h != null && h.isEnabled() && todayDateStr.equals(h.getDate())) {
                todayHoliday = h;
                break;
            }
        }

        // Update Hero Banner (UX-002)
        updateNextClassHeroBanner(todaysRoutinesForHero, todayHoliday);

        adapter.notifyDataSetChanged();
        adapter.setShowDayBadge("All Days".equalsIgnoreCase(selectedDay));

        if (displayedRoutines.isEmpty()) {
            if (todayHoliday != null && ("All Days".equalsIgnoreCase(selectedDay) || com.akon.subtools.utils.AcademicHelper.isSameDay(selectedDay, todayDayName))) {
                binding.emptyRoutineText.setText("🎉 Holiday — No Classes Scheduled (" + todayHoliday.getName() + ")");
            } else if (currentUser.getSubjects() == null || currentUser.getSubjects().isEmpty()) {
                binding.emptyRoutineText.setText("Add your subjects in the Subjects section to see your personalized routine.");
            } else if (!routineSearchQuery.isEmpty()) {
                binding.emptyRoutineText.setText("No classes match search criteria.");
            } else {
                binding.emptyRoutineText.setText("No classes scheduled for this day.");
            }
            binding.emptyRoutineContainer.setVisibility(View.VISIBLE);
        } else {
            binding.emptyRoutineContainer.setVisibility(View.GONE);
        }
    }

    private void updateNextClassHeroBanner(List<Routine> todaysRoutines, com.akon.subtools.models.Holiday todayHoliday) {
        if (binding == null) return;

        if (todayHoliday != null) {
            binding.cardHeroNextClass.setVisibility(View.VISIBLE);
            binding.textHeroStatusBadge.setText("🎉 UNIVERSITY HOLIDAY");
            binding.textHeroTimeLeft.setText("View Calendar ➔");
            binding.textHeroSubjectTitle.setText(todayHoliday.getName());
            binding.textHeroTimeRoom.setText(todayHoliday.getDescription() != null && !todayHoliday.getDescription().isEmpty() ? todayHoliday.getDescription() : "Enjoy your holiday!");
            binding.textHeroTeacher.setText("Tap to view full academic holiday schedule");
            binding.cardHeroNextClass.setOnClickListener(v -> showHolidaysBottomSheet());
            return;
        }

        binding.cardHeroNextClass.setOnClickListener(null);

        java.util.Calendar now = java.util.Calendar.getInstance();
        int currentMinutes = now.get(java.util.Calendar.HOUR_OF_DAY) * 60 + now.get(java.util.Calendar.MINUTE);

        Routine ongoing = null;
        Routine nextUpcoming = null;
        int minUpcomingDiff = Integer.MAX_VALUE;

        for (Routine r : todaysRoutines) {
            int startMins = com.akon.subtools.utils.AcademicHelper.parseTimeToMinutes(r.getStartTime());
            int endMins = com.akon.subtools.utils.AcademicHelper.parseTimeToMinutes(r.getEndTime());

            if (currentMinutes >= startMins && currentMinutes <= endMins) {
                ongoing = r;
                break;
            } else if (startMins > currentMinutes) {
                int diff = startMins - currentMinutes;
                if (diff < minUpcomingDiff) {
                    minUpcomingDiff = diff;
                    nextUpcoming = r;
                }
            }
        }

        if (ongoing != null) {
            binding.cardHeroNextClass.setVisibility(View.VISIBLE);
            binding.textHeroStatusBadge.setText("🟢 ONGOING CLASS");
            binding.textHeroTimeLeft.setText("In session now");
            binding.textHeroSubjectTitle.setText(ongoing.getCode() + " • " + ongoing.getSubject());
            binding.textHeroTimeRoom.setText("⏰ " + adapter.formatTo12Hour(ongoing.getStartTime()) + " - " + adapter.formatTo12Hour(ongoing.getEndTime()) + "  •  📍 " + ongoing.getFormattedLocation());
            String teacherStr = (ongoing.getTeachers() != null && !ongoing.getTeachers().isEmpty()) ? android.text.TextUtils.join(", ", ongoing.getTeachers()) : "";
            binding.textHeroTeacher.setText(teacherStr);
        } else if (nextUpcoming != null) {
            binding.cardHeroNextClass.setVisibility(View.VISIBLE);
            binding.textHeroStatusBadge.setText("⚡ NEXT UPCOMING CLASS");
            int hours = minUpcomingDiff / 60;
            int mins = minUpcomingDiff % 60;
            String timeDiffStr = hours > 0 ? ("In " + hours + "h " + mins + "m") : ("In " + mins + " mins");
            binding.textHeroTimeLeft.setText(timeDiffStr);
            binding.textHeroSubjectTitle.setText(nextUpcoming.getCode() + " • " + nextUpcoming.getSubject());
            binding.textHeroTimeRoom.setText("⏰ " + adapter.formatTo12Hour(nextUpcoming.getStartTime()) + " - " + adapter.formatTo12Hour(nextUpcoming.getEndTime()) + "  •  📍 " + nextUpcoming.getFormattedLocation());
            String teacherStr = (nextUpcoming.getTeachers() != null && !nextUpcoming.getTeachers().isEmpty()) ? android.text.TextUtils.join(", ", nextUpcoming.getTeachers()) : "";
            binding.textHeroTeacher.setText(teacherStr);
        } else {
            binding.cardHeroNextClass.setVisibility(View.GONE);
        }
    }

    private void showHolidaysBottomSheet() {
        if (getContext() == null || activeHolidays.isEmpty()) {
            android.widget.Toast.makeText(getContext(), "No academic holidays recorded", android.widget.Toast.LENGTH_SHORT).show();
            return;
        }

        com.google.android.material.bottomsheet.BottomSheetDialog dialog =
                new com.google.android.material.bottomsheet.BottomSheetDialog(requireContext());

        android.widget.LinearLayout root = new android.widget.LinearLayout(requireContext());
        root.setOrientation(android.widget.LinearLayout.VERTICAL);
        root.setPadding(48, 40, 48, 48);

        android.widget.TextView title = new android.widget.TextView(requireContext());
        title.setText("📅 University Academic Holidays");
        title.setTextSize(18);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setTextColor(androidx.core.content.ContextCompat.getColor(requireContext(), R.color.text_primary));
        title.setPadding(0, 0, 0, 24);
        root.addView(title);

        android.widget.ScrollView scrollView = new android.widget.ScrollView(requireContext());
        android.widget.LinearLayout listLayout = new android.widget.LinearLayout(requireContext());
        listLayout.setOrientation(android.widget.LinearLayout.VERTICAL);

        for (com.akon.subtools.models.Holiday h : activeHolidays) {
            android.widget.LinearLayout itemLayout = new android.widget.LinearLayout(requireContext());
            itemLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
            itemLayout.setPadding(0, 16, 0, 16);

            android.widget.TextView nameView = new android.widget.TextView(requireContext());
            nameView.setText("🎉 " + h.getName());
            nameView.setTextSize(15);
            nameView.setTypeface(null, android.graphics.Typeface.BOLD);
            nameView.setTextColor(androidx.core.content.ContextCompat.getColor(requireContext(), R.color.text_primary));
            itemLayout.addView(nameView);

            android.widget.TextView dateView = new android.widget.TextView(requireContext());
            String desc = (h.getDescription() != null && !h.getDescription().isEmpty()) ? " • " + h.getDescription() : "";
            dateView.setText("📅 " + h.getDate() + desc);
            dateView.setTextSize(13);
            dateView.setTextColor(androidx.core.content.ContextCompat.getColor(requireContext(), R.color.text_secondary_light));
            itemLayout.addView(dateView);

            android.view.View divider = new android.view.View(requireContext());
            divider.setLayoutParams(new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 2));
            divider.setBackgroundColor(android.graphics.Color.parseColor("#E5E7EB"));
            itemLayout.addView(divider);

            listLayout.addView(itemLayout);
        }

        scrollView.addView(listLayout);
        root.addView(scrollView);
        dialog.setContentView(root);
        dialog.show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}