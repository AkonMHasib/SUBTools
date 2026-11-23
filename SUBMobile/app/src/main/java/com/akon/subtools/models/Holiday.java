package com.akon.subtools.models;

import java.io.Serializable;

public class Holiday implements Serializable {
    private String id;
    private String name;
    private String date; // YYYY-MM-DD
    private String description;
    private boolean enabled = true;

    public Holiday() {}

    public Holiday(String id, String name, String date, String description, boolean enabled) {
        this.id = id;
        this.name = name;
        this.date = date;
        this.description = description;
        this.enabled = enabled;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public static Holiday fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        Holiday h = new Holiday();
        h.setId(obj.optString("id", ""));
        String name = obj.optString("name", "");
        if (name.isEmpty()) name = obj.optString("title", "");
        h.setName(name);
        h.setDate(obj.optString("date", ""));
        h.setDescription(obj.optString("description", ""));
        h.setEnabled(obj.optBoolean("enabled", true));
        return h;
    }

    public org.json.JSONObject toJson() {
        org.json.JSONObject json = new org.json.JSONObject();
        try {
            if (id != null && !id.isEmpty()) json.put("id", id);
            json.put("name", name != null ? name : "");
            json.put("title", name != null ? name : "");
            json.put("date", date != null ? date : "");
            json.put("description", description != null ? description : "");
            json.put("enabled", enabled);
        } catch (Exception ignored) {}
        return json;
    }
}
