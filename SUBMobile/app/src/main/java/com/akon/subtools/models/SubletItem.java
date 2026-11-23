package com.akon.subtools.models;

import java.io.Serializable;

public class SubletItem implements Serializable {
    private String id;
    private String title;
    private String type; // "Seat", "Sublet", "Full Flat", "Room"
    private String location; // "Dhanmondi", "Ashulia", "Mirpur", etc.
    private String address;
    private double rent; // BDT
    private boolean billsIncluded;
    private String genderPreference; // "Male", "Female", "Any"
    private String availableFrom;
    private String description;
    private String contactName;
    private String contactPhone;
    private String publisherUid;
    private String publisherName;
    private String approvalStatus; // "approved", "pending"
    private String photoUrl;
    private String status; // "Active", "Rented", "Closed"
    private long timestamp;

    public SubletItem() {
        this.type = "Seat";
        this.genderPreference = "Male";
        this.approvalStatus = "pending";
        this.status = "Active";
        this.timestamp = System.currentTimeMillis();
    }

    public SubletItem(String id, String title, String type, String location, String address, double rent, boolean billsIncluded, String genderPreference, String availableFrom, String description, String contactName, String contactPhone, String publisherUid, String publisherName, String photoUrl) {
        this.id = id;
        this.title = title;
        this.type = type != null ? type : "Seat";
        this.location = location;
        this.address = address;
        this.rent = rent;
        this.billsIncluded = billsIncluded;
        this.genderPreference = genderPreference != null ? genderPreference : "Male";
        this.availableFrom = availableFrom;
        this.description = description;
        this.contactName = contactName;
        this.contactPhone = contactPhone;
        this.publisherUid = publisherUid;
        this.publisherName = publisherName;
        this.photoUrl = photoUrl;
        this.approvalStatus = "pending";
        this.status = "Active";
        this.timestamp = System.currentTimeMillis();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public double getRent() { return rent; }
    public void setRent(double rent) { this.rent = rent; }

    public boolean isBillsIncluded() { return billsIncluded; }
    public void setBillsIncluded(boolean billsIncluded) { this.billsIncluded = billsIncluded; }

    public String getGenderPreference() { return genderPreference; }
    public void setGenderPreference(String genderPreference) { this.genderPreference = genderPreference; }

    public String getAvailableFrom() { return availableFrom; }
    public void setAvailableFrom(String availableFrom) { this.availableFrom = availableFrom; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

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

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    public org.json.JSONObject toJson() {
        org.json.JSONObject root = new org.json.JSONObject();
        try {
            root.put("id", id != null ? id : "sublet-" + System.currentTimeMillis());
            root.put("title", title != null ? title : "");
            root.put("rent", String.valueOf(rent));
            root.put("location", location != null ? location : "");
            root.put("room_type", type != null ? type : "Seat");
            root.put("phone", contactPhone != null ? contactPhone : "");
            root.put("publisher_uid", publisherUid != null ? publisherUid : "");

            org.json.JSONObject dataObj = new org.json.JSONObject();
            dataObj.put("address", address != null ? address : "");
            dataObj.put("billsIncluded", billsIncluded);
            dataObj.put("genderPreference", genderPreference != null ? genderPreference : "Male");
            dataObj.put("availableFrom", availableFrom != null ? availableFrom : "");
            dataObj.put("description", description != null ? description : "");
            dataObj.put("contactName", contactName != null ? contactName : "");
            dataObj.put("publisherName", publisherName != null ? publisherName : "");
            dataObj.put("approvalStatus", approvalStatus != null ? approvalStatus : "pending");
            dataObj.put("photoUrl", photoUrl != null ? photoUrl : "");
            dataObj.put("status", status != null ? status : "Active");
            dataObj.put("timestamp", timestamp);

            root.put("data", dataObj);
        } catch (Exception ignored) {}
        return root;
    }

    public static SubletItem fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        SubletItem item = new SubletItem();
        item.setId(obj.optString("id", ""));
        item.setTitle(obj.optString("title", ""));
        item.setLocation(obj.optString("location", ""));

        String rentStr = obj.optString("rent", "0");
        try {
            item.setRent(Double.parseDouble(rentStr));
        } catch (Exception e) {
            item.setRent(0.0);
        }

        item.setType(obj.optString("room_type", obj.optString("type", "Seat")));
        item.setContactPhone(obj.optString("phone", obj.optString("contactPhone", "")));
        item.setPublisherUid(obj.optString("publisher_uid", obj.optString("publisherUid", "")));

        org.json.JSONObject data = obj.optJSONObject("data");
        if (data != null) {
            item.setAddress(data.optString("address", ""));
            item.setBillsIncluded(data.optBoolean("billsIncluded", false));
            item.setGenderPreference(data.optString("genderPreference", "Male"));
            item.setAvailableFrom(data.optString("availableFrom", ""));
            item.setDescription(data.optString("description", ""));
            item.setContactName(data.optString("contactName", ""));
            item.setPublisherName(data.optString("publisherName", ""));
            item.setApprovalStatus(data.optString("approvalStatus", "approved"));
            item.setPhotoUrl(data.optString("photoUrl", ""));
            item.setStatus(data.optString("status", "Active"));
            long ts = data.optLong("timestamp", 0);
            if (ts > 0) item.setTimestamp(ts);
        } else {
            item.setAddress(obj.optString("address", ""));
            item.setBillsIncluded(obj.optBoolean("billsIncluded", false));
            item.setGenderPreference(obj.optString("genderPreference", "Male"));
            item.setAvailableFrom(obj.optString("availableFrom", ""));
            item.setDescription(obj.optString("description", ""));
            item.setContactName(obj.optString("contactName", ""));
            item.setPublisherName(obj.optString("publisherName", ""));
            item.setApprovalStatus(obj.optString("approvalStatus", "approved"));
            item.setPhotoUrl(obj.optString("photoUrl", ""));
            item.setStatus(obj.optString("status", "Active"));
        }
        return item;
    }
}
