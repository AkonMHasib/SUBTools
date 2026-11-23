package com.akon.subtools.coordinator.ui.routine;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.databinding.ItemRoutineBinding;

import java.util.ArrayList;
import java.util.List;

public class RoutineAdapter extends RecyclerView.Adapter<RoutineAdapter.RoutineViewHolder> {

    public interface RoutineActionListener {
        void onItemClick(ClassRoutine item);
        void onItemLongClick(ClassRoutine item);
        void onEditClick(ClassRoutine item);
        void onDuplicateClick(ClassRoutine item);
        void onDeleteClick(ClassRoutine item);
        void onRescheduleClick(ClassRoutine item);
    }

    private List<ClassRoutine> items = new ArrayList<>();
    private boolean isMultiSelectMode = false;
    private final RoutineActionListener listener;

    public RoutineAdapter(RoutineActionListener listener) {
        this.listener = listener;
    }

    public void setItems(List<ClassRoutine> newItems, boolean multiSelectMode) {
        this.items = newItems != null ? newItems : new ArrayList<>();
        this.isMultiSelectMode = multiSelectMode;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public RoutineViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemRoutineBinding binding = ItemRoutineBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new RoutineViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull RoutineViewHolder holder, int position) {
        holder.bind(items.get(position), isMultiSelectMode, listener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class RoutineViewHolder extends RecyclerView.ViewHolder {
        private final ItemRoutineBinding binding;

        public RoutineViewHolder(ItemRoutineBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(ClassRoutine item, boolean isMultiSelectMode, RoutineActionListener listener) {
            // Course code
            binding.tvCode.setText(item.getCode() != null ? item.getCode() : "");

            // Subject
            binding.tvSubject.setText(item.getSubject() != null ? item.getSubject() : "");

            // Day (separate from time)
            String day = item.getDay() != null ? item.getDay() : "";
            binding.tvDayTime.setText(day);

            // Time on its own row
            binding.tvTime.setText(item.getTimeSlot());

            // Tower (full name via model helper)
            binding.tvTower.setText(item.getFormattedTower());

            // Room
            String room = item.getClassroom() != null && !item.getClassroom().isEmpty()
                    ? "Room: " + item.getClassroom()
                    : "Room: N/A";
            binding.tvRoom.setText(room);

            // Teachers
            binding.tvTeachers.setText("Teachers: " + item.getFormattedTeachers());

            // Pill badge type — color-coded
            boolean isTemporary = item.isTemporary();
            binding.chipType.setText(isTemporary ? "⚡ Temporary Shift" : "✓ Regular");
            if (isTemporary) {
                binding.chipType.setBackgroundResource(com.akon.subtools.coordinator.R.drawable.bg_priority_badge);
                binding.chipType.setTextColor(android.graphics.Color.parseColor("#D97706"));
            } else {
                binding.chipType.setBackgroundResource(com.akon.subtools.coordinator.R.drawable.bg_status_live);
                binding.chipType.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
            }

            // Checkbox for multi-select
            binding.cbSelect.setVisibility(isMultiSelectMode ? View.VISIBLE : View.GONE);
            binding.cbSelect.setChecked(item.isSelected());

            // Card click
            binding.cardRoutineItem.setOnClickListener(v -> listener.onItemClick(item));
            binding.cardRoutineItem.setOnLongClickListener(v -> {
                listener.onItemLongClick(item);
                return true;
            });

            // Action buttons
            binding.btnEdit.setOnClickListener(v -> listener.onEditClick(item));
            binding.btnDuplicate.setOnClickListener(v -> listener.onDuplicateClick(item));
            binding.btnDelete.setOnClickListener(v -> listener.onDeleteClick(item));
            binding.btnReschedule.setOnClickListener(v -> listener.onRescheduleClick(item));
        }
    }
}
