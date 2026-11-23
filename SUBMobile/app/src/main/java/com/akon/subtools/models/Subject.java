package com.akon.subtools.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;

@Entity(tableName = "subjects")
public class Subject implements Serializable {
    @PrimaryKey
    @NonNull
    private String code = "";
    private String name;
    private String department;
    private String credit;
    private String term;
    private String type;

    public Subject() {}

    @androidx.room.Ignore
    public Subject(String code, String name, String department, String credit, String term) {
        this.code = code != null ? code : "";
        this.name = name;
        this.department = department;
        this.credit = credit;
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

    public String getTerm() { return term; }
    public void setTerm(String term) { this.term = term; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public static Subject fromJson(org.json.JSONObject json) {
        if (json == null) return null;
        try {
            org.json.JSONObject data = json.optJSONObject("data");
            if (data == null) data = json;

            String code = !json.optString("code", "").isEmpty() ? json.optString("code", "") : data.optString("code", json.optString("id", ""));
            String name = !json.optString("name", "").isEmpty() ? json.optString("name", "") : data.optString("name", "");
            String rawDept = !json.optString("department", "").isEmpty() ? json.optString("department", "") : data.optString("department", "");
            String dept = com.akon.subtools.utils.DepartmentHelper.getDeptCode(rawDept);

            String credit = !data.optString("credit", "").isEmpty()
                    ? data.optString("credit", "")
                    : String.valueOf(json.optDouble("credits", data.optDouble("credits", 3.0)));
            if (credit.endsWith(".0")) credit = credit.substring(0, credit.length() - 2);

            String type = !json.optString("type", "").isEmpty() ? json.optString("type", "") : data.optString("type", "Theory");
            String term = !data.optString("term", "").isEmpty() ? data.optString("term", "") : "Term-1";

            Subject s = new Subject(code, name, dept, credit, term);
            s.setType(type);
            return s;
        } catch (Exception e) {
            return null;
        }
    }

    public org.json.JSONObject toSupabaseJson() {
        try {
            String dept = com.akon.subtools.utils.DepartmentHelper.getDeptCode(getDepartment());
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

            return root;
        } catch (Exception e) {
            return new org.json.JSONObject();
        }
    }
}
