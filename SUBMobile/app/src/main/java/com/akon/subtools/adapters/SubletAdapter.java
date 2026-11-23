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

import com.akon.subtools.databinding.ItemSubletBinding;
import com.akon.subtools.models.SubletItem;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class SubletAdapter extends RecyclerView.Adapter<SubletAdapter.SubletViewHolder> {

    private final Context context;
    private final List<SubletItem> list;

    public SubletAdapter(Context context, List<SubletItem> list) {
        this.context = context;
        this.list = list;
    }

    @NonNull
    @Override
    public SubletViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemSubletBinding binding = ItemSubletBinding.inflate(
                LayoutInflater.from(parent.getContext()),
                parent,
                false
        );
        return new SubletViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull SubletViewHolder holder, int position) {
        SubletItem item = list.get(position);

        String titlePrefix = "pending".equalsIgnoreCase(item.getApprovalStatus()) ? "⏳ [Pending Approval] " : "";
        holder.binding.textTitle.setText(titlePrefix + (item.getTitle() != null ? item.getTitle() : "Sublet Listing"));
        
        // Type Badge
        String type = item.getType() != null ? item.getType() : "Seat";
        holder.binding.textTypeBadge.setText("🛋️ " + type);

        // Gender Badge
        String gender = item.getGenderPreference() != null ? item.getGenderPreference() : "Any";
        if ("Male".equalsIgnoreCase(gender) || "Male Only".equalsIgnoreCase(gender)) {
            holder.binding.textGenderBadge.setText("👨 Male Only");
        } else if ("Female".equalsIgnoreCase(gender) || "Female Only".equalsIgnoreCase(gender)) {
            holder.binding.textGenderBadge.setText("👩 Female Only");
        } else {
            holder.binding.textGenderBadge.setText("👫 Any Gender");
        }

        // Rent Price
        NumberFormat formatter = NumberFormat.getInstance(Locale.US);
        holder.binding.textRentPrice.setText("৳ " + formatter.format(item.getRent()) + " / mo");

        // Photo loading using Glide
        if (item.getPhotoUrl() != null && !item.getPhotoUrl().trim().isEmpty()) {
            holder.binding.imagePhoto.setVisibility(View.VISIBLE);
            com.bumptech.glide.Glide.with(context)
                    .load(item.getPhotoUrl().trim())
                    .placeholder(com.akon.subtools.R.drawable.ic_room)
                    .error(com.akon.subtools.R.drawable.ic_room)
                    .into(holder.binding.imagePhoto);
        } else {
            holder.binding.imagePhoto.setVisibility(View.GONE);
        }

        // Location & Date
        String loc = item.getLocation() != null ? item.getLocation() : "Dhanmondi";
        holder.binding.textLocation.setText("📍 " + loc);

        String availDate = item.getAvailableFrom() != null && !item.getAvailableFrom().trim().isEmpty()
                ? item.getAvailableFrom().trim()
                : "Immediate";
        holder.binding.textAvailableDate.setText("📅 Available From: " + availDate);

        // Booked Badge & Status Check
        boolean isBooked = "Booked".equalsIgnoreCase(item.getStatus()) || "Rented".equalsIgnoreCase(item.getStatus());
        if (isBooked) {
            holder.binding.textTitle.setText("🔒 [BOOKED] " + (item.getTitle() != null ? item.getTitle() : "Sublet Listing"));
        }

        // Check if item belongs to active user
        com.akon.subtools.models.User localUser = com.akon.subtools.database.AppDatabase.getLocalUser(holder.itemView.getContext());
        String currentUid = localUser != null && localUser.getUid() != null ? localUser.getUid().trim() : "";
        boolean isMyOwnPost = !currentUid.isEmpty() && currentUid.equalsIgnoreCase(item.getPublisherUid());

        if (isMyOwnPost) {
            holder.binding.textApprovalBadge.setVisibility(View.VISIBLE);
            boolean isPending = item.getApprovalStatus() == null || "pending".equalsIgnoreCase(item.getApprovalStatus());
            if (isPending) {
                holder.binding.textApprovalBadge.setText("⏳ Pending Admin Review");
                holder.binding.textApprovalBadge.setTextColor(android.graphics.Color.parseColor("#D97706"));
                holder.binding.textApprovalBadge.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#FEF3C7")));
            } else {
                holder.binding.textApprovalBadge.setText("✓ Approved");
                holder.binding.textApprovalBadge.setTextColor(android.graphics.Color.parseColor("#059669"));
                holder.binding.textApprovalBadge.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#D1FAE5")));
            }

            holder.binding.btnMarkBooked.setVisibility(View.VISIBLE);
            holder.binding.btnMarkBooked.setText(isBooked ? "Mark Available" : "Mark Booked");
            holder.binding.btnMarkBooked.setOnClickListener(v -> {
                String newStatus = isBooked ? "Active" : "Booked";
                holder.binding.btnMarkBooked.setEnabled(false);

                java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                    try {
                        org.json.JSONObject payload = new org.json.JSONObject();
                        payload.put("status", newStatus);
                        boolean success = com.akon.subtools.utils.SupabaseAuthBridge.updateRecord("sublets", "id=eq." + item.getId(), payload);
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
            holder.binding.textApprovalBadge.setVisibility(View.GONE);
            holder.binding.btnMarkBooked.setVisibility(View.GONE);
        }

        // Bills Included
        if (item.isBillsIncluded()) {
            holder.binding.textBillsInfo.setText("⚡ Utility Bills: Included (Gas, Water, Wi-Fi)");
        } else {
            holder.binding.textBillsInfo.setText("💡 Utility Bills: Excluded / Shared");
        }

        // Description
        holder.binding.textDescription.setText(item.getDescription() != null ? item.getDescription() : "");

        // Host info
        String publisher = item.getPublisherName() != null ? item.getPublisherName() : (item.getContactName() != null ? item.getContactName() : "Student");
        holder.binding.textHostName.setText("Posted by: " + publisher);

        String phone = item.getContactPhone() != null ? item.getContactPhone() : "";
        holder.binding.textContactPhone.setText("📞 " + phone);

        // Call button
        holder.binding.btnCallHost.setOnClickListener(v -> {
            if (phone.isEmpty()) {
                Toast.makeText(context, "No contact phone provided", Toast.LENGTH_SHORT).show();
                return;
            }
            try {
                Intent callIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone));
                context.startActivity(callIntent);
            } catch (Exception e) {
                Toast.makeText(context, "Could not open dialer", Toast.LENGTH_SHORT).show();
            }
        });

        // WhatsApp button
        holder.binding.btnWhatsapp.setOnClickListener(v -> {
            if (phone.isEmpty()) {
                Toast.makeText(context, "No contact phone provided", Toast.LENGTH_SHORT).show();
                return;
            }
            try {
                String cleanPhone = phone.replaceAll("[^0-9]", "");
                if (cleanPhone.startsWith("0")) {
                    cleanPhone = "88" + cleanPhone;
                }
                String url = "https://api.whatsapp.com/send?phone=" + cleanPhone;
                Intent waIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                context.startActivity(waIntent);
            } catch (Exception e) {
                Toast.makeText(context, "Could not open WhatsApp", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public int getItemCount() {
        return list != null ? list.size() : 0;
    }

    public static class SubletViewHolder extends RecyclerView.ViewHolder {
        final ItemSubletBinding binding;

        public SubletViewHolder(ItemSubletBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
