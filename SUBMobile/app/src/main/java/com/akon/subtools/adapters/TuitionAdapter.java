package com.akon.subtools.adapters;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.databinding.ItemTuitionBinding;
import com.akon.subtools.models.TuitionItem;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class TuitionAdapter extends RecyclerView.Adapter<TuitionAdapter.TuitionViewHolder> {

    private final Context context;
    private final List<TuitionItem> list;

    public TuitionAdapter(Context context, List<TuitionItem> list) {
        this.context = context;
        this.list = list;
    }

    @NonNull
    @Override
    public TuitionViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemTuitionBinding binding = ItemTuitionBinding.inflate(
                LayoutInflater.from(parent.getContext()),
                parent,
                false
        );
        return new TuitionViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull TuitionViewHolder holder, int position) {
        TuitionItem item = list.get(position);

        String titlePrefix = "pending".equalsIgnoreCase(item.getApprovalStatus()) ? "⏳ [Pending Approval] " : "";
        holder.binding.textTitle.setText(titlePrefix + (item.getTitle() != null ? item.getTitle() : "Tuition Requirement"));

        // Medium Badge
        String medium = item.getMedium() != null ? item.getMedium() : "Bangla Medium";
        holder.binding.textMediumBadge.setText("📚 " + medium);

        // Booked Status Check & User Ownership
        boolean isBooked = "Booked".equalsIgnoreCase(item.getStatus()) || "Closed".equalsIgnoreCase(item.getStatus());
        if (isBooked) {
            holder.binding.textTitle.setText("🔒 [TAKEN] " + (item.getTitle() != null ? item.getTitle() : "Tuition Requirement"));
        }

        com.akon.subtools.models.User localUser = com.akon.subtools.database.AppDatabase.getLocalUser(holder.itemView.getContext());
        String currentUid = localUser != null && localUser.getUid() != null ? localUser.getUid().trim() : "";
        boolean isMyOwnPost = !currentUid.isEmpty() && currentUid.equalsIgnoreCase(item.getPublisherUid());

        // Status Badge
        boolean isPending = "pending".equalsIgnoreCase(item.getApprovalStatus());
        if (isMyOwnPost) {
            if (isPending) {
                holder.binding.textStatusBadge.setText("⏳ Pending Admin Review");
                holder.binding.textStatusBadge.setTextColor(android.graphics.Color.parseColor("#D97706"));
                holder.binding.textStatusBadge.setAlpha(1.0f);
            } else if (isBooked) {
                holder.binding.textStatusBadge.setText("🔒 Booked");
                holder.binding.textStatusBadge.setTextColor(android.graphics.Color.parseColor("#4B5563"));
                holder.binding.textStatusBadge.setAlpha(0.85f);
            } else {
                holder.binding.textStatusBadge.setText("✓ Approved");
                holder.binding.textStatusBadge.setTextColor(android.graphics.Color.parseColor("#059669"));
                holder.binding.textStatusBadge.setAlpha(1.0f);
            }
        } else {
            if (isPending) {
                holder.binding.textStatusBadge.setText("⏳ Pending");
                holder.binding.textStatusBadge.setAlpha(0.8f);
            } else if (isBooked) {
                holder.binding.textStatusBadge.setText("🔒 Booked");
                holder.binding.textStatusBadge.setAlpha(0.85f);
            } else {
                holder.binding.textStatusBadge.setText("✓ Active");
                holder.binding.textStatusBadge.setAlpha(1.0f);
            }
        }

        // Remuneration & Days
        NumberFormat formatter = NumberFormat.getInstance(Locale.US);
        String days = item.getDaysPerWeek() != null ? item.getDaysPerWeek() : "3 Days/Wk";
        holder.binding.textSalary.setText("৳ " + formatter.format(item.getSalary()) + " / mo • " + days);

        // Grade & Subjects
        String grade = item.getClassGrade() != null ? item.getClassGrade() : "Class 6-8";
        String subjects = item.getSubjects() != null ? item.getSubjects() : "All Subjects";
        holder.binding.textGradeSubjects.setText("📖 " + grade + " (" + subjects + ")");

        // Location & Available From
        String loc = item.getLocation() != null ? item.getLocation() : "Dhanmondi";
        String availDate = item.getAvailableFrom() != null && !item.getAvailableFrom().trim().isEmpty()
                ? item.getAvailableFrom().trim()
                : "Immediate";
        holder.binding.textLocation.setText("📍 " + loc + " • 📅 Starts: " + availDate);

        // Contact
        String contactName = item.getContactName() != null ? item.getContactName() : (item.getPublisherName() != null ? item.getPublisherName() : "SUB Student");
        String phone = item.getContactPhone() != null ? item.getContactPhone() : "";
        holder.binding.textContactInfo.setText("👤 Contact: " + contactName + (phone.isEmpty() ? "" : " (" + phone + ")"));

        if (isMyOwnPost) {
            holder.binding.btnMarkBooked.setVisibility(View.VISIBLE);
            holder.binding.btnMarkBooked.setText(isBooked ? "Mark Available" : "Mark Booked");
            holder.binding.btnMarkBooked.setOnClickListener(v -> {
                String newStatus = isBooked ? "Available" : "Booked";
                holder.binding.btnMarkBooked.setEnabled(false);

                java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                    try {
                        org.json.JSONObject payload = new org.json.JSONObject();
                        payload.put("status", newStatus);
                        boolean success = com.akon.subtools.utils.SupabaseAuthBridge.updateRecord("tuitions", "id=eq." + item.getId(), payload);
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                            holder.binding.btnMarkBooked.setEnabled(true);
                            if (success) {
                                item.setStatus(newStatus);
                                notifyItemChanged(position);
                                Toast.makeText(context, "Status updated to " + newStatus, Toast.LENGTH_SHORT).show();
                            } else {
                                Toast.makeText(context, "Failed to update status in Supabase", Toast.LENGTH_SHORT).show();
                            }
                        });
                    } catch (Exception e) {
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                            holder.binding.btnMarkBooked.setEnabled(true);
                            Toast.makeText(context, "Error updating status: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        });
                    }
                });
            });
        } else {
            holder.binding.btnMarkBooked.setVisibility(View.GONE);
        }

        // Time Ago
        holder.binding.textTimeAgo.setText(getTimeAgo(item.getTimestamp()));

        // Call button
        holder.binding.btnCall.setOnClickListener(v -> {
            if (phone.isEmpty()) {
                Toast.makeText(context, "No contact phone provided", Toast.LENGTH_SHORT).show();
                return;
            }
            try {
                Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone));
                context.startActivity(intent);
            } catch (Exception e) {
                Toast.makeText(context, "Unable to dial phone: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public int getItemCount() {
        return list != null ? list.size() : 0;
    }

    private String getTimeAgo(long timestamp) {
        if (timestamp <= 0) return "Recently";
        long diff = System.currentTimeMillis() - timestamp;
        long minutes = diff / (60 * 1000);
        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + "m ago";
        long hours = minutes / 60;
        if (hours < 24) return hours + "h ago";
        long days = hours / 24;
        return days + "d ago";
    }

    public static class TuitionViewHolder extends RecyclerView.ViewHolder {
        final ItemTuitionBinding binding;

        public TuitionViewHolder(ItemTuitionBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
