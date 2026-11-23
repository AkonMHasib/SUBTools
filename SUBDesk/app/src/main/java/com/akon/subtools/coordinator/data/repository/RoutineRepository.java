package com.akon.subtools.coordinator.data.repository;

import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.utils.AppCache;
import com.akon.subtools.coordinator.utils.DepartmentUtils;
import com.akon.subtools.coordinator.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class RoutineRepository {

    public interface DataCallback<T> {
        void onSuccess(T data);
        void onError(String errorMessage);
    }

    private static final String CACHE_PREFIX = "routines_";

    public RoutineRepository() {}

    public void getRoutines(String department, DataCallback<List<ClassRoutine>> callback) {
        getRoutines(department, false, callback);
    }

    public void getRoutines(String department, boolean forceRefresh, DataCallback<List<ClassRoutine>> callback) {
        boolean isAll = DepartmentUtils.isAllDepartments(department);
        String deptCode = isAll ? "ALL" : DepartmentUtils.getDepartmentCode(department);
        String cacheKey = CACHE_PREFIX + deptCode;
        java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<List<ClassRoutine>>(){}.getType();

        if (!forceRefresh) {
            List<ClassRoutine> cached = AppCache.get(cacheKey, type);
            if (cached != null && !cached.isEmpty()) {
                callback.onSuccess(cached);
                return;
            }
        } else {
            AppCache.invalidate(cacheKey);
        }

        String query = "select=*&order=day.asc";

        SupabaseAuthBridge.queryTable("routines", query, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                List<ClassRoutine> routines = new ArrayList<>();
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.getJSONObject(i);
                        ClassRoutine r = ClassRoutine.fromJson(obj);
                        if (r != null) {
                            if (!isAll) {
                                String rDeptCode = DepartmentUtils.getDepartmentCode(r.getDepartment());
                                if (!deptCode.equalsIgnoreCase(rDeptCode)) {
                                    continue;
                                }
                            }
                            routines.add(r);
                        }
                    }
                    AppCache.put(cacheKey, routines, AppCache.TTL_SHORT);
                    callback.onSuccess(routines);
                } catch (Exception e) {
                    callback.onError("Failed to parse routines: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to fetch routines from Supabase: " + errorMessage);
            }
        });
    }

    public void addOrUpdateRoutine(ClassRoutine routine, DataCallback<Void> callback) {
        if (routine == null) {
            callback.onError("Routine cannot be null");
            return;
        }

        boolean isUpdate = (routine.getId() != null && !routine.getId().trim().isEmpty());
        if (!isUpdate) {
            routine.setId(UUID.randomUUID().toString());
        }

        JSONObject payload = routine.toSupabaseJson();

        if (isUpdate) {
            try {
                String filter = "id=eq." + URLEncoder.encode(routine.getId().trim(), StandardCharsets.UTF_8.name());
                SupabaseAuthBridge.updateRecord("routines", filter, payload, new SupabaseAuthBridge.SupabaseCallback() {
                    @Override
                    public void onSuccess(String response) {
                        AppCache.invalidatePrefix(CACHE_PREFIX);
                        callback.onSuccess(null);
                    }

                    @Override
                    public void onError(String errorMessage) {
                        callback.onError("Failed to save routine: " + errorMessage);
                    }
                });
            } catch (Exception e) {
                callback.onError("Failed to encode routine ID: " + e.getMessage());
            }
        } else {
            SupabaseAuthBridge.insertRecord("routines", payload, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidatePrefix(CACHE_PREFIX);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to save routine: " + errorMessage);
                }
            });
        }
    }

    public void createRoutineSlot(ClassRoutine routine, DataCallback<Void> callback) {
        addOrUpdateRoutine(routine, callback);
    }

    public void updateRoutineSlot(ClassRoutine routine, DataCallback<Void> callback) {
        addOrUpdateRoutine(routine, callback);
    }

    public void deleteRoutine(String routineId, DataCallback<Void> callback) {
        if (routineId == null || routineId.isEmpty()) {
            callback.onError("Routine ID is required for deletion");
            return;
        }

        SupabaseAuthBridge.deleteRecord("routines", "id=eq." + routineId, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                AppCache.invalidatePrefix(CACHE_PREFIX);
                callback.onSuccess(null);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to delete routine: " + errorMessage);
            }
        });
    }

    /**
     * Deletes routines in batches using Supabase PostgREST id=in.(id1,id2,...)
     */
    public void bulkDeleteRoutines(List<String> routineIds, DataCallback<Integer> callback) {
        if (routineIds == null || routineIds.isEmpty()) {
            callback.onSuccess(0);
            return;
        }

        int batchSize = 100;
        int totalBatches = (int) Math.ceil((double) routineIds.size() / batchSize);
        final int[] successCount = {0};
        final int[] completedBatches = {0};
        final boolean[] hasError = {false};

        for (int i = 0; i < routineIds.size(); i += batchSize) {
            int end = Math.min(i + batchSize, routineIds.size());
            List<String> subList = routineIds.subList(i, end);
            StringBuilder idFilter = new StringBuilder("id=in.(");
            for (int j = 0; j < subList.size(); j++) {
                if (j > 0) idFilter.append(",");
                idFilter.append(subList.get(j));
            }
            idFilter.append(")");

            final int thisBatchSize = subList.size();
            SupabaseAuthBridge.deleteRecord("routines", idFilter.toString(), new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    synchronized (completedBatches) {
                        successCount[0] += thisBatchSize;
                        completedBatches[0]++;
                        if (completedBatches[0] == totalBatches) {
                            AppCache.invalidatePrefix(CACHE_PREFIX);
                            if (hasError[0]) {
                                callback.onError("Bulk delete finished with partial errors. Deleted " + successCount[0] + " items.");
                            } else {
                                callback.onSuccess(successCount[0]);
                            }
                        }
                    }
                }

                @Override
                public void onError(String errorMessage) {
                    synchronized (completedBatches) {
                        hasError[0] = true;
                        completedBatches[0]++;
                        if (completedBatches[0] == totalBatches) {
                            AppCache.invalidatePrefix(CACHE_PREFIX);
                            callback.onError("Bulk delete failed for some batches: " + errorMessage);
                        }
                    }
                }
            });
        }
    }

    public void rescheduleRoutine(ClassRoutine original, String targetDate, String mode, String note, DataCallback<Void> callback) {
        if ("COPY".equalsIgnoreCase(mode)) {
            ClassRoutine tempCopy = new ClassRoutine();
            tempCopy.setCode(original.getCode());
            tempCopy.setSubject(original.getSubject());
            tempCopy.setDepartment(original.getDepartment());
            tempCopy.setAcademicLevel(original.getAcademicLevel());
            tempCopy.setTerm(original.getTerm());
            tempCopy.setDay(original.getDay());
            tempCopy.setStartTime(original.getStartTime());
            tempCopy.setEndTime(original.getEndTime());
            tempCopy.setTower(original.getTower());
            tempCopy.setClassroom(original.getClassroom());
            tempCopy.setTeachers(original.getTeachers());

            tempCopy.setDate(targetDate);
            tempCopy.setTemporary(true);
            tempCopy.setRescheduleMode("COPY");
            tempCopy.setOriginalRoutineId(original.getId());
            tempCopy.setRescheduleNote(note);

            addOrUpdateRoutine(tempCopy, callback);
        } else {
            // MOVE mode: update existing routine document
            original.setDate(targetDate);
            original.setTemporary(true);
            original.setRescheduleMode("MOVE");
            original.setRescheduleNote(note);

            addOrUpdateRoutine(original, callback);
        }
    }
}
