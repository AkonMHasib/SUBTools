package com.akon.subtools.adapters;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.R;
import com.akon.subtools.models.LectureSlide;

import java.util.ArrayList;
import java.util.List;

public class LectureSlideAdapter extends RecyclerView.Adapter<LectureSlideAdapter.ViewHolder> {

    private final List<LectureSlide> slideList = new ArrayList<>();

    public void setSlides(List<LectureSlide> list) {
        slideList.clear();
        if (list != null) {
            slideList.addAll(list);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_lecture_slide, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        LectureSlide slide = slideList.get(position);

        holder.txtSubjectCode.setText(slide.getSubjectCode());
        holder.txtDept.setText(slide.getDepartment());
        holder.txtTitle.setText(slide.getTitle());

        if (slide.getLectureNumber() != null && !slide.getLectureNumber().trim().isEmpty()) {
            holder.txtLectureNum.setVisibility(View.VISIBLE);
            holder.txtLectureNum.setText(slide.getLectureNumber());
        } else {
            holder.txtLectureNum.setVisibility(View.GONE);
        }

        if (slide.getDescription() != null && !slide.getDescription().trim().isEmpty()) {
            holder.txtDesc.setVisibility(View.VISIBLE);
            holder.txtDesc.setText(slide.getDescription());
        } else {
            holder.txtDesc.setVisibility(View.GONE);
        }

        if (slide.getUploaderName() != null && !slide.getUploaderName().trim().isEmpty()) {
            holder.txtUploader.setText("By " + slide.getUploaderName());
        } else {
            holder.txtUploader.setText("Course Material");
        }

        holder.btnDownload.setOnClickListener(v -> {
            String url = slide.getFileUrl();
            if (url != null && !url.trim().isEmpty()) {
                try {
                    String cleanUrl = url.trim();
                    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
                        cleanUrl = "https://" + cleanUrl;
                    }
                    Context context = v.getContext();
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(cleanUrl));
                    context.startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(v.getContext(), "Unable to open slide link", Toast.LENGTH_SHORT).show();
                }
            } else {
                Toast.makeText(v.getContext(), "Slide download link unavailable", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public int getItemCount() {
        return slideList.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView txtSubjectCode, txtDept, txtTitle, txtLectureNum, txtDesc, txtUploader, btnDownload;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            txtSubjectCode = itemView.findViewById(R.id.txt_slide_subject_code);
            txtDept = itemView.findViewById(R.id.txt_slide_dept);
            txtTitle = itemView.findViewById(R.id.txt_slide_title);
            txtLectureNum = itemView.findViewById(R.id.txt_slide_lecture_num);
            txtDesc = itemView.findViewById(R.id.txt_slide_desc);
            txtUploader = itemView.findViewById(R.id.txt_slide_uploader);
            btnDownload = itemView.findViewById(R.id.btn_download_slide);
        }
    }
}
