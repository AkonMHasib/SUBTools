package com.akon.subtools.coordinator.data.model;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class User {
    private String uid;
    private String studentId;
    private String name;
    private String email;
    private String department;
    private String batch;
    private String phone;
    private String dob;
    private String academicSystem;
    private String academicLevel;
    private String section;
    private String bloodGroup;
    private String city;
    private String area;
    private String location;
    private String status;
    private String role;
    private java.util.List<String> roles;
    private String activeRole;
    private boolean allowBloodDonation;
    private boolean disabled;
    private boolean manuallyVerified;
    private boolean emailVerified;
    private String photoUrl;
    private String semester;
    private String trimester;
    private String academicSession;
    private String batchStatus;
    private long admissionDate;
    private long verificationEmailSentAt;
    private java.util.List<String> subjects = new java.util.ArrayList<>();

    public User() {
        // Required for Firestore deserialization
    }

    public String getUid() { return uid; }
    public void setUid(String uid) { this.uid = uid; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getDepartment() {
        if (department != null && !department.trim().isEmpty()) {
            return department;
        }
        String inferred = com.akon.subtools.coordinator.utils.DepartmentUtils.inferDepartmentFromEmail(email);
        return inferred != null ? inferred : "GENERAL";
    }
    public void setDepartment(String department) { this.department = department; }

    public String getBatch() { return batch; }
    public void setBatch(String batch) { this.batch = batch; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDob() { return dob; }
    public void setDob(String dob) { this.dob = dob; }

    public String getAcademicSystem() { return academicSystem; }
    public void setAcademicSystem(String academicSystem) { this.academicSystem = academicSystem; }

    public String getAcademicLevel() { return academicLevel; }
    public void setAcademicLevel(String academicLevel) { this.academicLevel = academicLevel; }

    public String getSection() { return section != null ? section : ""; }
    public void setSection(String section) { this.section = section != null ? section : ""; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getArea() { return area; }
    public void setArea(String area) { this.area = area; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    private String image;

    public String getPhotoUrl() {
        if (photoUrl != null && !photoUrl.trim().isEmpty()) return photoUrl.trim();
        if (image != null && !image.trim().isEmpty()) return image.trim();
        return "";
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public String getPhoto_url() { return getPhotoUrl(); }
    public void setPhoto_url(String photo_url) { setPhotoUrl(photo_url); }

    public String getImage() { return getPhotoUrl(); }
    public void setImage(String image) {
        this.image = image;
        if (this.photoUrl == null) this.photoUrl = image;
    }

    public String getRole() {
        if (roles != null && !roles.isEmpty()) return roles.get(0);
        if (role != null && !role.trim().isEmpty()) return role.trim().toLowerCase();
        return "student";
    }
    public void setRole(String role) {
        this.role = role;
        if (role != null && !role.trim().isEmpty()) {
            if (this.roles == null) this.roles = new java.util.ArrayList<>();
            String clean = role.trim().toLowerCase();
            if (!this.roles.contains(clean)) this.roles.add(clean);
        }
    }

    public java.util.List<String> getRoles() {
        if (roles == null) {
            roles = new java.util.ArrayList<>();
            if (role != null && !role.trim().isEmpty()) {
                roles.add(role.trim().toLowerCase());
            } else {
                roles.add("student");
            }
        }
        return roles;
    }

    public void setRoles(java.util.List<String> roles) {
        this.roles = roles;
        if (roles != null && !roles.isEmpty()) {
            boolean hasAdmin = false;
            for (String r : roles) {
                if (r != null) {
                    String clean = r.trim().toLowerCase();
                    if ("super_admin".equals(clean) || "superadmin".equals(clean)) {
                        this.role = "super_admin";
                        hasAdmin = true;
                        break;
                    } else if ("admin".equals(clean) || "administrator".equals(clean)) {
                        this.role = "admin";
                        hasAdmin = true;
                    }
                }
            }
            if (!hasAdmin) {
                this.role = roles.get(0);
            }
        }
    }

    public String getActiveRole() {
        if (activeRole != null && !activeRole.trim().isEmpty()) {
            return activeRole.trim().toLowerCase();
        }
        if (roles != null) {
            for (String r : roles) {
                if (r != null) {
                    String clean = r.trim().toLowerCase();
                    if ("super_admin".equals(clean) || "superadmin".equals(clean)) return "super_admin";
                    if ("admin".equals(clean) || "administrator".equals(clean)) return "admin";
                }
            }
            if (!roles.isEmpty()) return roles.get(0).trim().toLowerCase();
        }
        if (role != null && !role.trim().isEmpty()) {
            return role.trim().toLowerCase();
        }
        return "student";
    }

    public void setActiveRole(String activeRole) {
        this.activeRole = activeRole;
    }

    public boolean isAllowBloodDonation() { return allowBloodDonation; }
    public void setAllowBloodDonation(boolean allowBloodDonation) { this.allowBloodDonation = allowBloodDonation; }

    public boolean isDisabled() { return disabled; }
    public void setDisabled(boolean disabled) { this.disabled = disabled; }

    public boolean isManuallyVerified() { return manuallyVerified; }
    public void setManuallyVerified(boolean manuallyVerified) { this.manuallyVerified = manuallyVerified; }

    public boolean isEmailVerified() { return emailVerified || manuallyVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    /**
     * Converts any stored date format (Timestamp, ISO string, milliseconds, or existing DD/MM/YYYY) into DD/MM/YYYY format.
     */
    public String getFormattedDOB() {
        if (dob == null || dob.trim().isEmpty()) {
            return "N/A";
        }
        String cleanDob = dob.trim();

        // 1. Check if already DD/MM/YYYY or DD-MM-YYYY
        if (cleanDob.matches("^\\d{2}[/\\-]\\d{2}[/\\-]\\d{4}$")) {
            return cleanDob.replace("-", "/");
        }

        // 2. Check if YYYY-MM-DD
        if (cleanDob.matches("^\\d{4}[/\\-]\\d{2}[/\\-]\\d{2}$")) {
            try {
                SimpleDateFormat inFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                SimpleDateFormat outFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.US);
                Date parsedDate = inFormat.parse(cleanDob.replace("/", "-"));
                if (parsedDate != null) return outFormat.format(parsedDate);
            } catch (Exception ignored) {}
        }

        // 3. Try parsing numeric millis
        try {
            long millis = Long.parseLong(cleanDob);
            SimpleDateFormat outFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.US);
            return outFormat.format(new Date(millis));
        } catch (NumberFormatException ignored) {}

        // Fallback return original string
        return cleanDob;
    }

    public static String extractPhotoUrl(org.json.JSONObject obj, org.json.JSONObject data) {
        String[] keys = {"photo_url", "avatar_url", "photoUrl", "photoURL", "image", "profile_image"};
        if (obj != null) {
            for (String key : keys) {
                String val = obj.optString(key, "").trim();
                if (!val.isEmpty() && !val.equalsIgnoreCase("null")) {
                    return val;
                }
            }
        }
        if (data != null) {
            for (String key : keys) {
                String val = data.optString(key, "").trim();
                if (!val.isEmpty() && !val.equalsIgnoreCase("null")) {
                    return val;
                }
            }
        }
        return "";
    }

    public static User fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        User u = new User();
        org.json.JSONObject data = obj.optJSONObject("data");
        String uid = obj.optString("id", obj.optString("uid", data != null ? data.optString("id", data.optString("uid", "")) : ""));
        u.setUid(uid);
        u.setStudentId(obj.optString("student_id", obj.optString("studentId", data != null ? data.optString("student_id", data.optString("studentId", "")) : "")));
        u.setName(obj.optString("full_name", obj.optString("name", data != null ? data.optString("full_name", data.optString("name", "")) : "")));
        u.setEmail(obj.optString("email", data != null ? data.optString("email", "") : ""));
        u.setDepartment(obj.optString("department", data != null ? data.optString("department", "") : ""));
        u.setBatch(obj.optString("batch", data != null ? data.optString("batch", "") : ""));
        u.setPhone(obj.optString("phone", data != null ? data.optString("phone", "") : ""));
        u.setDob(obj.optString("dob", data != null ? data.optString("dob", "") : ""));
        u.setAcademicSystem(obj.optString("academic_system", obj.optString("academicSystem", data != null ? data.optString("academic_system", data.optString("academicSystem", "")) : "")));
        u.setAcademicLevel(obj.optString("academic_level", obj.optString("academicLevel", data != null ? data.optString("academic_level", data.optString("academicLevel", "")) : "")));
        u.setSection(obj.optString("section", data != null ? data.optString("section", "") : ""));
        u.setBloodGroup(obj.optString("blood_group", obj.optString("bloodGroup", data != null ? data.optString("blood_group", data.optString("bloodGroup", "")) : "")));
        u.setCity(obj.optString("city", data != null ? data.optString("city", "") : ""));
        u.setArea(obj.optString("area", data != null ? data.optString("area", "") : ""));
        u.setLocation(obj.optString("location", data != null ? data.optString("location", "") : ""));
        u.setStatus(obj.optString("status", data != null ? data.optString("status", "active") : "active"));
        
        // Parse roles array
        java.util.List<String> rList = new java.util.ArrayList<>();
        org.json.JSONArray rolesArr = obj.optJSONArray("roles");
        if (rolesArr == null && data != null) rolesArr = data.optJSONArray("roles");
        if (rolesArr != null) {
            for (int i = 0; i < rolesArr.length(); i++) {
                String r = rolesArr.optString(i, "").toLowerCase().trim();
                if (!r.isEmpty() && !rList.contains(r)) rList.add(r);
            }
        }

        // Also check if 'roles' is a string (e.g. JSON string "[\"admin\"]" or CSV "admin,student" or Postgres "{admin}")
        String rolesStr = obj.optString("roles", data != null ? data.optString("roles", "") : "").trim();
        if (!rolesStr.isEmpty() && !rolesStr.equalsIgnoreCase("null")) {
            if (rolesStr.startsWith("[") && rolesStr.endsWith("]")) {
                try {
                    org.json.JSONArray sArr = new org.json.JSONArray(rolesStr);
                    for (int i = 0; i < sArr.length(); i++) {
                        String r = sArr.optString(i, "").toLowerCase().trim();
                        if (!r.isEmpty() && !rList.contains(r)) rList.add(r);
                    }
                } catch (Exception ignored) {}
            }
            if (rList.isEmpty()) {
                String cleanCsv = rolesStr.replace("{", "").replace("}", "").replace("[", "").replace("]", "").replace("\"", "");
                for (String part : cleanCsv.split(",")) {
                    String clean = part.trim().toLowerCase();
                    if (!clean.isEmpty() && !rList.contains(clean)) rList.add(clean);
                }
            }
        }

        String singleR = obj.optString("role", data != null ? data.optString("role", "") : "").trim().toLowerCase();
        if (!singleR.isEmpty() && !rList.contains(singleR)) {
            rList.add(singleR);
        }

        boolean isAdminFlag = obj.optBoolean("is_admin", obj.optBoolean("isAdmin", data != null && data.optBoolean("is_admin", data.optBoolean("isAdmin", false))));
        boolean isSuperFlag = obj.optBoolean("is_super_admin", obj.optBoolean("isSuperAdmin", data != null && data.optBoolean("is_super_admin", data.optBoolean("isSuperAdmin", false))));
        if (isAdminFlag && !rList.contains("admin")) rList.add("admin");
        if (isSuperFlag && !rList.contains("super_admin")) rList.add("super_admin");
        if (rList.isEmpty()) rList.add("student");
        u.setRoles(rList);

        u.setPhotoUrl(extractPhotoUrl(obj, data));
        u.setAllowBloodDonation(obj.optBoolean("allow_blood_donation", obj.optBoolean("allowBloodDonation", data != null && data.optBoolean("allowBloodDonation", false))));
        u.setDisabled(obj.optBoolean("disabled", data != null && data.optBoolean("disabled", false)));
        u.setManuallyVerified(obj.optBoolean("manually_verified", obj.optBoolean("manuallyVerified", data != null && data.optBoolean("manuallyVerified", false))));
        u.setEmailVerified(obj.optBoolean("email_verified", obj.optBoolean("emailVerified", data != null && data.optBoolean("emailVerified", false))));

        // Parse academic fields
        u.setSemester(obj.optString("semester", data != null ? data.optString("semester", "") : ""));
        u.setTrimester(obj.optString("trimester", data != null ? data.optString("trimester", "") : ""));
        u.setAcademicSession(obj.optString("academic_session", obj.optString("academicSession", data != null ? data.optString("academic_session", data.optString("academicSession", "")) : "")));
        u.setBatchStatus(obj.optString("batch_status", obj.optString("batchStatus", data != null ? data.optString("batch_status", data.optString("batchStatus", "Active")) : "Active")));
        u.setAdmissionDate(obj.optLong("admission_date", obj.optLong("admissionDate", data != null ? data.optLong("admission_date", data.optLong("admissionDate", 0L)) : 0L)));
        u.setVerificationEmailSentAt(obj.optLong("verification_email_sent_at", obj.optLong("verificationEmailSentAt", data != null ? data.optLong("verification_email_sent_at", data.optLong("verificationEmailSentAt", 0L)) : 0L)));

        org.json.JSONArray subjArr = obj.optJSONArray("subjects");
        if (subjArr == null && data != null) subjArr = data.optJSONArray("subjects");
        if (subjArr != null) {
            java.util.List<String> sList = new java.util.ArrayList<>();
            for (int i = 0; i < subjArr.length(); i++) {
                String s = subjArr.optString(i, "").trim();
                if (!s.isEmpty()) sList.add(s);
            }
            u.setSubjects(sList);
        }

        return u;
    }

    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }

    public String getTrimester() { return trimester; }
    public void setTrimester(String trimester) { this.trimester = trimester; }

    public String getAcademicSession() { return academicSession; }
    public void setAcademicSession(String academicSession) { this.academicSession = academicSession; }

    public String getBatchStatus() { return batchStatus != null ? batchStatus : "Active"; }
    public void setBatchStatus(String batchStatus) { this.batchStatus = batchStatus; }

    public long getAdmissionDate() { return admissionDate; }
    public void setAdmissionDate(long admissionDate) { this.admissionDate = admissionDate; }

    public long getVerificationEmailSentAt() { return verificationEmailSentAt; }
    public void setVerificationEmailSentAt(long verificationEmailSentAt) { this.verificationEmailSentAt = verificationEmailSentAt; }

    public java.util.List<String> getSubjects() {
        if (subjects == null) subjects = new java.util.ArrayList<>();
        return subjects;
    }
    public void setSubjects(java.util.List<String> subjects) {
        if (subjects == null) {
            this.subjects = new java.util.ArrayList<>();
        } else {
            java.util.List<String> unique = new java.util.ArrayList<>();
            for (String s : subjects) {
                if (s != null && !s.trim().isEmpty() && !unique.contains(s.trim())) {
                    unique.add(s.trim());
                }
            }
            this.subjects = unique;
        }
    }

    public org.json.JSONObject toSupabaseJson() {
        org.json.JSONObject json = new org.json.JSONObject();
        try {
            if (uid != null && !uid.isEmpty()) {
                json.put("id", uid);
                json.put("uid", uid);
            }
            json.put("student_id", studentId != null ? studentId : "");
            json.put("studentId", studentId != null ? studentId : "");
            json.put("full_name", name != null ? name : "");
            json.put("name", name != null ? name : "");
            json.put("email", email != null ? email : "");
            json.put("department", getDepartment());
            json.put("batch", batch != null ? batch : "");
            json.put("phone", phone != null ? phone : "");
            json.put("dob", dob != null ? dob : "");
            json.put("academic_system", academicSystem != null ? academicSystem : "");
            json.put("academic_level", academicLevel != null ? academicLevel : "");
            json.put("section", getSection());
            json.put("blood_group", bloodGroup != null ? bloodGroup : "");
            json.put("bloodGroup", bloodGroup != null ? bloodGroup : "");
            json.put("city", city != null ? city : "");
            json.put("area", area != null ? area : "");
            json.put("location", location != null ? location : "");
            json.put("status", status != null ? status : "active");
            json.put("roles", new org.json.JSONArray(getRoles()));
            json.put("avatar_url", getPhotoUrl());
            json.put("photo_url", getPhotoUrl());
            json.put("photoUrl", getPhotoUrl());
            json.put("photoURL", getPhotoUrl());
            json.put("allow_blood_donation", allowBloodDonation);
            json.put("disabled", disabled);
            json.put("manually_verified", manuallyVerified);
            json.put("email_verified", emailVerified);

            if (semester != null && !semester.isEmpty()) json.put("semester", semester);
            if (trimester != null && !trimester.isEmpty()) json.put("trimester", trimester);
            if (academicSession != null && !academicSession.isEmpty()) {
                json.put("academic_session", academicSession);
                json.put("academicSession", academicSession);
            }
            if (batchStatus != null && !batchStatus.isEmpty()) {
                json.put("batch_status", batchStatus);
                json.put("batchStatus", batchStatus);
            }
            if (admissionDate > 0) {
                json.put("admission_date", admissionDate);
                json.put("admissionDate", admissionDate);
            }
            if (verificationEmailSentAt > 0) {
                json.put("verification_email_sent_at", verificationEmailSentAt);
                json.put("verificationEmailSentAt", verificationEmailSentAt);
            }
            if (subjects != null && !subjects.isEmpty()) {
                json.put("subjects", new org.json.JSONArray(subjects));
            }

            org.json.JSONObject data = new org.json.JSONObject(json.toString());
            json.put("data", data);
        } catch (Exception e) {}
        return json;
    }
}
