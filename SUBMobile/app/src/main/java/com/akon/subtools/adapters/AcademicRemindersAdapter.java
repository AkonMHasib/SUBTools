package com.akon.subtools.adapters;

import android.graphics.Paint;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.R;
import com.akon.subtools.models.AcademicReminder;

import java.util.ArrayList;
import java.util.List;

public class AcademicRemindersAdapter extends RecyclerView.Adapter<AcademicRemindersAdapter.ViewHolder> {

    public interface ReminderActionListener {
        void onToggleCompleted(AcademicReminder reminder, boolean isDone);
        void onDelete(AcademicReminder reminder);
    }

    private final List<AcademicReminder> reminderList = new ArrayList<>();
    private final ReminderActionListener listener;

    public AcademicRemindersAdapter(ReminderActionListener listener) {
        this.listener = listener;
    }

    public void setReminders(List<AcademicReminder> list) {
        reminderList.clear();
        if (list != null) {
            reminderList.addAll(list);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_academic_reminder, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        AcademicReminder item = reminderList.get(position);

        holder.txtCourse.setText(item.getCourseCode());
        holder.txtTitle.setText(item.getTitle());
        holder.badgeType.setText(item.getType());
        holder.txtDue.setText("⏰ Due: " + item.getDueDate() + " " + item.getDueTime());

        holder.checkDone.setOnCheckedChangeListener(null);
        holder.checkDone.setChecked(item.isCompleted());

        if (item.isCompleted()) {
            holder.txtTitle.setPaintFlags(holder.txtTitle.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
            holder.txtTitle.setAlpha(0.6f);
        } else {
            holder.txtTitle.setPaintFlags(holder.txtTitle.getPaintFlags() & (~Paint.STRIKE_THRU_TEXT_FLAG));
            holder.txtTitle.setAlpha(1.0f);
        }

        holder.checkDone.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (listener != null) {
                listener.onToggleCompleted(item, isChecked);
            }
        });

        holder.btnDelete.setOnClickListener(v -> {
            if (listener != null) {
                listener.onDelete(item);
            }
        });
    }

    @Override
    public int getItemCount() {
        return reminderList.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView badgeType, txtCourse, txtTitle, txtDue;
        CheckBox checkDone;
        ImageView btnDelete;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            badgeType = itemView.findViewById(R.id.badge_reminder_type);
            txtCourse = itemView.findViewById(R.id.txt_reminder_course);
            txtTitle = itemView.findViewById(R.id.txt_reminder_title);
            txtDue = itemView.findViewById(R.id.txt_reminder_due);
            checkDone = itemView.findViewById(R.id.check_reminder_done);
            btnDelete = itemView.findViewById(R.id.btn_delete_reminder);
        }
    }
}
