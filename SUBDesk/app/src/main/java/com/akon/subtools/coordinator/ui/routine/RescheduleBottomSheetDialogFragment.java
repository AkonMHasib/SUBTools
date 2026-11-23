package com.akon.subtools.coordinator.ui.routine;

import android.app.DatePickerDialog;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.material.bottomsheet.BottomSheetDialogFragment;
import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.data.repository.RoutineRepository;
import com.akon.subtools.coordinator.databinding.DialogRescheduleRoutineBinding;
import com.akon.subtools.coordinator.utils.DateUtils;

import java.util.Calendar;

public class RescheduleBottomSheetDialogFragment extends BottomSheetDialogFragment {

    private DialogRescheduleRoutineBinding binding;
    private ClassRoutine targetRoutine;
    private RoutineRepository repository;
    private String selectedDateStr = DateUtils.getCurrentDateString();

    public static RescheduleBottomSheetDialogFragment newInstance(ClassRoutine routine) {
        RescheduleBottomSheetDialogFragment fragment = new RescheduleBottomSheetDialogFragment();
        fragment.targetRoutine = routine;
        return fragment;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = DialogRescheduleRoutineBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        repository = new RoutineRepository();

        if (targetRoutine != null) {
            binding.tvRescheduleRoutineInfo.setText(targetRoutine.getCode() + " - " + targetRoutine.getSubject());
        }

        binding.btnPickRescheduleDate.setText("Date: " + selectedDateStr);
        binding.btnPickRescheduleDate.setOnClickListener(v -> {
            Calendar c = Calendar.getInstance();
            new DatePickerDialog(requireContext(), (view1, year, month, dayOfMonth) -> {
                Calendar chosen = Calendar.getInstance();
                chosen.set(year, month, dayOfMonth);
                selectedDateStr = DateUtils.formatDateToDDMMYYYY(chosen.getTime());
                binding.btnPickRescheduleDate.setText("Date: " + selectedDateStr);
            }, c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show();
        });

        binding.btnCancelReschedule.setOnClickListener(v -> dismiss());
        binding.btnConfirmReschedule.setOnClickListener(v -> executeReschedule());
    }

    private void executeReschedule() {
        if (targetRoutine == null) {
            dismiss();
            return;
        }

        String mode = binding.rbCopy.isChecked() ? "COPY" : "MOVE";
        String note = binding.etRescheduleNote.getText() != null ? binding.etRescheduleNote.getText().toString().trim() : "";

        repository.rescheduleRoutine(targetRoutine, selectedDateStr, mode, note, new RoutineRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), "Reschedule applied (" + mode + ")!", Toast.LENGTH_SHORT).show();
                    dismissAllowingStateLoss();
                }
            }

            @Override
            public void onError(String errorMessage) {
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), errorMessage, Toast.LENGTH_LONG).show();
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
