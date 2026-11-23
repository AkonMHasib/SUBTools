package com.akon.subtools.adapters;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.R;
import com.akon.subtools.databinding.ItemSubjectBinding;
import com.akon.subtools.models.Subject;

import java.util.List;

public class SubjectAdapter extends RecyclerView.Adapter<SubjectAdapter.NormalViewHolder> {
    private final List<Subject> list;
    private final List<String> enrolledCodes;
    private final List<String> completedCodes;
    private final OnSubjectClickListener listener;

    public interface OnSubjectClickListener {
        void onAddClick(Subject subject);
        void onRemoveClick(Subject subject);
        void onToggleCompletedClick(Subject subject);
    }

    public SubjectAdapter(List<Subject> list, List<String> enrolledCodes, List<String> completedCodes, OnSubjectClickListener listener) {
        this.list = list;
        this.enrolledCodes = enrolledCodes;
        this.completedCodes = completedCodes;
        this.listener = listener;
    }

    public void setIsLoading(boolean isLoading) {
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public NormalViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemSubjectBinding binding = ItemSubjectBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new NormalViewHolder(binding);
    }

    private boolean isEnrolled(String code) {
        if (code == null || enrolledCodes == null) return false;
        for (String e : enrolledCodes) {
            if (e != null && com.akon.subtools.utils.AcademicHelper.isSameSubjectCode(code, e)) {
                return true;
            }
        }
        return false;
    }

    private boolean isCompleted(String code) {
        if (code == null || completedCodes == null) return false;
        for (String c : completedCodes) {
            if (c != null && com.akon.subtools.utils.AcademicHelper.isSameSubjectCode(code, c)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public void onBindViewHolder(@NonNull NormalViewHolder holder, int position) {
        Subject s = list.get(position);
        boolean isEnrolled = isEnrolled(s.getCode());
        boolean isCompleted = isCompleted(s.getCode());

        if (isCompleted) {
            holder.binding.textSubjectCode.setText(s.getCode() + " • COMPLETED ✓");
            holder.binding.textSubjectCode.setTextColor(ContextCompat.getColor(holder.itemView.getContext(), R.color.text_secondary_light));
        } else {
            holder.binding.textSubjectCode.setText(s.getCode());
            holder.binding.textSubjectCode.setTextColor(ContextCompat.getColor(holder.itemView.getContext(), R.color.primary));
        }

        holder.binding.textSubjectName.setText(s.getName());
        holder.binding.textCredit.setText(s.getCredit() + " Credits");
        holder.binding.textTerm.setText(s.getTerm());

        if (isCompleted) {
            holder.binding.btnAction.setText("Unmark");
            holder.binding.btnAction.setTextColor(ContextCompat.getColor(holder.itemView.getContext(), R.color.text_secondary_light));
            holder.binding.btnAction.setOnClickListener(v -> listener.onToggleCompletedClick(s));
        } else if (isEnrolled) {
            holder.binding.btnAction.setText("Remove");
            holder.binding.btnAction.setTextColor(ContextCompat.getColor(holder.itemView.getContext(), R.color.priority_critical));
            holder.binding.btnAction.setOnClickListener(v -> listener.onRemoveClick(s));
        } else {
            holder.binding.btnAction.setText("Add");
            holder.binding.btnAction.setTextColor(ContextCompat.getColor(holder.itemView.getContext(), R.color.primary));
            holder.binding.btnAction.setOnClickListener(v -> listener.onAddClick(s));
        }

        holder.itemView.setOnClickListener(v -> showSubjectDetailDialog(holder.itemView.getContext(), s, isEnrolled, isCompleted));
    }

    private void showSubjectDetailDialog(android.content.Context context, Subject subject, boolean isEnrolled, boolean isCompleted) {
        String dept = (subject.getDepartment() != null && !subject.getDepartment().trim().isEmpty())
                ? subject.getDepartment() : "General / All Departments";
        String status = isCompleted ? "Completed (Passed)" : (isEnrolled ? "Enrolled (Current Term)" : "Available");

        new com.google.android.material.dialog.MaterialAlertDialogBuilder(context, com.google.android.material.R.style.ThemeOverlay_MaterialComponents_Dialog_Alert)
                .setTitle(subject.getCode() + " • " + subject.getName())
                .setMessage("📚 Course Code: " + subject.getCode() + "\n" +
                            "📖 Course Title: " + subject.getName() + "\n" +
                            "⚡ Credit Load: " + subject.getCredit() + " Credits\n" +
                            "📅 Academic Term: " + (subject.getTerm() != null ? subject.getTerm() : "N/A") + "\n" +
                            "🏢 Department: " + dept + "\n" +
                            "📌 Academic Status: " + status)
                .setNeutralButton("Close", null)
                .setNegativeButton(isCompleted ? "Unmark Completed" : "Mark as Completed", (dialog, which) -> {
                    listener.onToggleCompletedClick(subject);
                })
                .setPositiveButton(isEnrolled ? "Remove from Semester" : "Enroll in Semester", (dialog, which) -> {
                    if (isEnrolled) {
                        listener.onRemoveClick(subject);
                    } else {
                        listener.onAddClick(subject);
                    }
                })
                .show();
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class NormalViewHolder extends RecyclerView.ViewHolder {
        final ItemSubjectBinding binding;
        public NormalViewHolder(ItemSubjectBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
