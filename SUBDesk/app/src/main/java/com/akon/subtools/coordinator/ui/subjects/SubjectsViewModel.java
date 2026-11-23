package com.akon.subtools.coordinator.ui.subjects;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.coordinator.data.model.Subject;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.data.repository.SubjectRepository;

import java.util.ArrayList;
import java.util.List;

public class SubjectsViewModel extends AndroidViewModel {

    private final SubjectRepository subjectRepository;
    private final SessionManager sessionManager;

    private final MutableLiveData<List<Subject>> rawSubjectsLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<List<Subject>> filteredSubjectsLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> toastMessage = new MutableLiveData<>();

    private String searchQuery = "";

    public SubjectsViewModel(@NonNull Application application) {
        super(application);
        this.subjectRepository = new SubjectRepository();
        this.sessionManager = new SessionManager(application);
    }

    public LiveData<List<Subject>> getFilteredSubjectsLiveData() { return filteredSubjectsLiveData; }
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getToastMessage() { return toastMessage; }

    public void loadSubjects() {
        loadSubjects(false);
    }

    public void forceRefresh() {
        loadSubjects(true);
    }

    public void loadSubjects(boolean forceRefresh) {
        isLoading.setValue(true);
        String dept = sessionManager.getDepartment();
        subjectRepository.getSubjectsForDepartment(dept, forceRefresh, new SubjectRepository.DataCallback<List<Subject>>() {
            @Override
            public void onSuccess(List<Subject> data) {
                isLoading.setValue(false);
                rawSubjectsLiveData.setValue(data != null ? data : new ArrayList<>());
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

    private void applyFilter() {
        List<Subject> all = rawSubjectsLiveData.getValue();
        if (all == null) return;

        String userDept = sessionManager.getDepartment();
        String userDeptCode = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(userDept);
        boolean isAll = com.akon.subtools.coordinator.utils.DepartmentUtils.isAllDepartments(userDept);

        List<Subject> filtered = new ArrayList<>();
        for (Subject s : all) {
            if (s == null) continue;
            String sDept = s.getDepartment() != null ? s.getDepartment() : "";
            String sDeptCode = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(sDept);
            boolean deptMatch = isAll || userDeptCode.isEmpty() || userDeptCode.equalsIgnoreCase(sDeptCode);

            boolean matches = deptMatch && (searchQuery.isEmpty() ||
                    (s.getName() != null && s.getName().toLowerCase().contains(searchQuery)) ||
                    (s.getCode() != null && s.getCode().toLowerCase().contains(searchQuery)));

            if (matches) {
                filtered.add(s);
            }
        }
        filteredSubjectsLiveData.setValue(filtered);
    }

    public void addSubject(Subject subject) {
        isLoading.setValue(true);
        subjectRepository.addSubject(subject, new SubjectRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                isLoading.setValue(false);
                toastMessage.setValue("Subject added successfully");
                loadSubjects();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void updateSubject(Subject subject) {
        isLoading.setValue(true);
        subjectRepository.updateSubject(subject, new SubjectRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                isLoading.setValue(false);
                toastMessage.setValue("Subject updated successfully");
                loadSubjects();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void deleteSubject(String code) {
        isLoading.setValue(true);
        subjectRepository.deleteSubject(code, new SubjectRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                isLoading.setValue(false);
                toastMessage.setValue("Subject deleted");
                loadSubjects();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }
}
