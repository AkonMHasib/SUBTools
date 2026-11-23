package com.akon.subtools.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;

@Entity(tableName = "faculty")
public class Faculty implements Serializable {
    @PrimaryKey
    @NonNull
    private String id = "";
    private String name;
    private String email;
    private String phone;
    private String department;
    private String designation;
    private String rank;
    private String roomNo;
    private String status;
    private String photoUrl;
    private String image;

    public Faculty() {}

    @androidx.room.Ignore
    public Faculty(String id, String name, String email, String phone, String department, String designation, String status) {
        this.id = id != null ? id : "";
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.department = department;
        this.designation = designation;
        this.status = status;
    }

    @androidx.room.Ignore
    public Faculty(String id, String name, String email, String phone, String department, String designation, String status, String photoUrl) {
        this(id, name, email, phone, department, designation, status);
        this.photoUrl = photoUrl;
        this.image = photoUrl;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public String getRank() { return rank; }
    public void setRank(String rank) { this.rank = rank; }

    public String getRoomNo() { return roomNo; }
    public void setRoomNo(String roomNo) { this.roomNo = roomNo; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPhotoUrl() {
        if (photoUrl != null && !photoUrl.trim().isEmpty()) return photoUrl;
        if (image != null && !image.trim().isEmpty()) return image;
        return "";
    }
    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
        if (this.image == null) this.image = photoUrl;
    }

    public String getImage() { return getPhotoUrl(); }
    public void setImage(String image) {
        this.image = image;
        if (this.photoUrl == null) this.photoUrl = image;
    }

    public static Faculty fromJson(org.json.JSONObject json) {
        if (json == null) return null;
        try {
            org.json.JSONObject data = json.optJSONObject("data");
            if (data == null) data = json;

            Faculty f = new Faculty();
            String id = !json.optString("id", "").isEmpty() ? json.optString("id", "") : data.optString("id", "");
            f.setId(id);

            String name = !json.optString("name", "").isEmpty() ? json.optString("name", "")
                    : !json.optString("full_name", "").isEmpty() ? json.optString("full_name", "")
                    : data.optString("name", data.optString("full_name", ""));
            f.setName(name);

            f.setEmail(!json.optString("email", "").isEmpty() ? json.optString("email", "") : data.optString("email", ""));
            f.setPhone(!json.optString("phone", "").isEmpty() ? json.optString("phone", "") : data.optString("phone", ""));

            String rawDept = !json.optString("department", "").isEmpty() ? json.optString("department", "") : data.optString("department", "");
            f.setDepartment(com.akon.subtools.utils.DepartmentHelper.getDeptCode(rawDept));

            f.setDesignation(!json.optString("designation", "").isEmpty() ? json.optString("designation", "") : data.optString("designation", "Faculty Member"));
            f.setRank(data.optString("rank", ""));
            f.setRoomNo(data.optString("roomNo", ""));
            f.setStatus(data.optString("status", "Active"));

            String img = !data.optString("photoUrl", "").isEmpty() ? data.optString("photoUrl", "")
                    : !data.optString("image", "").isEmpty() ? data.optString("image", "")
                    : !json.optString("avatar_url", "").isEmpty() ? json.optString("avatar_url", "")
                    : json.optString("photoUrl", "");
            f.setPhotoUrl(img);
            f.setImage(img);

            return f;
        } catch (Exception e) {
            return null;
        }
    }

    public org.json.JSONObject toSupabaseJson() {
        try {
            String dept = com.akon.subtools.utils.DepartmentHelper.getDeptCode(getDepartment());

            org.json.JSONObject data = new org.json.JSONObject();
            data.put("id", getId());
            data.put("name", getName() != null ? getName() : "");
            data.put("email", getEmail() != null ? getEmail() : "");
            data.put("phone", getPhone() != null ? getPhone() : "");
            data.put("department", dept);
            data.put("designation", getDesignation() != null ? getDesignation() : "Faculty Member");
            data.put("rank", getRank() != null ? getRank() : "");
            data.put("roomNo", getRoomNo() != null ? getRoomNo() : "");
            data.put("status", getStatus() != null ? getStatus() : "Active");
            data.put("photoUrl", getPhotoUrl());
            data.put("image", getPhotoUrl());

            org.json.JSONObject root = new org.json.JSONObject();
            root.put("id", getId());
            root.put("name", getName() != null ? getName() : "");
            root.put("department", dept);
            root.put("designation", getDesignation() != null ? getDesignation() : "Faculty Member");
            root.put("email", getEmail() != null ? getEmail() : "");
            root.put("phone", getPhone() != null ? getPhone() : "");
            root.put("data", data);

            return root;
        } catch (Exception e) {
            return new org.json.JSONObject();
        }
    }
}
