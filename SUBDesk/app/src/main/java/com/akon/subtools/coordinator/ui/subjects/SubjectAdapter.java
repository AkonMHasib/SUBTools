package com.akon.subtools.coordinator.ui.subjects;

import android.view.LayoutInflater;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.coordinator.data.model.Subject;
import com.akon.subtools.coordinator.databinding.ItemSubjectBinding;

import java.util.ArrayList;
import java.util.List;

public class SubjectAdapter extends RecyclerView.Adapter<SubjectAdapter.SubjectViewHolder> {

    public interface SubjectActionListener {
        void onEditSubject(Subject subject);
        void onDeleteSubject(Subject subject);
    }

    private List<Subject> items = new ArrayList<>();
    private final SubjectActionListener listener;

    public SubjectAdapter(SubjectActionListener listener) {
        this.listener = listener;
    }

    public void setItems(List<Subject> newItems) {
        this.items = newItems != null ? newItems : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public SubjectViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemSubjectBinding binding = ItemSubjectBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new SubjectViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull SubjectViewHolder holder, int position) {
        holder.bind(items.get(position), listener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class SubjectViewHolder extends RecyclerView.ViewHolder {
        private final ItemSubjectBinding binding;

        public SubjectViewHolder(ItemSubjectBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(Subject subject, SubjectActionListener listener) {
            binding.tvSubjectCode.setText(subject.getCode() != null ? subject.getCode() : "N/A");
            binding.tvSubjectName.setText(subject.getName() != null ? subject.getName() : "Course Subject");
            binding.tvSubjectDept.setText("Dept: " + (subject.getDepartment() != null ? com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentFullName(subject.getDepartment()) : "N/A"));
            binding.tvSubjectCredit.setText("Credit: " + (subject.getCredit() != null ? subject.getCredit() : "3.0"));
            binding.tvSubjectType.setText(subject.getType() != null ? subject.getType() : "Theory");

            binding.btnEditSubject.setOnClickListener(v -> listener.onEditSubject(subject));
            binding.btnDeleteSubject.setOnClickListener(v -> listener.onDeleteSubject(subject));
        }
    }
}
