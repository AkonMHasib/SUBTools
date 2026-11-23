package com.akon.subtools.coordinator.ui.rbac;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.databinding.ItemRbacUserBinding;

import java.util.ArrayList;
import java.util.List;

public class RbacAdapter extends RecyclerView.Adapter<RbacAdapter.RbacViewHolder> {

    public interface RbacActionListener {
        void onViewDetailsClicked(User user);
        void onChangeRoleClicked(User user);
        void onToggleBanClicked(User user);
        void onDeleteUserClicked(User user);
    }

    private final List<User> userList = new ArrayList<>();
    private final RbacActionListener listener;

    public RbacAdapter(RbacActionListener listener) {
        this.listener = listener;
    }

    public void setItems(List<User> items) {
        userList.clear();
        if (items != null) {
            userList.addAll(items);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public RbacViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemRbacUserBinding binding = ItemRbacUserBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new RbacViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull RbacViewHolder holder, int position) {
        holder.bind(userList.get(position));
    }

    @Override
    public int getItemCount() {
        return userList.size();
    }

    class RbacViewHolder extends RecyclerView.ViewHolder {
        private final ItemRbacUserBinding binding;

        public RbacViewHolder(ItemRbacUserBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(User user) {
            String name = user.getName() != null ? user.getName() : "User";
            binding.tvUserName.setText(name);
            binding.tvUserEmail.setText(user.getEmail() != null ? user.getEmail() : "");
            binding.tvUserDept.setText("Dept: " + (user.getDepartment() != null ? com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentFullName(user.getDepartment()) : "GENERAL"));

            String firstLetter = !name.trim().isEmpty() ? name.trim().substring(0, 1).toUpperCase() : "👤";
            binding.tvUserAvatar.setText(firstLetter);

            String role = user.getActiveRole();
            if (role == null || role.isEmpty()) role = user.getRole();
            if (role == null || role.isEmpty()) role = "student";

            String roleDisplay = "Student";
            int badgeColor = android.graphics.Color.parseColor("#475569");
            int badgeBg = android.graphics.Color.parseColor("#F1F5F9");

            if ("super_admin".equalsIgnoreCase(role) || "admin".equalsIgnoreCase(role)) {
                roleDisplay = "👑 Super Admin";
                badgeColor = android.graphics.Color.parseColor("#7C3AED");
                badgeBg = android.graphics.Color.parseColor("#F3E8FF");
            } else if ("moderator".equalsIgnoreCase(role)) {
                roleDisplay = "🛡️ Moderator";
                badgeColor = android.graphics.Color.parseColor("#0284C7");
                badgeBg = android.graphics.Color.parseColor("#E0F2FE");
            } else if ("coordinator".equalsIgnoreCase(role)) {
                roleDisplay = "🧑‍🏫 Coordinator";
                badgeColor = android.graphics.Color.parseColor("#059669");
                badgeBg = android.graphics.Color.parseColor("#D1FAE5");
            }

            binding.tvUserRoleBadge.setText(roleDisplay);
            binding.tvUserRoleBadge.setTextColor(badgeColor);
            binding.tvUserRoleBadge.setBackgroundTintList(android.content.res.ColorStateList.valueOf(badgeBg));

            String status = user.getStatus();
            boolean isBanned = "banned".equalsIgnoreCase(status) || "disabled".equalsIgnoreCase(status) || "restricted".equalsIgnoreCase(status);
            if (isBanned) {
                binding.btnToggleBan.setText("✅ Unban");
                binding.btnToggleBan.setTextColor(android.graphics.Color.parseColor("#059669"));
            } else {
                binding.btnToggleBan.setText("🚫 Ban");
                binding.btnToggleBan.setTextColor(android.graphics.Color.parseColor("#D97706"));
            }

            binding.btnViewDetails.setOnClickListener(v -> {
                if (listener != null) listener.onViewDetailsClicked(user);
            });

            binding.btnEditUserRole.setOnClickListener(v -> {
                if (listener != null) listener.onChangeRoleClicked(user);
            });

            binding.btnToggleBan.setOnClickListener(v -> {
                if (listener != null) listener.onToggleBanClicked(user);
            });

            binding.btnDeleteUser.setOnClickListener(v -> {
                if (listener != null) listener.onDeleteUserClicked(user);
            });
        }
    }
}
