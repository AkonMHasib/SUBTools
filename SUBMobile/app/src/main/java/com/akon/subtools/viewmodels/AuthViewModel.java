package com.akon.subtools.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.models.User;
import com.akon.subtools.repository.AuthRepository;
import com.akon.subtools.utils.CacheManager;

import java.util.List;

public class AuthViewModel extends AndroidViewModel {
    private final AuthRepository authRepository;
    private final CacheManager cacheManager;
    private final MutableLiveData<User> userLiveData = new MutableLiveData<>();
    private final MutableLiveData<String> errorLiveData = new MutableLiveData<>();
    private final MutableLiveData<Boolean> loadingLiveData = new MutableLiveData<>();
    private final MutableLiveData<Boolean> signupSuccessLiveData = new MutableLiveData<>();
    private final MutableLiveData<Boolean> forgotPasswordSuccessLiveData = new MutableLiveData<>();
    private final MutableLiveData<String> verificationResentMessageLiveData = new MutableLiveData<>();

    public AuthViewModel(@NonNull Application application) {
        super(application);
        this.authRepository = new AuthRepository(application);
        this.cacheManager = new CacheManager(application);
        checkCurrentUserSession();
    }

    public LiveData<User> getUserLiveData() { return userLiveData; }
    public LiveData<String> getErrorLiveData() { return errorLiveData; }
    public LiveData<Boolean> getLoadingLiveData() { return loadingLiveData; }
    public LiveData<Boolean> getSignupSuccessLiveData() { return signupSuccessLiveData; }
    public LiveData<Boolean> getForgotPasswordSuccessLiveData() { return forgotPasswordSuccessLiveData; }
    public LiveData<String> getVerificationResentMessageLiveData() { return verificationResentMessageLiveData; }

    public void clearErrors() {
        errorLiveData.setValue(null);
    }

    public void updateLocalUserSubjects(List<String> subjects) {
        User current = userLiveData.getValue();
        if (current == null) {
            current = cacheManager.getObject("user_profile", User.class);
        }
        if (current != null) {
            current.setSubjects(subjects != null ? subjects : new java.util.ArrayList<>());
            cacheManager.save("user_profile", current);
            com.akon.subtools.database.AppDatabase.setCachedLocalUser(current);
            final User toSave = current;
            com.akon.subtools.database.AppDatabase.databaseWriteExecutor.execute(() -> {
                try {
                    com.akon.subtools.database.AppDatabase.getDatabase(getApplication()).userDao().insertUser(toSave);
                } catch (Exception ignored) {}
            });
            userLiveData.setValue(current);
        }
    }

    public void checkCurrentUserSession() {
        // Fast-path: immediately populate userLiveData from SharedPreferences cache so UI is not blank
        User local = cacheManager.getObject("user_profile", User.class);
        if (local != null && local.getUid() != null && !local.getUid().isEmpty()) {
            userLiveData.setValue(local);
            com.akon.subtools.database.AppDatabase.setCachedLocalUser(local);
        }

        authRepository.getActiveLocalUser(new AuthRepository.AuthCallback<>() {
            @Override
            public void onSuccess(User cached) {
                if (cached != null && cached.getUid() != null && !cached.getUid().isEmpty()) {
                    userLiveData.postValue(cached);
                    com.akon.subtools.database.AppDatabase.setCachedLocalUser(cached);
                    fetchFreshProfile(cached.getUid());
                } else if (local != null && local.getUid() != null && !local.getUid().isEmpty()) {
                    fetchFreshProfile(local.getUid());
                }
            }

            @Override
            public void onFailure(Exception e) {
                if (local != null && local.getUid() != null && !local.getUid().isEmpty()) {
                    fetchFreshProfile(local.getUid());
                }
            }
        });
    }

