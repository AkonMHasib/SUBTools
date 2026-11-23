package com.akon.subtools.coordinator.ui.routine;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.akon.subtools.coordinator.R;
import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.data.model.Subject;
import com.akon.subtools.coordinator.data.repository.RoutineRepository;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.data.repository.SubjectRepository;
import com.akon.subtools.coordinator.databinding.DialogBulkImportBinding;
import com.akon.subtools.coordinator.utils.DepartmentUtils;
import com.akon.subtools.coordinator.utils.ExcelCsvParser;
import com.akon.subtools.coordinator.utils.RoutineImportEngine;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.List;

public class BulkImportDialogFragment extends DialogFragment {

    private DialogBulkImportBinding binding;
    private SessionManager sessionManager;
    private RoutineRepository routineRepository;
    private SubjectRepository subjectRepository;

    private String pickedFileContent = null;

    private final ActivityResultLauncher<Intent> filePickerLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                    Uri uri = result.getData().getData();
                    if (uri != null) {
                        readContentFromUri(uri);
                    }
                }
            }
    );

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = DialogBulkImportBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        sessionManager = new SessionManager(requireContext());
        routineRepository = new RoutineRepository();
        subjectRepository = new SubjectRepository();

        setupDeptSpinner();

        binding.btnPickFile.setOnClickListener(v -> openFilePicker());
        binding.btnCancelImport.setOnClickListener(v -> dismiss());
        binding.btnExecuteImport.setOnClickListener(v -> startImportWorkflow());
    }

    private void setupDeptSpinner() {
        List<String> fullNames = DepartmentUtils.getDepartmentFullNames();
        ArrayAdapter<String> adapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, fullNames);
        adapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerImportDept.setAdapter(adapter);

        String userDeptCode = sessionManager.getDepartment();
        String userDeptName = DepartmentUtils.getDepartmentFullName(userDeptCode);
        int pos = fullNames.indexOf(userDeptName);
        if (pos >= 0) {
            binding.spinnerImportDept.setSelection(pos);
        }
        binding.spinnerImportDept.setEnabled(false); // Locked to admin's own department
    }

    private void openFilePicker() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        String[] mimeTypes = {"text/csv", "text/comma-separated-values", "application/json", "text/plain"};
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        filePickerLauncher.launch(Intent.createChooser(intent, "Select CSV or JSON routine file"));
    }

    private void readContentFromUri(Uri uri) {
        try (InputStream inputStream = requireContext().getContentResolver().openInputStream(uri);
             BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            pickedFileContent = sb.toString();
            binding.etPayload.setText(pickedFileContent);
            Toast.makeText(requireContext(), "File loaded successfully!", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(requireContext(), "Failed to read file: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void startImportWorkflow() {
        String payload = binding.etPayload.getText() != null ? binding.etPayload.getText().toString().trim() : "";
        if (payload.isEmpty()) {
            Toast.makeText(requireContext(), "Please select a file or paste CSV/JSON payload.", Toast.LENGTH_SHORT).show();
            return;
        }

        String rawDeptSelection = binding.spinnerImportDept.getSelectedItem() != null ?
                binding.spinnerImportDept.getSelectedItem().toString() : sessionManager.getDepartment();
        String dept = DepartmentUtils.getDepartmentCode(rawDeptSelection);

        binding.importProgressBar.setVisibility(View.VISIBLE);
        binding.btnExecuteImport.setEnabled(false);

        try {
            List<ClassRoutine> candidates = ExcelCsvParser.parseContent(payload, dept);
            if (candidates.isEmpty()) {
                binding.importProgressBar.setVisibility(View.GONE);
                binding.btnExecuteImport.setEnabled(true);
                Toast.makeText(requireContext(), "No valid routine entries found in payload.", Toast.LENGTH_SHORT).show();
                return;
            }

            // Fetch existing routines & subject registry for validation cross-checking
            routineRepository.getRoutines(dept, new RoutineRepository.DataCallback<List<ClassRoutine>>() {
                @Override
                public void onSuccess(List<ClassRoutine> existingRoutines) {
                    subjectRepository.getSubjectsForDepartment(dept, new SubjectRepository.DataCallback<List<Subject>>() {
                        @Override
                        public void onSuccess(List<Subject> subjectRegistry) {
                            // Process import via RoutineImportEngine
                            RoutineImportEngine.processImport(candidates, dept, existingRoutines, subjectRegistry)
                                    .thenAccept(result -> requireActivity().runOnUiThread(() -> {
                                        binding.importProgressBar.setVisibility(View.GONE);
                                        binding.btnExecuteImport.setEnabled(true);

                                        if (result.getSuccessCount() > 0) {
                                            Toast.makeText(requireContext(),
                                                    "✅ Successfully imported " + result.getSuccessCount() + " valid routine slots!",
                                                    Toast.LENGTH_LONG).show();
                                        }

                                        dismiss();

                                        if (!result.getErrors().isEmpty()) {
                                            ImportErrorsDialogFragment errorDialog = ImportErrorsDialogFragment.newInstance(result.getErrors());
                                            errorDialog.show(getParentFragmentManager(), "ImportErrorsDialog");
                                        }
                                    }));
                        }

                        @Override
                        public void onError(String errorMessage) {
                            binding.importProgressBar.setVisibility(View.GONE);
                            binding.btnExecuteImport.setEnabled(true);
                            Toast.makeText(requireContext(), errorMessage, Toast.LENGTH_SHORT).show();
                        }
                    });
                }

                @Override
                public void onError(String errorMessage) {
                    binding.importProgressBar.setVisibility(View.GONE);
                    binding.btnExecuteImport.setEnabled(true);
                    Toast.makeText(requireContext(), errorMessage, Toast.LENGTH_SHORT).show();
                }
            });

        } catch (Exception e) {
            binding.importProgressBar.setVisibility(View.GONE);
            binding.btnExecuteImport.setEnabled(true);
            Toast.makeText(requireContext(), "Parsing error: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getDialog() != null && getDialog().getWindow() != null) {
            getDialog().getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }
    }
}
