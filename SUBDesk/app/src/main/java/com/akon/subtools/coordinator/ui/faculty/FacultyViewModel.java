package com.akon.subtools.coordinator.ui.faculty;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.coordinator.data.model.Faculty;
import com.akon.subtools.coordinator.data.repository.FacultyRepository;
import com.akon.subtools.coordinator.data.repository.SessionManager;

import java.util.ArrayList;
import java.util.List;

public class FacultyViewModel extends AndroidViewModel {

    private final FacultyRepository facultyRepository;
    private final SessionManager sessionManager;

    private final MutableLiveData<List<Faculty>> rawFacultyLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<List<Faculty>> filteredFacultyLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> toastMessage = new MutableLiveData<>();

    private String searchQuery = "";
    private String selectedDept = "All";

    public FacultyViewModel(@NonNull Application application) {
        super(application);
        this.facultyRepository = new FacultyRepository();
        this.sessionManager = new SessionManager(application);
        this.selectedDept = sessionManager.getDepartment();
    }

    public LiveData<List<Faculty>> getFilteredFacultyLiveData() { return filteredFacultyLiveData; }
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getToastMessage() { return toastMessage; }

    public void loadFaculty() {
        loadFaculty(false);
    }

    public void forceRefresh() {
        loadFaculty(true);
    }

    public void loadFaculty(boolean forceRefresh) {
        isLoading.setValue(true);
        // Coordinator sees their department by default; Admin sees all
        facultyRepository.getDepartmentFaculty(sessionManager.getDepartment(), forceRefresh, new FacultyRepository.DataCallback<List<Faculty>>() {
            @Override
            public void onSuccess(List<Faculty> data) {
                isLoading.setValue(false);
                rawFacultyLiveData.setValue(data);
                applyFilter();
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
        applyFilter();
    }

    public void setSelectedDept(String dept) {
        this.selectedDept = dept != null ? dept.trim() : "All";
        applyFilter();
    }

    private void applyFilter() {
        List<Faculty> all = rawFacultyLiveData.getValue();
        if (all == null) return;

        List<Faculty> filtered = new ArrayList<>();
        for (Faculty f : all) {
            boolean matchesSearch = searchQuery.isEmpty() ||
                    (f.getName() != null && f.getName().toLowerCase().contains(searchQuery)) ||
                    (f.getDesignation() != null && f.getDesignation().toLowerCase().contains(searchQuery)) ||
                    (f.getRank() != null && f.getRank().toLowerCase().contains(searchQuery));

            boolean matchesDept = "All".equalsIgnoreCase(selectedDept) ||
                    (f.getDepartment() != null && com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(f.getDepartment())
                            .equalsIgnoreCase(com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(selectedDept)));

            if (matchesSearch && matchesDept) {
                filtered.add(f);
            }
        }
        filteredFacultyLiveData.setValue(filtered);
    }

    public void deleteFaculty(String facultyId) {
        isLoading.setValue(true);
        facultyRepository.deleteFaculty(facultyId, new FacultyRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                isLoading.setValue(false);
                toastMessage.setValue("Faculty deleted successfully");
                loadFaculty();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue("Error deleting faculty: " + errorMessage);
            }
        });
    }
}
