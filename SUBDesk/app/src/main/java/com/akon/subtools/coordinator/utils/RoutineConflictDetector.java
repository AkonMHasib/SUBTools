package com.akon.subtools.coordinator.utils;

import com.akon.subtools.coordinator.data.model.ClassRoutine;
import java.util.ArrayList;
import java.util.List;

public class RoutineConflictDetector {

    public static class ConflictResult {
        public enum ConflictType {
            ROOM_COLLISION,
            TEACHER_COLLISION
        }

        private final ConflictType type;
        private final String message;
        private final ClassRoutine conflictingRoutine;

        public ConflictResult(ConflictType type, String message, ClassRoutine conflictingRoutine) {
            this.type = type;
            this.message = message;
            this.conflictingRoutine = conflictingRoutine;
        }

        public ConflictType getType() {
            return type;
        }

        public String getMessage() {
            return message;
        }

        public ClassRoutine getConflictingRoutine() {
            return conflictingRoutine;
        }
    }

    public static List<ConflictResult> detectConflicts(ClassRoutine target, List<ClassRoutine> existingList) {
        List<ConflictResult> conflicts = new ArrayList<>();
        if (target == null || target.getDay() == null || target.getStartTime() == null || target.getEndTime() == null) {
            return conflicts;
        }

        int targetStartMin = parseTimeToMinutes(target.getStartTime());
        int targetEndMin = parseTimeToMinutes(target.getEndTime());
        if (targetStartMin >= targetEndMin) {
            return conflicts;
        }

        String targetDay = target.getDay().trim().toLowerCase();
        String targetTower = target.getTower() != null ? target.getTower().trim().toLowerCase() : "";
        String targetRoom = target.getClassroom() != null ? target.getClassroom().trim().toLowerCase() : "";

        List<String> targetTeachers = new ArrayList<>();
        if (target.getTeachers() != null) {
            for (String t : target.getTeachers()) {
                if (t != null && !t.trim().isEmpty()) {
                    String clean = t.trim().toLowerCase();
                    if (!clean.equals("tba") && !clean.equals("to be announced") && !clean.equals("n/a") && !clean.equals("none")) {
                        targetTeachers.add(clean);
                    }
                }
            }
        }

        if (existingList == null) return conflicts;

        for (ClassRoutine existing : existingList) {
            if (existing == null) continue;
            // Exclude self if editing
            if (target.getId() != null && !target.getId().isEmpty() && target.getId().equals(existing.getId())) {
                continue;
            }

            String exDay = existing.getDay() != null ? existing.getDay().trim().toLowerCase() : "";
            if (!exDay.equals(targetDay)) continue;

            int exStartMin = parseTimeToMinutes(existing.getStartTime());
            int exEndMin = parseTimeToMinutes(existing.getEndTime());

            // Time window overlap condition
            boolean isTimeOverlap = targetStartMin < exEndMin && exStartMin < targetEndMin;
            if (!isTimeOverlap) continue;

            // 1. Room Overlap Check
            String exTower = existing.getTower() != null ? existing.getTower().trim().toLowerCase() : "";
            String exRoom = existing.getClassroom() != null ? existing.getClassroom().trim().toLowerCase() : "";
            if (!targetRoom.isEmpty() && !exRoom.isEmpty() && targetRoom.equals(exRoom)) {
                if (targetTower.isEmpty() || exTower.isEmpty() || targetTower.equals(exTower)) {
                    String msg = "Classroom Conflict: Room " + existing.getClassroom() + " (" + (existing.getTower() != null ? existing.getTower() : "Main") +
                            ") is already assigned to " + existing.getCode() + " (" + existing.getSubject() + ") from " + existing.getStartTime() + " to " + existing.getEndTime() + ".";
                    conflicts.add(new ConflictResult(ConflictResult.ConflictType.ROOM_COLLISION, msg, existing));
                }
            }

            // 2. Teacher Overlap Check
            if (!targetTeachers.isEmpty() && existing.getTeachers() != null) {
                List<String> exTeachers = new ArrayList<>();
                for (String t : existing.getTeachers()) {
                    if (t != null && !t.trim().isEmpty()) {
                        String clean = t.trim().toLowerCase();
                        if (!clean.equals("tba") && !clean.equals("to be announced") && !clean.equals("n/a") && !clean.equals("none")) {
                            exTeachers.add(clean);
                        }
                    }
                }

                for (String teacher : targetTeachers) {
                    if (exTeachers.contains(teacher)) {
                        String msg = "Faculty Overlap: '" + teacher.toUpperCase() + "' is already teaching " + existing.getCode() +
                                " in Room " + existing.getClassroom() + " from " + existing.getStartTime() + " to " + existing.getEndTime() + ".";
                        conflicts.add(new ConflictResult(ConflictResult.ConflictType.TEACHER_COLLISION, msg, existing));
                        break;
                    }
                }
            }
        }

        return conflicts;
    }

    public static int parseTimeToMinutes(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) return 0;
        String cleanStr = timeStr.trim().toUpperCase();
        try {
            boolean isPM = cleanStr.contains("PM");
            boolean isAM = cleanStr.contains("AM");
            String digits = cleanStr.replaceAll("[^0-9:]", "");
            String[] parts = digits.split(":");
            if (parts.length >= 1 && !parts[0].isEmpty()) {
                int hour = Integer.parseInt(parts[0]);
                int minute = parts.length >= 2 && !parts[1].isEmpty() ? Integer.parseInt(parts[1]) : 0;

                if (isPM && hour < 12) {
                    hour += 12;
                } else if (isAM && hour == 12) {
                    hour = 0;
                }
                return hour * 60 + minute;
            }
        } catch (Exception ignored) {}
        return 0;
    }
}
