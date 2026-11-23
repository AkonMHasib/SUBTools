package com.akon.subtools.coordinator.ui.subjects;

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

import com.akon.subtools.coordinator.R;
import com.akon.subtools.coordinator.data.model.Subject;
import com.akon.subtools.coordinator.databinding.FragmentSubjectsBinding;

public class SubjectsFragment extends Fragment implements SubjectAdapter.SubjectActionListener {

    private FragmentSubjectsBinding binding;
    private SubjectsViewModel viewModel;
    private SubjectAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentSubjectsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    private com.akon.subtools.coordinator.data.repository.SessionManager sessionManager;

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        sessionManager = new com.akon.subtools.coordinator.data.repository.SessionManager(requireContext());
        viewModel = new ViewModelProvider(this).get(SubjectsViewModel.class);

        adapter = new SubjectAdapter(this);
        binding.rvSubjects.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvSubjects.setAdapter(adapter);

        binding.fabAddSubject.setOnClickListener(v -> openEditDialog(null));
        binding.swipeRefreshLayout.setOnRefreshListener(() -> viewModel.forceRefresh());

        setupSearch();
        setupObservers();
    }

    @Override
    public void onResume() {
        super.onResume();
        viewModel.loadSubjects();
    }

    private void setupSearch() {
        binding.etSearchSubjects.addTextChangedListener(new TextWatcher() {
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
        viewModel.getFilteredSubjectsLiveData().observe(getViewLifecycleOwner(), subjects -> {
            adapter.setItems(subjects);
            boolean empty = subjects == null || subjects.isEmpty();
            binding.tvEmptySubjects.setVisibility(empty ? View.VISIBLE : View.GONE);
            if (empty && sessionManager != null) {
                String myDept = sessionManager.getDepartment();
                binding.tvEmptySubjects.setText("No subjects found for " + com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentFullName(myDept));
            }
        });

        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            boolean loading = Boolean.TRUE.equals(isLoading);
            binding.progressBarSubjects.setVisibility(loading && !binding.swipeRefreshLayout.isRefreshing() ? View.VISIBLE : View.GONE);
            binding.swipeRefreshLayout.setRefreshing(loading);
        });

        viewModel.getToastMessage().observe(getViewLifecycleOwner(), msg -> {
            if (msg != null && !msg.isEmpty()) {
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void openEditDialog(@Nullable Subject subject) {
        AlertDialog.Builder builder = new AlertDialog.Builder(requireContext());
        builder.setTitle(subject == null ? "Add Subject" : "Edit Subject");

        View dialogView = getLayoutInflater().inflate(R.layout.dialog_add_subject, null);
        android.widget.EditText etCode = dialogView.findViewById(R.id.etDialogSubjectCode);
        android.widget.EditText etName = dialogView.findViewById(R.id.etDialogSubjectName);
        android.widget.Spinner spinnerDept = dialogView.findViewById(R.id.spinnerDialogSubjectDept);
        android.widget.EditText etCredit = dialogView.findViewById(R.id.etDialogSubjectCredit);

        java.util.List<String> fullDepts = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentFullNames();
        android.widget.ArrayAdapter<String> spinnerAdapter = new android.widget.ArrayAdapter<>(
                requireContext(), android.R.layout.simple_spinner_item, fullDepts);
        spinnerAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        spinnerDept.setAdapter(spinnerAdapter);

        // Lock department to admin's assigned department by default (no manual filtering/selection)
        String myDept = sessionManager.getDepartment();
        String defaultFull = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentFullName(myDept);
        int defaultIdx = fullDepts.indexOf(defaultFull);
        if (defaultIdx >= 0) spinnerDept.setSelection(defaultIdx);

        if (subject != null) {
            etCode.setText(subject.getCode());
            etCode.setEnabled(false); // Code is document ID
            etName.setText(subject.getName());
            etCredit.setText(subject.getCredit());

            String currentFull = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentFullName(subject.getDepartment());
            int idx = fullDepts.indexOf(currentFull);
            if (idx >= 0) spinnerDept.setSelection(idx);
        }
        spinnerDept.setEnabled(false); // Admin can only manage their own department

        builder.setView(dialogView);
        builder.setPositiveButton("Save", (dialog, which) -> {
            String code = etCode.getText().toString().trim();
            String name = etName.getText().toString().trim();
            String fullDept = (String) spinnerDept.getSelectedItem();
            String deptCode = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(fullDept);
            String credit = etCredit.getText().toString().trim();

            if (code.isEmpty() || name.isEmpty()) {
                Toast.makeText(requireContext(), "Code and Name are required", Toast.LENGTH_SHORT).show();
                return;
            }

            Subject newSub = new Subject(code, name, deptCode, credit, "Theory");
            if (subject == null) {
                viewModel.addSubject(newSub);
            } else {
                viewModel.updateSubject(newSub);
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    @Override
    public void onEditSubject(Subject subject) {
        openEditDialog(subject);
    }

    @Override
    public void onDeleteSubject(Subject subject) {
        new AlertDialog.Builder(requireContext())
                .setTitle("Delete Subject")
                .setMessage("Are you sure you want to delete course " + subject.getCode() + "?")
                .setPositiveButton("Delete", (dialog, which) -> viewModel.deleteSubject(subject.getCode()))
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
