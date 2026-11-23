package com.akon.subtools.coordinator.ui.auth;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.data.repository.AuthRepository;
import com.akon.subtools.coordinator.data.repository.SessionManager;

public class AuthViewModel extends AndroidViewModel {

    private final AuthRepository authRepository;
    private final SessionManager sessionManager;

    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<User> userLiveData = new MutableLiveData<>();
    private final MutableLiveData<String> errorMessage = new MutableLiveData<>();
    private final MutableLiveData<String> unauthorizedRole = new MutableLiveData<>();

    public AuthViewModel(@NonNull Application application) {
        super(application);
        this.sessionManager = new SessionManager(application);
        this.authRepository = new AuthRepository(sessionManager);
    }

    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<User> getUserLiveData() { return userLiveData; }
    public LiveData<String> getErrorMessage() { return errorMessage; }
    public LiveData<String> getUnauthorizedRole() { return unauthorizedRole; }

    public boolean isLoggedIn() {
        return sessionManager.isLoggedIn();
    }

    public void login(String identifier, String password) {
        if (identifier == null || identifier.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            errorMessage.setValue("Please enter both your credentials (email, phone or ID) and password.");
            return;
        }

        isLoading.setValue(true);
        authRepository.login(identifier.trim(), password, new AuthRepository.AuthCallback() {
            @Override
            public void onSuccess(User user) {
                isLoading.postValue(false);
                userLiveData.postValue(user);
            }

            @Override
            public void onError(String error) {
                isLoading.postValue(false);
                errorMessage.postValue(error);
            }

            @Override
            public void onRoleUnauthorized(String role) {
                isLoading.postValue(false);
                unauthorizedRole.postValue(role);
            }
        });
    }

    public void logout() {
        authRepository.logout();
        userLiveData.setValue(null);
    }

    public SessionManager getSessionManager() {
        return sessionManager;
    }
}
