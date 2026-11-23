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
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.adapters.FacultyAdapter;
import com.akon.subtools.databinding.FragmentFacultyBinding;
import com.akon.subtools.models.Faculty;
import com.akon.subtools.repository.FacultyRepository;
import com.akon.subtools.utils.DepartmentHelper;
import com.akon.subtools.viewmodels.AuthViewModel;

import java.util.ArrayList;
import java.util.List;

public class FacultyFragment extends Fragment {
    private FragmentFacultyBinding binding;
    private AuthViewModel authViewModel;
    private FacultyAdapter adapter;
    private final List<Faculty> facultyList = new ArrayList<>();
    private FacultyRepository facultyRepository;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentFacultyBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        facultyRepository = new FacultyRepository(requireContext());
        binding.recyclerFaculty.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new FacultyAdapter(facultyList);
        binding.recyclerFaculty.setAdapter(adapter);

        authViewModel = new ViewModelProvider(requireActivity()).get(AuthViewModel.class);
        
        setupSwipeRefresh();
        setupObservers();
    }

    private void safeNotifyDataSetChanged() {
        if (binding == null || adapter == null) return;
        if (binding.recyclerFaculty.isComputingLayout()) {
            binding.recyclerFaculty.post(() -> {
                if (binding != null && adapter != null) {
                    adapter.notifyDataSetChanged();
                }
            });
        } else {
            adapter.notifyDataSetChanged();
        }
    }

    private void safeSetIsLoading(boolean isLoading) {
        if (binding == null || adapter == null) return;
        if (binding.recyclerFaculty.isComputingLayout()) {
            binding.recyclerFaculty.post(() -> {
                if (binding != null && adapter != null) {
                    adapter.setIsLoading(isLoading);
                }
            });
        } else {
            adapter.setIsLoading(isLoading);
        }
    }

    private void setupSwipeRefresh() {
        binding.swipeRefresh.setOnRefreshListener(() -> {
            if (authViewModel.getUserLiveData().getValue() != null) {
                String dept = authViewModel.getUserLiveData().getValue().getDepartment();
                if (dept != null && !dept.trim().isEmpty()) {
                    refreshFacultyFromFirestore(DepartmentHelper.getDeptCode(dept.trim()), true);
                } else {
                    binding.swipeRefresh.setRefreshing(false);
                }
            } else {
                binding.swipeRefresh.setRefreshing(false);
            }
        });
    }

    private void setupObservers() {
        binding.progressBar.setVisibility(View.GONE);
        safeSetIsLoading(true);

        authViewModel.getUserLiveData().observe(getViewLifecycleOwner(), user -> {
            if (user != null) {
                String dept = user.getDepartment();
                if (dept != null && !dept.trim().isEmpty()) {
                    String deptCode = DepartmentHelper.getDeptCode(dept.trim());
                    String fullDept = DepartmentHelper.getFullDepartmentName(dept.trim());
                    binding.textHeader.setText("Faculty Directory – " + fullDept);
                    binding.textSubheader.setText("Official faculty members and academic advisors for your department.");
                    loadFaculty(deptCode);
                } else {
                    safeSetIsLoading(false);
                    binding.emptyFacultyText.setText("No department configured in your student profile.");
                    binding.emptyFacultyText.setVisibility(View.VISIBLE);
                }
            } else {
                safeSetIsLoading(false);
                binding.emptyFacultyText.setText("Failed to load user profile.");
                binding.emptyFacultyText.setVisibility(View.VISIBLE);
            }
        });
    }

    private void loadFaculty(String department) {
        safeSetIsLoading(true);
        // 1. Load instantly from database cache (filtered by user's department)
        facultyRepository.getCachedFaculty(department, new FacultyRepository.FacultyCallback() {
            @Override
            public void onSuccess(List<Faculty> list) {
                if (binding == null) return;
                
                if (list != null && !list.isEmpty()) {
                    safeSetIsLoading(false);
                    facultyList.clear();
                    facultyList.addAll(list);
                    binding.emptyFacultyText.setVisibility(View.GONE);
                    safeNotifyDataSetChanged();
                }

                // 2. Refresh from Firestore in background if sync is required or cache is empty
                if (getContext() != null) {
                    android.content.SharedPreferences prefs = requireContext().getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                    long lastSync = prefs.getLong("last_faculty_sync_timestamp_" + department, 0);
                    if (com.akon.subtools.sync.SyncWorker.isSyncRequired(lastSync) || list == null || list.isEmpty()) {
                        refreshFacultyFromFirestore(department, false);
                    }
                }
            }

            @Override
            public void onFailure(Exception e) {
                refreshFacultyFromFirestore(department, false);
            }
        });
    }

    private void refreshFacultyFromFirestore(String department, boolean isManual) {
        if (facultyList.isEmpty()) {
            safeSetIsLoading(true);
        }

        facultyRepository.getFacultyByDepartment(department, new FacultyRepository.FacultyCallback() {
            @Override
            public void onSuccess(List<Faculty> list) {
                if (binding == null) return;
                safeSetIsLoading(false);
                binding.swipeRefresh.setRefreshing(false);
                
                facultyList.clear();
                if (list != null) {
                    facultyList.addAll(list);
                }

                if (facultyList.isEmpty()) {
                    binding.emptyFacultyText.setText("No faculty members found for department: " + DepartmentHelper.getFullDepartmentName(department));
                    binding.emptyFacultyText.setVisibility(View.VISIBLE);
                } else {
                    binding.emptyFacultyText.setVisibility(View.GONE);
                }
                safeNotifyDataSetChanged();

                // Save sync time
                if (getContext() != null) {
                    android.content.SharedPreferences prefs = requireContext().getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                    prefs.edit().putLong("last_faculty_sync_timestamp_" + department, System.currentTimeMillis()).apply();
                }
            }

            @Override
            public void onFailure(Exception e) {
                if (binding == null) return;
                safeSetIsLoading(false);
                binding.swipeRefresh.setRefreshing(false);
                if (isManual && getContext() != null) {
                    Toast.makeText(getContext(), "Failed to refresh faculty: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
