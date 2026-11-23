package com.akon.subtools.coordinator.ui.routine;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.akon.subtools.coordinator.databinding.DialogImportErrorsBinding;
import com.akon.subtools.coordinator.utils.RoutineImportEngine;

import java.util.List;

public class ImportErrorsDialogFragment extends DialogFragment {

    private DialogImportErrorsBinding binding;
    private List<RoutineImportEngine.ImportError> errors;

    public static ImportErrorsDialogFragment newInstance(List<RoutineImportEngine.ImportError> errors) {
        ImportErrorsDialogFragment fragment = new ImportErrorsDialogFragment();
        fragment.errors = errors;
        return fragment;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = DialogImportErrorsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        StringBuilder sb = new StringBuilder();
        if (errors != null) {
            for (RoutineImportEngine.ImportError err : errors) {
                sb.append("• ").append(err.getFormattedError()).append("\n\n");
            }
        }

        binding.tvErrorDetails.setText(sb.toString());
        binding.btnCloseErrors.setOnClickListener(v -> dismiss());
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getDialog() != null && getDialog().getWindow() != null) {
            getDialog().getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }
    }
}
