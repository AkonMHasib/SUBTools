package com.akon.subtools.models;

import java.io.Serializable;

public class AcademicReminder implements Serializable {
    private String id;
    private String type; // "Class Test", "Quiz Test", "Assignment"
    private String courseCode;
    private String title;
    private String dueDate;
    private String dueTime;
    private long dueTimestampMs;
    private boolean completed;
    private String notes;

    public AcademicReminder() {}

    public AcademicReminder(String id, String type, String courseCode, String title, String dueDate, String dueTime, long dueTimestampMs, String notes) {
        this.id = id;
        this.type = type;
        this.courseCode = courseCode;
        this.title = title;
        this.dueDate = dueDate;
        this.dueTime = dueTime;
        this.dueTimestampMs = dueTimestampMs;
        this.notes = notes;
        this.completed = false;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type != null ? type : "Class Test"; }
    public void setType(String type) { this.type = type; }

    public String getCourseCode() { return courseCode != null ? courseCode : ""; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getTitle() { return title != null ? title : ""; }
    public void setTitle(String title) { this.title = title; }

    public String getDueDate() { return dueDate != null ? dueDate : ""; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }

    public String getDueTime() { return dueTime != null ? dueTime : ""; }
    public void setDueTime(String dueTime) { this.dueTime = dueTime; }

    public long getDueTimestampMs() { return dueTimestampMs; }
    public void setDueTimestampMs(long dueTimestampMs) { this.dueTimestampMs = dueTimestampMs; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public String getNotes() { return notes != null ? notes : ""; }
    public void setNotes(String notes) { this.notes = notes; }
}
