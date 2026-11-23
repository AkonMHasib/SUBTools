package com.akon.subtools.coordinator.data.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ClassRoutine implements Serializable {
    private String id;
    private String code;
    private String subject;
    private String department;
    private String academicLevel;
    private String term;
    private String day;
    private String startTime;
    private String endTime;
    private String tower;
    private String classroom;
    private String date;
    private String rescheduleMode; // e.g. "COPY" or "MOVE"
    private String originalRoutineId;
    private String rescheduleNote;
    private String note;
    private String section;
    private Object createdAt; // Timestamp or String or Long
    private String createdBy;
    private boolean active = true;
    private boolean published = true;
    private List<String> teachers = new ArrayList<>();
    private boolean isTemporary;

    // Transient selection state for UI bulk selection
    private transient boolean isSelected = false;

    public ClassRoutine() {
        // Required for Firestore deserialization
    }



    public void setTeachersFromObject(Object teachersObj) {
        this.teachers = new ArrayList<>();
        if (teachersObj instanceof List) {
            for (Object item : (List<?>) teachersObj) {
                if (item != null && !item.toString().trim().isEmpty()) {
                    this.teachers.add(item.toString().trim());
                }
            }
        } else if (teachersObj instanceof String) {
            String tStr = (String) teachersObj;
            if (!tStr.trim().isEmpty()) {
                String[] parts = tStr.split("[,/;|]");
                for (String p : parts) {
                    if (!p.trim().isEmpty()) {
                        this.teachers.add(p.trim());
                    }
                }
            }
        }
        if (this.teachers.isEmpty()) {
            this.teachers.add("TBA");
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

    public String getAcademicLevel() { return academicLevel != null ? academicLevel : (term != null ? term : "All"); }
    public void setAcademicLevel(String academicLevel) {
        this.academicLevel = academicLevel;
        if (this.term == null || this.term.isEmpty()) {
            this.term = academicLevel;
        }
    }

    public String getTerm() { return term != null ? term : (academicLevel != null ? academicLevel : "All"); }
    public void setTerm(String term) {
        this.term = term;
        if (this.academicLevel == null || this.academicLevel.isEmpty()) {
            this.academicLevel = term;
        }
    }

    public String getDay() { return day; }
    public void setDay(String day) { this.day = day; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public String getTower() { return tower; }
    public void setTower(String tower) { this.tower = tower; }

    public String getClassroom() { return classroom; }
    public void setClassroom(String classroom) { this.classroom = classroom; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getRescheduleMode() { return rescheduleMode; }
    public void setRescheduleMode(String rescheduleMode) { this.rescheduleMode = rescheduleMode; }

    public String getOriginalRoutineId() { return originalRoutineId; }
    public void setOriginalRoutineId(String originalRoutineId) { this.originalRoutineId = originalRoutineId; }

    public String getRescheduleNote() { return rescheduleNote; }
    public void setRescheduleNote(String rescheduleNote) { this.rescheduleNote = rescheduleNote; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getSection() { return section != null && !section.trim().isEmpty() ? section : "All"; }
    public void setSection(String section) { this.section = section != null && !section.trim().isEmpty() ? section : "All"; }

    public Object getCreatedAt() { return createdAt; }
    public void setCreatedAt(Object createdAt) { this.createdAt = createdAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }

    public List<String> getTeachers() { return teachers; }
    public void setTeachers(List<String> teachers) { this.teachers = teachers != null ? teachers : new ArrayList<>(); }

    public boolean isTemporary() { return isTemporary; }
    public void setTemporary(boolean temporary) { isTemporary = temporary; }

    public boolean isSelected() { return isSelected; }
    public void setSelected(boolean selected) { isSelected = selected; }

    public String getFormattedTeachers() {
        if (teachers == null || teachers.isEmpty()) {
            return "TBA";
        }
        return android.text.TextUtils.join(", ", teachers);
    }

    public String getTimeSlot() {
        if (startTime != null && endTime != null) {
            return startTime + " - " + endTime;
        }
        return startTime != null ? startTime : "";
    }

    public String getFormattedTower() {
        if (tower == null || tower.trim().isEmpty()) {
            return "Shadhinota Tower";
        }
        String t = tower.trim();
        if (t.equalsIgnoreCase("Shadhinota") || t.equalsIgnoreCase("ST")) {
            return "Shadhinota Tower";
        } else if (t.equalsIgnoreCase("Bijoy") || t.equalsIgnoreCase("BT")) {
            return "Bijoy Tower";
        }
        if (t.toLowerCase().contains("tower")) {
            return t;
        }
        return t + " Tower";
    }

    public Map<String, Object> toFirestoreMap() {
        Map<String, Object> map = new HashMap<>();
        if (id != null) map.put("id", id);
        if (code != null) map.put("code", code);
        if (subject != null) map.put("subject", subject);

        String deptCode = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(department);
        map.put("department", deptCode);

        String termVal = academicLevel != null ? academicLevel : (term != null ? term : "All");
        map.put("academicLevel", termVal);
        map.put("term", termVal);

        map.put("section", getSection());
        map.put("day", day != null ? day : "Sunday");
        map.put("startTime", startTime != null ? startTime : "");
        map.put("endTime", endTime != null ? endTime : "");

        // Clean tower: store short form ("Shadhinota" or "Bijoy") matching SUBAdmin
        String cleanTower = "Shadhinota";
        if (tower != null && !tower.trim().isEmpty()) {
            String tLower = tower.trim().toLowerCase();
            if (tLower.contains("bijoy") || tLower.equals("bt")) {
                cleanTower = "Bijoy";
            } else {
                cleanTower = "Shadhinota";
            }
        }
        map.put("tower", cleanTower);
        map.put("classroom", classroom != null ? classroom : "502");
        map.put("teachers", teachers != null ? teachers : new ArrayList<>());
        map.put("teacher", getFormattedTeachers());
        map.put("isTemporary", isTemporary);

        if (date != null) map.put("date", date);
        if (rescheduleMode != null) map.put("rescheduleMode", rescheduleMode);
        if (originalRoutineId != null) map.put("originalRoutineId", originalRoutineId);
        if (rescheduleNote != null) map.put("rescheduleNote", rescheduleNote);
        if (note != null) map.put("note", note);
        if (createdBy != null) map.put("createdBy", createdBy);

        map.put("active", active);
        map.put("published", published);
        map.put("updatedAt", System.currentTimeMillis());
        if (createdAt != null) {
            map.put("createdAt", createdAt);
        } else {
            map.put("createdAt", System.currentTimeMillis());
        }

        return map;
    }

    public static ClassRoutine fromJson(org.json.JSONObject json) {
        if (json == null) return null;
        try {
            org.json.JSONObject data = json.optJSONObject("data");
            if (data == null) data = json;

            ClassRoutine rot = new ClassRoutine();
            rot.setId(json.optString("id", data.optString("id", "")));
            rot.setCode(data.optString("code", json.optString("course_code", "")));
            rot.setSubject(data.optString("subject", json.optString("course_title", "")));

            String rawDept = !json.optString("department", "").isEmpty()
                    ? json.optString("department", "")
                    : data.optString("department", data.optString("dept", ""));
            rot.setDepartment(com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(rawDept));

            String term = data.optString("academicLevel", data.optString("term", json.optString("batch", "All")));
            rot.setAcademicLevel(term != null && !term.trim().isEmpty() ? term : "All");
            rot.setTerm(term != null && !term.trim().isEmpty() ? term : "All");

            rot.setDay(data.optString("day", json.optString("day", "Sunday")));
            rot.setStartTime(data.optString("startTime", ""));
            rot.setEndTime(data.optString("endTime", ""));
            rot.setTower(data.optString("tower", "Shadhinota"));
            rot.setClassroom(data.optString("classroom", json.optString("room", "502")));
            rot.setNote(data.optString("note", ""));

            String sec = data.optString("section", "All");
            rot.setSection(sec != null && !sec.trim().isEmpty() ? sec : "All");

            rot.setTemporary(data.optBoolean("isTemporary", false));
            rot.setDate(data.optString("date", ""));
            rot.setRescheduleMode(data.optString("rescheduleMode", ""));
            rot.setOriginalRoutineId(data.optString("originalRoutineId", ""));
            rot.setRescheduleNote(data.optString("rescheduleNote", ""));
            rot.setCreatedBy(data.optString("createdBy", ""));
            rot.setActive(data.optBoolean("active", true));
            rot.setPublished(data.optBoolean("published", true));

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

    public org.json.JSONObject toSupabaseJson() {
        try {
            org.json.JSONObject data = new org.json.JSONObject();
            data.put("id", getId());
            data.put("code", getCode() != null ? getCode() : "");
            data.put("subject", getSubject() != null ? getSubject() : "");
            String deptCode = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(getDepartment());
            data.put("department", deptCode);
            data.put("dept", deptCode);
            String termVal = getAcademicLevel() != null ? getAcademicLevel() : (getTerm() != null ? getTerm() : "All");
            data.put("academicLevel", termVal);
            data.put("term", termVal);
            data.put("section", getSection());
            data.put("day", getDay() != null ? getDay() : "Sunday");
            data.put("startTime", getStartTime() != null ? getStartTime() : "");
            data.put("endTime", getEndTime() != null ? getEndTime() : "");
            data.put("tower", getTower() != null ? getTower() : "Shadhinota");
            data.put("classroom", getClassroom() != null ? getClassroom() : "502");
            data.put("isTemporary", isTemporary());
            data.put("date", getDate() != null ? getDate() : "");
            data.put("rescheduleMode", getRescheduleMode() != null ? getRescheduleMode() : "");
            data.put("originalRoutineId", getOriginalRoutineId() != null ? getOriginalRoutineId() : "");
            data.put("rescheduleNote", getRescheduleNote() != null ? getRescheduleNote() : "");
            data.put("note", getNote() != null ? getNote() : "");
            data.put("createdBy", getCreatedBy() != null ? getCreatedBy() : "");
            data.put("active", isActive());
            data.put("published", isPublished());

            org.json.JSONArray teachersArr = new org.json.JSONArray();
            if (getTeachers() != null) {
                for (String t : getTeachers()) {
                    if (t != null && !t.trim().isEmpty()) teachersArr.put(t.trim());
                }
            }
            data.put("teachers", teachersArr);
            data.put("teacher", getFormattedTeachers());

            org.json.JSONObject root = new org.json.JSONObject();
            root.put("id", getId());
            root.put("department", deptCode);
            root.put("batch", termVal);
            root.put("day", getDay() != null ? getDay() : "Sunday");
            String slot = (getStartTime() != null ? getStartTime() : "") + " - " + (getEndTime() != null ? getEndTime() : "");
            root.put("slot", slot.trim());
            root.put("room", getClassroom() != null ? getClassroom() : "502");
            root.put("course_code", getCode() != null ? getCode() : "");
            root.put("course_title", getSubject() != null ? getSubject() : "");
            String teacherInit = getTeachers() != null && !getTeachers().isEmpty() ? getTeachers().get(0) : "";
            root.put("teacher_initial", teacherInit);
            root.put("data", data);
            root.put("updated_at", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date()));

            return root;
        } catch (Exception e) {
            return new org.json.JSONObject();
        }
    }
}
