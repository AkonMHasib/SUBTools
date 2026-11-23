package com.akon.subtools.coordinator.ui.students;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.material.bottomsheet.BottomSheetDialogFragment;
import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.databinding.BottomSheetStudentDetailBinding;
import com.akon.subtools.coordinator.utils.DepartmentUtils;

public class StudentDetailBottomSheetDialogFragment extends BottomSheetDialogFragment {

    private BottomSheetStudentDetailBinding binding;
    private User student;
    private OnStudentActionListener actionListener;

    public interface OnStudentActionListener {
        void onEditRequested(User student);
        void onStatusChangeRequested(User student, String newStatus);
        void onVerifyToggleRequested(User student, boolean isVerified);
    }

    public static StudentDetailBottomSheetDialogFragment newInstance(User student, OnStudentActionListener actionListener) {
        StudentDetailBottomSheetDialogFragment fragment = new StudentDetailBottomSheetDialogFragment();
        fragment.student = student;
        fragment.actionListener = actionListener;
        return fragment;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = BottomSheetStudentDetailBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        if (student != null) {
            binding.tvDetailName.setText(student.getName());
            binding.tvDetailId.setText("ID: " + (student.getStudentId() != null ? student.getStudentId() : "N/A"));
            binding.tvDetailEmail.setText("Email: " + (student.getEmail() != null ? student.getEmail() : "N/A"));
            binding.tvDetailPhone.setText("Phone: " + (student.getPhone() != null ? student.getPhone() : "N/A"));

            String academicTerm = student.getAcademicLevel() != null && !student.getAcademicLevel().trim().isEmpty() 
                    ? student.getAcademicLevel() 
                    : (student.getAcademicSystem() != null ? student.getAcademicSystem() : "N/A");
            String sectionStr = student.getSection() != null && !student.getSection().trim().isEmpty() 
                    ? " | Section: " + student.getSection() 
                    : "";

            binding.tvDetailBatchDept.setText("Department: " + DepartmentUtils.getDepartmentFullName(student.getDepartment()) +
                    "\nBatch: " + (student.getBatch() != null ? student.getBatch() : "N/A") +
                    " • Term: " + academicTerm + sectionStr);

            // Strict DD/MM/YYYY DOB Display
            binding.tvDetailDOB.setText("Date of Birth: " + student.getFormattedDOB());
            binding.tvDetailBloodGroup.setText("Blood Group: " + (student.getBloodGroup() != null ? student.getBloodGroup() : "N/A"));
            binding.tvDetailLocation.setText("Location: " + (student.getLocation() != null ? student.getLocation() : "N/A"));

            // Load profile picture
            String photoUrl = student.getPhotoUrl();
            if (photoUrl != null && !photoUrl.trim().isEmpty()) {
                com.bumptech.glide.Glide.with(requireContext())
                        .load(photoUrl.trim())
                        .circleCrop()
                        .placeholder(com.akon.subtools.coordinator.R.drawable.ic_students)
                        .error(com.akon.subtools.coordinator.R.drawable.ic_students)
                        .into(binding.ivStudentPhoto);
            } else {
                binding.ivStudentPhoto.setImageResource(com.akon.subtools.coordinator.R.drawable.ic_students);
            }

            if (student.isAllowBloodDonation()) {
                binding.chipDonorBadge.setVisibility(View.VISIBLE);
            } else {
                binding.chipDonorBadge.setVisibility(View.GONE);
            }

            // User modification is restricted to Super Admin on Web Admin.
            // STC provides strictly read-only student information for coordinators.
            binding.btnToggleBan.setVisibility(View.GONE);
            binding.btnToggleVerify.setVisibility(View.GONE);
            binding.btnEditFromSheet.setVisibility(View.GONE);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
