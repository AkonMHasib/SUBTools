package com.akon.subtools.coordinator.ui.routine;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.android.material.tabs.TabLayout;
import com.akon.subtools.coordinator.R;
import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.utils.DepartmentUtils;
import com.akon.subtools.coordinator.databinding.FragmentRoutineBinding;

public class RoutineFragment extends Fragment implements RoutineAdapter.RoutineActionListener {

    private FragmentRoutineBinding binding;
    private RoutineViewModel viewModel;
    private RoutineAdapter adapter;
    private boolean isMultiSelectMode = false;
    private boolean isDayGridViewMode = false;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentRoutineBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        viewModel = new ViewModelProvider(this).get(RoutineViewModel.class);

        adapter = new RoutineAdapter(this);
        binding.rvRoutines.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvRoutines.setAdapter(adapter);

        setupSpinners();
        setupDayTabs();
        setupSearchAndFilters();
        setupToggleGroup();
        setupObservers();

        binding.swipeRefreshLayout.setOnRefreshListener(() -> viewModel.forceRefresh());

        binding.fabAddRoutine.setOnClickListener(v -> {
            AddRoutineDialogFragment dialog = new AddRoutineDialogFragment();
            dialog.setRoutineSaveListener(() -> viewModel.forceRefresh());
            dialog.show(getChildFragmentManager(), "AddRoutineDialog");
        });

        binding.btnBulkDelete.setOnClickListener(v -> confirmBulkDelete());
    }

    @Override
    public void onResume() {
        super.onResume();
        viewModel.loadRoutines();
    }

    private void setupSpinners() {
        SessionManager sessionManager = new SessionManager(requireContext());
        String deptCode = DepartmentUtils.getDepartmentCode(sessionManager.getDepartment());
        int termArrayRes = "ARCH".equalsIgnoreCase(deptCode) ? R.array.arch_terms_array : R.array.terms_array;

        ArrayAdapter<CharSequence> termAdapter = ArrayAdapter.createFromResource(
                requireContext(), termArrayRes, android.R.layout.simple_spinner_item);
        termAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerTerm.setAdapter(termAdapter);

        ArrayAdapter<CharSequence> dayAdapter = ArrayAdapter.createFromResource(
                requireContext(), R.array.days_array, android.R.layout.simple_spinner_item);
        dayAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerDay.setAdapter(dayAdapter);

        ArrayAdapter<CharSequence> typeAdapter = ArrayAdapter.createFromResource(
                requireContext(), R.array.routine_types_array, android.R.layout.simple_spinner_item);
        typeAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerType.setAdapter(typeAdapter);
    }

    private void setupDayTabs() {
        String[] days = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
        for (String day : days) {
            binding.tabLayoutDays.addTab(binding.tabLayoutDays.newTab().setText(day));
        }

        binding.tabLayoutDays.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                if (isDayGridViewMode && tab.getText() != null) {
                    viewModel.setDayFilter(tab.getText().toString());
                }
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {}

            @Override
            public void onTabReselected(TabLayout.Tab tab) {}
        });
    }

    private void setupToggleGroup() {
        binding.toggleViewMode.addOnButtonCheckedListener((group, checkedId, isChecked) -> {
            if (isChecked) {
                if (checkedId == R.id.btnViewGrid) {
                    isDayGridViewMode = true;
                    binding.tabLayoutDays.setVisibility(View.VISIBLE);
                    binding.spinnerDay.setVisibility(View.GONE);
                    TabLayout.Tab selectedTab = binding.tabLayoutDays.getTabAt(binding.tabLayoutDays.getSelectedTabPosition());
                    if (selectedTab != null && selectedTab.getText() != null) {
                        viewModel.setDayFilter(selectedTab.getText().toString());
                    }
                } else {
                    isDayGridViewMode = false;
                    binding.tabLayoutDays.setVisibility(View.GONE);
                    binding.spinnerDay.setVisibility(View.VISIBLE);
                    viewModel.setDayFilter(binding.spinnerDay.getSelectedItem() != null ? binding.spinnerDay.getSelectedItem().toString() : "All Days");
                }
            }
        });
    }

    private void setupSearchAndFilters() {
        binding.etSearchRoutine.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                viewModel.setSearchQuery(s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        binding.spinnerTerm.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                viewModel.setTermFilter(parent.getItemAtPosition(position).toString());
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        binding.spinnerDay.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                if (!isDayGridViewMode) {
                    viewModel.setDayFilter(parent.getItemAtPosition(position).toString());
                }
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        binding.spinnerType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                viewModel.setTypeFilter(parent.getItemAtPosition(position).toString());
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void setupObservers() {
        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.swipeRefreshLayout.setRefreshing(Boolean.TRUE.equals(isLoading));
        });

        viewModel.getFilteredRoutinesLiveData().observe(getViewLifecycleOwner(), routines -> {
            adapter.setItems(routines, isMultiSelectMode);
        });

        viewModel.getToastMessage().observe(getViewLifecycleOwner(), message -> {
            if (message != null && !message.isEmpty()) {
                Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show();
            }
        });

        viewModel.getSelectedCountLiveData().observe(getViewLifecycleOwner(), count -> {
            if (count > 0) {
                isMultiSelectMode = true;
                binding.cardBulkBar.setVisibility(View.VISIBLE);
                binding.tvSelectedCount.setText(count + " routines selected");
            } else {
                isMultiSelectMode = false;
                binding.cardBulkBar.setVisibility(View.GONE);
            }
            adapter.setItems(viewModel.getFilteredRoutinesLiveData().getValue(), isMultiSelectMode);
        });
    }

    private void confirmBulkDelete() {
        int count = viewModel.getSelectedCountLiveData().getValue() != null ? viewModel.getSelectedCountLiveData().getValue() : 0;
        new AlertDialog.Builder(requireContext())
                .setTitle("Confirm Bulk Delete")
                .setMessage("Delete " + count + " selected routines? This action cannot be undone.")
                .setPositiveButton("Delete", (dialog, which) -> viewModel.executeBulkDelete())
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onItemClick(ClassRoutine item) {
        if (isMultiSelectMode) {
            viewModel.toggleSelection(item);
        }
    }

    @Override
    public void onItemLongClick(ClassRoutine item) {
        viewModel.toggleSelection(item);
    }

    @Override
    public void onEditClick(ClassRoutine item) {
        AddRoutineDialogFragment dialog = AddRoutineDialogFragment.newInstance(item, false);
        dialog.setRoutineSaveListener(() -> viewModel.forceRefresh());
        dialog.show(getChildFragmentManager(), "AddRoutineDialog");
    }

    @Override
    public void onDuplicateClick(ClassRoutine item) {
        AddRoutineDialogFragment dialog = AddRoutineDialogFragment.newInstance(item, true);
        dialog.setRoutineSaveListener(() -> viewModel.forceRefresh());
        dialog.show(getChildFragmentManager(), "AddRoutineDialog");
    }

    @Override
    public void onDeleteClick(ClassRoutine item) {
        new AlertDialog.Builder(requireContext())
                .setTitle("Delete Routine Slot")
                .setMessage("Delete routine slot for " + item.getCode() + " (" + item.getSubject() + ")?")
                .setPositiveButton("Delete", (dialog, which) -> viewModel.deleteSingleRoutine(item.getId()))
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onRescheduleClick(ClassRoutine item) {
        RescheduleBottomSheetDialogFragment dialog = RescheduleBottomSheetDialogFragment.newInstance(item);
        dialog.show(getChildFragmentManager(), "RescheduleDialog");
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
