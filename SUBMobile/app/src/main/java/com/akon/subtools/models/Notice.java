package com.akon.subtools.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;

@Entity(tableName = "notices")
public class Notice implements Serializable {
    @PrimaryKey
    @NonNull
    private String id = "";
    private String title;
    private String content;
    private String department;
    private String priority;
    private String type;
    private String date;
    private String sender;
    private String imageUrl;
    private String attachmentUrl;
    private String status;

    public Notice() {}

    @androidx.room.Ignore
    public Notice(String id, String title, String content, String department, String priority, String type, String date, String sender) {
        this.id = id != null ? id : "";
        this.title = title;
        this.content = content;
        this.department = department;
        this.priority = priority;
        this.type = type;
        this.date = date;
        this.sender = sender;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { 
        return (content != null && !content.trim().isEmpty()) ? content : description; 
    }
    public void setContent(String content) { 
        this.content = content; 
        if (this.description == null) this.description = content;
    }

    private String description;
    public String getDescription() { return getContent(); }
    public void setDescription(String description) { 
        this.description = description; 
        if (this.content == null) this.content = description;
    }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDate() { 
        return getFormattedDate(); 
    }
    public void setDate(String date) { this.date = date; }

    public String getFormattedDate() {
        long ts = getTimestamp();
        if (ts > 0) {
            java.text.SimpleDateFormat outSdf = new java.text.SimpleDateFormat("dd/MM/yyyy - hh:mm a", java.util.Locale.ENGLISH);
            return outSdf.format(new java.util.Date(ts));
        }
        if (date != null && !date.trim().isEmpty()) {
            return formatNoticeDateTime(date.trim());
        }
        return "";
    }

    private static String formatNoticeDateTime(String raw) {
        if (raw == null || raw.trim().isEmpty()) return "";
        String trimmed = raw.trim();
        String[] formats = {
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ssX",
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd HH:mm:ss",
            "dd/MM/yyyy, hh:mm:ss a",
            "dd/MM/yyyy, HH:mm:ss",
            "M/d/yyyy, h:mm:ss a",
            "M/d/yyyy, hh:mm:ss a",
            "M/d/yyyy, h:mm:ss",
            "dd/MM/yyyy HH:mm:ss",
            "dd/MM/yyyy",
            "yyyy-MM-dd",
            "dd-MM-yyyy",
            "dd MMM yyyy",
            "MMM dd, yyyy"
        };
        for (String f : formats) {
            try {
                java.text.SimpleDateFormat inSdf = new java.text.SimpleDateFormat(f, java.util.Locale.ENGLISH);
                inSdf.setLenient(true);
                java.util.Date parsed = inSdf.parse(trimmed);
                if (parsed != null) {
                    java.text.SimpleDateFormat outSdf = new java.text.SimpleDateFormat("dd/MM/yyyy - hh:mm a", java.util.Locale.ENGLISH);
                    return outSdf.format(parsed);
                }
            } catch (Exception ignored) {}
        }
        return trimmed;
    }

    @androidx.room.Ignore
    private Object createdAt;
    public Object getCreatedAt() { return createdAt; }
    public void setCreatedAt(Object createdAt) { this.createdAt = createdAt; }

    public long getTimestamp() {
        if (createdAt != null) {
            if (createdAt instanceof Number) {
                long val = ((Number) createdAt).longValue();
                if (val > 0) return val;
            } else if (createdAt instanceof java.util.Date) {
                return ((java.util.Date) createdAt).getTime();
            } else if (createdAt instanceof org.json.JSONObject) {
                org.json.JSONObject cObj = (org.json.JSONObject) createdAt;
                long secs = cObj.optLong("_seconds", cObj.optLong("seconds", 0));
                if (secs > 0) return secs * 1000L;
            } else if (createdAt instanceof java.util.Map) {
                java.util.Map<?, ?> cMap = (java.util.Map<?, ?>) createdAt;
                Object sObj = cMap.containsKey("_seconds") ? cMap.get("_seconds") : cMap.get("seconds");
                if (sObj instanceof Number) {
                    return ((Number) sObj).longValue() * 1000L;
                }
            } else if (createdAt.getClass().getName().contains("Timestamp")) {
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
            } else if (createdAt instanceof String) {
                String trimmed = ((String) createdAt).trim();
                try {
                    long val = Long.parseLong(trimmed);
                    if (val > 0) return val;
                } catch (Exception ignored) {}
                try {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        return java.time.Instant.parse(trimmed).toEpochMilli();
                    }
                } catch (Exception ignored) {}
                String[] formats = {
                    "yyyy-MM-dd'T'HH:mm:ss.SSSX",
                    "yyyy-MM-dd'T'HH:mm:ssX",
                    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                    "yyyy-MM-dd'T'HH:mm:ss'Z'",
                    "yyyy-MM-dd'T'HH:mm:ss",
                    "yyyy-MM-dd HH:mm:ss",
                    "dd/MM/yyyy HH:mm:ss",
                    "dd/MM/yyyy, hh:mm:ss a",
                    "dd/MM/yyyy, HH:mm:ss",
                    "M/d/yyyy, h:mm:ss a",
                    "dd/MM/yyyy",
                    "yyyy-MM-dd",
                    "dd-MM-yyyy",
                    "dd MMM yyyy",
                    "MMM dd, yyyy"
                };
                for (String f : formats) {
                    try {
                        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat(f, java.util.Locale.ENGLISH);
                        sdf.setLenient(true);
                        java.util.Date parsed = sdf.parse(trimmed);
                        if (parsed != null) return parsed.getTime();
                    } catch (Exception ignored) {}
                }
            }
        }
        if (date != null && !date.trim().isEmpty()) {
            String trimmed = date.trim();
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    return java.time.Instant.parse(trimmed).toEpochMilli();
                }
            } catch (Exception ignored) {}
            String[] formats = {
                "yyyy-MM-dd'T'HH:mm:ss.SSSX",
                "yyyy-MM-dd'T'HH:mm:ssX",
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss",
                "dd/MM/yyyy HH:mm:ss",
                "dd/MM/yyyy, hh:mm:ss a",
                "dd/MM/yyyy, HH:mm:ss",
                "M/d/yyyy, h:mm:ss a",
                "dd/MM/yyyy",
                "yyyy-MM-dd",
                "dd-MM-yyyy",
                "dd MMM yyyy",
                "MMM dd, yyyy"
            };
            for (String f : formats) {
                try {
                    java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat(f, java.util.Locale.ENGLISH);
                    sdf.setLenient(true);
                    java.util.Date parsed = sdf.parse(trimmed);
                    if (parsed != null) return parsed.getTime();
                } catch (Exception ignored) {}
            }
        }
        if (id != null && id.contains("-")) {
            String suffix = id.substring(id.lastIndexOf("-") + 1);
            try {
                long ts = Long.parseLong(suffix);
                if (ts > 1000000000000L) return ts;
            } catch (Exception ignored) {}
        }
        return 0L;
    }

    public String getSender() { 
        return (sender != null && !sender.trim().isEmpty()) ? sender : authorName; 
    }
    public void setSender(String sender) { 
        this.sender = sender; 
        if (this.authorName == null) this.authorName = sender;
    }

    private String authorName;
    public String getAuthorName() { return getSender(); }
    public void setAuthorName(String authorName) { 
        this.authorName = authorName; 
        if (this.sender == null) this.sender = authorName;
    }

    private String authorStudentId;
    public String getAuthorStudentId() { return authorStudentId != null ? authorStudentId : ""; }
    public void setAuthorStudentId(String authorStudentId) { this.authorStudentId = authorStudentId; }

    public String getFormattedCreatorInfo() {
        String name = getSender();
        if (name == null || name.trim().isEmpty()) {
            name = "Admin";
        } else {
            name = name.trim();
        }

        String sid = getAuthorStudentId();
        if (sid != null) sid = sid.trim();

        long ts = getTimestamp();
        String formattedTime = null;
        if (ts > 0) {
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("h:mm a | d MMMM yyyy", java.util.Locale.ENGLISH);
            formattedTime = sdf.format(new java.util.Date(ts));
        }

        if (formattedTime == null || formattedTime.isEmpty()) {
            if (date != null && !date.trim().isEmpty()) {
                formattedTime = formatPublishDateTo12Hour(date.trim());
            }
        }

        if (formattedTime == null || formattedTime.isEmpty()) {
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("h:mm a | d MMMM yyyy", java.util.Locale.ENGLISH);
            formattedTime = sdf.format(new java.util.Date());
        }

        StringBuilder sb = new StringBuilder("Posted by: ");
        sb.append(name);
        if (sid != null && !sid.isEmpty()) {
            sb.append("_").append(sid);
        }
        sb.append("_").append(formattedTime);
        return sb.toString();
    }

    private String formatPublishDateTo12Hour(String raw) {
        if (raw == null || raw.trim().isEmpty()) return "";
        String[] formats = {
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ssX",
            "yyyy-MM-dd'T'HH:mm:ss",
            "dd/MM/yyyy HH:mm:ss",
            "dd/MM/yyyy, hh:mm:ss a",
            "dd/MM/yyyy",
            "yyyy-MM-dd",
            "dd-MM-yyyy"
        };
        for (String f : formats) {
            try {
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat(f, java.util.Locale.ENGLISH);
                sdf.setLenient(true);
                java.util.Date d = sdf.parse(raw.trim());
                if (d != null) {
                    return new java.text.SimpleDateFormat("h:mm a | d MMMM yyyy", java.util.Locale.ENGLISH).format(d);
                }
            } catch (Exception ignored) {}
        }
        return raw.trim();
    }

    public String getImageUrl() { 
        if (imageUrl != null && !imageUrl.trim().isEmpty()) return imageUrl;
        if (attachmentUrl != null && !attachmentUrl.trim().isEmpty()) return attachmentUrl;
        return "";
    }
    public void setImageUrl(String imageUrl) { 
        this.imageUrl = imageUrl; 
        if (this.attachmentUrl == null) this.attachmentUrl = imageUrl;
    }

    public String getAttachmentUrl() { return getImageUrl(); }
    public void setAttachmentUrl(String attachmentUrl) { 
        this.attachmentUrl = attachmentUrl; 
        if (this.imageUrl == null) this.imageUrl = attachmentUrl;
    }

    private String pdfUrl;
    private String pdfLink;
    private String pdfAttachment;

    public String getPdfUrl() {
        if (pdfUrl != null && !pdfUrl.trim().isEmpty()) return pdfUrl;
        if (pdfLink != null && !pdfLink.trim().isEmpty()) return pdfLink;
        if (pdfAttachment != null && !pdfAttachment.trim().isEmpty()) return pdfAttachment;
        return "";
    }
    public void setPdfUrl(String pdfUrl) {
        this.pdfUrl = pdfUrl;
        if (this.pdfLink == null) this.pdfLink = pdfUrl;
        if (this.pdfAttachment == null) this.pdfAttachment = pdfUrl;
    }

    public String getPdfLink() { return getPdfUrl(); }
    public void setPdfLink(String pdfLink) {
        this.pdfLink = pdfLink;
        if (this.pdfUrl == null) this.pdfUrl = pdfLink;
    }

    public String getPdfAttachment() { return getPdfUrl(); }
    public void setPdfAttachment(String pdfAttachment) {
        this.pdfAttachment = pdfAttachment;
        if (this.pdfUrl == null) this.pdfUrl = pdfAttachment;
    }

    public static Notice fromJson(org.json.JSONObject json) {
        if (json == null) return null;
        try {
            // 'data' is a nested JSON blob written by STC mirror; fall back to root for pure Supabase rows
            org.json.JSONObject data = json.optJSONObject("data");
            if (data == null) data = json;

            Notice n = new Notice();
            // ID: always from top-level
            String id = json.optString("id", data.optString("id", ""));
            n.setId(id);

            // Title: prefer top-level, fallback to data blob
            String title = !json.optString("title", "").isEmpty()
                    ? json.optString("title", "")
                    : data.optString("title", "");
            n.setTitle(title);

            // Body / Content: prefer top-level content or body; data blob may hold these too
            String body = !json.optString("content", "").isEmpty() ? json.optString("content", "")
                    : !json.optString("body", "").isEmpty() ? json.optString("body", "")
                    : !data.optString("content", "").isEmpty() ? data.optString("content", "")
                    : !data.optString("body", "").isEmpty() ? data.optString("body", "")
                    : data.optString("description", "");
            n.setContent(body);
            n.setDescription(body);

            // Department: prefer TOP-LEVEL Supabase column first (most reliable source);
            // fallback to nested data blob, then default "ALL"
            String dept = !json.optString("department", "").isEmpty()
                    ? json.optString("department", "")
                    : !data.optString("department", "").isEmpty()
                    ? data.optString("department", "")
                    : data.optString("targetDept", "ALL");
            n.setDepartment(dept);

            // Priority
            String priority = !json.optString("priority", "").isEmpty()
                    ? json.optString("priority", "")
                    : data.optString("priority", "Normal");
            n.setPriority(priority);

            // Type / Category
            String type = !json.optString("type", "").isEmpty() ? json.optString("type", "")
                    : !json.optString("category", "").isEmpty() ? json.optString("category", "")
                    : !data.optString("type", "").isEmpty() ? data.optString("type", "")
                    : data.optString("category", "General");
            n.setType(type);

            // Date: prefer top-level Supabase created_at timestamp
            String dateStr = !json.optString("created_at", "").isEmpty() ? json.optString("created_at", "")
                    : !json.optString("date", "").isEmpty() ? json.optString("date", "")
                    : data.optString("date", data.optString("created_at", ""));
            n.setDate(dateStr);

            Object cAt = json.opt("createdAt");
            if (cAt == null && data != null) cAt = data.opt("createdAt");
            if (cAt == null) cAt = json.opt("created_at");
            if (cAt == null && data != null) cAt = data.opt("created_at");
            if (cAt != null) {
                n.setCreatedAt(cAt);
            } else if (!dateStr.isEmpty()) {
                n.setCreatedAt(dateStr);
            }

            // Sender / Author
            String sender = !json.optString("sender", "").isEmpty() ? json.optString("sender", "")
                    : !json.optString("author", "").isEmpty() ? json.optString("author", "")
                    : !data.optString("sender", "").isEmpty() ? data.optString("sender", "")
                    : !data.optString("authorName", "").isEmpty() ? data.optString("authorName", "")
                    : data.optString("author", "SUB Authority");
            n.setSender(sender);
            n.setAuthorName(sender);

            String sId = !json.optString("student_id", "").isEmpty() ? json.optString("student_id", "")
                    : !json.optString("studentId", "").isEmpty() ? json.optString("studentId", "")
                    : !json.optString("author_student_id", "").isEmpty() ? json.optString("author_student_id", "")
                    : !data.optString("student_id", "").isEmpty() ? data.optString("student_id", "")
                    : !data.optString("studentId", "").isEmpty() ? data.optString("studentId", "")
                    : data.optString("author_student_id", "");
            n.setAuthorStudentId(sId);

            // Image / Attachment URL
            String imgUrl = !json.optString("imageUrl", "").isEmpty() ? json.optString("imageUrl", "")
                    : !json.optString("attachmentUrl", "").isEmpty() ? json.optString("attachmentUrl", "")
                    : !data.optString("imageUrl", "").isEmpty() ? data.optString("imageUrl", "")
                    : data.optString("attachmentUrl", "");
            if (imgUrl.isEmpty()) {
                org.json.JSONArray atts = json.optJSONArray("attachments");
                if (atts == null) atts = data.optJSONArray("attachments");
                if (atts != null && atts.length() > 0) {
                    Object first = atts.opt(0);
                    if (first instanceof org.json.JSONObject) {
                        org.json.JSONObject fObj = (org.json.JSONObject) first;
                        imgUrl = fObj.optString("url", fObj.optString("link", fObj.optString("file_url", "")));
                    } else if (first != null) {
                        imgUrl = first.toString();
                    }
                }
            }
            n.setImageUrl(imgUrl);

            // PDF URL
            String pdf = !json.optString("pdfUrl", "").isEmpty() ? json.optString("pdfUrl", "")
                    : !json.optString("pdfLink", "").isEmpty() ? json.optString("pdfLink", "")
                    : !data.optString("pdfUrl", "").isEmpty() ? data.optString("pdfUrl", "")
                    : !data.optString("pdfLink", "").isEmpty() ? data.optString("pdfLink", "")
                    : data.optString("pdfAttachment", "");
            if (pdf.isEmpty() && imgUrl != null && imgUrl.toLowerCase().endsWith(".pdf")) {
                pdf = imgUrl;
            }
            n.setPdfUrl(pdf);

            String status = json.optString("status", data.optString("status", "published"));
            n.setStatus(status);

            return n;
        } catch (Exception e) {
            return null;
        }
    }

    public String getStatus() { return status != null ? status : "published"; }
    public void setStatus(String status) { this.status = status; }

    public boolean isPopupNotice() {
        return "In-App Popup".equalsIgnoreCase(type) ||
               "In-App Popup".equalsIgnoreCase(priority) ||
               "Popup".equalsIgnoreCase(priority) ||
               "Popup".equalsIgnoreCase(type);
    }
}
