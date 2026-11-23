package com.akon.subtools.coordinator.utils;

import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.data.model.Subject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class RoutineImportEngine {

    public static class ImportError {
        private final int rowIndex;
        private final String code;
        private final String reason;

        public ImportError(int rowIndex, String code, String reason) {
            this.rowIndex = rowIndex;
            this.code = code;
            this.reason = reason;
        }

        public int getRowIndex() { return rowIndex; }
        public String getCode() { return code; }
        public String getReason() { return reason; }

        public String getFormattedError() {
            return "Row " + rowIndex + " (" + (code.isEmpty() ? "N/A" : code) + "): " + reason;
        }
    }

    public static class ImportResult {
        private final int successCount;
        private final List<ImportError> errors;

        public ImportResult(int successCount, List<ImportError> errors) {
            this.successCount = successCount;
            this.errors = errors;
        }

        public int getSuccessCount() { return successCount; }
        public List<ImportError> getErrors() { return errors; }
    }

    public static CompletableFuture<ImportResult> processImport(
            List<ClassRoutine> candidates,
            String department,
            List<ClassRoutine> existingRoutines,
            List<Subject> subjectRegistry
    ) {
        CompletableFuture<ImportResult> future = new CompletableFuture<>();

        Map<String, String> subjectMap = new HashMap<>();
        if (subjectRegistry != null) {
            for (Subject s : subjectRegistry) {
                if (s.getCode() != null && s.getName() != null) {
                    subjectMap.put(s.getCode().trim().toUpperCase(), s.getName().trim());
                }
            }
        }

        List<ClassRoutine> validRoutinesToCommit = new ArrayList<>();
        List<ImportError> errors = new ArrayList<>();

        for (int i = 0; i < candidates.size(); i++) {
            int rowNum = i + 1;
            ClassRoutine item = candidates.get(i);
            item.setDepartment(department);

            // Step 3.1: Code/Name Resolution
            if ((item.getSubject() == null || item.getSubject().trim().isEmpty()) && item.getCode() != null) {
                String resolvedName = subjectMap.get(item.getCode().trim().toUpperCase());
                if (resolvedName != null) {
                    item.setSubject(resolvedName);
                }
            }

            // Step 3.2: Validation checks
            if (item.getCode() == null || item.getCode().trim().isEmpty()) {
                errors.add(new ImportError(rowNum, item.getCode(), "Missing Course Code."));
                continue;
            }
            if (item.getDay() == null || item.getDay().trim().isEmpty()) {
                errors.add(new ImportError(rowNum, item.getCode(), "Missing weekday (e.g. Sunday)."));
                continue;
            }
            if (item.getStartTime() == null || item.getStartTime().trim().isEmpty() || item.getEndTime() == null || item.getEndTime().trim().isEmpty()) {
                errors.add(new ImportError(rowNum, item.getCode(), "Invalid or missing start/end time."));
                continue;
            }
            if (item.getClassroom() == null || item.getClassroom().trim().isEmpty()) {
                errors.add(new ImportError(rowNum, item.getCode(), "Missing classroom."));
                continue;
            }

            // Step 3.3: Term-Agnostic Duplicate Checking against existing routines
            boolean isDuplicate = false;
            String dupReason = "";

            if (existingRoutines != null) {
                for (ClassRoutine existing : existingRoutines) {
                    if (existing.getDay() != null && existing.getDay().equalsIgnoreCase(item.getDay().trim())) {
                        boolean sameSubjectCode = existing.getCode() != null && existing.getCode().equalsIgnoreCase(item.getCode().trim());
                        boolean sameSubjectName = existing.getSubject() != null && item.getSubject() != null && existing.getSubject().equalsIgnoreCase(item.getSubject().trim());

                        if (sameSubjectCode || sameSubjectName) {
                            if (isTimeOverlap(existing.getStartTime(), existing.getEndTime(), item.getStartTime(), item.getEndTime())) {
                                isDuplicate = true;
                                dupReason = "Subject routine slot on " + item.getDay() + " (" + item.getTimeSlot() + ") already exists.";
                                break;
                            }
                        }
                    }
                }
            }

            if (isDuplicate) {
                errors.add(new ImportError(rowNum, item.getCode(), dupReason));
                continue;
            }

            validRoutinesToCommit.add(item);
        }

        // Execute chunked batch writes for valid routines to Supabase REST (max 100 items per chunk)
        if (validRoutinesToCommit.isEmpty()) {
            future.complete(new ImportResult(0, errors));
            return future;
        }

        final int CHUNK_SIZE = 100;
        final int totalChunks = (int) Math.ceil((double) validRoutinesToCommit.size() / CHUNK_SIZE);
        final int[] successCount = {0};
        final int[] completedChunks = {0};

        for (int start = 0; start < validRoutinesToCommit.size(); start += CHUNK_SIZE) {
            int end = Math.min(start + CHUNK_SIZE, validRoutinesToCommit.size());
            List<ClassRoutine> chunk = validRoutinesToCommit.subList(start, end);

            org.json.JSONArray chunkArray = new org.json.JSONArray();
            for (ClassRoutine routine : chunk) {
                if (routine.getId() == null || routine.getId().isEmpty()) {
                    routine.setId(java.util.UUID.randomUUID().toString());
                }
                chunkArray.put(routine.toSupabaseJson());
            }

            final int thisChunkSize = chunk.size();
            SupabaseAuthBridge.insertRecords("routines", chunkArray, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    synchronized (completedChunks) {
                        successCount[0] += thisChunkSize;
                        completedChunks[0]++;
                        if (completedChunks[0] == totalChunks) {
                            future.complete(new ImportResult(successCount[0], errors));
                        }
                    }
                }

                @Override
                public void onError(String errorMessage) {
                    synchronized (completedChunks) {
                        errors.add(new ImportError(0, "BATCH", "Batch chunk failed: " + errorMessage));
                        completedChunks[0]++;
                        if (completedChunks[0] == totalChunks) {
                            future.complete(new ImportResult(successCount[0], errors));
                        }
                    }
                }
            });
        }

        return future;
    }

    private static boolean isTimeOverlap(String start1, String end1, String start2, String end2) {
        if (start1 == null || end1 == null || start2 == null || end2 == null) return false;

        int s1 = RoutineConflictDetector.parseTimeToMinutes(start1);
        int e1 = RoutineConflictDetector.parseTimeToMinutes(end1);
        int s2 = RoutineConflictDetector.parseTimeToMinutes(start2);
        int e2 = RoutineConflictDetector.parseTimeToMinutes(end2);

        if (s1 <= 0 || e1 <= 0 || s2 <= 0 || e2 <= 0) {
            // Fallback to strict equality if parsing fails
            return start1.trim().equalsIgnoreCase(start2.trim()) && end1.trim().equalsIgnoreCase(end2.trim());
        }

        return s1 < e2 && s2 < e1;
    }
}
