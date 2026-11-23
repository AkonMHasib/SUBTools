package com.akon.subtools.coordinator.ui.students;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.databinding.FragmentStudentsBinding;

public class StudentsFragment extends Fragment implements StudentAdapter.StudentActionListener {

    private FragmentStudentsBinding binding;
    private StudentsViewModel viewModel;
    private StudentAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentStudentsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        viewModel = new ViewModelProvider(this).get(StudentsViewModel.class);

        adapter = new StudentAdapter(this);
        binding.rvStudents.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvStudents.setAdapter(adapter);

        setupSearch();
        setupObservers();

        binding.swipeRefreshLayout.setOnRefreshListener(() -> viewModel.forceRefresh());
    }

    @Override
    public void onResume() {
        super.onResume();
        viewModel.loadStudents();
    }

    private void setupSearch() {
        binding.etSearchStudents.addTextChangedListener(new TextWatcher() {
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
        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.swipeRefreshLayout.setRefreshing(Boolean.TRUE.equals(isLoading));
        });

        viewModel.getFilteredStudentsLiveData().observe(getViewLifecycleOwner(), students -> {
            adapter.setItems(students);
        });
    }

    @Override
    public void onViewDetail(User student) {
        StudentDetailBottomSheetDialogFragment drawer = StudentDetailBottomSheetDialogFragment.newInstance(
                student,
                new StudentDetailBottomSheetDialogFragment.OnStudentActionListener() {
                    @Override
                    public void onEditRequested(User s) {
                        // Read-only on mobile
                    }

                    @Override
                    public void onStatusChangeRequested(User s, String newStatus) {
                        viewModel.updateStudentStatus(s.getUid(), newStatus);
                    }

                    @Override
                    public void onVerifyToggleRequested(User s, boolean isVerified) {
                        viewModel.toggleStudentVerification(s.getUid(), isVerified);
                    }
                }
        );
        drawer.show(getChildFragmentManager(), "StudentDetailDrawer");
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
