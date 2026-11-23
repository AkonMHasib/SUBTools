package com.akon.subtools.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;
import androidx.room.TypeConverters;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Entity(tableName = "users")
public class User implements Serializable {
    @PrimaryKey
    @NonNull
    private String uid = "";
    private String studentId;
    private String name;
    private String email;
    private String department;
    private String batch;
    private String phone;
    private String dob;
    private String academicLevel;
    private String academicSystem;
    private String status;
    private String role;
    @androidx.room.Ignore
    private List<String> roles;
    private String photoURL;
    private String section;
    private List<String> subjects;
    private List<String> completedSubjects;

    // Academic auto-sync fields
    private String semester;
    private String trimester;
    private String academicSession;
    private String batchStatus;
    private boolean manuallyVerified;
    private long verificationEmailSentAt;
    private long admissionDate;

    // Blood donor profile and location fields
    private String bloodGroup;
    private boolean allowBloodDonation;
    private String location;
    private String city;
    private String area;

    // Device and Security Tracking (ignored in Room, synced in Firestore)
    @androidx.room.Ignore
    private String lastIp;
    @androidx.room.Ignore
    private String deviceModel;
    @androidx.room.Ignore
    private String deviceManufacturer;
    @androidx.room.Ignore
    private String androidVersion;
    @androidx.room.Ignore
    private long lastLoginAt;

    // No-arg constructor required for Firestore/Room deserialization
    public User() {
        this.subjects = new ArrayList<>();
        this.completedSubjects = new ArrayList<>();
        this.status = "Active";
        this.role = "student";
        this.allowBloodDonation = false;
    }

    @androidx.room.Ignore
    public User(String uid, String studentId, String name, String email, String department, String batch, String phone, String dob, String academicLevel) {
        this.uid = uid != null ? uid : "";
        this.studentId = studentId;
        this.name = name;
        this.email = email;
        this.department = department;
        this.batch = batch;
        this.phone = phone;
        this.dob = dob;
        this.academicLevel = academicLevel;
        this.status = "Active";
        this.role = "student";
        this.subjects = new ArrayList<>();
        this.completedSubjects = new ArrayList<>();
        this.allowBloodDonation = false;
    }

    // Getters and Setters
    public String getUid() { return uid; }
    public void setUid(String uid) { this.uid = uid; }

    public String getStudentId() { 
        return formatStudentIdIfNeeded(studentId, department, batch, email); 
    }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public static String formatStudentIdIfNeeded(String rawId, String dept, String batch, String email) {
        if (rawId == null) rawId = "";
        String clean = rawId.trim();
        // If already in standard UGxx-xx-xx-xxx or similar format
        if (clean.matches("(?i)^[A-Z]{2}\\d{2}-\\d{2}-\\d{2}-\\d{3}$")) {
            return clean.toUpperCase();
        }
        // If 5 digits like 59004 (Batch 59, Roll 004)
        if (clean.matches("^\\d{5}$")) {
            String batchNum = clean.substring(0, 2);
            String rollNum = clean.substring(2); // e.g. 004
            String normDept = com.akon.subtools.utils.DepartmentHelper.getDeptCode(dept);
            if (normDept.isEmpty() && email != null) {
                normDept = deriveDeptFromEmailOrId(email, clean);
            }
            String prefix = getDepartmentUGPrefix(normDept);
            return prefix + "-" + batchNum + "-25-" + rollNum;
        }
        return clean;
    }

