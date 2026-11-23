package com.akon.subtools.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.R;
import com.akon.subtools.models.ExamRoutine;

import java.util.ArrayList;
import java.util.List;

public class ExamRoutineAdapter extends RecyclerView.Adapter<ExamRoutineAdapter.ViewHolder> {

    private final List<ExamRoutine> examList = new ArrayList<>();

    public void setExams(List<ExamRoutine> list) {
        examList.clear();
        if (list != null) {
            examList.addAll(list);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_exam_routine, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        ExamRoutine exam = examList.get(position);
        holder.txtCourseCode.setText(exam.getCourseCode());
        holder.txtCourseTitle.setText(exam.getCourseTitle());
        holder.badgeExamType.setText(exam.getExamType());
        holder.txtDate.setText("📅 " + exam.getExamDate());
        holder.txtTime.setText("⏰ " + exam.getExamTime());
        holder.txtRoom.setText("Room " + exam.getRoom());

        if (exam.getInvigilator() != null && !exam.getInvigilator().trim().isEmpty()) {
            holder.txtInvigilator.setVisibility(View.VISIBLE);
            holder.txtInvigilator.setText("Invigilator: " + exam.getInvigilator());
        } else {
            holder.txtInvigilator.setVisibility(View.GONE);
        }
    }

    @Override
    public int getItemCount() {
        return examList.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView txtCourseCode, txtCourseTitle, badgeExamType, txtDate, txtTime, txtRoom, txtInvigilator;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            txtCourseCode = itemView.findViewById(R.id.txt_exam_course_code);
            txtCourseTitle = itemView.findViewById(R.id.txt_exam_course_title);
            badgeExamType = itemView.findViewById(R.id.badge_exam_type);
            txtDate = itemView.findViewById(R.id.txt_exam_date);
            txtTime = itemView.findViewById(R.id.txt_exam_time);
            txtRoom = itemView.findViewById(R.id.txt_exam_room);
            txtInvigilator = itemView.findViewById(R.id.txt_exam_invigilator);
        }
    }
}
