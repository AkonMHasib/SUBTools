package com.akon.subtools.coordinator.ui.students;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.data.repository.StudentRepository;

import java.util.ArrayList;
import java.util.List;

public class StudentsViewModel extends AndroidViewModel {

    private final StudentRepository studentRepository;
    private final SessionManager sessionManager;

    private final MutableLiveData<List<User>> rawStudentsLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<List<User>> filteredStudentsLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> toastMessage = new MutableLiveData<>();

    private String searchQuery = "";

    public StudentsViewModel(@NonNull Application application) {
        super(application);
        this.studentRepository = new StudentRepository();
        this.sessionManager = new SessionManager(application);
    }

    public LiveData<List<User>> getFilteredStudentsLiveData() { return filteredStudentsLiveData; }
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getToastMessage() { return toastMessage; }

    public void loadStudents() {
        loadStudents(false);
    }

    public void forceRefresh() {
        loadStudents(true);
    }

    public void loadStudents(boolean forceRefresh) {
        isLoading.setValue(true);
        studentRepository.getDepartmentStudents(sessionManager.getDepartment(), forceRefresh, new StudentRepository.DataCallback<List<User>>() {
            @Override
            public void onSuccess(List<User> data) {
                isLoading.setValue(false);
                rawStudentsLiveData.setValue(data);
                applySearch();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void setSearchQuery(String query) {
        this.searchQuery = query != null ? query.toLowerCase().trim() : "";
        applySearch();
    }

    private void applySearch() {
        List<User> all = rawStudentsLiveData.getValue();
        if (all == null) return;

        List<User> filtered = new ArrayList<>();
        for (User u : all) {
            boolean matches = searchQuery.isEmpty() ||
                    (u.getName() != null && u.getName().toLowerCase().contains(searchQuery)) ||
                    (u.getStudentId() != null && u.getStudentId().toLowerCase().contains(searchQuery)) ||
                    (u.getBatch() != null && u.getBatch().toLowerCase().contains(searchQuery));

            if (matches) {
                filtered.add(u);
            }
        }
        filteredStudentsLiveData.setValue(filtered);
    }

    public void updateStudentStatus(String uid, String newStatus) {
        isLoading.setValue(true);
        studentRepository.updateStudentStatus(uid, newStatus, new StudentRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                toastMessage.setValue("Student status updated to " + newStatus);
                loadStudents();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void toggleStudentVerification(String uid, boolean isVerified) {
        isLoading.setValue(true);
        studentRepository.toggleStudentVerification(uid, isVerified, new StudentRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                toastMessage.setValue("Verification status updated to " + (isVerified ? "Verified" : "Unverified"));
                loadStudents();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }
}
