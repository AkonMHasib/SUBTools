package com.akon.subtools.viewmodels;

import android.app.Application;
import android.graphics.Bitmap;
import android.net.Uri;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.models.User;
import com.akon.subtools.repository.UserRepository;
import com.akon.subtools.utils.CacheManager;

import java.util.ArrayList;
import java.util.List;

public class UserViewModel extends AndroidViewModel {
    private final UserRepository userRepository;
    private final CacheManager cacheManager;
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();
    private final MutableLiveData<Boolean> profileUpdated = new MutableLiveData<>(false);
    private final MutableLiveData<String> photoUploadedUrl = new MutableLiveData<>();
    private final MutableLiveData<Boolean> subjectsUpdated = new MutableLiveData<>(false);

    public UserViewModel(@NonNull Application application) {
        super(application);
        this.userRepository = new UserRepository(application);
        this.cacheManager = new CacheManager(application);
    }

    public LiveData<Boolean> getLoading() { return loading; }
    public LiveData<String> getError() { return error; }
    public LiveData<Boolean> getProfileUpdated() { return profileUpdated; }
    public LiveData<String> getPhotoUploadedUrl() { return photoUploadedUrl; }
    public LiveData<Boolean> getSubjectsUpdated() { return subjectsUpdated; }

    public void clearStatus() {
        profileUpdated.setValue(false);
        subjectsUpdated.setValue(false);
        error.setValue(null);
    }

    private void persistUserLocally(User user) {
        if (user != null) {
            cacheManager.save("user_profile", user);
            com.akon.subtools.database.AppDatabase.setCachedLocalUser(user);
            com.akon.subtools.database.AppDatabase.databaseWriteExecutor.execute(() -> {
                try {
                    com.akon.subtools.database.AppDatabase.getDatabase(getApplication()).userDao().insertUser(user);
                } catch (Exception ignored) {}
            });
        }
    }

    public void updateProfile(String uid, String phone) {
        loading.setValue(true);
        userRepository.updateUserPhone(uid, phone, new UserRepository.UserCallback<>() {
            @Override
            public void onSuccess(Void result) {
                // Update local cache
                User cachedUser = cacheManager.getObject("user_profile", User.class);
                if (cachedUser != null) {
                    cachedUser.setPhone(phone);
                    persistUserLocally(cachedUser);
                }
                loading.setValue(false);
                profileUpdated.setValue(true);
            }

            @Override
            public void onFailure(Exception e) {
                loading.setValue(false);
                error.setValue(e.getMessage());
            }
        });
    }

    public void uploadProfilePhoto(String uid, Uri fileUri) {
        loading.setValue(true);
        userRepository.uploadProfileImage(uid, fileUri, new UserRepository.UserCallback<>() {
            @Override
            public void onSuccess(String downloadUrl) {
                // Update local cache photoURL
                User cachedUser = cacheManager.getObject("user_profile", User.class);
                if (cachedUser != null) {
                    cachedUser.setPhotoURL(downloadUrl);
                    persistUserLocally(cachedUser);
                }
                loading.setValue(false);
                photoUploadedUrl.setValue(downloadUrl);
            }

            @Override
            public void onFailure(Exception e) {
                loading.setValue(false);
                error.setValue(e.getMessage());
            }
        });
    }

    public void uploadProfilePhotoBitmap(String uid, Bitmap bitmap) {
        loading.setValue(true);
        userRepository.uploadProfileImageFromBitmap(uid, bitmap, new UserRepository.UserCallback<>() {
            @Override
            public void onSuccess(String downloadUrl) {
                User cachedUser = cacheManager.getObject("user_profile", User.class);
                if (cachedUser != null) {
                    cachedUser.setPhotoURL(downloadUrl);
                    persistUserLocally(cachedUser);
                }
                loading.setValue(false);
                photoUploadedUrl.setValue(downloadUrl);
            }

            @Override
            public void onFailure(Exception e) {
                loading.setValue(false);
                error.setValue(e.getMessage());
            }
        });
    }

