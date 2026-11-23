package com.akon.subtools.adapters;

import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.R;
import com.akon.subtools.databinding.ItemNoticeBinding;
import com.akon.subtools.models.Notice;

import java.util.List;

public class NoticeAdapter extends RecyclerView.Adapter<NoticeAdapter.NormalViewHolder> {
    private final List<Notice> list;
    private final boolean isMinimalHome;
    private final OnNoticeClickListener clickListener;
    private boolean hideTimeline = false;

    public interface OnNoticeClickListener {
        void onNoticeClick(Notice notice);
    }

    public NoticeAdapter(List<Notice> list) {
        this(list, false, null);
    }

    public NoticeAdapter(List<Notice> list, boolean isMinimalHome, OnNoticeClickListener clickListener) {
        this.list = list;
        this.isMinimalHome = isMinimalHome;
        this.clickListener = clickListener;
    }

    public void setIsLoading(boolean isLoading) {
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public NormalViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemNoticeBinding binding = ItemNoticeBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new NormalViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull NormalViewHolder holder, int position) {
        Notice n = list.get(position);
        holder.binding.textNoticeTitle.setText(n.getTitle());
        holder.binding.textNoticeContent.setText(n.getContent());
        holder.binding.textNoticeDate.setText(n.getDate());
        holder.binding.textNoticeSender.setText(n.getFormattedCreatorInfo());

        // Dynamic Priority Badge Colors
        String priority = n.getPriority();
        holder.binding.badgePriority.setText(priority != null ? priority.toUpperCase() : "NORMAL");

        int badgeColorRes;
        if ("Critical".equalsIgnoreCase(priority)) {
            badgeColorRes = R.color.priority_critical;
        } else if ("High".equalsIgnoreCase(priority)) {
            badgeColorRes = R.color.priority_high;
        } else {
            badgeColorRes = R.color.priority_normal;
        }
        
        int color = ContextCompat.getColor(holder.itemView.getContext(), badgeColorRes);
        holder.binding.badgePriority.setBackgroundTintList(ColorStateList.valueOf(color));
        holder.binding.timelineDot.setBackgroundTintList(ColorStateList.valueOf(color));

        if (isMinimalHome) {
            holder.binding.badgePriority.setVisibility(android.view.View.VISIBLE);
            holder.binding.textNoticeDate.setVisibility(android.view.View.VISIBLE);
            holder.binding.textNoticeContent.setVisibility(android.view.View.VISIBLE);
            holder.binding.textNoticeContent.setMaxLines(1);
            holder.binding.textNoticeSender.setVisibility(android.view.View.GONE);
        } else {
            holder.binding.badgePriority.setVisibility(android.view.View.VISIBLE);
            holder.binding.textNoticeDate.setVisibility(android.view.View.VISIBLE);
            holder.binding.textNoticeContent.setVisibility(android.view.View.VISIBLE);
            holder.binding.textNoticeContent.setMaxLines(3);
            holder.binding.textNoticeSender.setVisibility(android.view.View.VISIBLE);
        }

        String imgUrl = n.getImageUrl();
        if (imgUrl != null && !imgUrl.trim().isEmpty() && !isMinimalHome) {
            holder.binding.imgNoticeAttachment.setVisibility(android.view.View.VISIBLE);
            com.bumptech.glide.Glide.with(holder.itemView.getContext())
                    .load(imgUrl.trim())
                    .centerCrop()
                    .placeholder(R.drawable.bg_search_input)
                    .into(holder.binding.imgNoticeAttachment);

            holder.binding.imgNoticeAttachment.setOnClickListener(v -> {
                showFullScreenImageDialog(holder.itemView.getContext(), imgUrl.trim());
            });
        } else {
            holder.binding.imgNoticeAttachment.setVisibility(android.view.View.GONE);
        }

        // Timeline connector visibility
        if (hideTimeline) {
            holder.binding.layoutTimeline.setVisibility(android.view.View.GONE);
        } else {
            holder.binding.layoutTimeline.setVisibility(android.view.View.VISIBLE);
            holder.binding.timelineLineTop.setVisibility(position == 0 ? android.view.View.INVISIBLE : android.view.View.VISIBLE);
            holder.binding.timelineLineBottom.setVisibility(position == list.size() - 1 ? android.view.View.INVISIBLE : android.view.View.VISIBLE);
        }

        holder.itemView.setOnClickListener(v -> {
            if (clickListener != null) {
                clickListener.onNoticeClick(n);
            }
        });
    }

    private void showFullScreenImageDialog(android.content.Context context, String imageUrl) {
        try {
            android.app.Dialog dialog = new android.app.Dialog(context, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
            android.widget.ImageView imageView = new android.widget.ImageView(context);
            imageView.setLayoutParams(new android.view.ViewGroup.LayoutParams(
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT));
            imageView.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
            imageView.setBackgroundColor(android.graphics.Color.BLACK);

            com.bumptech.glide.Glide.with(context)
                    .load(imageUrl)
                    .into(imageView);

            imageView.setOnClickListener(v -> dialog.dismiss());
            dialog.setContentView(imageView);
            dialog.show();
        } catch (Exception ignored) {}
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class NormalViewHolder extends RecyclerView.ViewHolder {
        final ItemNoticeBinding binding;
        public NormalViewHolder(ItemNoticeBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
