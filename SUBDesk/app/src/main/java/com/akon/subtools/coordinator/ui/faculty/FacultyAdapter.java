package com.akon.subtools.coordinator.ui.faculty;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.coordinator.data.model.Faculty;
import com.akon.subtools.coordinator.databinding.ItemFacultyBinding;

import java.util.ArrayList;
import java.util.List;

public class FacultyAdapter extends RecyclerView.Adapter<FacultyAdapter.FacultyViewHolder> {

    public interface FacultyActionListener {
        void onCallFaculty(Faculty faculty);
        void onEmailFaculty(Faculty faculty);
        void onEditFaculty(Faculty faculty);
        void onDeleteFaculty(Faculty faculty);
    }

    private List<Faculty> items = new ArrayList<>();
    private final FacultyActionListener listener;
    private boolean canManage = true;

    public FacultyAdapter(FacultyActionListener listener) {
        this.listener = listener;
    }

    public void setCanManage(boolean canManage) {
        this.canManage = canManage;
        notifyDataSetChanged();
    }

    public void setItems(List<Faculty> newItems) {
        this.items = newItems != null ? newItems : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public FacultyViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemFacultyBinding binding = ItemFacultyBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new FacultyViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull FacultyViewHolder holder, int position) {
        holder.bind(items.get(position), listener, canManage);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class FacultyViewHolder extends RecyclerView.ViewHolder {
        private final ItemFacultyBinding binding;

        public FacultyViewHolder(ItemFacultyBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(Faculty faculty, FacultyActionListener listener, boolean canManage) {
            binding.tvFacultyName.setText(faculty.getName() != null ? faculty.getName() : "Faculty Member");
            String fullDept = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentFullName(faculty.getDepartment());
            binding.chipFacultyRank.setText(fullDept);
            binding.tvFacultyDesignation.setText(faculty.getDesignation() != null && !faculty.getDesignation().isEmpty() ? faculty.getDesignation() : "Lecturer");
            if (faculty.getRoomNo() != null && !faculty.getRoomNo().trim().isEmpty() && !faculty.getRoomNo().equalsIgnoreCase("N/A")) {
                binding.tvFacultyRoom.setVisibility(View.VISIBLE);
                binding.tvFacultyRoom.setText("Room: " + faculty.getRoomNo());
            } else {
                binding.tvFacultyRoom.setVisibility(View.GONE);
            }
            binding.tvFacultyEmail.setText("Email: " + (faculty.getEmail() != null && !faculty.getEmail().isEmpty() ? faculty.getEmail() : "N/A"));

            // Check phone number: if missing or empty, keep blank & hide Call button
            String phone = faculty.getPhone();
            if (phone != null && !phone.trim().isEmpty() && !phone.equalsIgnoreCase("N/A")) {
                binding.btnCallFaculty.setVisibility(View.VISIBLE);
                binding.btnCallFaculty.setOnClickListener(v -> listener.onCallFaculty(faculty));
            } else {
                binding.btnCallFaculty.setVisibility(View.GONE);
            }

            if (faculty.getEmail() != null && !faculty.getEmail().trim().isEmpty()) {
                binding.btnEmailFaculty.setVisibility(View.VISIBLE);
                binding.btnEmailFaculty.setOnClickListener(v -> listener.onEmailFaculty(faculty));
            } else {
                binding.btnEmailFaculty.setVisibility(View.GONE);
            }

            if (canManage) {
                binding.btnEditFaculty.setVisibility(View.VISIBLE);
                binding.btnEditFaculty.setOnClickListener(v -> listener.onEditFaculty(faculty));

                binding.btnDeleteFaculty.setVisibility(View.VISIBLE);
                binding.btnDeleteFaculty.setOnClickListener(v -> listener.onDeleteFaculty(faculty));
            } else {
                binding.btnEditFaculty.setVisibility(View.GONE);
                binding.btnDeleteFaculty.setVisibility(View.GONE);
            }
        }
    }
}