    private void fetchFreshProfile(String uid) {
        authRepository.fetchUserProfile(uid, new AuthRepository.AuthCallback<>() {
            @Override
            public void onSuccess(User result) {
                if (result != null) {
                    cacheManager.save("user_profile", result);
                    com.akon.subtools.database.AppDatabase.setCachedLocalUser(result);
                    userLiveData.postValue(result);

                    // Re-sync routines & notices with the fresh profile's latest subjects
                    try {
                        com.akon.subtools.cache.BackgroundSyncManager.getInstance(getApplication()).syncExpiredCachesSilently();
                    } catch (Exception ignored) {}
                }

                // Save profile sync time
                android.content.SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                prefs.edit().putLong("last_profile_sync_timestamp", System.currentTimeMillis()).apply();
            }

            @Override
            public void onFailure(Exception e) {
                // Ignore silent fetch failures (e.g. offline)
            }
        });
    }

    public void refreshCurrentUserSession() {
        authRepository.getActiveLocalUser(new AuthRepository.AuthCallback<>() {
            @Override
            public void onSuccess(User cached) {
                String uid = (cached != null && cached.getUid() != null && !cached.getUid().isEmpty()) ? cached.getUid() : null;
                if (uid != null) {
                    loadingLiveData.setValue(true);
                    authRepository.fetchUserProfile(uid, new AuthRepository.AuthCallback<>() {
                        @Override
                        public void onSuccess(User result) {
                            loadingLiveData.setValue(false);
                            cacheManager.save("user_profile", result);
                            userLiveData.setValue(result);

                            // Save sync time
                            android.content.SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                            prefs.edit().putLong("last_profile_sync_timestamp", System.currentTimeMillis()).apply();
                        }

                        @Override
                        public void onFailure(Exception e) {
                            loadingLiveData.setValue(false);
                            errorLiveData.setValue(e.getMessage());
                        }
                    });
                }
            }

            @Override
            public void onFailure(Exception e) {}
        });
    }

    public void login(String email, String password) {
        loadingLiveData.setValue(true);
        errorLiveData.setValue(null);
        authRepository.login(email, password, new AuthRepository.AuthCallback<>() {
            @Override
            public void onSuccess(User result) {
                loadingLiveData.setValue(false);
                if (result != null) {
                    cacheManager.save("user_profile", result);
                    com.akon.subtools.database.AppDatabase.setCachedLocalUser(result);
                }
                userLiveData.setValue(result);
            }

            @Override
            public void onFailure(Exception e) {
                loadingLiveData.setValue(false);
                errorLiveData.setValue(e.getMessage());
            }
        });
    }

    public void signup(User user, String password) {
        loadingLiveData.setValue(true);
        errorLiveData.setValue(null);
        authRepository.signup(user, password, new AuthRepository.AuthCallback<>() {
            @Override
            public void onSuccess(User result) {
                loadingLiveData.setValue(false);
                signupSuccessLiveData.setValue(true);
            }

            @Override
            public void onFailure(Exception e) {
                loadingLiveData.setValue(false);
                errorLiveData.setValue(e.getMessage());
            }
        });
    }

    public void resendVerificationEmail(String uid) {
        loadingLiveData.setValue(true);
        errorLiveData.setValue(null);
        authRepository.resendVerificationEmail(uid, new AuthRepository.AuthCallback<>() {
            @Override
            public void onSuccess(Void result) {
                loadingLiveData.setValue(false);
                verificationResentMessageLiveData.setValue("Verification email resent successfully!");
            }

            @Override
            public void onFailure(Exception e) {
                loadingLiveData.setValue(false);
                errorLiveData.setValue(e.getMessage());
            }
        });
    }

    public void forgotPassword(String email) {
        loadingLiveData.setValue(true);
        errorLiveData.setValue(null);
        authRepository.forgotPassword(email, new AuthRepository.AuthCallback<>() {
            @Override
            public void onSuccess(Void result) {
                loadingLiveData.setValue(false);
                forgotPasswordSuccessLiveData.setValue(true);
            }

            @Override
            public void onFailure(Exception e) {
                loadingLiveData.setValue(false);
                errorLiveData.setValue(e.getMessage());
            }
        });
    }

    public void logout() {
        authRepository.logout();
        userLiveData.setValue(null);
        cacheManager.clearAll();
        com.akon.subtools.database.AppDatabase.clearCachedLocalUser();
    }
}
