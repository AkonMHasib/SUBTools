package com.akon.subtools.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Entity(tableName = "routines")
public class Routine implements Serializable {
    @PrimaryKey
    @NonNull
    private String id = "";
    private String code;
    private String subject;
    private String department;
    private String academicLevel;
    private String day;
    private String startTime;
    private String endTime;
    
    private List<String> teachers;
    private String tower;
    private String classroom;
    private String note;
    private String section;

    private boolean isTemporary;
    private String date;
    private String rescheduleMode;
    private String originalRoutineId;
    private String rescheduleNote;

    public Routine() {
        this.teachers = new ArrayList<>();
    }

    @androidx.room.Ignore
    public Routine(String id, String code, String subject, String department, String academicLevel, String day, String startTime, String endTime, List<String> teachers, String tower, String classroom) {
        this.id = id != null ? id : "";
        this.code = code;
        this.subject = subject;
        this.department = department;
        this.academicLevel = academicLevel;
        this.day = day;
        this.startTime = startTime;
        this.endTime = endTime;
        this.teachers = teachers != null ? teachers : new ArrayList<>();
        this.tower = tower;
        this.classroom = classroom;
    }


    public static Routine fromJson(org.json.JSONObject json) {
        if (json == null) return null;
        try {
            org.json.JSONObject data = json.optJSONObject("data");
            if (data == null) data = json;

            Routine rot = new Routine();
            rot.setId(json.optString("id", data.optString("id", "")));
            rot.setCode(data.optString("code", json.optString("course_code", "")));
            rot.setSubject(data.optString("subject", json.optString("course_title", "")));
            rot.setDepartment(data.optString("department", json.optString("department", "")));

            String term = data.optString("academicLevel", data.optString("term", json.optString("batch", "All")));
            rot.setAcademicLevel(term != null && !term.trim().isEmpty() ? term : "All");

            rot.setDay(data.optString("day", json.optString("day", "")));
            rot.setStartTime(data.optString("startTime", json.optString("start_time", "")));
            rot.setEndTime(data.optString("endTime", json.optString("end_time", "")));
            rot.setTower(data.optString("tower", json.optString("tower", "")));
            rot.setClassroom(data.optString("classroom", json.optString("classroom", json.optString("room", ""))));
            rot.setNote(data.optString("note", json.optString("note", "")));

            String sec = data.optString("section", "All");
            rot.setSection(sec != null && !sec.trim().isEmpty() ? sec : "All");

            rot.setTemporary(data.optBoolean("isTemporary", false));
            rot.setDate(data.optString("date", ""));
            rot.setRescheduleMode(data.optString("rescheduleMode", ""));
            rot.setOriginalRoutineId(data.optString("originalRoutineId", ""));
            rot.setRescheduleNote(data.optString("rescheduleNote", ""));

            org.json.JSONArray teachersArr = data.optJSONArray("teachers");
            if (teachersArr != null) {
                List<String> tList = new ArrayList<>();
                for (int i = 0; i < teachersArr.length(); i++) {
                    tList.add(teachersArr.optString(i));
                }
                rot.setTeachers(tList);
            } else {
                String teacherInit = json.optString("teacher_initial", data.optString("teacher", ""));
                if (!teacherInit.isEmpty()) {
                    List<String> tList = new ArrayList<>();
                    tList.add(teacherInit);
                    rot.setTeachers(tList);
                }
            }
            return rot;
        } catch (Exception e) {
            return null;
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getAcademicLevel() { return academicLevel; }
    public void setAcademicLevel(String academicLevel) { this.academicLevel = academicLevel; }

    @androidx.room.Ignore
    public String getTerm() { return academicLevel; }
    @androidx.room.Ignore
    public void setTerm(String term) { if (term != null && !term.isEmpty()) this.academicLevel = term; }

    public String getDay() { return day; }
    public void setDay(String day) { this.day = day; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public int getStartTimeInMinutes() {
        return parseTimeToMinutes(startTime);
    }

    public int getEndTimeInMinutes() {
        return parseTimeToMinutes(endTime);
    }

    private static int parseTimeToMinutes(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) return -1;
        String clean = timeStr.trim().toLowerCase();
        boolean isPm = clean.contains("pm");
        boolean isAm = clean.contains("am");
        clean = clean.replace("am", "").replace("pm", "").trim();

        String[] parts = clean.split(":");
        if (parts.length < 2) return -1;
        try {
            int hours = Integer.parseInt(parts[0].trim());
            int minutes = Integer.parseInt(parts[1].trim());
            if (isPm && hours < 12) hours += 12;
            if (isAm && hours == 12) hours = 0;
            return hours * 60 + minutes;
        } catch (Exception e) {
            return -1;
        }
    }

    public List<String> getTeachers() {
        if (teachers == null) {
            teachers = new ArrayList<>();
        }
        return teachers;
    }

    public void setTeachers(List<String> teachers) {
        this.teachers = teachers != null ? teachers : new ArrayList<>();
    }

    @androidx.room.Ignore
    public void setTeachersFromObject(Object teachersObj) {
        if (teachersObj instanceof List) {
            this.teachers = new ArrayList<>();
            for (Object item : (List<?>) teachersObj) {
                if (item != null && !item.toString().trim().isEmpty()) {
                    this.teachers.add(item.toString().trim());
                }
            }
        } else if (teachersObj instanceof String) {
            this.teachers = new ArrayList<>();
            String tStr = (String) teachersObj;
            if (!tStr.trim().isEmpty()) {
                String[] parts = tStr.split(",");
                for (String p : parts) {
                    if (!p.trim().isEmpty()) {
                        this.teachers.add(p.trim());
                    }
                }
            }
        } else {
            this.teachers = new ArrayList<>();
        }
    }

    public String getTower() { return tower; }
    public void setTower(String tower) { this.tower = tower; }

    public String getClassroom() { return classroom; }
    public void setClassroom(String classroom) { this.classroom = classroom; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public boolean isTemporary() { return isTemporary; }
    public void setTemporary(boolean temporary) { isTemporary = temporary; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getRescheduleMode() { return rescheduleMode; }
    public void setRescheduleMode(String rescheduleMode) { this.rescheduleMode = rescheduleMode; }

    public String getOriginalRoutineId() { return originalRoutineId; }
    public void setOriginalRoutineId(String originalRoutineId) { this.originalRoutineId = originalRoutineId; }

    public String getRescheduleNote() { return rescheduleNote; }
    public void setRescheduleNote(String rescheduleNote) { this.rescheduleNote = rescheduleNote; }

    public String getSection() { return section != null ? section : ""; }
    public void setSection(String section) { this.section = section != null ? section : ""; }

    @androidx.room.Ignore
    public String getFormattedLocation() {
        if ((tower == null || tower.trim().isEmpty()) && (classroom == null || classroom.trim().isEmpty())) {
            return "N/A";
        }

        String towerAbbr = "";
        if (tower != null && !tower.trim().isEmpty()) {
            String t = tower.trim();
            if (t.equalsIgnoreCase("Shadhinota Tower") || t.equalsIgnoreCase("Shadhinota") || t.equalsIgnoreCase("ST")) {
                towerAbbr = "ST";
            } else if (t.equalsIgnoreCase("Bijoy Tower") || t.equalsIgnoreCase("Bijoy") || t.equalsIgnoreCase("BT")) {
                towerAbbr = "BT";
            } else {
                towerAbbr = t.replaceAll("(?i)Shadhinota\\s*Tower", "ST")
                             .replaceAll("(?i)Shadhinota", "ST")
                             .replaceAll("(?i)Bijoy\\s*Tower", "BT")
                             .replaceAll("(?i)Bijoy", "BT");
            }
        }

        String cleanRoom = "";
        if (classroom != null && !classroom.trim().isEmpty()) {
            cleanRoom = classroom.trim()
                    .replaceAll("(?i)^Rm\\.?\\s*", "")
                    .replaceAll("(?i)^Room\\.?\\s*", "")
                    .replaceAll("(?i)^RM\\.?\\s*", "")
                    .trim();
        }

        if (!towerAbbr.isEmpty() && !cleanRoom.isEmpty()) {
            return towerAbbr + " - " + cleanRoom;
        } else if (!towerAbbr.isEmpty()) {
            return towerAbbr;
        } else {
            return cleanRoom;
        }
    }
}
