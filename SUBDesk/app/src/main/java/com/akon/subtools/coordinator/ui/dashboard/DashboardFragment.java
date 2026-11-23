package com.akon.subtools.coordinator.ui.dashboard;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.navigation.Navigation;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.coordinator.R;
import com.akon.subtools.coordinator.databinding.FragmentDashboardBinding;
import com.akon.subtools.coordinator.ui.routine.AddRoutineDialogFragment;
import com.akon.subtools.coordinator.ui.notices.CreateNoticeDialogFragment;
import com.akon.subtools.coordinator.utils.DepartmentUtils;

public class DashboardFragment extends Fragment {

    private FragmentDashboardBinding binding;
    private DashboardViewModel viewModel;
    private TodayClassesAdapter adapter;
    private com.akon.subtools.coordinator.data.repository.SessionManager sessionManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentDashboardBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        viewModel = new ViewModelProvider(this).get(DashboardViewModel.class);
        sessionManager = new com.akon.subtools.coordinator.data.repository.SessionManager(requireContext());

        adapter = new TodayClassesAdapter();
        binding.rvTodayClasses.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvTodayClasses.setAdapter(adapter);

        setupHeader();
        setupObservers();
        setupQuickActions();

        binding.swipeRefreshLayout.setOnRefreshListener(() -> viewModel.loadDashboardMetrics(true));
    }

    @Override
    public void onResume() {
        super.onResume();
        setupHeader();
        viewModel.loadDashboardMetrics();
    }

    private void setupHeader() {
        String fullName = viewModel.getCoordinatorName();
        if (fullName == null || fullName.trim().isEmpty() || "Coordinator".equalsIgnoreCase(fullName.trim())) {
            fullName = sessionManager.getUserName();
        }
        if (fullName != null && !fullName.trim().isEmpty() && !"Coordinator".equalsIgnoreCase(fullName.trim())) {
            binding.tvCoordinatorName.setText(fullName.trim());
        } else {
            binding.tvCoordinatorName.setText("Admin");
        }

        updateDepartmentChip();
        binding.chipDept.setClickable(false);
        binding.chipDept.setFocusable(false);
    }

    private void updateDepartmentChip() {
        String dept = sessionManager.getDepartment();
        String displayDept = DepartmentUtils.getDepartmentFullName(dept);
        binding.chipDept.setText(displayDept);
    }

    private void setupObservers() {
        boolean isOverviewRole = true;

        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.swipeRefreshLayout.setRefreshing(Boolean.TRUE.equals(isLoading));
        });

        if (isOverviewRole) {
            binding.layoutModeratorMetrics.setVisibility(View.VISIBLE);
            binding.gridMetrics.setVisibility(View.GONE);

            binding.tvTodaySectionTitle.setVisibility(View.GONE);
            binding.rvTodayClasses.setVisibility(View.GONE);
            binding.tvNoClassesToday.setVisibility(View.GONE);

            viewModel.getModUsersTotal().observe(getViewLifecycleOwner(), text -> binding.tvModMetricUsersTotal.setText(text));
            viewModel.getModUsersDept().observe(getViewLifecycleOwner(), text -> binding.tvModMetricUsersDept.setText(text));

            viewModel.getModFacultyTotal().observe(getViewLifecycleOwner(), text -> binding.tvModMetricFacultyTotal.setText(text));
            viewModel.getModFacultyDept().observe(getViewLifecycleOwner(), text -> binding.tvModMetricFacultyDept.setText(text));

            viewModel.getModSubjectsTotal().observe(getViewLifecycleOwner(), text -> binding.tvModMetricSubjectsTotal.setText(text));
            viewModel.getModSubjectsDept().observe(getViewLifecycleOwner(), text -> binding.tvModMetricSubjectsDept.setText(text));

            viewModel.getModCoverPagesTotal().observe(getViewLifecycleOwner(), text -> binding.tvModMetricCoverPagesTotal.setText(text));
            viewModel.getModCoverPagesDept().observe(getViewLifecycleOwner(), text -> binding.tvModMetricCoverPagesDept.setText(text));

            viewModel.getModTransportsTotal().observe(getViewLifecycleOwner(), text -> binding.tvModMetricTransportsTotal.setText(text));
            viewModel.getModTransportsExpired().observe(getViewLifecycleOwner(), text -> binding.tvModMetricTransportsExpired.setText(text));
            viewModel.getModNoticesTotal().observe(getViewLifecycleOwner(), text -> binding.tvModMetricNoticesTotal.setText(text));
            viewModel.getModNoticesDept().observe(getViewLifecycleOwner(), text -> binding.tvModMetricNoticesDept.setText(text));
            viewModel.getGpsExpiryAlert().observe(getViewLifecycleOwner(), text -> {
                boolean visible = text != null && !text.isEmpty();
                binding.tvGpsExpiryAlert.setVisibility(visible ? View.VISIBLE : View.GONE);
                binding.tvGpsExpiryAlert.setText(visible ? "GPS Alert: " + text : "");
            });
        } else {
            binding.layoutModeratorMetrics.setVisibility(View.GONE);
            binding.gridMetrics.setVisibility(View.VISIBLE);

            binding.tvTodaySectionTitle.setVisibility(View.VISIBLE);

            viewModel.getActiveStudentsCount().observe(getViewLifecycleOwner(), count -> binding.tvMetricStudents.setText(String.valueOf(count)));
            viewModel.getTodayLecturesCount().observe(getViewLifecycleOwner(), count -> binding.tvMetricTodayLectures.setText(String.valueOf(count)));
            viewModel.getWeeklyLecturesCount().observe(getViewLifecycleOwner(), count -> binding.tvMetricWeeklyLectures.setText(String.valueOf(count)));
            viewModel.getActiveNoticesCount().observe(getViewLifecycleOwner(), count -> binding.tvMetricNotices.setText(String.valueOf(count)));

            viewModel.getTodayClassesLiveData().observe(getViewLifecycleOwner(), classes -> {
                if (classes == null || classes.isEmpty()) {
                    binding.rvTodayClasses.setVisibility(View.GONE);
                    binding.tvNoClassesToday.setVisibility(View.VISIBLE);
                } else {
                    binding.rvTodayClasses.setVisibility(View.VISIBLE);
                    binding.tvNoClassesToday.setVisibility(View.GONE);
                    adapter.setItems(classes);
                }
            });
        }
    }

    private void setupQuickActions() {
        binding.cardQuickActions.setVisibility(View.VISIBLE);

        binding.btnQuickAddClass.setVisibility(View.VISIBLE);
        binding.btnQuickPostNotice.setVisibility(View.VISIBLE);
        binding.btnQuickStudentLookup.setVisibility(View.VISIBLE);

        binding.btnQuickAddClass.setOnClickListener(v -> {
            AddRoutineDialogFragment dialog = new AddRoutineDialogFragment();
            dialog.show(getChildFragmentManager(), "AddRoutineDialog");
        });

        binding.btnQuickPostNotice.setOnClickListener(v -> {
            CreateNoticeDialogFragment dialog = new CreateNoticeDialogFragment();
            dialog.show(getChildFragmentManager(), "CreateNoticeDialog");
        });

        binding.btnQuickStudentLookup.setOnClickListener(v -> {
            try {
                androidx.navigation.NavOptions navOptions = new androidx.navigation.NavOptions.Builder()
                        .setLaunchSingleTop(true)
                        .setPopUpTo(R.id.navigation_dashboard, false)
                        .build();
                Navigation.findNavController(requireView()).navigate(R.id.navigation_students, null, navOptions);
            } catch (Exception ignored) {}
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