    public static String getDepartmentUGPrefix(String dept) {
        String d = dept != null ? dept.trim().toUpperCase() : "";
        switch (d) {
            case "CSE": return "UG02";
            case "DSE": return "UG13";
            case "ARCH": return "UG09";
            case "BBA": return "UG01";
            case "ENG": return "UG07";
            case "ES": return "UG04";
            case "FENS": return "UG11";
            case "JCMS": return "UG12";
            case "LLB": return "UG10";
            case "B.PHARM": return "UG08";
            case "MIB": return "UG03";
            default: return "UG09";
        }
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getBatch() { return batch; }
    public void setBatch(String batch) { this.batch = batch; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDob() { return dob; }
    public void setDob(String dob) { this.dob = dob; }

    public String getAcademicLevel() { return academicLevel; }
    public void setAcademicLevel(String academicLevel) { this.academicLevel = academicLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public List<String> getRoles() {
        if (roles == null) {
            roles = new ArrayList<>();
            if (role != null && !role.trim().isEmpty()) {
                for (String part : role.split(",")) {
                    String clean = part.trim().toLowerCase();
                    if (!clean.isEmpty() && !roles.contains(clean)) {
                        roles.add(clean);
                    }
                }
            }
        }
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public boolean hasStudentRole() {
        if ("student".equalsIgnoreCase(role)) return true;
        if (role != null && role.toLowerCase().contains("student")) return true;
        List<String> rList = getRoles();
        if (rList != null) {
            for (String r : rList) {
                if (r != null && "student".equalsIgnoreCase(r.trim())) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean hasAdminRole() {
        if (role != null) {
            String r = role.trim().toLowerCase();
            if (r.contains("admin")) return true;
        }
        List<String> rList = getRoles();
        if (rList != null) {
            for (String r : rList) {
                if (r != null) {
                    String clean = r.trim().toLowerCase();
                    if ("admin".equals(clean) || "super_admin".equals(clean) || "superadmin".equals(clean) || "administrator".equals(clean)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public String getPhotoURL() { return photoURL; }
    public void setPhotoURL(String photoURL) { this.photoURL = photoURL; }
    public String getPhoto_url() { return photoURL; }
    public void setPhoto_url(String photo_url) { this.photoURL = photo_url; }
    public String getPhotoUrl() { return photoURL; }
    public void setPhotoUrl(String photoUrl) { this.photoURL = photoUrl; }

    public List<String> getSubjects() { 
        if (subjects == null) {
            subjects = new ArrayList<>();
        }
        return subjects; 
    }
    public void setSubjects(List<String> subjects) { 
        if (subjects == null) {
            this.subjects = new ArrayList<>();
        } else {
            List<String> unique = new ArrayList<>();
            for (String s : subjects) {
                if (s != null && !s.trim().isEmpty() && !unique.contains(s.trim())) {
                    unique.add(s.trim());
                }
            }
            this.subjects = unique;
        }
    }

    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }

    public String getTrimester() { return trimester; }
    public void setTrimester(String trimester) { this.trimester = trimester; }

    public String getAcademicSession() { return academicSession; }
    public void setAcademicSession(String academicSession) { this.academicSession = academicSession; }

    public String getBatchStatus() { return batchStatus; }
    public void setBatchStatus(String batchStatus) { this.batchStatus = batchStatus; }

    public boolean isManuallyVerified() { return manuallyVerified; }
    public void setManuallyVerified(boolean manuallyVerified) { this.manuallyVerified = manuallyVerified; }

    public long getVerificationEmailSentAt() { return verificationEmailSentAt; }
    public void setVerificationEmailSentAt(long verificationEmailSentAt) { this.verificationEmailSentAt = verificationEmailSentAt; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public boolean isAllowBloodDonation() { return allowBloodDonation; }
    public void setAllowBloodDonation(boolean allowBloodDonation) { this.allowBloodDonation = allowBloodDonation; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getSection() { return section != null ? section : ""; }
    public void setSection(String section) { this.section = section != null ? section : ""; }

    public String getAcademicSystem() { return academicSystem; }
    public void setAcademicSystem(String academicSystem) { this.academicSystem = academicSystem; }

    public long getAdmissionDate() { return admissionDate; }
    public void setAdmissionDate(long admissionDate) { this.admissionDate = admissionDate; }

    private String gender;
    private int lastBirthdayWishedYear;
    private List<String> usedBirthdayMessages = new java.util.ArrayList<>();

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public int getLastBirthdayWishedYear() { return lastBirthdayWishedYear; }
    public void setLastBirthdayWishedYear(int lastBirthdayWishedYear) { this.lastBirthdayWishedYear = lastBirthdayWishedYear; }

    public List<String> getUsedBirthdayMessages() {
        if (usedBirthdayMessages == null) {
            usedBirthdayMessages = new java.util.ArrayList<>();
        }
        return usedBirthdayMessages;
    }
    public void setUsedBirthdayMessages(List<String> usedBirthdayMessages) {
        this.usedBirthdayMessages = usedBirthdayMessages;
    }

    public int selectUnusedBirthdayMessageIndex(int maxCount) {
        List<String> used = getUsedBirthdayMessages();
        List<Integer> available = new java.util.ArrayList<>();
        for (int i = 0; i < maxCount; i++) {
            if (!used.contains(String.valueOf(i))) {
                available.add(i);
            }
        }
        if (available.isEmpty()) {
            used.clear();
            for (int i = 0; i < maxCount; i++) {
                available.add(i);
            }
        }
        int randomIndex = available.get(new java.util.Random().nextInt(available.size()));
        used.add(String.valueOf(randomIndex));
        return randomIndex;
    }

    public String getLastIp() { return lastIp; }
    public void setLastIp(String lastIp) { this.lastIp = lastIp; }

    public String getDeviceModel() { return deviceModel; }
    public void setDeviceModel(String deviceModel) { this.deviceModel = deviceModel; }

    public String getDeviceManufacturer() { return deviceManufacturer; }
    public void setDeviceManufacturer(String deviceManufacturer) { this.deviceManufacturer = deviceManufacturer; }

    public String getAndroidVersion() { return androidVersion; }
    public void setAndroidVersion(String androidVersion) { this.androidVersion = androidVersion; }

    public long getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(long lastLoginAt) { this.lastLoginAt = lastLoginAt; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getArea() { return area; }
    public void setArea(String area) { this.area = area; }

    // Profile extras (ignored in Room to avoid a schema migration; synced via Supabase)
    @androidx.room.Ignore
    private boolean donor;
    @androidx.room.Ignore
    private String lastDonationDate;
    @androidx.room.Ignore
    private String bio;
    @androidx.room.Ignore
    private String birthday;

    public boolean isDonor() { return donor; }
    public void setDonor(boolean donor) { this.donor = donor; }

    public String getLastDonationDate() { return lastDonationDate; }
    public void setLastDonationDate(String lastDonationDate) { this.lastDonationDate = lastDonationDate; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getBirthday() { return birthday; }
    public void setBirthday(String birthday) { this.birthday = birthday; }

    @androidx.room.Ignore
    private double completedCredits;

    public double getCompletedCredits() { return completedCredits; }
    public void setCompletedCredits(double completedCredits) { this.completedCredits = completedCredits; }

    public List<String> getCompletedSubjects() {
        if (completedSubjects == null) completedSubjects = new ArrayList<>();
        return completedSubjects;
    }
    public void setCompletedSubjects(List<String> completedSubjects) {
        this.completedSubjects = completedSubjects;
    }

    public static String extractPhotoUrl(org.json.JSONObject... sources) {
        String[] keys = {"photo_url", "avatar_url", "photoUrl", "photoURL", "picture", "image", "profile_image", "avatar"};
        if (sources == null) return "";
        for (org.json.JSONObject src : sources) {
            if (src == null) continue;
            for (String key : keys) {
                if (src.has(key) && !src.isNull(key)) {
                    String val = src.optString(key, "").trim();
                    if (!val.isEmpty() && !"null".equalsIgnoreCase(val)) {
                        return val;
                    }
                }
            }
            org.json.JSONObject meta = src.optJSONObject("raw_user_meta_data");
            if (meta == null) meta = src.optJSONObject("user_metadata");
            if (meta != null) {
                for (String key : keys) {
                    if (meta.has(key) && !meta.isNull(key)) {
                        String val = meta.optString(key, "").trim();
                        if (!val.isEmpty() && !"null".equalsIgnoreCase(val)) {
                            return val;
                        }
                    }
                }
            }
        }
        return "";
    }

    public static String deriveDeptFromEmailOrId(String email, String studentId) {
        if (email != null && email.contains("@")) {
            String prefix = email.split("@")[0].trim().toLowerCase();
            String[] parts = prefix.split("\\.");
            for (String p : parts) {
                String code = com.akon.subtools.utils.DepartmentHelper.getDeptCode(p);
                for (String c : com.akon.subtools.utils.DepartmentHelper.ALL_CODES) {
                    if (c.equalsIgnoreCase(code)) {
                        return c;
                    }
                }
            }
        }
        return "";
    }

    public static String deriveBatchFromEmailOrId(String email, String studentId) {
        if (studentId != null && !studentId.trim().isEmpty()) {
            String clean = studentId.trim();
            if (clean.contains("-")) {
                String[] parts = clean.split("-");
                if (parts.length >= 2 && parts[1].length() >= 2) {
                    return parts[1];
                }
            }
        }
        if (email != null && email.contains("@")) {
            String prefix = email.split("@")[0].trim().toLowerCase();
            String[] parts = prefix.split("\\.");
            if (parts.length >= 3) {
                String lastPart = parts[parts.length - 1].replaceAll("[^0-9]", "");
                if (lastPart.length() >= 2) {
                    return lastPart.substring(0, 2);
                }
            }
        }
        return "";
    }

    public static User fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        User u = new User();

        // 1. Unpack all metadata containers from Supabase Auth & REST
        org.json.JSONObject userMeta = obj.optJSONObject("raw_user_meta_data");
        if (userMeta == null) userMeta = obj.optJSONObject("user_metadata");

        org.json.JSONObject appMeta = obj.optJSONObject("raw_app_meta_data");
        if (appMeta == null) appMeta = obj.optJSONObject("app_metadata");

        org.json.JSONObject data = obj.optJSONObject("data");

        org.json.JSONObject[] containers = new org.json.JSONObject[]{userMeta, obj, data, appMeta};

        String uid = optFirstNonEmpty(containers, "id", "uid");
        u.setUid(uid);

        String studentId = optFirstNonEmpty(containers, "student_id", "studentId");
        u.setStudentId(studentId);

        String name = optFirstNonEmpty(containers, "name", "full_name", "fullName");
        u.setName(name);

        String email = optFirstNonEmpty(containers, "email");
        u.setEmail(email);

        String dept = optFirstNonEmpty(new org.json.JSONObject[]{userMeta, appMeta, obj, data}, "department");
        u.setDepartment(dept);

        String batch = optFirstNonEmpty(containers, "batch");
        u.setBatch(batch);

        String phone = optFirstNonEmpty(containers, "phone");
        u.setPhone(phone);

        String dobVal = optFirstNonEmpty(containers, "dob", "birthday");
        u.setDob(dobVal);

        String rawLevel = optFirstNonEmpty(containers, "academic_level", "academicLevel", "term");
        if (rawLevel.isEmpty()) {
            String sem = optFirstNonEmpty(containers, "semester");
            if (!sem.matches(".*\\d{4}.*")) {
                rawLevel = sem;
            }
        }
        if (rawLevel.isEmpty()) {
            String tri = optFirstNonEmpty(containers, "trimester");
            if (!tri.matches(".*\\d{4}.*")) {
                rawLevel = tri;
            }
        }
        u.setAcademicLevel(rawLevel);

        String acadSys = optFirstNonEmpty(containers, "academic_system", "academicSystem");
        u.setAcademicSystem(acadSys);

        // Auto-derive department from email or student ID if missing
        if (u.getDepartment() == null || u.getDepartment().trim().isEmpty() || "N/A".equalsIgnoreCase(u.getDepartment().trim())) {
            String derivedDept = deriveDeptFromEmailOrId(u.getEmail(), u.getStudentId());
            if (!derivedDept.isEmpty()) {
                u.setDepartment(derivedDept);
            }
        }

        // Auto-derive batch from email or student ID if missing
        if (u.getBatch() == null || u.getBatch().trim().isEmpty() || "N/A".equalsIgnoreCase(u.getBatch().trim())) {
            String derivedBatch = deriveBatchFromEmailOrId(u.getEmail(), u.getStudentId());
            if (!derivedBatch.isEmpty()) {
                u.setBatch(derivedBatch);
            }
        }

        // Architecture department always uses Architecture system
        if ("ARCH".equalsIgnoreCase(u.getDepartment())) {
            u.setAcademicSystem("Architecture");
        } else if (u.getAcademicSystem() == null || u.getAcademicSystem().trim().isEmpty() || "N/A".equalsIgnoreCase(u.getAcademicSystem().trim())) {
            u.setAcademicSystem("Semester");
        }

        String status = optFirstNonEmpty(new org.json.JSONObject[]{appMeta, userMeta, obj, data}, "status");
        u.setStatus(!status.isEmpty() ? status : "Active");

        String role = optFirstNonEmpty(new org.json.JSONObject[]{appMeta, userMeta, obj, data}, "role");
        u.setRole(!role.isEmpty() ? role : "student");

        u.setPhotoURL(extractPhotoUrl(userMeta, obj, data));

        u.setSection(optFirstNonEmpty(containers, "section"));
        u.setSemester(optFirstNonEmpty(containers, "semester"));
        u.setTrimester(optFirstNonEmpty(containers, "trimester"));
        u.setAcademicSession(optFirstNonEmpty(containers, "academic_session", "academicSession"));
        u.setBatchStatus(optFirstNonEmpty(containers, "batch_status", "batchStatus"));
        u.setManuallyVerified(optBooleanFirst(containers, "manually_verified", "manuallyVerified"));
        u.setVerificationEmailSentAt(optLongFirst(containers, "verification_email_sent_at", "verificationEmailSentAt"));
        u.setAdmissionDate(optLongFirst(containers, "admission_date", "admissionDate"));

        u.setBloodGroup(optFirstNonEmpty(containers, "blood_group", "bloodGroup"));
        boolean isDonor = optBooleanFirst(containers, "allow_blood_donation", "allowBloodDonation", "is_donor", "isDonor");
        u.setAllowBloodDonation(isDonor);
        u.setDonor(isDonor);

        u.setLocation(optFirstNonEmpty(containers, "location"));
        u.setCity(optFirstNonEmpty(containers, "city"));
        u.setArea(optFirstNonEmpty(containers, "area"));
        u.setGender(optFirstNonEmpty(containers, "gender"));
        u.setLastBirthdayWishedYear((int) optLongFirst(containers, "last_birthday_wished_year", "lastBirthdayWishedYear"));

        double credits = optDoubleFirst(containers, "completed_credits", "completedCredits");
        u.setCompletedCredits(credits);

        // Subject codes (enrolled and completed) from all containers
        List<String> list = extractSubjectCodesFromContainers(containers, "subjects", "enrolled_subjects", "enrolledSubjects", "enrolledCodes");
        u.setSubjects(list);

        List<String> cList = extractSubjectCodesFromContainers(containers, "completed_subjects", "completedSubjects");
        u.setCompletedSubjects(cList);

        // Roles parsing
        List<String> rList = new ArrayList<>();
        extractRolesFromContainers(new org.json.JSONObject[]{appMeta, userMeta, obj, data}, rList);
        if (rList.isEmpty()) rList.add("student");
        u.setRoles(rList);

        return u;
    }

    private static String optFirstNonEmpty(org.json.JSONObject[] containers, String... keys) {
        if (containers == null) return "";
        for (org.json.JSONObject c : containers) {
            if (c == null) continue;
            for (String k : keys) {
                if (c.has(k) && !c.isNull(k)) {
                    String val = c.optString(k, "").trim();
                    if (!val.isEmpty() && !"null".equalsIgnoreCase(val)) {
                        return val;
                    }
                }
            }
        }
        return "";
    }

    private static boolean optBooleanFirst(org.json.JSONObject[] containers, String... keys) {
        if (containers == null) return false;
        for (org.json.JSONObject c : containers) {
            if (c == null) continue;
            for (String k : keys) {
                if (c.has(k) && !c.isNull(k)) {
                    return c.optBoolean(k, false);
                }
            }
        }
        return false;
    }

    private static long optLongFirst(org.json.JSONObject[] containers, String... keys) {
        if (containers == null) return 0L;
        for (org.json.JSONObject c : containers) {
            if (c == null) continue;
            for (String k : keys) {
                if (c.has(k) && !c.isNull(k)) {
                    return c.optLong(k, 0L);
                }
            }
        }
        return 0L;
    }

    private static double optDoubleFirst(org.json.JSONObject[] containers, String... keys) {
        if (containers == null) return 0.0;
        for (org.json.JSONObject c : containers) {
            if (c == null) continue;
            for (String k : keys) {
                if (c.has(k) && !c.isNull(k)) {
                    return c.optDouble(k, 0.0);
                }
            }
        }
        return 0.0;
    }

    private static void extractRolesFromContainers(org.json.JSONObject[] containers, List<String> rList) {
        if (containers == null) return;
        for (org.json.JSONObject c : containers) {
            if (c == null) continue;
            org.json.JSONArray rolesArr = c.optJSONArray("roles");
            if (rolesArr != null) {
                for (int i = 0; i < rolesArr.length(); i++) {
                    String r = rolesArr.optString(i, "").toLowerCase().trim();
                    if (!r.isEmpty() && !rList.contains(r)) rList.add(r);
                }
            }
            String rolesStr = c.optString("roles", "").trim();
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
            String singleR = c.optString("role", "").trim().toLowerCase();
            if (!singleR.isEmpty() && !rList.contains(singleR)) {
                rList.add(singleR);
            }
            if (c.optBoolean("is_admin", false) || c.optBoolean("isAdmin", false)) {
                if (!rList.contains("admin")) rList.add("admin");
            }
            if (c.optBoolean("is_super_admin", false) || c.optBoolean("isSuperAdmin", false)) {
                if (!rList.contains("super_admin")) rList.add("super_admin");
            }
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
            json.put("department", department != null ? department : "");
            json.put("batch", batch != null ? batch : "");
            json.put("phone", phone != null ? phone : "");
            json.put("dob", dob != null ? dob : "");
            json.put("birthday", dob != null ? dob : "");
            json.put("academic_level", academicLevel != null ? academicLevel : "");
            json.put("academicLevel", academicLevel != null ? academicLevel : "");
            json.put("term", academicLevel != null ? academicLevel : "");
            json.put("academic_system", academicSystem != null ? academicSystem : "");
            json.put("academicSystem", academicSystem != null ? academicSystem : "");
            json.put("status", status != null ? status : "Active");
            json.put("role", role != null ? role : "student");
            json.put("photo_url", photoURL != null ? photoURL : "");
            json.put("photoUrl", photoURL != null ? photoURL : "");
            json.put("avatar_url", photoURL != null ? photoURL : "");
            json.put("photoURL", photoURL != null ? photoURL : "");
            json.put("section", section != null ? section : "");
            json.put("semester", semester != null ? semester : "");
            json.put("trimester", trimester != null ? trimester : "");
            json.put("academic_session", academicSession != null ? academicSession : "");
            json.put("academicSession", academicSession != null ? academicSession : "");
            json.put("batch_status", batchStatus != null ? batchStatus : "");
            json.put("batchStatus", batchStatus != null ? batchStatus : "");
            json.put("manually_verified", manuallyVerified);
            json.put("manuallyVerified", manuallyVerified);
            json.put("verification_email_sent_at", verificationEmailSentAt);
            json.put("verificationEmailSentAt", verificationEmailSentAt);
            json.put("admission_date", admissionDate);
            json.put("admissionDate", admissionDate);
            json.put("blood_group", bloodGroup != null ? bloodGroup : "");
            json.put("bloodGroup", bloodGroup != null ? bloodGroup : "");
            json.put("allow_blood_donation", allowBloodDonation);
            json.put("allowBloodDonation", allowBloodDonation);
            json.put("location", location != null ? location : "");
            json.put("city", city != null ? city : "");
            json.put("area", area != null ? area : "");
            json.put("gender", gender != null ? gender : "");
            json.put("last_birthday_wished_year", lastBirthdayWishedYear);
            json.put("lastBirthdayWishedYear", lastBirthdayWishedYear);
            json.put("completed_credits", completedCredits);
            json.put("completedCredits", completedCredits);

            if (usedBirthdayMessages != null) {
                org.json.JSONArray bArr = new org.json.JSONArray();
                for (String m : usedBirthdayMessages) bArr.put(m);
                json.put("used_birthday_messages", bArr);
                json.put("usedBirthdayMessages", bArr);
            }

            if (subjects != null) {
                org.json.JSONArray arr = new org.json.JSONArray();
                for (String s : subjects) arr.put(s);
                json.put("subjects", arr);
            }

            if (completedSubjects != null) {
                org.json.JSONArray cArr = new org.json.JSONArray();
                for (String s : completedSubjects) cArr.put(s);
                json.put("completed_subjects", cArr);
                json.put("completedSubjects", cArr);
            }

            if (roles != null && !roles.isEmpty()) {
                org.json.JSONArray rArr = new org.json.JSONArray();
                for (String r : roles) rArr.put(r);
                json.put("roles", rArr);
            }

            org.json.JSONObject data = new org.json.JSONObject(json.toString());
            json.put("data", data);
        } catch (Exception e) {}
        return json;
    }

    public org.json.JSONObject toAuthMetadataJson() {
        org.json.JSONObject meta = new org.json.JSONObject();
        try {
            meta.put("name", name != null ? name : "");
            meta.put("full_name", name != null ? name : "");
            meta.put("student_id", studentId != null ? studentId : "");
            meta.put("studentId", studentId != null ? studentId : "");
            meta.put("department", department != null ? department : "");
            meta.put("batch", batch != null ? batch : "");
            meta.put("phone", phone != null ? phone : "");
            meta.put("dob", dob != null ? dob : "");
            meta.put("birthday", dob != null ? dob : "");
            meta.put("academic_level", academicLevel != null ? academicLevel : "All");
            meta.put("academicLevel", academicLevel != null ? academicLevel : "All");
            meta.put("term", academicLevel != null ? academicLevel : "All");
            meta.put("academic_system", academicSystem != null ? academicSystem : "Semester");
            meta.put("academicSystem", academicSystem != null ? academicSystem : "Semester");
            meta.put("section", section != null ? section : "All");
            meta.put("semester", semester != null ? semester : "");
            meta.put("photo_url", photoURL != null ? photoURL : "");
            meta.put("photoURL", photoURL != null ? photoURL : "");
            meta.put("avatar_url", photoURL != null ? photoURL : "");
            meta.put("blood_group", bloodGroup != null ? bloodGroup : "");
            meta.put("bloodGroup", bloodGroup != null ? bloodGroup : "");
            meta.put("allow_blood_donation", allowBloodDonation);
            meta.put("allowBloodDonation", allowBloodDonation);
            meta.put("is_donor", allowBloodDonation);
            meta.put("location", location != null ? location : "");
            meta.put("city", city != null ? city : "");
            meta.put("area", area != null ? area : "");

            org.json.JSONArray sArr = new org.json.JSONArray();
            if (subjects != null) {
                for (String s : subjects) {
                    if (s != null && !s.trim().isEmpty()) sArr.put(s.trim());
                }
            }
            meta.put("subjects", sArr);
            meta.put("enrolled_subjects", sArr);
            meta.put("enrolledSubjects", sArr);

            org.json.JSONArray cArr = new org.json.JSONArray();
            if (completedSubjects != null) {
                for (String s : completedSubjects) {
                    if (s != null && !s.trim().isEmpty()) cArr.put(s.trim());
                }
            }
            meta.put("completed_subjects", cArr);
            meta.put("completedSubjects", cArr);
            meta.put("completed_credits", completedCredits);
            meta.put("completedCredits", completedCredits);
        } catch (Exception ignored) {}
        return meta;
    }

    private static List<String> extractSubjectCodes(org.json.JSONObject obj, org.json.JSONObject data, String... keys) {
        return extractSubjectCodesFromContainers(new org.json.JSONObject[]{obj, data}, keys);
    }

    private static List<String> extractSubjectCodesFromContainers(org.json.JSONObject[] containers, String... keys) {
        List<String> result = new ArrayList<>();
        if (containers == null) return result;
        for (String k : keys) {
            for (org.json.JSONObject c : containers) {
                if (c != null && c.has(k) && !c.isNull(k)) {
                    Object target = c.opt(k);
                    if (target != null) {
                        parseCodesIntoList(target, result);
                    }
                }
            }
            if (!result.isEmpty()) {
                break;
            }
        }
        return result;
    }

    private static void parseCodesIntoList(Object target, List<String> result) {
        if (target instanceof org.json.JSONArray) {
            org.json.JSONArray arr = (org.json.JSONArray) target;
            for (int i = 0; i < arr.length(); i++) {
                Object item = arr.opt(i);
                if (item instanceof org.json.JSONObject) {
                    org.json.JSONObject iObj = (org.json.JSONObject) item;
                    String code = iObj.optString("code", iObj.optString("subject_code", iObj.optString("course_code", iObj.optString("subjectCode", iObj.optString("id", "")))));
                    if (!code.isEmpty() && !result.contains(code)) result.add(code);
                } else if (item != null) {
                    String s = item.toString().trim();
                    if (!s.isEmpty() && !result.contains(s)) result.add(s);
                }
            }
        } else if (target instanceof String) {
            String str = ((String) target).trim();
            if (str.startsWith("[") && str.endsWith("]")) {
                try {
                    org.json.JSONArray arr = new org.json.JSONArray(str);
                    for (int i = 0; i < arr.length(); i++) {
                        Object item = arr.opt(i);
                        if (item instanceof org.json.JSONObject) {
                            org.json.JSONObject iObj = (org.json.JSONObject) item;
                            String code = iObj.optString("code", iObj.optString("subject_code", iObj.optString("course_code", "")));
                            if (!code.isEmpty() && !result.contains(code)) result.add(code);
                        } else if (item != null) {
                            String s = item.toString().trim();
                            if (!s.isEmpty() && !result.contains(s)) result.add(s);
                        }
                    }
                } catch (Exception ignored) {}
            }
            if (result.isEmpty() && !str.isEmpty()) {
                String cleanCsv = str.replace("{", "").replace("}", "").replace("\"", "");
                for (String part : cleanCsv.split("[,\\r\\n]+")) {
                    String clean = part.trim();
                    if (!clean.isEmpty() && !result.contains(clean)) result.add(clean);
                }
            }
        }
    }
}
