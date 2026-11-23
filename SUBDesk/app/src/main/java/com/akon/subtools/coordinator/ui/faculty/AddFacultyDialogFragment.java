package com.akon.subtools.coordinator.ui.faculty;

import android.app.Dialog;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.akon.subtools.coordinator.R;
import com.akon.subtools.coordinator.data.model.Faculty;
import com.akon.subtools.coordinator.data.repository.FacultyRepository;
import com.akon.subtools.coordinator.databinding.DialogAddFacultyBinding;
import com.akon.subtools.coordinator.utils.DepartmentUtils;

import java.util.Arrays;
import java.util.List;

public class AddFacultyDialogFragment extends DialogFragment {

    public interface FacultySaveListener {
        void onFacultySaved();
    }

    private DialogAddFacultyBinding binding;
    private Faculty editingFaculty = null;
    private FacultySaveListener listener;

    private static final List<String> DESIGNATIONS = Arrays.asList(
            "Professor", "Associate Professor", "Assistant Professor", "Lecturer"
    );

    public static AddFacultyDialogFragment newInstance(@Nullable Faculty faculty, @Nullable FacultySaveListener listener) {
        AddFacultyDialogFragment fragment = new AddFacultyDialogFragment();
        fragment.editingFaculty = faculty;
        fragment.listener = listener;
        return fragment;
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getDialog() != null && getDialog().getWindow() != null) {
            int width = (int) (getResources().getDisplayMetrics().widthPixels * 0.92);
            getDialog().getWindow().setLayout(width, ViewGroup.LayoutParams.WRAP_CONTENT);
            getDialog().getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = DialogAddFacultyBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        setupSpinners();

        if (editingFaculty != null) {
            binding.tvDialogTitle.setText("Edit Faculty Member");
            binding.etFacultyName.setText(editingFaculty.getName());
            binding.etFacultyEmail.setText(editingFaculty.getEmail());
            binding.etFacultyPhone.setText(editingFaculty.getPhone());

            // Select dept spinner using full department name match
            List<String> fullDepts = DepartmentUtils.getDepartmentFullNames();
            String currentFullName = DepartmentUtils.getDepartmentFullName(editingFaculty.getDepartment());
            int deptIdx = fullDepts.indexOf(currentFullName);
            if (deptIdx >= 0) binding.spinnerDepartment.setSelection(deptIdx);

            // Select designation spinner
            int desigIdx = DESIGNATIONS.indexOf(editingFaculty.getDesignation());
            if (desigIdx >= 0) binding.spinnerDesignation.setSelection(desigIdx);
        }

        binding.btnCancel.setOnClickListener(v -> dismiss());
        binding.btnSave.setOnClickListener(v -> saveFaculty());
    }

    private void setupSpinners() {
        List<String> fullDepts = DepartmentUtils.getDepartmentFullNames();
        ArrayAdapter<String> deptAdapter = new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_item, fullDepts);
        deptAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerDepartment.setAdapter(deptAdapter);

        com.akon.subtools.coordinator.data.repository.SessionManager sessionManager =
                new com.akon.subtools.coordinator.data.repository.SessionManager(requireContext());
        String myDept = sessionManager.getDepartment();
        String currentFullName = DepartmentUtils.getDepartmentFullName(myDept);
        int deptIdx = fullDepts.indexOf(currentFullName);
        if (deptIdx >= 0) binding.spinnerDepartment.setSelection(deptIdx);
        binding.spinnerDepartment.setEnabled(false); // Locked to admin department

        ArrayAdapter<String> desigAdapter = new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_item, DESIGNATIONS);
        desigAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerDesignation.setAdapter(desigAdapter);
    }

    private void saveFaculty() {
        String name = binding.etFacultyName.getText() != null ? binding.etFacultyName.getText().toString().trim() : "";
        String email = binding.etFacultyEmail.getText() != null ? binding.etFacultyEmail.getText().toString().trim() : "";
        String phone = binding.etFacultyPhone.getText() != null ? binding.etFacultyPhone.getText().toString().trim() : "";
        String fullDept = (String) binding.spinnerDepartment.getSelectedItem();
        String deptCode = DepartmentUtils.getDepartmentCode(fullDept);
        String desig = (String) binding.spinnerDesignation.getSelectedItem();

        if (name.length() < 3) {
            binding.etFacultyName.setError("Name must be at least 3 characters");
            return;
        }
        if (email.isEmpty() || !email.contains("@")) {
            binding.etFacultyEmail.setError("Valid email is required");
            return;
        }

        Faculty f = editingFaculty != null ? editingFaculty : new Faculty();
        f.setName(name);
        f.setEmail(email);
        f.setPhone(phone);
        f.setDepartment(deptCode);
        f.setDesignation(desig);
        f.setRank(desig);
        f.setRoomNo("");
        f.setStatus("Active");

        FacultyRepository repo = new FacultyRepository();
        FacultyRepository.DataCallback<Void> callback = new FacultyRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                if (isAdded()) {
                    Toast.makeText(requireContext(), editingFaculty != null ? "Faculty updated successfully!" : "Faculty added successfully!", Toast.LENGTH_SHORT).show();
                    if (listener != null) listener.onFacultySaved();
                    dismiss();
                }
            }

            @Override
            public void onError(String errorMessage) {
                if (isAdded()) {
                    Toast.makeText(requireContext(), "Error: " + errorMessage, Toast.LENGTH_SHORT).show();
                }
            }
        };

        if (editingFaculty != null) {
            repo.updateFaculty(f, callback);
        } else {
            repo.createFaculty(f, callback);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
