package com.akon.subtools.coordinator.ui.notices;

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
import com.akon.subtools.coordinator.data.model.Notice;
import com.akon.subtools.coordinator.data.repository.NoticeRepository;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.databinding.DialogEditNoticeBinding;
import com.akon.subtools.coordinator.utils.DepartmentUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class EditNoticeDialogFragment extends DialogFragment {

    public interface NoticeSaveListener {
        void onNoticeSaved();
    }

    private DialogEditNoticeBinding binding;
    private Notice notice;
    private NoticeSaveListener listener;

    private static final List<String> PRIORITIES = Arrays.asList("Normal", "High", "Critical");

    public static EditNoticeDialogFragment newInstance(Notice notice, NoticeSaveListener listener) {
        EditNoticeDialogFragment fragment = new EditNoticeDialogFragment();
        fragment.notice = notice;
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
        binding = DialogEditNoticeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        setupSpinners();

        SessionManager sessionManager = new SessionManager(requireContext());
        List<String> depts = new ArrayList<>();
        depts.add("All Departments");
        String myDept = DepartmentUtils.getDepartmentFullName(sessionManager.getDepartment());
        if (myDept != null && !myDept.trim().isEmpty() 
                && !"All Departments".equalsIgnoreCase(myDept.trim()) 
                && !"All".equalsIgnoreCase(myDept.trim())
                && !depts.contains(myDept.trim())) {
            depts.add(myDept.trim());
        }

        if (notice != null) {
            binding.etNoticeTitle.setText(notice.getTitle());
            binding.etNoticeContent.setText(notice.getDescription());
            binding.etAttachmentUrl.setText(notice.getAttachmentUrl());

            int prioIdx = PRIORITIES.indexOf(notice.getPriority());
            if (prioIdx >= 0) binding.spinnerPriority.setSelection(prioIdx);

            String currNoticeDept = notice.getDepartment();
            int deptIdx = 0;
            if (currNoticeDept != null && !currNoticeDept.equalsIgnoreCase("All") && !currNoticeDept.equalsIgnoreCase("All Departments")) {
                String full = DepartmentUtils.getDepartmentFullName(currNoticeDept);
                int found = depts.indexOf(full);
                if (found >= 0) deptIdx = found;
            }
            binding.spinnerTargetDept.setSelection(deptIdx);
        }

        binding.btnCancel.setOnClickListener(v -> dismiss());
        binding.btnSave.setOnClickListener(v -> saveNotice());
    }

    private void setupSpinners() {
        ArrayAdapter<String> prioAdapter = new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_item, PRIORITIES);
        prioAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerPriority.setAdapter(prioAdapter);

        SessionManager sessionManager = new SessionManager(requireContext());
        List<String> depts = new ArrayList<>();
        depts.add("All Departments");
        String myDept = DepartmentUtils.getDepartmentFullName(sessionManager.getDepartment());
        if (myDept != null && !myDept.trim().isEmpty() 
                && !"All Departments".equalsIgnoreCase(myDept.trim()) 
                && !"All".equalsIgnoreCase(myDept.trim())
                && !depts.contains(myDept.trim())) {
            depts.add(myDept.trim());
        }

        ArrayAdapter<String> deptAdapter = new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_item, depts);
        deptAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerTargetDept.setAdapter(deptAdapter);
        binding.spinnerTargetDept.setEnabled(depts.size() > 1);
    }

    private void saveNotice() {
        String title = binding.etNoticeTitle.getText() != null ? binding.etNoticeTitle.getText().toString().trim() : "";
        String content = binding.etNoticeContent.getText() != null ? binding.etNoticeContent.getText().toString().trim() : "";
        String attachment = binding.etAttachmentUrl.getText() != null ? binding.etAttachmentUrl.getText().toString().trim() : "";
        String priority = (String) binding.spinnerPriority.getSelectedItem();
        String rawDept = (String) binding.spinnerTargetDept.getSelectedItem();
        String dept = "All Departments".equalsIgnoreCase(rawDept) || "All".equalsIgnoreCase(rawDept) ? "All" : DepartmentUtils.getDepartmentCode(rawDept);

        if (title.length() < 5) {
            binding.etNoticeTitle.setError("Title must be at least 5 characters");
            return;
        }
        if (content.length() < 10) {
            binding.etNoticeContent.setError("Content must be at least 10 characters");
            return;
        }

        notice.setTitle(title);
        notice.setDescription(content);
        notice.setContent(content);
        notice.setAttachmentUrl(attachment);
        notice.setPriority(priority);
        notice.setDepartment(dept);
        notice.setTargetDept(dept);

        NoticeRepository repo = new NoticeRepository();
        repo.updateNotice(notice, new NoticeRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), "Notice updated successfully!", Toast.LENGTH_SHORT).show();
                    if (listener != null) listener.onNoticeSaved();
                    dismissAllowingStateLoss();
                }
            }

            @Override
            public void onError(String errorMessage) {
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), "Error updating notice: " + errorMessage, Toast.LENGTH_SHORT).show();
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
