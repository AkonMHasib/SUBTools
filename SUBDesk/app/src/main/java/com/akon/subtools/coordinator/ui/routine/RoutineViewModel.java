package com.akon.subtools.coordinator.ui.routine;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.data.repository.RoutineRepository;
import com.akon.subtools.coordinator.data.repository.SessionManager;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class RoutineViewModel extends AndroidViewModel {

    private final RoutineRepository routineRepository;
    private final SessionManager sessionManager;

    private final MutableLiveData<List<ClassRoutine>> rawRoutinesLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<List<ClassRoutine>> filteredRoutinesLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> toastMessage = new MutableLiveData<>();

    private final Set<String> selectedRoutineIds = new HashSet<>();
    private final MutableLiveData<Integer> selectedCountLiveData = new MutableLiveData<>(0);

    private String searchQuery = "";
    private String selectedTerm = "All Terms";
    private String selectedDay = "All Days";
    private String selectedType = "All Routines";

    public RoutineViewModel(@NonNull Application application) {
        super(application);
        this.routineRepository = new RoutineRepository();
        this.sessionManager = new SessionManager(application);
    }

    public LiveData<List<ClassRoutine>> getFilteredRoutinesLiveData() { return filteredRoutinesLiveData; }
    public LiveData<List<ClassRoutine>> getRawRoutinesLiveData() { return rawRoutinesLiveData; }
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getToastMessage() { return toastMessage; }
    public LiveData<Integer> getSelectedCountLiveData() { return selectedCountLiveData; }

    public String getDepartment() { return sessionManager.getDepartment(); }

    public void loadRoutines() {
        loadRoutines(false);
    }

    public void forceRefresh() {
        loadRoutines(true);
    }

    public void loadRoutines(boolean forceRefresh) {
        isLoading.setValue(true);
        routineRepository.getRoutines(sessionManager.getDepartment(), forceRefresh, new RoutineRepository.DataCallback<List<ClassRoutine>>() {
            @Override
            public void onSuccess(List<ClassRoutine> data) {
                isLoading.setValue(false);
                rawRoutinesLiveData.setValue(data);
                applyFilters();
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
        applyFilters();
    }

    public void setTermFilter(String term) {
        this.selectedTerm = term;
        applyFilters();
    }

    public void setDayFilter(String day) {
        this.selectedDay = day;
        applyFilters();
    }

    public void setTypeFilter(String type) {
        this.selectedType = type;
        applyFilters();
    }

    private void applyFilters() {
        List<ClassRoutine> all = rawRoutinesLiveData.getValue();
        if (all == null) return;

        List<ClassRoutine> filtered = new ArrayList<>();
        for (ClassRoutine item : all) {
            // Search match
            boolean matchesSearch = searchQuery.isEmpty() ||
                    (item.getSubject() != null && item.getSubject().toLowerCase().contains(searchQuery)) ||
                    (item.getCode() != null && item.getCode().toLowerCase().contains(searchQuery)) ||
                    (item.getClassroom() != null && item.getClassroom().toLowerCase().contains(searchQuery)) ||
                    (item.getFormattedTeachers() != null && item.getFormattedTeachers().toLowerCase().contains(searchQuery));

            if (!matchesSearch) continue;

            // Term match (flexible hyphen / space / digit matching e.g. "Term-1" vs "Studio 1")
            if (!"All Terms".equalsIgnoreCase(selectedTerm) && !"All Studios".equalsIgnoreCase(selectedTerm) && !"All".equalsIgnoreCase(selectedTerm)) {
                String itemTerm = item.getTerm() != null ? item.getTerm() : (item.getAcademicLevel() != null ? item.getAcademicLevel() : "");
                if (!itemTerm.equalsIgnoreCase("All") && !itemTerm.equalsIgnoreCase("All Terms") && !itemTerm.equalsIgnoreCase("All Studios")) {
                    String normItemTerm = itemTerm.replaceAll("[^0-9]", "");
                    String normSelectedTerm = selectedTerm.replaceAll("[^0-9]", "");
                    if (!normSelectedTerm.isEmpty()) {
                        if (!normItemTerm.contains(normSelectedTerm) && !itemTerm.toLowerCase().contains(selectedTerm.toLowerCase())) {
                            continue;
                        }
                    } else if (!itemTerm.toLowerCase().contains(selectedTerm.toLowerCase())) {
                        continue;
                    }
                }
            }

            // Day match
            if (!"All Days".equalsIgnoreCase(selectedDay) && !"All".equalsIgnoreCase(selectedDay) && item.getDay() != null && !item.getDay().equalsIgnoreCase(selectedDay)) {
                continue;
            }

            // Type match
            if ("Regular Only".equalsIgnoreCase(selectedType) && item.isTemporary()) {
                continue;
            }
            if ("Temporary Only".equalsIgnoreCase(selectedType) && !item.isTemporary()) {
                continue;
            }

            // Maintain selection state
            item.setSelected(selectedRoutineIds.contains(item.getId()));
            filtered.add(item);
        }

        // Sort by day order then start time
        List<String> dayOrder = Arrays.asList(
                "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday");
        Collections.sort(filtered, (a, b) -> {
            int dayA = dayOrder.indexOf(a.getDay() != null ? a.getDay() : "");
            int dayB = dayOrder.indexOf(b.getDay() != null ? b.getDay() : "");
            if (dayA < 0) dayA = Integer.MAX_VALUE;
            if (dayB < 0) dayB = Integer.MAX_VALUE;
            if (dayA != dayB) return Integer.compare(dayA, dayB);
            String tA = a.getStartTime() != null ? a.getStartTime() : "";
            String tB = b.getStartTime() != null ? b.getStartTime() : "";
            return tA.compareToIgnoreCase(tB);
        });

        filteredRoutinesLiveData.setValue(filtered);
    }

    public void toggleSelection(ClassRoutine item) {
        if (item.isSelected()) {
            item.setSelected(false);
            selectedRoutineIds.remove(item.getId());
        } else {
            item.setSelected(true);
            selectedRoutineIds.add(item.getId());
        }
        selectedCountLiveData.setValue(selectedRoutineIds.size());
        applyFilters();
    }

    public void clearSelection() {
        selectedRoutineIds.clear();
        selectedCountLiveData.setValue(0);
        applyFilters();
    }

    public void executeBulkDelete() {
        if (selectedRoutineIds.isEmpty()) return;

        List<String> idsToDelete = new ArrayList<>(selectedRoutineIds);
        isLoading.setValue(true);

        routineRepository.bulkDeleteRoutines(idsToDelete, new RoutineRepository.DataCallback<Integer>() {
            @Override
            public void onSuccess(Integer count) {
                isLoading.setValue(false);
                toastMessage.setValue("Successfully deleted " + count + " routines.");
                clearSelection();
                forceRefresh();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void deleteSingleRoutine(String routineId) {
        routineRepository.deleteRoutine(routineId, new RoutineRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                toastMessage.setValue("Routine deleted.");
                forceRefresh();
            }

            @Override
            public void onError(String errorMessage) {
                toastMessage.setValue(errorMessage);
            }
        });
    }
}
