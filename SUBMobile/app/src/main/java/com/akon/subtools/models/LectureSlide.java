package com.akon.subtools.models;

import java.io.Serializable;

public class LectureSlide implements Serializable {
    private String id;
    private String title;
    private String department;
    private String subjectCode;
    private String subjectName;
    private String lectureNumber;
    private String fileUrl;
    private String description;
    private String uploaderName;
    private Object createdAt;

    public LectureSlide() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title != null ? title : ""; }
    public void setTitle(String title) { this.title = title; }

    public String getDepartment() { return department != null ? department : ""; }
    public void setDepartment(String department) { this.department = department; }

    public String getSubjectCode() { return subjectCode != null ? subjectCode : ""; }
    public void setSubjectCode(String subjectCode) { this.subjectCode = subjectCode; }

    public String getSubjectName() { return subjectName != null ? subjectName : ""; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }

    public String getLectureNumber() { return lectureNumber != null ? lectureNumber : ""; }
    public void setLectureNumber(String lectureNumber) { this.lectureNumber = lectureNumber; }

    public String getFileUrl() { return fileUrl != null ? fileUrl : ""; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getDescription() { return description != null ? description : ""; }
    public void setDescription(String description) { this.description = description; }

    public String getUploaderName() { return uploaderName != null ? uploaderName : ""; }
    public void setUploaderName(String uploaderName) { this.uploaderName = uploaderName; }

    public Object getCreatedAt() { return createdAt; }
    public void setCreatedAt(Object createdAt) { this.createdAt = createdAt; }

    public long getCreatedAtMillis() {
        if (createdAt instanceof Number) {
            return ((Number) createdAt).longValue();
        }
        if (createdAt instanceof java.util.Date) {
            return ((java.util.Date) createdAt).getTime();
        }
        if (createdAt != null && createdAt.getClass().getName().contains("Timestamp")) {
            try {
                java.lang.reflect.Method toDateMethod = createdAt.getClass().getMethod("toDate");
                java.util.Date d = (java.util.Date) toDateMethod.invoke(createdAt);
                if (d != null) return d.getTime();
            } catch (Exception ignored) {}
            try {
                java.lang.reflect.Method getSecondsMethod = createdAt.getClass().getMethod("getSeconds");
                Long secs = (Long) getSecondsMethod.invoke(createdAt);
                if (secs != null) return secs * 1000L;
            } catch (Exception ignored) {}
        }
        if (createdAt instanceof String) {
            try {
                return Long.parseLong(((String) createdAt).trim());
            } catch (Exception ignored) {}
        }
        return 0L;
    }

    public static LectureSlide fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        LectureSlide slide = new LectureSlide();
        slide.setId(obj.optString("id", ""));
        slide.setTitle(obj.optString("title", ""));

        org.json.JSONObject data = obj.optJSONObject("data");

        String dept = obj.optString("department", "");
        if (dept.isEmpty() && data != null) dept = data.optString("department", "");
        slide.setDepartment(dept);

        String subCode = obj.optString("subject_code", "");
        if (subCode.isEmpty()) subCode = obj.optString("subjectCode", "");
        if (subCode.isEmpty() && data != null) subCode = data.optString("subjectCode", data.optString("subject_code", ""));
        slide.setSubjectCode(subCode);

        String subName = obj.optString("subject_name", "");
        if (subName.isEmpty()) subName = obj.optString("subjectName", "");
        if (subName.isEmpty() && data != null) subName = data.optString("subjectName", data.optString("subject_name", ""));
        slide.setSubjectName(subName);

        String lecNum = obj.optString("lecture_number", "");
        if (lecNum.isEmpty()) lecNum = obj.optString("lectureNumber", "");
        if (lecNum.isEmpty() && data != null) lecNum = data.optString("lectureNumber", data.optString("lecture_number", ""));
        slide.setLectureNumber(lecNum);

        String file = obj.optString("file_url", "");
        if (file.isEmpty()) file = obj.optString("fileUrl", "");
        if (file.isEmpty() && data != null) file = data.optString("fileUrl", data.optString("file_url", ""));
        slide.setFileUrl(file);

        String desc = obj.optString("description", "");
        if (desc.isEmpty() && data != null) desc = data.optString("description", "");
        slide.setDescription(desc);

        String uploader = obj.optString("uploader_name", "");
        if (uploader.isEmpty()) uploader = obj.optString("uploaderName", "");
        if (uploader.isEmpty() && data != null) uploader = data.optString("uploaderName", data.optString("uploader_name", ""));
        slide.setUploaderName(uploader);

        Object created = obj.opt("createdAt");
        if (created == null && data != null) created = data.opt("createdAt");
        if (created == null) created = obj.opt("created_at");
        if (created == null && data != null) created = data.opt("created_at");
        if (created == null) {
            long createdMs = obj.optLong("created_at_ms", 0);
            if (createdMs > 0) created = createdMs;
        }
        slide.setCreatedAt(created != null ? created : System.currentTimeMillis());

        return slide;
    }
}
