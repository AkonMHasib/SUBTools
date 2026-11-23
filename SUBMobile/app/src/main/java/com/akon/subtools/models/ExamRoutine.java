package com.akon.subtools.models;

import java.io.Serializable;

public class ExamRoutine implements Serializable {
    private String id;
    private String courseCode;
    private String courseTitle;
    private String department;
    private String examDate;
    private String examTime;
    private String room;
    private String examType;
    private String invigilator;
    private String notes;

    public ExamRoutine() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCourseCode() { return courseCode != null ? courseCode : ""; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseTitle() { return courseTitle != null ? courseTitle : ""; }
    public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }

    public String getDepartment() { return department != null ? department : ""; }
    public void setDepartment(String department) { this.department = department; }

    public String getExamDate() { return examDate != null ? examDate : ""; }
    public void setExamDate(String examDate) { this.examDate = examDate; }

    public String getExamTime() { return examTime != null ? examTime : ""; }
    public void setExamTime(String examTime) { this.examTime = examTime; }

    public String getRoom() { return room != null ? room : ""; }
    public void setRoom(String room) { this.room = room; }

    public String getExamType() { return examType != null ? examType : "Midterm"; }
    public void setExamType(String examType) { this.examType = examType; }

    public String getInvigilator() { return invigilator != null ? invigilator : ""; }
    public void setInvigilator(String invigilator) { this.invigilator = invigilator; }

    public String getNotes() { return notes != null ? notes : ""; }
    public void setNotes(String notes) { this.notes = notes; }

    public static ExamRoutine fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        ExamRoutine exam = new ExamRoutine();
        exam.setId(obj.optString("id", ""));
        
        org.json.JSONObject data = obj.optJSONObject("data");
        
        String dept = obj.optString("department", "");
        if (dept.isEmpty() && data != null) dept = data.optString("department", "");
        exam.setDepartment(dept);

        String code = obj.optString("course_code", "");
        if (code.isEmpty()) code = obj.optString("courseCode", "");
        if (code.isEmpty() && data != null) code = data.optString("courseCode", data.optString("course_code", ""));
        exam.setCourseCode(code);

        String title = obj.optString("course_title", "");
        if (title.isEmpty()) title = obj.optString("courseTitle", "");
        if (title.isEmpty() && data != null) title = data.optString("courseTitle", data.optString("course_title", ""));
        exam.setCourseTitle(title);

        String date = obj.optString("exam_date", "");
        if (date.isEmpty()) date = obj.optString("examDate", "");
        if (date.isEmpty() && data != null) date = data.optString("examDate", data.optString("exam_date", ""));
        exam.setExamDate(date);

        String time = obj.optString("exam_time", "");
        if (time.isEmpty()) time = obj.optString("examTime", "");
        if (time.isEmpty() && data != null) time = data.optString("examTime", data.optString("exam_time", ""));
        exam.setExamTime(time);

        String room = obj.optString("room", "");
        if (room.isEmpty() && data != null) room = data.optString("room", "");
        exam.setRoom(room);

        String type = obj.optString("exam_type", "");
        if (type.isEmpty()) type = obj.optString("examType", "");
        if (type.isEmpty() && data != null) type = data.optString("examType", data.optString("exam_type", "Midterm"));
        if (type.isEmpty()) type = "Midterm";
        exam.setExamType(type);

        String inv = obj.optString("invigilator", "");
        if (inv.isEmpty() && data != null) inv = data.optString("invigilator", "");
        exam.setInvigilator(inv);

        String notes = obj.optString("notes", "");
        if (notes.isEmpty() && data != null) notes = data.optString("notes", "");
        exam.setNotes(notes);

        return exam;
    }
}
