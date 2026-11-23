package com.akon.subtools.coordinator.data.model;

public class Subject {
    private String code;
    private String name;
    private String department;
    private String credit;
    private String type;
    private String term;

    public Subject() {
        // Required for Firestore
    }

    public Subject(String code, String name, String department, String credit, String type) {
        this.code = code;
        this.name = name;
        this.department = department;
        this.credit = credit;
        this.type = type;
        this.term = "Term-1";
    }

    public Subject(String code, String name, String department, String credit, String type, String term) {
        this.code = code;
        this.name = name;
        this.department = department;
        this.credit = credit;
        this.type = type;
        this.term = term;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getCredit() { return credit; }
    public void setCredit(String credit) { this.credit = credit; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTerm() { return term; }
    public void setTerm(String term) { this.term = term; }

    private static String optClean(org.json.JSONObject obj, String key) {
        if (obj == null || obj.isNull(key)) return "";
        String val = obj.optString(key, "").trim();
        if ("null".equalsIgnoreCase(val)) return "";
        return val;
    }

    public static Subject fromJson(org.json.JSONObject json) {
        if (json == null) return null;
        try {
            org.json.JSONObject data = json.optJSONObject("data");

            String code = optClean(json, "code");
            if (code.isEmpty() && data != null) code = optClean(data, "code");
            if (code.isEmpty()) code = optClean(json, "id");
            if (code.isEmpty() && data != null) code = optClean(data, "id");

            String name = optClean(json, "name");
            if (name.isEmpty() && data != null) name = optClean(data, "name");
            if (name.isEmpty() && data != null) name = optClean(data, "title");

            String rawDept = optClean(json, "department");
            if (rawDept.isEmpty() && data != null) rawDept = optClean(data, "department");
            String dept = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(rawDept);

            String credit = "";
            if (data != null) credit = optClean(data, "credit");
            if (credit.isEmpty()) credit = optClean(json, "credit");
            if (credit.isEmpty()) {
                if (!json.isNull("credits")) {
                    double d = json.optDouble("credits", 3.0);
                    if (!Double.isNaN(d)) credit = String.valueOf(d);
                } else if (data != null && !data.isNull("credits")) {
                    double d = data.optDouble("credits", 3.0);
                    if (!Double.isNaN(d)) credit = String.valueOf(d);
                }
            }
            if (credit.isEmpty()) credit = "3.0";
            if (credit.endsWith(".0")) credit = credit.substring(0, credit.length() - 2);

            String type = optClean(json, "type");
            if (type.isEmpty() && data != null) type = optClean(data, "type");
            if (type.isEmpty()) type = "Theory";

            String term = "";
            if (data != null) term = optClean(data, "term");
            if (term.isEmpty()) term = optClean(json, "term");
            if (term.isEmpty()) term = "Term-1";

            return new Subject(code, name, dept, credit, type, term);
        } catch (Exception e) {
            return null;
        }
    }

    public org.json.JSONObject toSupabaseJson() {
        try {
            String dept = com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(getDepartment());
            double creds = 3.0;
            try {
                if (getCredit() != null && !getCredit().trim().isEmpty()) {
                    creds = Double.parseDouble(getCredit().trim());
                }
            } catch (Exception ignored) {}

            org.json.JSONObject data = new org.json.JSONObject();
            data.put("code", getCode() != null ? getCode() : "");
            data.put("name", getName() != null ? getName() : "");
            data.put("department", dept);
            data.put("credit", getCredit() != null ? getCredit() : "3");
            data.put("credits", creds);
            data.put("type", getType() != null ? getType() : "Theory");
            data.put("term", getTerm() != null ? getTerm() : "Term-1");

            org.json.JSONObject root = new org.json.JSONObject();
            root.put("id", getCode() != null ? getCode() : "");
            root.put("code", getCode() != null ? getCode() : "");
            root.put("name", getName() != null ? getName() : "");
            root.put("department", dept);
            root.put("credits", creds);
            root.put("type", getType() != null ? getType() : "Theory");
            root.put("data", data);
            root.put("updated_at", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date()));

            return root;
        } catch (Exception e) {
            return new org.json.JSONObject();
        }
    }
}
