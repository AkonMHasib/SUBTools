package com.akon.subtools.coordinator.ui.faculty;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.coordinator.data.model.Faculty;
import com.akon.subtools.coordinator.data.model.Permission;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.databinding.FragmentFacultyBinding;
import com.akon.subtools.coordinator.utils.DepartmentUtils;



public class FacultyFragment extends Fragment implements FacultyAdapter.FacultyActionListener {

    private FragmentFacultyBinding binding;
    private FacultyViewModel viewModel;
    private FacultyAdapter adapter;
    private SessionManager sessionManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentFacultyBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        viewModel = new ViewModelProvider(this).get(FacultyViewModel.class);
        sessionManager = new SessionManager(requireContext());

        adapter = new FacultyAdapter(this);
        boolean canManage = sessionManager.hasPermission(Permission.FACULTY_MANAGE) || sessionManager.hasPermission(Permission.FACULTY_CREATE);
        adapter.setCanManage(canManage);

        binding.rvFaculty.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvFaculty.setAdapter(adapter);

        binding.fabAddFaculty.setVisibility(canManage ? View.VISIBLE : View.GONE);
        binding.fabAddFaculty.setOnClickListener(v -> openAddFacultyDialog(null));

        setupDeptFilter();
        setupSearch();
        setupObservers();

        binding.swipeRefreshLayout.setOnRefreshListener(() -> viewModel.forceRefresh());
    }

    @Override
    public void onResume() {
        super.onResume();
        viewModel.loadFaculty();
    }

    private void setupDeptFilter() {
        // Auto-filter to the user's own department (filter UI is hidden)
        String myDept = sessionManager.getDepartment();
        String myDeptCode = DepartmentUtils.getDepartmentCode(myDept);
        viewModel.setSelectedDept(myDeptCode);
    }

    private void setupSearch() {
        binding.etSearchFaculty.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                viewModel.setSearchQuery(s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void setupObservers() {
        viewModel.getFilteredFacultyLiveData().observe(getViewLifecycleOwner(), facultyList -> {
            adapter.setItems(facultyList);
        });

        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            boolean loading = Boolean.TRUE.equals(isLoading);
            binding.progressBarFaculty.setVisibility(loading && !binding.swipeRefreshLayout.isRefreshing() ? View.VISIBLE : View.GONE);
            binding.swipeRefreshLayout.setRefreshing(loading);
        });

        viewModel.getToastMessage().observe(getViewLifecycleOwner(), msg -> {
            if (msg != null && !msg.isEmpty()) {
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void openAddFacultyDialog(@Nullable Faculty faculty) {
        AddFacultyDialogFragment dialog = AddFacultyDialogFragment.newInstance(faculty, () -> viewModel.loadFaculty());
        dialog.show(getChildFragmentManager(), "AddFacultyDialog");
    }

    @Override
    public void onCallFaculty(Faculty faculty) {
        if (faculty.getPhone() != null && !faculty.getPhone().trim().isEmpty()) {
            Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + faculty.getPhone().trim()));
            startActivity(intent);
        } else {
            Toast.makeText(requireContext(), "Phone number not available for this faculty member.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onEmailFaculty(Faculty faculty) {
        if (faculty.getEmail() != null && !faculty.getEmail().trim().isEmpty()) {
            Intent intent = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:" + faculty.getEmail().trim()));
            startActivity(intent);
        } else {
            Toast.makeText(requireContext(), "Email address not available for this faculty member.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onEditFaculty(Faculty faculty) {
        openAddFacultyDialog(faculty);
    }

    @Override
    public void onDeleteFaculty(Faculty faculty) {
        new AlertDialog.Builder(requireContext())
                .setTitle("Delete Faculty Member")
                .setMessage("Are you sure you want to delete " + (faculty.getName() != null ? faculty.getName() : "this faculty member") + "?")
                .setPositiveButton("Delete", (dialog, which) -> viewModel.deleteFaculty(faculty.getId()))
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