    public void saveUserSubjects(String uid, List<String> subjects) {
        List<String> uniqueSubjects = new ArrayList<>();
        if (subjects != null) {
            for (String s : subjects) {
                if (s != null && !s.trim().isEmpty() && !uniqueSubjects.contains(s.trim())) {
                    uniqueSubjects.add(s.trim());
                }
            }
        }
        userRepository.updateSelectedSubjects(uid, uniqueSubjects, new UserRepository.UserCallback<>() {
            @Override
            public void onSuccess(Void result) {
                // Update local cache subjects list
                User cachedUser = cacheManager.getObject("user_profile", User.class);
                if (cachedUser != null) {
                    cachedUser.setSubjects(uniqueSubjects);
                    persistUserLocally(cachedUser);
                }
                subjectsUpdated.setValue(true);
            }

            @Override
            public void onFailure(Exception e) {
                loading.setValue(false);
                error.setValue(e.getMessage());
            }
        });
    }

    public void updateAcademicInfo(String uid, String section, String academicLevel) {
        loading.setValue(true);
        userRepository.updateAcademicInfo(uid, section, academicLevel, new UserRepository.UserCallback<Void>() {
            @Override
            public void onSuccess(Void result) {
                User cachedUser = cacheManager.getObject("user_profile", User.class);
                if (cachedUser != null) {
                    cachedUser.setSection(section != null ? section.trim() : "");
                    cachedUser.setAcademicLevel(academicLevel != null ? academicLevel.trim() : "");
                    persistUserLocally(cachedUser);
                }
                loading.setValue(false);
                profileUpdated.setValue(true);
            }

            @Override
            public void onFailure(Exception e) {
                loading.setValue(false);
                error.setValue(e.getMessage());
            }
        });
    }

    public void savePersonalDetails(String uid, String phone, String dob, String bloodGroup, boolean isDonor, String location) {
        loading.setValue(true);
        userRepository.updatePersonalDetails(uid, phone, dob, bloodGroup, isDonor, location, new UserRepository.UserCallback<Void>() {
            @Override
            public void onSuccess(Void result) {
                User cachedUser = cacheManager.getObject("user_profile", User.class);
                if (cachedUser != null) {
                    cachedUser.setPhone(phone != null ? phone.trim() : "");
                    cachedUser.setDob(dob != null ? dob.trim() : "");
                    cachedUser.setBloodGroup(bloodGroup != null ? bloodGroup.trim() : "");
                    cachedUser.setAllowBloodDonation(isDonor);
                    cachedUser.setDonor(isDonor);
                    cachedUser.setLocation(location != null ? location.trim() : "");
                    cachedUser.setArea(location != null ? location.trim() : "");
                    persistUserLocally(cachedUser);
                }
                loading.setValue(false);
                profileUpdated.setValue(true);
            }

            @Override
            public void onFailure(Exception e) {
                loading.setValue(false);
                error.setValue(e.getMessage());
            }
        });
    }

    public void saveCompletedSubjects(String uid, List<String> completedSubjects, double completedCredits) {
        List<String> uniqueCompleted = new ArrayList<>();
        if (completedSubjects != null) {
            for (String s : completedSubjects) {
                if (s != null && !s.trim().isEmpty() && !uniqueCompleted.contains(s.trim())) {
                    uniqueCompleted.add(s.trim());
                }
            }
        }
        userRepository.updateCompletedSubjects(uid, uniqueCompleted, completedCredits, new UserRepository.UserCallback<Void>() {
            @Override
            public void onSuccess(Void result) {
                User cachedUser = cacheManager.getObject("user_profile", User.class);
                if (cachedUser != null) {
                    cachedUser.setCompletedSubjects(uniqueCompleted);
                    cachedUser.setCompletedCredits(completedCredits);
                    persistUserLocally(cachedUser);
                }
                subjectsUpdated.setValue(true);
            }

            @Override
            public void onFailure(Exception e) {
                loading.setValue(false);
                error.setValue(e.getMessage());
            }
        });
    }

    public void saveManualCompletedCredits(String uid, double completedCredits) {
        User cachedUser = cacheManager.getObject("user_profile", User.class);
        List<String> subjects = (cachedUser != null && cachedUser.getCompletedSubjects() != null)
                ? cachedUser.getCompletedSubjects() : new ArrayList<>();
        saveCompletedSubjects(uid, subjects, completedCredits);
    }
}
