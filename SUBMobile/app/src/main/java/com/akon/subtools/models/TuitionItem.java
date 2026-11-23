package com.akon.subtools.models;

import java.io.Serializable;

public class TuitionItem implements Serializable {
    private String id;
    private String title;
    private String medium; // "Bangla Medium", "English Medium", "English Version"
    private String classGrade; // "Class 1-5", "Class 6-8", "SSC / Class 9-10", "HSC / College"
    private String subjects; // "Math, Science, Physics", etc.
    private String location; // "Dhanmondi", "Ashulia", "Mirpur", "Mymensingh", etc.
    private double salary; // BDT / month
    private String daysPerWeek; // "3 Days / Week", "4 Days / Week", etc.
    private String contactName;
    private String availableFrom;
    private String contactPhone;
    private String publisherUid;
    private String publisherName;
    private String approvalStatus; // "pending", "approved"
    private String status; // "Available", "Booked", "Closed"
    private long timestamp;

    public TuitionItem() {
        this.medium = "Bangla Medium";
        this.classGrade = "Class 6-8";
        this.approvalStatus = "pending";
        this.status = "Available";
        this.timestamp = System.currentTimeMillis();
    }

    public TuitionItem(String id, String title, String medium, String classGrade, String subjects, String location, double salary, String daysPerWeek, String contactName, String contactPhone, String publisherUid, String publisherName) {
        this.id = id;
        this.title = title;
        this.medium = medium != null ? medium : "Bangla Medium";
        this.classGrade = classGrade != null ? classGrade : "Class 6-8";
        this.subjects = subjects;
        this.location = location;
        this.salary = salary;
        this.daysPerWeek = daysPerWeek;
        this.contactName = contactName;
        this.contactPhone = contactPhone;
        this.publisherUid = publisherUid;
        this.publisherName = publisherName;
        this.approvalStatus = "pending";
        this.status = "Available";
        this.timestamp = System.currentTimeMillis();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMedium() { return medium; }
    public void setMedium(String medium) { this.medium = medium; }

    public String getClassGrade() { return classGrade; }
    public void setClassGrade(String classGrade) { this.classGrade = classGrade; }

    public String getSubjects() { return subjects; }
    public void setSubjects(String subjects) { this.subjects = subjects; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public double getSalary() { return salary; }
    public void setSalary(double salary) { this.salary = salary; }

    public String getDaysPerWeek() { return daysPerWeek; }
    public void setDaysPerWeek(String daysPerWeek) { this.daysPerWeek = daysPerWeek; }

    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getPublisherUid() { return publisherUid; }
    public void setPublisherUid(String publisherUid) { this.publisherUid = publisherUid; }

    public String getPublisherName() { return publisherName; }
    public void setPublisherName(String publisherName) { this.publisherName = publisherName; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAvailableFrom() { return availableFrom; }
    public void setAvailableFrom(String availableFrom) { this.availableFrom = availableFrom; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    public org.json.JSONObject toJson() {
        org.json.JSONObject root = new org.json.JSONObject();
        try {
            root.put("id", id != null ? id : "tuition-" + System.currentTimeMillis());
            root.put("title", title != null ? title : "");
            root.put("student_class", classGrade != null ? classGrade : "");
            root.put("subject", subjects != null ? subjects : "");
            root.put("salary", String.valueOf(salary));
            root.put("location", location != null ? location : "");
            root.put("phone", contactPhone != null ? contactPhone : "");
            root.put("publisher_uid", publisherUid != null ? publisherUid : "");

            org.json.JSONObject dataObj = new org.json.JSONObject();
            dataObj.put("medium", medium != null ? medium : "");
            dataObj.put("daysPerWeek", daysPerWeek != null ? daysPerWeek : "");
            dataObj.put("contactName", contactName != null ? contactName : "");
            dataObj.put("publisherName", publisherName != null ? publisherName : "");
            dataObj.put("approvalStatus", approvalStatus != null ? approvalStatus : "pending");
            dataObj.put("status", status != null ? status : "Available");
            dataObj.put("availableFrom", availableFrom != null ? availableFrom : "");
            dataObj.put("timestamp", timestamp);

            root.put("data", dataObj);
        } catch (Exception ignored) {}
        return root;
    }

    public static TuitionItem fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        TuitionItem item = new TuitionItem();
        item.setId(obj.optString("id", ""));
        item.setTitle(obj.optString("title", ""));
        item.setLocation(obj.optString("location", ""));
        
        String salStr = obj.optString("salary", "0");
        try {
            item.setSalary(Double.parseDouble(salStr));
        } catch (Exception e) {
            item.setSalary(0.0);
        }
        
        item.setContactPhone(obj.optString("phone", obj.optString("contactPhone", "")));
        item.setPublisherUid(obj.optString("publisher_uid", obj.optString("publisherUid", "")));
        
        String classVal = obj.optString("student_class", "");
        if (classVal.isEmpty()) classVal = obj.optString("classGrade", "");
        item.setClassGrade(classVal);
        
        String subjVal = obj.optString("subject", "");
        if (subjVal.isEmpty()) subjVal = obj.optString("subjects", "");
        item.setSubjects(subjVal);

        org.json.JSONObject data = obj.optJSONObject("data");
        if (data != null) {
            item.setMedium(data.optString("medium", item.getMedium()));
            item.setDaysPerWeek(data.optString("daysPerWeek", item.getDaysPerWeek()));
            item.setContactName(data.optString("contactName", item.getContactName()));
            item.setPublisherName(data.optString("publisherName", item.getPublisherName()));
            item.setApprovalStatus(data.optString("approvalStatus", "approved"));
            item.setStatus(data.optString("status", "Available"));
            item.setAvailableFrom(data.optString("availableFrom", ""));
            long ts = data.optLong("timestamp", 0);
            if (ts > 0) item.setTimestamp(ts);
        } else {
            item.setApprovalStatus(obj.optString("approvalStatus", "approved"));
            item.setStatus(obj.optString("status", "Available"));
            item.setDaysPerWeek(obj.optString("daysPerWeek", ""));
            item.setContactName(obj.optString("contactName", ""));
            item.setPublisherName(obj.optString("publisherName", ""));
        }
        return item;
    }
}
