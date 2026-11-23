package com.akon.subtools.activities;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.akon.subtools.databinding.ActivityLoginBinding;
import com.akon.subtools.viewmodels.AuthViewModel;

public class LoginActivity extends AppCompatActivity {
    private ActivityLoginBinding binding;
    private AuthViewModel authViewModel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        authViewModel = new ViewModelProvider(this).get(AuthViewModel.class);
        com.akon.subtools.utils.CrashLogManager.checkForCrashLog(this);

        setupObservers();
        setupListeners();
    }

    private void setupObservers() {
        authViewModel.getUserLiveData().observe(this, user -> {
            if (user != null) {
                // Navigate to main activity
                startActivity(new Intent(LoginActivity.this, MainActivity.class));
                finish();
            }
        });

        com.akon.subtools.utils.LoadingDialog loadingDialog = new com.akon.subtools.utils.LoadingDialog(this, "Logging you in safely...");
        authViewModel.getLoadingLiveData().observe(this, isLoading -> {
            if (isLoading) {
                loadingDialog.show();
            } else {
                loadingDialog.dismiss();
            }
            binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            binding.btnLogin.setEnabled(!isLoading);
        });

        authViewModel.getErrorLiveData().observe(this, error -> {
            if (error != null) {
                if ("UNVERIFIED_EMAIL".equals(error)) {
                    authViewModel.clearErrors();
                    new androidx.appcompat.app.AlertDialog.Builder(this)
                            .setTitle("Verify Your Email")
                            .setMessage("Your email address is not verified yet. We have sent a verification link to your registered email.\n\nWould you like to resend the verification email?")
                            .setPositiveButton("Resend Email", (dialog, which) -> {
                                com.akon.subtools.models.User localUser = new com.akon.subtools.utils.CacheManager(this).get("user_profile", com.akon.subtools.models.User.class);
                                if (localUser != null && localUser.getUid() != null) {
                                    authViewModel.resendVerificationEmail(localUser.getUid());
                                } else {
                                    Toast.makeText(this, "Session expired. Please try logging in again.", Toast.LENGTH_SHORT).show();
                                }
                            })
                            .setNegativeButton("Cancel", (dialog, which) -> {
                                authViewModel.logout();
                            })
                            .setOnCancelListener(dialog -> {
                                authViewModel.logout();
                            })
                            .show();
                } else {
                    com.akon.subtools.utils.DialogHelper.showWarningDialog(this, "Login Failed", error);
                }
            }
        });

        authViewModel.getVerificationResentMessageLiveData().observe(this, msg -> {
            if (msg != null) {
                Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
                authViewModel.logout();
            }
        });
    }

    private void setupListeners() {
        binding.btnLogin.setOnClickListener(v -> {
            String email = binding.inputEmail.getText().toString().trim().toLowerCase();
            String password = binding.inputPassword.getText().toString().trim();

            if (TextUtils.isEmpty(email)) {
                binding.inputEmail.setError("Email address is required");
                return;
            }

            if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                binding.inputEmail.setError("Please enter a valid email address (e.g. user@gmail.com)");
                return;
            }

            if (TextUtils.isEmpty(password)) {
                binding.inputPassword.setError("Password is required");
                return;
            }

            authViewModel.login(email, password);
        });

        binding.btnSignupLink.setOnClickListener(v -> {
            startActivity(new Intent(LoginActivity.this, SignupActivity.class));
        });

        binding.btnForgotPassword.setOnClickListener(v -> {
            startActivity(new Intent(LoginActivity.this, ForgotPasswordActivity.class));
        });
    }
}
