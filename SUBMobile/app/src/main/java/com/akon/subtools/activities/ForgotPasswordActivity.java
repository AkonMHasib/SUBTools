package com.akon.subtools.activities;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.akon.subtools.databinding.ActivityForgotPasswordBinding;
import com.akon.subtools.viewmodels.AuthViewModel;

public class ForgotPasswordActivity extends AppCompatActivity {
    private ActivityForgotPasswordBinding binding;
    private AuthViewModel authViewModel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityForgotPasswordBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        authViewModel = new ViewModelProvider(this).get(AuthViewModel.class);

        setupObservers();
        setupListeners();
    }

    private void setupObservers() {
        com.akon.subtools.utils.LoadingDialog loadingDialog = new com.akon.subtools.utils.LoadingDialog(this, "Sending reset link...");
        authViewModel.getLoadingLiveData().observe(this, isLoading -> {
            if (isLoading) {
                loadingDialog.show();
            } else {
                loadingDialog.dismiss();
            }
            binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            binding.btnResetPassword.setEnabled(!isLoading);
        });

        authViewModel.getForgotPasswordSuccessLiveData().observe(this, isSuccess -> {
            if (isSuccess != null && isSuccess) {
                new androidx.appcompat.app.AlertDialog.Builder(this)
                        .setTitle("Reset Link Sent")
                        .setMessage("A password reset link has been sent to your email address. Please check your inbox and open the link in your web browser to create a new password.")
                        .setPositiveButton("OK", (dialog, which) -> finish())
                        .setCancelable(false)
                        .show();
            }
        });

        authViewModel.getErrorLiveData().observe(this, error -> {
            if (error != null) {
                com.akon.subtools.utils.DialogHelper.showWarningDialog(this, "Reset Failed", error);
            }
        });
    }

    private void setupListeners() {
        binding.btnBack.setOnClickListener(v -> finish());

        binding.btnResetPassword.setOnClickListener(v -> {
            String email = binding.inputEmail.getText().toString().trim();

            if (TextUtils.isEmpty(email)) {
                binding.inputEmail.setError("Email is required");
                return;
            }

            if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                binding.inputEmail.setError("Enter a valid email address");
                return;
            }

            authViewModel.forgotPassword(email);
        });
    }
}
