package com.akon.subtools.adapters;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.R;
import com.akon.subtools.databinding.ItemLostFoundBinding;
import com.akon.subtools.models.LostFoundItem;
import com.bumptech.glide.Glide;

import java.util.List;

public class LostFoundAdapter extends RecyclerView.Adapter<LostFoundAdapter.ViewHolder> {
    private final List<LostFoundItem> list;

    public LostFoundAdapter(List<LostFoundItem> list) {
        this.list = list;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemLostFoundBinding binding = ItemLostFoundBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new ViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        LostFoundItem item = list.get(position);
        Context context = holder.itemView.getContext();

        holder.binding.txtTitle.setText(item.getTitle() != null ? item.getTitle() : "Untitled Item");
        holder.binding.txtDescription.setText(item.getDescription() != null ? item.getDescription() : "");
        holder.binding.txtLocation.setText("Location: " + (item.getLocation() != null ? item.getLocation() : "Unknown"));
        holder.binding.txtDate.setText(item.getDate() != null ? item.getDate() : "");
        holder.binding.txtContactName.setText("Posted by: " + (item.getContactName() != null ? item.getContactName() : "Student"));

        String rawType = item.getType();
        String type = (rawType != null && "found".equalsIgnoreCase(rawType.trim())) ? "FOUND" : "LOST";
        holder.binding.badgeType.setText(type);

        if ("FOUND".equalsIgnoreCase(type)) {
            holder.binding.badgeType.setBackgroundTintList(ContextCompat.getColorStateList(context, R.color.priority_normal));
        } else {
            holder.binding.badgeType.setBackgroundTintList(ContextCompat.getColorStateList(context, R.color.priority_high));
        }

        // Approval Status for user's own submissions
        com.akon.subtools.models.User localUser = com.akon.subtools.database.AppDatabase.getLocalUser(context);
        String currentUid = localUser != null && localUser.getUid() != null ? localUser.getUid().trim() : "";
        boolean isMyPost = !currentUid.isEmpty() && 
                (currentUid.equalsIgnoreCase(item.getPublisherUid()) || currentUid.equalsIgnoreCase(item.getReporterUid()));

        if (isMyPost) {
            holder.binding.txtApprovalStatus.setVisibility(View.VISIBLE);
            boolean isPending = item.getApprovalStatus() == null || "pending".equalsIgnoreCase(item.getApprovalStatus());
            if (isPending) {
                holder.binding.txtApprovalStatus.setText("⏳ Pending Admin Review");
                holder.binding.txtApprovalStatus.setTextColor(android.graphics.Color.parseColor("#D97706"));
                holder.binding.txtApprovalStatus.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#FEF3C7")));
            } else {
                holder.binding.txtApprovalStatus.setText("✓ Approved");
                holder.binding.txtApprovalStatus.setTextColor(android.graphics.Color.parseColor("#059669"));
                holder.binding.txtApprovalStatus.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#D1FAE5")));
            }
        } else {
            holder.binding.txtApprovalStatus.setVisibility(View.GONE);
        }

        // Bind image photo if present
        String displayImg = item.getImageUrl();
        if (displayImg == null || displayImg.trim().isEmpty()) {
            displayImg = item.getPhotoUrl();
        }

        if (displayImg != null && !displayImg.trim().isEmpty()) {
            holder.binding.imgPhoto.setVisibility(View.VISIBLE);
            Glide.with(context)
                    .load(displayImg.trim())
                    .placeholder(android.R.drawable.ic_menu_camera)
                    .error(android.R.drawable.ic_menu_camera)
                    .into(holder.binding.imgPhoto);
        } else {
            holder.binding.imgPhoto.setVisibility(View.GONE);
        }

        holder.binding.btnCallContact.setOnClickListener(v -> {
            if (item.getContactPhone() != null && !item.getContactPhone().trim().isEmpty()) {
                try {
                    Intent callIntent = new Intent(Intent.ACTION_DIAL);
                    callIntent.setData(Uri.parse("tel:" + item.getContactPhone().trim()));
                    context.startActivity(callIntent);
                } catch (Exception ignored) {}
            }
        });
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        final ItemLostFoundBinding binding;
        public ViewHolder(ItemLostFoundBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
