package com.akon.subtools.coordinator.ui.dashboard;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.databinding.ItemTodayTimelineClassBinding;

import java.util.ArrayList;
import java.util.List;

public class TodayClassesAdapter extends RecyclerView.Adapter<TodayClassesAdapter.TimelineViewHolder> {

    private List<ClassRoutine> items = new ArrayList<>();

    public void setItems(List<ClassRoutine> newItems) {
        this.items = newItems != null ? newItems : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public TimelineViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemTodayTimelineClassBinding binding = ItemTodayTimelineClassBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new TimelineViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull TimelineViewHolder holder, int position) {
        boolean isLast = position == getItemCount() - 1;
        holder.bind(items.get(position), isLast);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class TimelineViewHolder extends RecyclerView.ViewHolder {
        private final ItemTodayTimelineClassBinding binding;

        public TimelineViewHolder(ItemTodayTimelineClassBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(ClassRoutine item, boolean isLast) {
            binding.timelineLine.setVisibility(isLast ? View.INVISIBLE : View.VISIBLE);

            String timeDisplay = item.getStartTime() != null && !item.getStartTime().isEmpty()
                    ? item.getStartTime() : "TBA";
            binding.tvTimelineTime.setText(timeDisplay);

            binding.tvCourseCode.setText(item.getCode() != null ? item.getCode() : "N/A");
            binding.tvSubjectTitle.setText(item.getSubject() != null ? item.getSubject() : "Course Subject");

            String roomInfo = "Room " + (item.getClassroom() != null ? item.getClassroom() : "TBA") +
                    " • " + item.getFormattedTower();
            binding.tvRoomTower.setText(roomInfo);
            String teachers = item.getFormattedTeachers();
            if (teachers != null && !teachers.isEmpty() && !teachers.toLowerCase().startsWith("faculty") && !teachers.toLowerCase().startsWith("teacher")) {
                teachers = "Faculty: " + teachers;
            }
            binding.tvTeacherName.setText(teachers != null && !teachers.isEmpty() ? teachers : "Faculty: TBA");

            // Status Badge
            if (item.isTemporary()) {
                binding.tvLiveStatus.setText("RESCHEDULED");
                binding.tvLiveStatus.setBackgroundColor(Color.parseColor("#F59E0B"));
            } else {
                binding.tvLiveStatus.setText("SCHEDULED");
                binding.tvLiveStatus.setBackgroundColor(Color.parseColor("#10B981"));
            }
        }
    }
}
