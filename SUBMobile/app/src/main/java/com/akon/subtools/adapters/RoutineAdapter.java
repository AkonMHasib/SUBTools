package com.akon.subtools.adapters;

import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.databinding.ItemRoutineBinding;
import com.akon.subtools.models.Routine;

import java.util.List;

public class RoutineAdapter extends RecyclerView.Adapter<RoutineAdapter.NormalViewHolder> {

    private final List<Routine> list;
    private boolean showDayBadge = false;
    private boolean hideTimeline = false;

    public RoutineAdapter(List<Routine> list) {
        this.list = list;
    }

    public RoutineAdapter(List<Routine> list, boolean hideTimeline) {
        this.list = list;
        this.hideTimeline = hideTimeline;
    }

    public void setShowDayBadge(boolean show) {
        this.showDayBadge = show;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public NormalViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemRoutineBinding binding = ItemRoutineBinding.inflate(
                LayoutInflater.from(parent.getContext()),
                parent,
                false
        );
        return new NormalViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull NormalViewHolder holder, int position) {

        Routine r = list.get(position);

        holder.binding.textSubjectCode.setText(r.getCode());
        holder.binding.textSubjectName.setText(r.getSubject());

        String startTime = formatTo12Hour(r.getStartTime());
        String endTime = formatTo12Hour(r.getEndTime());
        holder.binding.textClassTime.setText(startTime + " - " + endTime);

        holder.binding.textClassroom.setText(r.getFormattedLocation());

        // Day badge
        if (showDayBadge && r.getDay() != null && !r.getDay().trim().isEmpty()) {
            holder.binding.textDayBadge.setText(r.getDay());
            holder.binding.textDayBadge.setVisibility(View.VISIBLE);
        } else {
            holder.binding.textDayBadge.setVisibility(View.GONE);
        }

        // Teachers
        if (r.getTeachers() != null && !r.getTeachers().isEmpty()) {
            holder.binding.textTeacher.setText(
                    TextUtils.join(", ", r.getTeachers())
            );
            holder.binding.textTeacher.setVisibility(View.VISIBLE);
        } else {
            holder.binding.textTeacher.setText("");
            holder.binding.textTeacher.setVisibility(View.GONE);
        }

        // Note & Reschedule info
        StringBuilder noteBuilder = new StringBuilder();
        if (r.isTemporary() && r.getDate() != null && !r.getDate().trim().isEmpty()) {
            noteBuilder.append("[Rescheduled: ").append(r.getDate().trim()).append("] ");
        }
        if (r.getRescheduleNote() != null && !r.getRescheduleNote().trim().isEmpty()) {
            noteBuilder.append(r.getRescheduleNote().trim());
        } else if (r.getNote() != null && !r.getNote().trim().isEmpty()) {
            noteBuilder.append(r.getNote().trim());
        }

        String noteText = noteBuilder.toString().trim();
        if (!noteText.isEmpty()) {
            holder.binding.textRoutineNote.setText("Note: " + noteText);
            holder.binding.textRoutineNote.setVisibility(View.VISIBLE);
        } else {
            holder.binding.textRoutineNote.setVisibility(View.GONE);
        }

        // Class Status Highlighting & Dimming (UX-003)
        java.util.Calendar now = java.util.Calendar.getInstance();
        int currentDayOfWeek = now.get(java.util.Calendar.DAY_OF_WEEK);
        String[] daysMap = {"", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
        String todayName = daysMap[currentDayOfWeek];

        boolean isToday = com.akon.subtools.utils.AcademicHelper.isSameDay(todayName, r.getDay());
        if (isToday) {
            int currentMinutes = now.get(java.util.Calendar.HOUR_OF_DAY) * 60 + now.get(java.util.Calendar.MINUTE);
            int startMins = com.akon.subtools.utils.AcademicHelper.parseTimeToMinutes(r.getStartTime());
            int endMins = com.akon.subtools.utils.AcademicHelper.parseTimeToMinutes(r.getEndTime());

            if (currentMinutes >= startMins && currentMinutes <= endMins) {
                // Ongoing class: highlight with high-contrast active emerald styling
                holder.binding.cardRoutine.setBackgroundResource(com.akon.subtools.R.drawable.bg_routine_active);
                holder.binding.cardRoutine.setAlpha(1.0f);
                holder.binding.textDayBadge.setText("● IN SESSION");
                holder.binding.textDayBadge.setBackgroundResource(com.akon.subtools.R.drawable.bg_badge_emerald);
                holder.binding.textDayBadge.setTextColor(androidx.core.content.ContextCompat.getColor(holder.itemView.getContext(), com.akon.subtools.R.color.routine_active_badge_text));
                holder.binding.textDayBadge.setVisibility(android.view.View.VISIBLE);
                holder.binding.textClassTime.setTextColor(androidx.core.content.ContextCompat.getColor(holder.itemView.getContext(), com.akon.subtools.R.color.routine_active_time_text));
                holder.binding.textSubjectCode.setTextColor(androidx.core.content.ContextCompat.getColor(holder.itemView.getContext(), com.akon.subtools.R.color.routine_active_code_text));
            } else if (currentMinutes > endMins) {
                // Completed class: dim card
                holder.binding.cardRoutine.setBackgroundResource(com.akon.subtools.R.drawable.bg_card_shadow);
                holder.binding.cardRoutine.setAlpha(0.55f);
                resetNormalRoutineStyling(holder, r);
            } else {
                // Upcoming class today
                holder.binding.cardRoutine.setBackgroundResource(com.akon.subtools.R.drawable.bg_card_shadow);
                holder.binding.cardRoutine.setAlpha(1.0f);
                resetNormalRoutineStyling(holder, r);
            }
        } else {
            holder.binding.cardRoutine.setBackgroundResource(com.akon.subtools.R.drawable.bg_card_shadow);
            holder.binding.cardRoutine.setAlpha(1.0f);
            resetNormalRoutineStyling(holder, r);
        }

        // Timeline
        if (hideTimeline) {
            holder.binding.layoutTimeline.setVisibility(View.GONE);
        } else {
            holder.binding.layoutTimeline.setVisibility(View.VISIBLE);

            holder.binding.timelineLineTop.setVisibility(
                    position == 0 ? View.INVISIBLE : View.VISIBLE
            );

            holder.binding.timelineLineBottom.setVisibility(
                    position == getItemCount() - 1
                            ? View.INVISIBLE
                            : View.VISIBLE
            );
        }
    }

    private void resetNormalRoutineStyling(NormalViewHolder holder, Routine r) {
        if (showDayBadge && r.getDay() != null && !r.getDay().trim().isEmpty()) {
            holder.binding.textDayBadge.setText(r.getDay());
            holder.binding.textDayBadge.setBackgroundResource(com.akon.subtools.R.drawable.bg_priority_badge);
            holder.binding.textDayBadge.setTextColor(androidx.core.content.ContextCompat.getColor(holder.itemView.getContext(), com.akon.subtools.R.color.text_primary));
            holder.binding.textDayBadge.setVisibility(View.VISIBLE);
        } else {
            holder.binding.textDayBadge.setVisibility(View.GONE);
        }
        holder.binding.textClassTime.setTextColor(androidx.core.content.ContextCompat.getColor(holder.itemView.getContext(), com.akon.subtools.R.color.text_secondary_light));
        holder.binding.textSubjectCode.setTextColor(androidx.core.content.ContextCompat.getColor(holder.itemView.getContext(), com.akon.subtools.R.color.primary));
    }

    public String formatTo12Hour(String timeStr) {

        if (timeStr == null || timeStr.trim().isEmpty()) {
            return "";
        }

        try {

            if (timeStr.toLowerCase().contains("am") ||
                    timeStr.toLowerCase().contains("pm")) {
                return timeStr.trim();
            }

            String[] parts = timeStr.trim().split(":");

            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);

            String suffix = "AM";

            if (hour >= 12) {
                suffix = "PM";
                if (hour > 12) {
                    hour -= 12;
                }
            }

            if (hour == 0) {
                hour = 12;
            }

            return String.format("%02d:%02d %s", hour, minute, suffix);

        } catch (Exception e) {
            return timeStr;
        }
    }

    @Override
    public int getItemCount() {
        return list == null ? 0 : list.size();
    }

    public static class NormalViewHolder extends RecyclerView.ViewHolder {

        final ItemRoutineBinding binding;

        public NormalViewHolder(ItemRoutineBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}