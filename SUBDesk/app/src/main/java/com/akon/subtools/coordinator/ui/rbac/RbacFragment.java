package com.akon.subtools.coordinator.ui.rbac;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.databinding.FragmentRbacBinding;

public class RbacFragment extends Fragment implements RbacAdapter.RbacActionListener {

    private FragmentRbacBinding binding;
    private RbacViewModel viewModel;
    private RbacAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentRbacBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        viewModel = new ViewModelProvider(this).get(RbacViewModel.class);

        adapter = new RbacAdapter(this);
        binding.rvRbacUsers.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvRbacUsers.setAdapter(adapter);

        setupSearch();
        setupObservers();

        binding.fabAddStaff.setOnClickListener(v -> showAddStaffDialog());
        binding.swipeRefreshLayout.setOnRefreshListener(() -> viewModel.loadUsers());
    }

    @Override
    public void onResume() {
        super.onResume();
        viewModel.loadUsers();
    }

    private void setupSearch() {
        binding.etSearchUser.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                viewModel.setQuery(s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void setupObservers() {
        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.swipeRefreshLayout.setRefreshing(Boolean.TRUE.equals(isLoading));
        });

        viewModel.getCoordCount().observe(getViewLifecycleOwner(), count -> {
            binding.tvRbacCoordinatorsCount.setText(String.valueOf(count));
        });

        viewModel.getModCount().observe(getViewLifecycleOwner(), count -> {
            binding.tvRbacModeratorsCount.setText(String.valueOf(count));
        });

        viewModel.getSuperAdminCount().observe(getViewLifecycleOwner(), count -> {
            binding.tvRbacSuperAdminsCount.setText(String.valueOf(count));
        });

        viewModel.getUsersLiveData().observe(getViewLifecycleOwner(), users -> {
            if (users == null || users.isEmpty()) {
                binding.rvRbacUsers.setVisibility(View.GONE);
                binding.tvEmptyRbacUsers.setVisibility(View.VISIBLE);
            } else {
                binding.rvRbacUsers.setVisibility(View.VISIBLE);
                binding.tvEmptyRbacUsers.setVisibility(View.GONE);
                adapter.setItems(users);
            }
        });
    }

    private void showAddStaffDialog() {
        LinearLayout container = new LinearLayout(requireContext());
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(50, 20, 50, 20);

        final EditText etName = new EditText(requireContext());
        etName.setHint("Full Name (e.g. John Doe)");
        container.addView(etName);

        final EditText etEmail = new EditText(requireContext());
        etEmail.setHint("Email Address (e.g. coord@sub.edu.bd)");
        container.addView(etEmail);

        final EditText etDept = new EditText(requireContext());
        etDept.setHint("Department (e.g. CSE, EEE, BBA)");
        container.addView(etDept);

        CharSequence[] roles = new CharSequence[]{"🧑‍🏫 Coordinator", "🛡️ Moderator", "👑 Super Admin"};
        final String[] roleKeys = new String[]{"coordinator", "moderator", "super_admin"};
        final int[] choice = new int[]{0};

        new AlertDialog.Builder(requireContext())
                .setTitle("➕ Add Staff / Coordinator")
                .setView(container)
                .setSingleChoiceItems(roles, 0, (dialog, which) -> choice[0] = which)
                .setPositiveButton("Create Account", (dialog, which) -> {
                    String name = etName.getText().toString().trim();
                    String email = etEmail.getText().toString().trim();
                    String dept = etDept.getText().toString().trim();
                    String role = roleKeys[choice[0]];

                    if (email.isEmpty()) {
                        Toast.makeText(requireContext(), "Email is required!", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    viewModel.addNewStaffAccount(name, email, role, dept,
                            () -> Toast.makeText(requireContext(), "Staff account created!", Toast.LENGTH_SHORT).show(),
                            err -> Toast.makeText(requireContext(), "Error: " + err, Toast.LENGTH_SHORT).show());
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onViewDetailsClicked(User user) {
        if (user == null) return;
        String details = "👤 Name: " + (user.getName() != null ? user.getName() : "N/A") + "\n" +
                         "📧 Email: " + (user.getEmail() != null ? user.getEmail() : "N/A") + "\n" +
                         "🔑 Role: " + (user.getActiveRole() != null ? user.getActiveRole() : user.getRole()) + "\n" +
                         "🏛️ Department: " + (user.getDepartment() != null ? com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentFullName(user.getDepartment()) : "GENERAL") + "\n" +
                         "⚡ Status: " + (user.getStatus() != null ? user.getStatus() : "Active") + "\n" +
                         "🆔 User ID: " + (user.getUid() != null ? user.getUid() : "N/A");

        new AlertDialog.Builder(requireContext())
                .setTitle("👁️ User Profile Details")
                .setMessage(details)
                .setPositiveButton("OK", null)
                .show();
    }

    @Override
    public void onChangeRoleClicked(User user) {
        if (user == null || user.getUid() == null) return;

        CharSequence[] roles = new CharSequence[]{"👑 Super Admin", "🛡️ Moderator", "🧑‍🏫 Coordinator", "🎓 Student"};
        final String[] roleKeys = new String[]{"super_admin", "moderator", "coordinator", "student"};

        int selectedIndex = 3;
        String currentRole = user.getActiveRole();
        if ("super_admin".equalsIgnoreCase(currentRole)) selectedIndex = 0;
        else if ("moderator".equalsIgnoreCase(currentRole)) selectedIndex = 1;
        else if ("coordinator".equalsIgnoreCase(currentRole)) selectedIndex = 2;

        final int[] choice = new int[]{selectedIndex};

        LinearLayout container = new LinearLayout(requireContext());
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(50, 20, 50, 20);

        final EditText etDept = new EditText(requireContext());
        etDept.setHint("Department (e.g. CSE, EEE, BBA)");
        etDept.setText(user.getDepartment() != null ? user.getDepartment() : "GENERAL");
        container.addView(etDept);

        new AlertDialog.Builder(requireContext())
                .setTitle("⚙️ Edit Role & Dept for " + (user.getName() != null ? user.getName() : "User"))
                .setSingleChoiceItems(roles, selectedIndex, (dialog, which) -> choice[0] = which)
                .setView(container)
                .setPositiveButton("Save Access", (dialog, which) -> {
                    String newRole = roleKeys[choice[0]];
                    String newDept = etDept.getText().toString().trim();
                    viewModel.updateUserRoleAndDept(user.getUid(), newRole, newDept,
                            () -> Toast.makeText(requireContext(), "Access updated successfully!", Toast.LENGTH_SHORT).show(),
                            err -> Toast.makeText(requireContext(), "Failed: " + err, Toast.LENGTH_SHORT).show());
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onToggleBanClicked(User user) {
        if (user == null || user.getUid() == null) return;
        boolean isBanned = "banned".equalsIgnoreCase(user.getStatus()) || "disabled".equalsIgnoreCase(user.getStatus()) || "restricted".equalsIgnoreCase(user.getStatus());
        String action = isBanned ? "Unban" : "Ban";

        new AlertDialog.Builder(requireContext())
                .setTitle(action + " Account")
                .setMessage("Are you sure you want to " + action.toLowerCase() + " account for " + (user.getName() != null ? user.getName() : user.getEmail()) + "?")
                .setPositiveButton(action, (dialog, which) -> {
                    viewModel.toggleUserBan(user,
                            () -> Toast.makeText(requireContext(), "Account status updated!", Toast.LENGTH_SHORT).show(),
                            err -> Toast.makeText(requireContext(), "Failed: " + err, Toast.LENGTH_SHORT).show());
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onDeleteUserClicked(User user) {
        if (user == null || user.getUid() == null) return;

        new AlertDialog.Builder(requireContext())
                .setTitle("🗑️ Revoke Staff Access")
                .setMessage("Are you sure you want to revoke staff access for " + (user.getName() != null ? user.getName() : user.getEmail()) + "?")
                .setPositiveButton("Revoke Access", (dialog, which) -> {
                    viewModel.deleteUserAccount(user,
                            () -> Toast.makeText(requireContext(), "Access revoked successfully!", Toast.LENGTH_SHORT).show(),
                            err -> Toast.makeText(requireContext(), "Failed: " + err, Toast.LENGTH_SHORT).show());
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
