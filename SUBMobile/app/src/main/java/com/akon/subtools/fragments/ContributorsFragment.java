package com.akon.subtools.fragments;

import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.R;
import com.akon.subtools.databinding.FragmentContributorsBinding;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.DepartmentHelper;
import com.akon.subtools.utils.ImageHelper;
import com.akon.subtools.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

public class ContributorsFragment extends Fragment {
    private FragmentContributorsBinding binding;
    private final List<AdminItem> adminList = new ArrayList<>();
    private AdminAdapter adapter;

    public static class AdminItem {
        public String name;
        public String role;
        public String department;
        public String phone;
        public String email;
        public String photoUrl;

        public AdminItem(String name, String role, String department, String phone, String email, String photoUrl) {
            this.name = name;
            this.role = role;
            this.department = department;
            this.phone = phone;
            this.email = email;
            this.photoUrl = photoUrl;
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentContributorsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        binding.textHeader.setText("Admins & Coordinators");
        binding.textHeader.setVisibility(View.VISIBLE);
        binding.textSubheader.setText("Directory of university administrators, department admins, and coordinators:");
        binding.textSubheader.setVisibility(View.VISIBLE);

        binding.recyclerContributors.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new AdminAdapter();
        binding.recyclerContributors.setAdapter(adapter);

        loadAdmins();
    }

    private void loadAdmins() {
        if (binding == null) return;
        binding.progressBar.setVisibility(View.VISIBLE);
        adminList.clear();

        if (SupabaseAuthBridge.isConfigured()) {
            Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    JSONArray arr = SupabaseAuthBridge.queryTable("users", "select=*&limit=250");
                    if (arr != null && arr.length() > 0) {
                        List<AdminItem> fetched = new ArrayList<>();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject obj = arr.getJSONObject(i);
                            User u = User.fromJson(obj);
                            if (u == null) continue;

                            boolean isAdmin = u.hasAdminRole() || obj.optBoolean("is_admin", false) || obj.optBoolean("isAdmin", false);
                            boolean isCoordinator = false;
                            if (u.getRoles() != null) {
                                for (String r : u.getRoles()) {
                                    if (r != null && r.toLowerCase().contains("coordinator")) {
                                        isCoordinator = true;
                                        break;
                                    }
                                }
                            }
                            if (u.getRole() != null && u.getRole().toLowerCase().contains("coordinator")) {
                                isCoordinator = true;
                            }
                            if (!isCoordinator) {
                                String rawR = obj.optString("role", "").toLowerCase();
                                if (rawR.contains("coordinator")) isCoordinator = true;
                            }

                            if (isAdmin || isCoordinator) {
                                String roleLabel = "Administrator";
                                if (u.getRoles() != null) {
                                    if (u.getRoles().contains("super_admin")) roleLabel = "Super Admin";
                                    else if (u.getRoles().contains("admin")) roleLabel = "Department Admin";
                                    else if (isCoordinator) roleLabel = "Academic Coordinator";
                                } else if (isCoordinator) {
                                    roleLabel = "Academic Coordinator";
                                }

                                String name = u.getName() != null && !u.getName().trim().isEmpty() ? u.getName().trim() : "Administrator";
                                String dept = u.getDepartment() != null ? u.getDepartment().trim() : "";
                                String phone = u.getPhone() != null ? u.getPhone().trim() : "";
                                String email = u.getEmail() != null ? u.getEmail().trim() : "";
                                String photo = u.getPhotoURL() != null ? u.getPhotoURL().trim() : "";
                                if (photo.isEmpty()) {
                                    photo = User.extractPhotoUrl(obj, obj.optJSONObject("data"));
                                }

                                fetched.add(new AdminItem(name, roleLabel, dept, phone, email, photo));
                            }
                        }

                        if (getActivity() != null) {
                            getActivity().runOnUiThread(() -> {
                                if (binding == null) return;
                                binding.progressBar.setVisibility(View.GONE);
                                adminList.clear();
                                adminList.addAll(fetched);
                                if (adapter != null) {
                                    adapter.notifyDataSetChanged();
                                }
                            });
                            return;
                        }
                    }
                } catch (Exception ignored) {}

                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        if (binding == null) return;
                        binding.progressBar.setVisibility(View.GONE);
                    });
                }
            });
        } else {
            binding.progressBar.setVisibility(View.GONE);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }

    private class AdminAdapter extends RecyclerView.Adapter<AdminAdapter.ViewHolder> {

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_contributor, parent, false);
            return new ViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            AdminItem item = adminList.get(position);
            holder.txtName.setText(item.name);
            holder.txtRole.setText(item.role);

            if (item.department != null && !item.department.trim().isEmpty()) {
                holder.txtDept.setText("Dept: " + DepartmentHelper.getFullDepartmentName(item.department));
                holder.txtDept.setVisibility(View.VISIBLE);
            } else {
                holder.txtDept.setVisibility(View.GONE);
            }

            holder.txtDescription.setVisibility(View.GONE);

            if (item.phone != null && !item.phone.trim().isEmpty()) {
                holder.txtPhone.setText("Phone: " + item.phone.trim());
                holder.txtPhone.setVisibility(View.VISIBLE);
                holder.txtPhone.setOnClickListener(v -> {
                    try {
                        android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_DIAL);
                        intent.setData(Uri.parse("tel:" + item.phone.trim()));
                        holder.itemView.getContext().startActivity(intent);
                    } catch (Exception ignored) {}
                });
            } else {
                holder.txtPhone.setVisibility(View.GONE);
            }

            if (item.email != null && !item.email.trim().isEmpty()) {
                holder.txtEmail.setText("Email: " + item.email.trim());
                holder.txtEmail.setVisibility(View.VISIBLE);
                holder.txtEmail.setOnClickListener(v -> {
                    try {
                        android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_SENDTO);
                        intent.setData(Uri.parse("mailto:" + item.email.trim()));
                        holder.itemView.getContext().startActivity(intent);
                    } catch (Exception ignored) {}
                });
            } else {
                holder.txtEmail.setVisibility(View.GONE);
            }

            // Initials fallback
            String initial = "A";
            if (item.name != null && !item.name.trim().isEmpty()) {
                initial = String.valueOf(item.name.trim().charAt(0)).toUpperCase();
            }
            holder.txtInitial.setText(initial);

            // Load photo safely with ImageHelper
            ImageHelper.loadProfileImage(
                    holder.itemView.getContext(),
                    item.photoUrl,
                    holder.imgAvatar,
                    holder.txtInitial,
                    holder.cardAvatar
            );
        }

        @Override
        public int getItemCount() {
            return adminList.size();
        }

        class ViewHolder extends RecyclerView.ViewHolder {
            TextView txtName, txtRole, txtDept, txtInitial, txtDescription, txtPhone, txtEmail;
            ImageView imgAvatar;
            View cardAvatar;

            ViewHolder(@NonNull View itemView) {
                super(itemView);
                txtName = itemView.findViewById(R.id.txt_name);
                txtRole = itemView.findViewById(R.id.txt_role);
                txtDept = itemView.findViewById(R.id.txt_dept);
                txtInitial = itemView.findViewById(R.id.txt_initial);
                txtDescription = itemView.findViewById(R.id.txt_description);
                txtPhone = itemView.findViewById(R.id.txt_phone);
                txtEmail = itemView.findViewById(R.id.txt_email);
                imgAvatar = itemView.findViewById(R.id.img_avatar);
                cardAvatar = itemView.findViewById(R.id.card_avatar);
            }
        }
    }
}
