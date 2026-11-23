package com.akon.subtools.coordinator.data.model;

public class Notice {
    private String id;
    private String title;
    private String description;
    private String department;
    private String authorName;
    private String attachmentUrl;
    private Object createdAt;
    private String publishDate;
    private boolean isPinned;
    private boolean isScheduled;
    private String status;     // "live", "archived", "draft", "scheduled"
    private String priority;   // "Normal", "High", "Critical"
    private String targetDept;
    private Long scheduledFor;
    private String scheduledForLabel;

    public Notice() {
        // Required for Firestore
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { 
        return (description != null && !description.trim().isEmpty()) ? description : content; 
    }
    public void setDescription(String description) { 
        this.description = description; 
        if (this.content == null) this.content = description;
    }

    private String content;
    public String getContent() { return getDescription(); }
    public void setContent(String content) { 
        this.content = content; 
        if (this.description == null) this.description = content;
    }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getAuthorName() { 
        return (authorName != null && !authorName.trim().isEmpty()) ? authorName : sender; 
    }
    public void setAuthorName(String authorName) { 
        this.authorName = authorName; 
        if (this.sender == null) this.sender = authorName;
    }

    private String sender;
    public String getSender() { return getAuthorName(); }
    public void setSender(String sender) { 
        this.sender = sender; 
        if (this.authorName == null) this.authorName = sender;
    }

    private String authorStudentId;
    public String getAuthorStudentId() { return authorStudentId != null ? authorStudentId : ""; }
    public void setAuthorStudentId(String authorStudentId) { this.authorStudentId = authorStudentId; }

    public String getAttachmentUrl() { 
        if (attachmentUrl != null && !attachmentUrl.trim().isEmpty()) return attachmentUrl;
        if (imageUrl != null && !imageUrl.trim().isEmpty()) return imageUrl;
        return "";
    }
    public void setAttachmentUrl(String attachmentUrl) { 
        this.attachmentUrl = attachmentUrl; 
        if (this.imageUrl == null) this.imageUrl = attachmentUrl;
    }

    private String imageUrl;
    public String getImageUrl() { return getAttachmentUrl(); }
    public void setImageUrl(String imageUrl) { 
        this.imageUrl = imageUrl; 
        if (this.attachmentUrl == null) this.attachmentUrl = imageUrl;
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

    public Object getCreatedAt() { return createdAt; }
    public void setCreatedAt(Object createdAt) { this.createdAt = createdAt; }

    public String getPublishDate() { return publishDate; }
    public void setPublishDate(String publishDate) { this.publishDate = publishDate; }

    public boolean isPinned() { return isPinned; }
    public void setPinned(boolean pinned) { isPinned = pinned; }

    public boolean isScheduled() { return isScheduled; }
    public void setScheduled(boolean scheduled) { isScheduled = scheduled; }

    public String getStatus() { return status != null ? status : "live"; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority != null ? priority : "Normal"; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getTargetDept() {
        return targetDept != null ? targetDept : (department != null ? department : "All");
    }
    public void setTargetDept(String targetDept) { this.targetDept = targetDept; }

    public Long getScheduledFor() { return scheduledFor; }
    public void setScheduledFor(Long scheduledFor) { this.scheduledFor = scheduledFor; }

    public String getScheduledForLabel() { return scheduledForLabel; }
    public void setScheduledForLabel(String scheduledForLabel) { this.scheduledForLabel = scheduledForLabel; }

    public long getTimestamp() {
        if (createdAt instanceof Number) {
            return ((Number) createdAt).longValue();
        }
        if (createdAt instanceof java.util.Date) {
            return ((java.util.Date) createdAt).getTime();
        }
        if (createdAt instanceof String) {
            String str = ((String) createdAt).trim();
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    return java.time.Instant.parse(str).toEpochMilli();
                }
            } catch (Exception ignored) {}
        }
        if (publishDate != null && !publishDate.trim().isEmpty()) {
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
                    java.util.Date d = sdf.parse(publishDate.trim());
                    if (d != null) return d.getTime();
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

    public String getFormattedCreatorInfo() {
        String name = getAuthorName();
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
            if (publishDate != null && !publishDate.trim().isEmpty()) {
                formattedTime = formatPublishDateTo12Hour(publishDate.trim());
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

    public static Notice fromJson(org.json.JSONObject json) {
        if (json == null) return null;
        try {
            org.json.JSONObject data = json.optJSONObject("data");
            if (data == null) data = json;

            Notice n = new Notice();
            String id = json.optString("id", data.optString("id", ""));
            n.setId(id);

            String title = !json.optString("title", "").isEmpty()
                    ? json.optString("title", "")
                    : data.optString("title", "");
            n.setTitle(title);

            String body = !json.optString("body", "").isEmpty() ? json.optString("body", "")
                    : !json.optString("content", "").isEmpty() ? json.optString("content", "")
                    : !data.optString("body", "").isEmpty() ? data.optString("body", "")
                    : !data.optString("content", "").isEmpty() ? data.optString("content", "")
                    : data.optString("description", "");
            n.setDescription(body);
            n.setContent(body);

            String dept = !json.optString("department", "").isEmpty()
                    ? json.optString("department", "")
                    : !data.optString("department", "").isEmpty()
                    ? data.optString("department", "")
                    : data.optString("targetDept", "ALL");
            n.setDepartment(com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(dept));
            n.setTargetDept(n.getDepartment());

            n.setPriority(!json.optString("priority", "").isEmpty() ? json.optString("priority", "") : data.optString("priority", "Normal"));
            n.setStatus(!json.optString("status", "").isEmpty() ? json.optString("status", "") : data.optString("status", "live"));
            n.setPinned(json.optBoolean("pinned", data.optBoolean("pinned", false)));

            String dateStr = !json.optString("created_at", "").isEmpty() ? json.optString("created_at", "")
                    : !json.optString("date", "").isEmpty() ? json.optString("date", "")
                    : data.optString("date", data.optString("created_at", ""));
            n.setPublishDate(dateStr);
            n.setCreatedAt(dateStr);

            String sender = !json.optString("author", "").isEmpty() ? json.optString("author", "")
                    : !json.optString("sender", "").isEmpty() ? json.optString("sender", "")
                    : !data.optString("author", "").isEmpty() ? data.optString("author", "")
                    : !data.optString("authorName", "").isEmpty() ? data.optString("authorName", "")
                    : data.optString("sender", "Coordinator");
            n.setAuthorName(sender);
            n.setSender(sender);

            String sId = !json.optString("student_id", "").isEmpty() ? json.optString("student_id", "")
                    : !json.optString("studentId", "").isEmpty() ? json.optString("studentId", "")
                    : !json.optString("author_student_id", "").isEmpty() ? json.optString("author_student_id", "")
                    : !data.optString("student_id", "").isEmpty() ? data.optString("student_id", "")
                    : !data.optString("studentId", "").isEmpty() ? data.optString("studentId", "")
                    : data.optString("author_student_id", "");
            n.setAuthorStudentId(sId);

            String imgUrl = !json.optString("imageUrl", "").isEmpty() ? json.optString("imageUrl", "")
                    : !json.optString("attachmentUrl", "").isEmpty() ? json.optString("attachmentUrl", "")
                    : !data.optString("imageUrl", "").isEmpty() ? data.optString("imageUrl", "")
                    : data.optString("attachmentUrl", "");
            if (imgUrl.isEmpty()) {
                org.json.JSONArray atts = json.optJSONArray("attachments");
                if (atts == null) atts = data.optJSONArray("attachments");
                if (atts != null && atts.length() > 0) {
                    imgUrl = atts.optString(0, "");
                }
            }
            n.setAttachmentUrl(imgUrl);
            n.setImageUrl(imgUrl);

            String pdf = !json.optString("pdfUrl", "").isEmpty() ? json.optString("pdfUrl", "")
                    : !json.optString("pdfLink", "").isEmpty() ? json.optString("pdfLink", "")
                    : !data.optString("pdfUrl", "").isEmpty() ? data.optString("pdfUrl", "")
                    : !data.optString("pdfLink", "").isEmpty() ? data.optString("pdfLink", "")
                    : data.optString("pdfAttachment", "");
            n.setPdfUrl(pdf);
            n.setPdfLink(pdf);

            return n;
        } catch (Exception e) {
            return null;
        }
    }

    public org.json.JSONObject toSupabaseJson() {
        try {
            String dept = getDepartment() != null
                    ? com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(getDepartment())
                    : "ALL";

            org.json.JSONObject data = new org.json.JSONObject();
            data.put("id", getId());
            data.put("title", getTitle() != null ? getTitle() : "");
            data.put("body", getDescription() != null ? getDescription() : "");
            data.put("content", getDescription() != null ? getDescription() : "");
            data.put("description", getDescription() != null ? getDescription() : "");
            data.put("department", dept);
            data.put("target", dept);
            data.put("targetDept", dept);
            data.put("category", "Alert");
            data.put("type", "Alert");
            data.put("status", getStatus() != null ? getStatus() : "live");
            data.put("author", getAuthorName() != null ? getAuthorName() : "Coordinator");
            data.put("authorName", getAuthorName() != null ? getAuthorName() : "Coordinator");
            data.put("sender", getAuthorName() != null ? getAuthorName() : "Coordinator");
            data.put("student_id", getAuthorStudentId());
            data.put("studentId", getAuthorStudentId());
            data.put("author_student_id", getAuthorStudentId());
            data.put("priority", getPriority() != null ? getPriority() : "Normal");
            data.put("imageUrl", getAttachmentUrl() != null ? getAttachmentUrl() : "");
            data.put("attachmentUrl", getAttachmentUrl() != null ? getAttachmentUrl() : "");
            data.put("pdfUrl", getPdfUrl() != null ? getPdfUrl() : "");
            data.put("pinned", isPinned());

            org.json.JSONArray atts = new org.json.JSONArray();
            if (getAttachmentUrl() != null && !getAttachmentUrl().trim().isEmpty()) {
                atts.put(getAttachmentUrl().trim());
            }
            data.put("attachments", atts);

            org.json.JSONObject root = new org.json.JSONObject();
            root.put("id", getId());
            root.put("title", getTitle() != null ? getTitle() : "");
            root.put("body", getDescription() != null ? getDescription() : "");
            root.put("category", "Alert");
            root.put("department", dept);
            root.put("target", dept);
            root.put("author", getAuthorName() != null ? getAuthorName() : "Coordinator");
            root.put("student_id", getAuthorStudentId());
            root.put("author_student_id", getAuthorStudentId());
            root.put("pinned", isPinned());
            root.put("attachments", atts);
            root.put("data", data);
            root.put("updated_at", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date()));

            return root;
        } catch (Exception e) {
            return new org.json.JSONObject();
        }
    }
}
