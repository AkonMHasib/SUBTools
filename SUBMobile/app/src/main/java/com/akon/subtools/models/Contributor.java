package com.akon.subtools.models;

import java.io.Serializable;

public class Contributor implements Serializable {

    private String name;
    private String role;
    private String department;
    private String phone;
    private String email;
    private String description;
    private String imageFilename;

    // Required for Firebase/Firestore
    public Contributor() {
    }

    // Basic constructor
    public Contributor(String name, String role, String department) {
        this(name, role, department, "", "", "", "");
    }

    // Constructor used by ContributorsFragment
    public Contributor(
            String name,
            String role,
            String phone,
            String email,
            String imageFilename
    ) {
        this(name, role, "", phone, email, "", imageFilename);
    }

    // Full constructor
    public Contributor(
            String name,
            String role,
            String department,
            String phone,
            String email,
            String description,
            String imageFilename
    ) {
        this.name = name;
        this.role = role;
        this.department = department;
        this.phone = phone;
        this.email = email;
        this.description = description;
        this.imageFilename = imageFilename;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImageFilename() {
        return imageFilename;
    }

    public void setImageFilename(String imageFilename) {
        this.imageFilename = imageFilename;
    }

    public static Contributor fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        org.json.JSONObject data = obj.optJSONObject("data");
        Contributor c = new Contributor();
        c.setName(obj.optString("name", obj.optString("full_name", data != null ? data.optString("name", data.optString("full_name", "")) : "")));
        c.setRole(obj.optString("role", data != null ? data.optString("role", "") : ""));
        c.setDepartment(obj.optString("department", data != null ? data.optString("department", "") : ""));
        c.setPhone(obj.optString("phone", data != null ? data.optString("phone", "") : ""));
        c.setEmail(obj.optString("email", data != null ? data.optString("email", "") : ""));
        c.setDescription(obj.optString("description", data != null ? data.optString("description", "") : ""));
        c.setImageFilename(obj.optString("image_filename", obj.optString("imageFilename", obj.optString("photo_url", obj.optString("avatar_url", data != null ? data.optString("imageFilename", "") : "")))));
        return c;
    }

    public org.json.JSONObject toSupabaseJson() {
        org.json.JSONObject json = new org.json.JSONObject();
        try {
            json.put("name", name != null ? name : "");
            json.put("role", role != null ? role : "");
            json.put("department", department != null ? department : "");
            json.put("phone", phone != null ? phone : "");
            json.put("email", email != null ? email : "");
            json.put("description", description != null ? description : "");
            json.put("image_filename", imageFilename != null ? imageFilename : "");
        } catch (Exception ignored) {}
        return json;
    }
}