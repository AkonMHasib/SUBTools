package com.akon.subtools.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.models.Subject;
import com.akon.subtools.repository.SubjectRepository;
import com.akon.subtools.utils.DepartmentHelper;

import java.util.ArrayList;
import java.util.List;

public class SubjectViewModel extends AndroidViewModel {
    private final SubjectRepository subjectRepository;
    private final MutableLiveData<List<Subject>> subjectsList = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();

    public SubjectViewModel(@NonNull Application application) {
        super(application);
        this.subjectRepository = new SubjectRepository(application);
    }

    public LiveData<List<Subject>> getSubjectsList() { return subjectsList; }
    public LiveData<Boolean> getLoading() { return loading; }
    public LiveData<String> getError() { return error; }

    /**
     * Targeted load: fetches subjects for the user's department shortcode.
     * Shows cache instantly, then refreshes from Firestore.
     */
    public void loadSubjectsForDept(String dept) {
        String deptCode = DepartmentHelper.getDeptCode(dept);

        // 1. Show cached data immediately
        subjectRepository.getCachedSubjects(new SubjectRepository.SubjectCallback() {
            @Override
            public void onSuccess(List<Subject> cached) {
                if (cached != null && !cached.isEmpty()) {
                    subjectsList.postValue(cached);
                }
                // 2. Always refresh if cache empty or sync required
                android.content.SharedPreferences prefs = getApplication()
                        .getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                long lastSync = prefs.getLong("last_subjects_sync_timestamp", 0);
                boolean cacheEmpty = (cached == null || cached.isEmpty());
                if (cacheEmpty || com.akon.subtools.sync.SyncWorker.isSyncRequired(lastSync)) {
                    fetchSubjectsForDept(deptCode);
                }
            }

            @Override
            public void onFailure(Exception e) {
                fetchSubjectsForDept(deptCode);
            }
        });
    }

    private void fetchSubjectsForDept(String deptCode) {
        subjectRepository.getSubjectsByDepartment(deptCode, new SubjectRepository.SubjectCallback() {
            @Override
            public void onSuccess(List<Subject> subjects) {
                android.content.SharedPreferences prefs = getApplication()
                        .getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                prefs.edit().putLong("last_subjects_sync_timestamp", System.currentTimeMillis()).apply();
                subjectsList.postValue(subjects);
            }

            @Override
            public void onFailure(Exception e) {
                // Ignore silent failure (offline)
            }
        });
    }

    /**
     * Generic load (broad fetch — used as fallback when no dept known).
     */
    public void loadSubjects() {
        subjectRepository.getCachedSubjects(new SubjectRepository.SubjectCallback() {
            @Override
            public void onSuccess(List<Subject> subjects) {
                if (subjects != null && !subjects.isEmpty()) {
                    subjectsList.postValue(subjects);
                }
                android.content.SharedPreferences prefs = getApplication()
                        .getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                long lastSync = prefs.getLong("last_subjects_sync_timestamp", 0);
                boolean cacheEmpty = (subjects == null || subjects.isEmpty());
                if (cacheEmpty || com.akon.subtools.sync.SyncWorker.isSyncRequired(lastSync)) {
                    refreshSubjectsSilently();
                }
            }

            @Override
            public void onFailure(Exception e) {
                refreshSubjectsSilently();
            }
        });
    }

    private void refreshSubjectsSilently() {
        subjectRepository.getAllSubjects(new SubjectRepository.SubjectCallback() {
            @Override
            public void onSuccess(List<Subject> subjects) {
                android.content.SharedPreferences prefs = getApplication()
                        .getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                prefs.edit().putLong("last_subjects_sync_timestamp", System.currentTimeMillis()).apply();
                subjectsList.postValue(subjects);
            }

            @Override
            public void onFailure(Exception e) {
                // Ignore silent failure (offline)
            }
        });
    }

    public void refreshSubjects() {
        loading.setValue(true);
        subjectRepository.getAllSubjects(new SubjectRepository.SubjectCallback() {
            @Override
            public void onSuccess(List<Subject> subjects) {
                loading.setValue(false);
                android.content.SharedPreferences prefs = getApplication()
                        .getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE);
                prefs.edit().putLong("last_subjects_sync_timestamp", System.currentTimeMillis()).apply();
                subjectsList.setValue(subjects);
            }

            @Override
            public void onFailure(Exception e) {
                loading.setValue(false);
                error.setValue(e.getMessage());
            }
        });
    }
}
