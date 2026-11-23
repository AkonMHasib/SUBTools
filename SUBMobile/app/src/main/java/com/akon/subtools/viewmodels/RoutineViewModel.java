package com.akon.subtools.viewmodels;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.models.Routine;
import com.akon.subtools.repository.RoutineRepository;
import com.akon.subtools.utils.DepartmentHelper;

import java.util.ArrayList;
import java.util.List;

public class RoutineViewModel extends AndroidViewModel {
    private final RoutineRepository routineRepository;
    private final MutableLiveData<List<Routine>> routineList = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();

    private static final String PREF_LAST_ROUTINE_SYNC = "last_routine_sync_timestamp";

    public RoutineViewModel(@NonNull Application application) {
        super(application);
        this.routineRepository = new RoutineRepository(application);
    }

    public LiveData<List<Routine>> getRoutineList() { return routineList; }
    public LiveData<Boolean> getLoading() { return loading; }
    public LiveData<String> getError() { return error; }

    /**
     * Targeted load: fetches routines matching the user's department and term.
     * Shows cache instantly, then refreshes live data from Firestore.
     */
    public void loadRoutinesForUser(String dept, String term) {
        String deptCode = DepartmentHelper.getDeptCode(dept);
        // 1. Show cached data immediately
        routineRepository.getCachedRoutines(new RoutineRepository.RoutineCallback() {
            @Override
            public void onSuccess(List<Routine> cached) {
                if (cached != null && !cached.isEmpty()) {
                    routineList.postValue(cached);
                }
                // 2. Fetch fresh routines from Firestore to ensure app receives instant admin updates
                fetchRoutinesForUser(deptCode, term);
            }

            @Override
            public void onFailure(Exception e) {
                fetchRoutinesForUser(deptCode, term);
            }
        });
    }

    private void fetchRoutinesForUser(String deptCode, String term) {
        routineRepository.getRoutinesByDeptAndTerm(deptCode, term, new RoutineRepository.RoutineCallback() {
            @Override
            public void onSuccess(List<Routine> routines) {
                SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", Context.MODE_PRIVATE);
                prefs.edit().putLong(PREF_LAST_ROUTINE_SYNC, System.currentTimeMillis()).apply();
                routineList.postValue(routines);
            }

            @Override
            public void onFailure(Exception e) {
                // Ignore silent fetch failures (offline mode)
            }
        });
    }

    /**
     * Generic load (used by CoverPage which needs all routines for teacher lookup).
     */
    public void loadRoutines() {
        routineRepository.getCachedRoutines(new RoutineRepository.RoutineCallback() {
            @Override
            public void onSuccess(List<Routine> cached) {
                if (cached != null && !cached.isEmpty()) {
                    routineList.postValue(cached);
                }
                refreshRoutinesSilently();
            }

            @Override
            public void onFailure(Exception e) {
                refreshRoutinesSilently();
            }
        });
    }

    private void refreshRoutinesSilently() {
        routineRepository.getAllRoutines(new RoutineRepository.RoutineCallback() {
            @Override
            public void onSuccess(List<Routine> routines) {
                SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", Context.MODE_PRIVATE);
                prefs.edit().putLong(PREF_LAST_ROUTINE_SYNC, System.currentTimeMillis()).apply();
                routineList.postValue(routines);
            }

            @Override
            public void onFailure(Exception e) {
                // Ignore silent update failure (offline)
            }
        });
    }

    public void refreshRoutines() {
        loading.setValue(true);
        routineRepository.refreshRoutines(new RoutineRepository.RoutineCallback() {
            @Override
            public void onSuccess(List<Routine> routines) {
                loading.postValue(false);
                SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", Context.MODE_PRIVATE);
                prefs.edit().putLong(PREF_LAST_ROUTINE_SYNC, System.currentTimeMillis()).apply();
                routineList.postValue(routines);
            }

            @Override
            public void onFailure(Exception e) {
                loading.postValue(false);
                error.postValue(e.getMessage());
            }
        });
    }

    /**
     * Filters the routine list to match the student's enrolled subjects and dept/term.
     * Uses DepartmentHelper to normalize department codes consistently.
     */
    public List<Routine> filterPersonalizedRoutine(List<Routine> allRoutines, String department, String term, List<String> studentSubjects) {
        return com.akon.subtools.utils.AcademicHelper.filterPersonalizedRoutine(allRoutines, department, term, "", studentSubjects, null);
    }

    public List<Routine> filterPersonalizedRoutine(List<Routine> allRoutines, String department, String term, String section, List<String> studentSubjects) {
        return com.akon.subtools.utils.AcademicHelper.filterPersonalizedRoutine(allRoutines, department, term, section, studentSubjects, null);
    }

    public List<Routine> filterPersonalizedRoutine(List<Routine> allRoutines, String department, String term, String section, List<String> studentSubjects, List<String> completedSubjects) {
        return com.akon.subtools.utils.AcademicHelper.filterPersonalizedRoutine(allRoutines, department, term, section, studentSubjects, completedSubjects);
    }
}
