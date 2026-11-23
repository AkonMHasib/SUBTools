package com.akon.subtools.coordinator.ui.students;

import android.view.LayoutInflater;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.databinding.ItemStudentBinding;

import java.util.ArrayList;
import java.util.List;

public class StudentAdapter extends RecyclerView.Adapter<StudentAdapter.StudentViewHolder> {

    public interface StudentActionListener {
        void onViewDetail(User student);
    }

    private List<User> items = new ArrayList<>();
    private final StudentActionListener listener;

    public StudentAdapter(StudentActionListener listener) {
        this.listener = listener;
    }

    public void setItems(List<User> newItems) {
        this.items = newItems != null ? newItems : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public StudentViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemStudentBinding binding = ItemStudentBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new StudentViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull StudentViewHolder holder, int position) {
        holder.bind(items.get(position), listener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class StudentViewHolder extends RecyclerView.ViewHolder {
        private final ItemStudentBinding binding;

        public StudentViewHolder(ItemStudentBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(User student, StudentActionListener listener) {
            binding.tvStudentName.setText(student.getName());
            binding.tvStudentId.setText("ID: " + (student.getStudentId() != null ? student.getStudentId() : "N/A"));
            String term = student.getAcademicLevel() != null && !student.getAcademicLevel().trim().isEmpty() 
                    ? " • " + student.getAcademicLevel() 
                    : "";
            binding.tvBatch.setText("Batch " + (student.getBatch() != null ? student.getBatch() : "N/A") + term);
            binding.chipBloodGroup.setText(student.getBloodGroup() != null && !student.getBloodGroup().isEmpty() ? student.getBloodGroup() : "N/A");
            binding.tvLocation.setText("Location: " + (student.getLocation() != null ? student.getLocation() : "N/A"));

            binding.btnViewStudentDetail.setOnClickListener(v -> listener.onViewDetail(student));
        }
    }
}
