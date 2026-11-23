package com.akon.subtools.models;

import java.io.Serializable;

public class LostFoundItem implements Serializable {
    private String id;
    private String title;
    private String description;
    private String type; // "Lost" or "Found"
    private String location;
    private String contactPhone;
    private String contactName;
    private String reporterName;
    private String reporterPhone;
    private String reporterEmail;
    private String publisherUid;
    private String reporterUid;
    private String approvalStatus; // "approved" or "pending"
    private String date;
    private String photoUrl;
    private String imageUrl;
    private String status; // "Active", "Resolved", "Lost", "Found", "Claimed"
    private long timestamp;

    public LostFoundItem() {
        this.approvalStatus = "pending";
        this.status = "Active";
        this.timestamp = System.currentTimeMillis();
    }

    public LostFoundItem(String id, String title, String description, String type, String location, String contactPhone, String contactName, String date, String photoUrl, String status, long timestamp) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.type = type;
        this.location = location;
        this.contactPhone = contactPhone;
        this.contactName = contactName;
        this.reporterName = contactName;
        this.reporterPhone = contactPhone;
        this.approvalStatus = "approved";
        this.date = date;
        this.photoUrl = photoUrl;
        this.imageUrl = photoUrl;
        this.status = status;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { 
        if (type == null || type.trim().isEmpty() || "null".equalsIgnoreCase(type.trim())) {
            return "Lost";
        }
        return type; 
    }
    public void setType(String type) { 
        if (type == null || type.trim().isEmpty() || "null".equalsIgnoreCase(type.trim())) {
            this.type = "Lost";
        } else if ("found".equalsIgnoreCase(type.trim())) {
            this.type = "Found";
        } else {
            this.type = "Lost";
        }
    }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getContactPhone() { 
        return (contactPhone != null && !contactPhone.isEmpty()) ? contactPhone : reporterPhone; 
    }
    public void setContactPhone(String contactPhone) { 
        this.contactPhone = contactPhone; 
        if (this.reporterPhone == null || this.reporterPhone.isEmpty()) {
            this.reporterPhone = contactPhone;
        }
    }

