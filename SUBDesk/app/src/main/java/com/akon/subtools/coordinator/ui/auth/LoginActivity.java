package com.akon.subtools.coordinator.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.akon.subtools.coordinator.databinding.ActivityLoginBinding;
import com.akon.subtools.coordinator.ui.main.MainActivity;

public class LoginActivity extends AppCompatActivity {

    private ActivityLoginBinding binding;
    private AuthViewModel viewModel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        viewModel = new ViewModelProvider(this).get(AuthViewModel.class);
        com.akon.subtools.coordinator.utils.CrashLogManager.checkForCrashLog(this);

        if (viewModel.isLoggedIn()) {
            com.akon.subtools.coordinator.data.repository.SessionManager session = viewModel.getSessionManager();
            if (session.isAdmin()) {
                session.setActiveRole(session.isSuperAdmin() ? "super_admin" : "admin");
                navigateToMain();
                return;
            }

            // Non-admin session must never bypass the SUBDesk role gate
            session.clearSession();
        }

        setupObservers();
        setupListeners();
    }

    private void setupListeners() {
        binding.btnLogin.setOnClickListener(v -> {
            String identifier = binding.etEmail.getText() != null ? binding.etEmail.getText().toString().trim() : "";
            String password = binding.etPassword.getText() != null ? binding.etPassword.getText().toString() : "";
            viewModel.login(identifier, password);
        });
    }

    private void setupObservers() {
        viewModel.getIsLoading().observe(this, isLoading -> {
            binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            binding.btnLogin.setEnabled(!isLoading);
        });

        viewModel.getUserLiveData().observe(this, user -> {
            if (user != null) {
                Toast.makeText(this, "Welcome, " + user.getName(), Toast.LENGTH_SHORT).show();
                handleRoleNavigation(user);
            }
        });

        viewModel.getErrorMessage().observe(this, error -> {
            if (error != null && !error.trim().isEmpty()) {
                showLoginErrorDialog(error);
            }
        });

        viewModel.getUnauthorizedRole().observe(this, role -> {
            if (role != null) {
                showAccessRestrictedDialog(role);
            }
        });
    }

    private void showLoginErrorDialog(String message) {
        if (isFinishing() || isDestroyed()) return;
        new com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
                .setTitle("Login Failed")
                .setMessage(message)
                .setIcon(android.R.drawable.ic_dialog_alert)
                .setPositiveButton("Dismiss", (dialog, which) -> dialog.dismiss())
                .show();
    }

    private void showAccessRestrictedDialog(String role) {
        if (isFinishing() || isDestroyed()) return;
        viewModel.logout();
        new com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
                .setTitle("Access Restricted")
                .setMessage("Your account has role '" + (role != null ? role : "student") + "'. Access to SUBDesk is strictly restricted to accounts with 'admin' role.")
                .setIcon(android.R.drawable.ic_dialog_alert)
                .setPositiveButton("OK", (dialog, which) -> dialog.dismiss())
                .setCancelable(false)
                .show();
    }

    private void handleRoleNavigation(com.akon.subtools.coordinator.data.model.User user) {
        com.akon.subtools.coordinator.data.repository.SessionManager session = viewModel.getSessionManager();
        if (session.isAdmin()) {
            session.setActiveRole(session.isSuperAdmin() ? "super_admin" : "admin");
            navigateToMain();
        } else {
            session.clearSession();
            showAccessRestrictedDialog(user.getRole());
        }
    }

    private void navigateToMain() {
        Intent intent = new Intent(this, MainActivity.class);
        startActivity(intent);
        finish();
    }
}
