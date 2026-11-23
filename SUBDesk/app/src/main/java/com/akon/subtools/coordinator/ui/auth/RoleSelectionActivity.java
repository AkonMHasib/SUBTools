package com.akon.subtools.coordinator.ui.auth;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.appcompat.app.AppCompatActivity;

import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.databinding.ActivityRoleSelectionBinding;
import com.akon.subtools.coordinator.ui.main.MainActivity;

import java.util.List;

public class RoleSelectionActivity extends AppCompatActivity {

    private ActivityRoleSelectionBinding binding;
    private SessionManager sessionManager;
    private String selectedRole = "coordinator";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityRoleSelectionBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        sessionManager = new SessionManager(this);

        List<String> workspaceRoles = sessionManager.getDistinctWorkspaceRoles();
        if (workspaceRoles.size() <= 1) {
            sessionManager.setActiveRole(workspaceRoles.isEmpty() ? sessionManager.getRole() : workspaceRoles.get(0));
            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
            return;
        }

        setupRoleSelection(workspaceRoles);
        setupListeners();
    }

    private void setupRoleSelection(List<String> workspaceRoles) {
        boolean hasCoord = workspaceRoles.contains("coordinator");
        boolean hasMod = workspaceRoles.contains("moderator");

        binding.cardRoleCoordinator.setVisibility(hasCoord ? View.VISIBLE : View.GONE);
        binding.cardRoleModerator.setVisibility(hasMod ? View.VISIBLE : View.GONE);
        binding.cardRoleAdmin.setVisibility(View.GONE);

        String active = sessionManager.getActiveRole();
        if (active != null && workspaceRoles.contains(active.toLowerCase())) {
            selectRole(active);
        } else if (hasCoord) {
            selectRole("coordinator");
        } else if (hasMod) {
            selectRole("moderator");
        }

        binding.cardRoleCoordinator.setOnClickListener(v -> selectRole("coordinator"));
        binding.cardRoleModerator.setOnClickListener(v -> selectRole("moderator"));

        binding.radioCoordinator.setOnClickListener(v -> selectRole("coordinator"));
        binding.radioModerator.setOnClickListener(v -> selectRole("moderator"));
    }

    private void selectRole(String role) {
        if (role == null) role = "coordinator";
        selectedRole = role.toLowerCase();

        boolean isCoord = "coordinator".equalsIgnoreCase(selectedRole);
        boolean isMod = "moderator".equalsIgnoreCase(selectedRole);

        binding.radioCoordinator.setChecked(isCoord);
        binding.radioModerator.setChecked(isMod);
        binding.radioAdmin.setChecked(false);

        int primaryColor = Color.parseColor("#010D26");
        int lightBorder = Color.parseColor("#CBD5E1");

        binding.cardRoleCoordinator.setStrokeColor(isCoord ? primaryColor : lightBorder);
        binding.cardRoleCoordinator.setStrokeWidth(isCoord ? 5 : 2);

        binding.cardRoleModerator.setStrokeColor(isMod ? primaryColor : lightBorder);
        binding.cardRoleModerator.setStrokeWidth(isMod ? 5 : 2);
    }

    private void setupListeners() {
        binding.btnContinueRole.setOnClickListener(v -> {
            v.setEnabled(false);
            sessionManager.setActiveRole(selectedRole);

            if (binding.chkRememberChoice.isChecked()) {
                getSharedPreferences("app_prefs", MODE_PRIVATE)
                        .edit()
                        .putString("preferred_role", selectedRole)
                        .apply();
            }

            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        });
    }
}