    public String getContactName() { 
        return (contactName != null && !contactName.isEmpty()) ? contactName : reporterName; 
    }
    public void setContactName(String contactName) { 
        this.contactName = contactName; 
        if (this.reporterName == null || this.reporterName.isEmpty()) {
            this.reporterName = contactName;
        }
    }

    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }

    public String getReporterPhone() { return reporterPhone; }
    public void setReporterPhone(String reporterPhone) { this.reporterPhone = reporterPhone; }

    public String getReporterEmail() { return reporterEmail; }
    public void setReporterEmail(String reporterEmail) { this.reporterEmail = reporterEmail; }

    public String getPublisherUid() {
        return (publisherUid != null && !publisherUid.isEmpty()) ? publisherUid : reporterUid;
    }
    public void setPublisherUid(String publisherUid) {
        this.publisherUid = publisherUid;
        if (this.reporterUid == null || this.reporterUid.isEmpty()) {
            this.reporterUid = publisherUid;
        }
    }

    public String getReporterUid() {
        return (reporterUid != null && !reporterUid.isEmpty()) ? reporterUid : publisherUid;
    }
    public void setReporterUid(String reporterUid) {
        this.reporterUid = reporterUid;
        if (this.publisherUid == null || this.publisherUid.isEmpty()) {
            this.publisherUid = reporterUid;
        }
    }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getPhotoUrl() { 
        return (photoUrl != null && !photoUrl.trim().isEmpty()) ? photoUrl : imageUrl; 
    }
    public void setPhotoUrl(String photoUrl) { 
        this.photoUrl = photoUrl;
        if (this.imageUrl == null || this.imageUrl.trim().isEmpty()) {
            this.imageUrl = photoUrl;
        }
    }

    public String getImageUrl() { 
        return (imageUrl != null && !imageUrl.trim().isEmpty()) ? imageUrl : photoUrl; 
    }
    public void setImageUrl(String imageUrl) { 
        this.imageUrl = imageUrl; 
        if (this.photoUrl == null || this.photoUrl.trim().isEmpty()) {
            this.photoUrl = imageUrl;
        }
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    public org.json.JSONObject toJson() {
        org.json.JSONObject root = new org.json.JSONObject();
        try {
            root.put("id", id != null ? id : "lf-" + System.currentTimeMillis());
            root.put("title", title != null ? title : "");
            root.put("description", description != null ? description : "");
            root.put("category", type != null ? type : "Lost");
            root.put("location", location != null ? location : "");
            root.put("status", status != null ? status : "Active");
            root.put("contact", getContactPhone());
            root.put("photo_url", getPhotoUrl() != null ? getPhotoUrl() : "");

            org.json.JSONObject dataObj = new org.json.JSONObject();
            dataObj.put("contactName", getContactName());
            dataObj.put("contactPhone", getContactPhone());
            dataObj.put("reporterName", reporterName != null ? reporterName : "");
            dataObj.put("reporterPhone", reporterPhone != null ? reporterPhone : "");
            dataObj.put("reporterEmail", reporterEmail != null ? reporterEmail : "");
            dataObj.put("publisherUid", getPublisherUid());
            dataObj.put("reporterUid", getReporterUid());
            dataObj.put("approvalStatus", approvalStatus != null ? approvalStatus : "pending");
            dataObj.put("date", date != null ? date : "");
            dataObj.put("timestamp", timestamp);

            root.put("data", dataObj);
        } catch (Exception ignored) {}
        return root;
    }

    public static LostFoundItem fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        LostFoundItem item = new LostFoundItem();
        item.setId(obj.optString("id", ""));
        item.setTitle(obj.optString("title", ""));
        item.setDescription(obj.optString("description", ""));
        
        org.json.JSONObject data = obj.optJSONObject("data");

        String cat = obj.optString("category", "").trim();
        if (cat.isEmpty() || "null".equalsIgnoreCase(cat)) {
            cat = obj.optString("type", "").trim();
        }
        if ((cat.isEmpty() || "null".equalsIgnoreCase(cat)) && data != null) {
            cat = data.optString("type", "").trim();
            if (cat.isEmpty() || "null".equalsIgnoreCase(cat)) {
                cat = data.optString("category", "").trim();
            }
        }
        if (cat.isEmpty() || "null".equalsIgnoreCase(cat)) {
            cat = "Lost";
        }
        item.setType(cat);

        item.setLocation(obj.optString("location", ""));
        item.setStatus(obj.optString("status", "Active"));
        
        String photo = obj.optString("photo_url", "");
        if (photo.isEmpty() || "null".equalsIgnoreCase(photo)) photo = obj.optString("photoUrl", obj.optString("imageUrl", ""));
        item.setPhotoUrl(photo);

        String contact = obj.optString("contact", "");

        if (data != null) {
            item.setContactName(data.optString("contactName", ""));
            item.setContactPhone(data.optString("contactPhone", contact));
            item.setReporterName(data.optString("reporterName", ""));
            item.setReporterPhone(data.optString("reporterPhone", contact));
            item.setReporterEmail(data.optString("reporterEmail", ""));
            item.setPublisherUid(data.optString("publisherUid", data.optString("publisher_uid", "")));
            item.setReporterUid(data.optString("reporterUid", ""));
            item.setApprovalStatus(data.optString("approvalStatus", "approved"));
            item.setDate(data.optString("date", ""));
            long ts = data.optLong("timestamp", 0);
            if (ts > 0) item.setTimestamp(ts);
        } else {
            item.setContactPhone(contact);
            item.setApprovalStatus(obj.optString("approvalStatus", "approved"));
            item.setPublisherUid(obj.optString("publisher_uid", obj.optString("publisherUid", "")));
            item.setDate(obj.optString("date", ""));
        }
        return item;
    }
}
