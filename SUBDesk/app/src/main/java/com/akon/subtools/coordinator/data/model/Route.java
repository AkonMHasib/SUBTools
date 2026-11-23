package com.akon.subtools.coordinator.data.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Route implements Serializable {
    private String id = "";
    private String name;
    private String code;
    private String destination;
    private String obhaiUsername;
    private String obhaiPassword;
    private List<String> pickupPoints;
    private Map<String, String> stoppageTimes;

    public Route() {
        this.pickupPoints = new ArrayList<>();
    }

    public Route(String id, String name, String code, String destination, String obhaiUsername, String obhaiPassword, List<String> pickupPoints) {
        this.id = id != null ? id : "";
        this.name = name;
        this.code = code;
        this.destination = destination;
        this.obhaiUsername = obhaiUsername;
        this.obhaiPassword = obhaiPassword;
        this.pickupPoints = pickupPoints != null ? pickupPoints : new ArrayList<>();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getObhaiUsername() { return obhaiUsername; }
    public void setObhaiUsername(String obhaiUsername) { this.obhaiUsername = obhaiUsername; }

    public String getObhaiPassword() { return obhaiPassword; }
    public void setObhaiPassword(String obhaiPassword) { this.obhaiPassword = obhaiPassword; }

    public List<String> getPickupPoints() {
        if (pickupPoints == null) {
            pickupPoints = new ArrayList<>();
        }
        return pickupPoints;
    }
    public void setPickupPoints(List<String> pickupPoints) { this.pickupPoints = pickupPoints; }

    public Map<String, String> getStoppageTimes() {
        if (stoppageTimes == null) {
            stoppageTimes = new java.util.HashMap<>();
        }
        return stoppageTimes;
    }
    public void setStoppageTimes(Map<String, String> stoppageTimes) {
        this.stoppageTimes = stoppageTimes;
    }

    public static Route fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        Route r = new Route();
        org.json.JSONObject data = obj.optJSONObject("data");
        r.setId(obj.optString("id", data != null ? data.optString("id", "") : ""));
        r.setName(obj.optString("name", data != null ? data.optString("name", "") : ""));
        r.setCode(obj.optString("code", data != null ? data.optString("code", "") : ""));
        r.setDestination(obj.optString("destination", data != null ? data.optString("destination", "") : ""));
        r.setObhaiUsername(obj.optString("obhaiUsername", data != null ? data.optString("obhaiUsername", "") : ""));
        r.setObhaiPassword(obj.optString("obhaiPassword", data != null ? data.optString("obhaiPassword", "") : ""));

        org.json.JSONArray pts = obj.optJSONArray("pickupPoints");
        if (pts == null && data != null) pts = data.optJSONArray("pickupPoints");
        if (pts != null) {
            List<String> list = new ArrayList<>();
            for (int i = 0; i < pts.length(); i++) {
                list.add(pts.optString(i));
            }
            r.setPickupPoints(list);
        }

        org.json.JSONObject st = obj.optJSONObject("stoppageTimes");
        if (st == null && data != null) st = data.optJSONObject("stoppageTimes");
        if (st != null) {
            Map<String, String> map = new java.util.HashMap<>();
            java.util.Iterator<String> it = st.keys();
            while (it.hasNext()) {
                String k = it.next();
                map.put(k, st.optString(k));
            }
            r.setStoppageTimes(map);
        }
        return r;
    }

    public org.json.JSONObject toSupabaseJson() {
        org.json.JSONObject json = new org.json.JSONObject();
        try {
            if (id != null && !id.isEmpty()) json.put("id", id);
            json.put("name", name != null ? name : "");
            json.put("code", code != null ? code : "");
            json.put("destination", destination != null ? destination : "");
            json.put("obhaiUsername", obhaiUsername != null ? obhaiUsername : "");
            json.put("obhaiPassword", obhaiPassword != null ? obhaiPassword : "");
            if (pickupPoints != null) {
                org.json.JSONArray arr = new org.json.JSONArray();
                for (String p : pickupPoints) arr.put(p);
                json.put("pickupPoints", arr);
            }
            if (stoppageTimes != null) {
                org.json.JSONObject st = new org.json.JSONObject();
                for (Map.Entry<String, String> e : stoppageTimes.entrySet()) {
                    st.put(e.getKey(), e.getValue());
                }
                json.put("stoppageTimes", st);
            }
            org.json.JSONObject data = new org.json.JSONObject(json.toString());
            json.put("data", data);
        } catch (Exception e) {}
        return json;
    }
}


