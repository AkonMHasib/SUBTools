package com.akon.subtools.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Entity(tableName = "routes")
public class Route implements Serializable {
    @PrimaryKey
    @NonNull
    private String id = "";
    private String name;
    private String code;
    private String destination;
    private String obhaiUsername;
    private String obhaiPassword;
    private List<String> pickupPoints;
    private java.util.Map<String, String> stoppageTimes;

    public Route() {
        this.pickupPoints = new ArrayList<>();
    }

    @androidx.room.Ignore
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

    public java.util.Map<String, String> getStoppageTimes() {
        if (stoppageTimes == null) {
            stoppageTimes = new java.util.HashMap<>();
        }
        return stoppageTimes;
    }
    public void setStoppageTimes(java.util.Map<String, String> stoppageTimes) {
        this.stoppageTimes = stoppageTimes;
    }

    public List<String> getStops() {
        return getPickupPoints();
    }

    public void setStops(List<String> stops) {
        setPickupPoints(stops);
    }

    private static String optStringSafe(org.json.JSONObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.isNull(key)) return "";
        String val = obj.optString(key, "").trim();
        return "null".equalsIgnoreCase(val) ? "" : val;
    }

    public static Route fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        Route route = new Route();
        org.json.JSONObject data = obj.optJSONObject("data");

        String id = optStringSafe(obj, "id");
        if (id.isEmpty() && data != null) id = optStringSafe(data, "id");
        route.setId(id);

        String name = "";
        if (data != null) {
            name = optStringSafe(data, "name");
            if (name.isEmpty()) name = optStringSafe(data, "title");
            if (name.isEmpty()) name = optStringSafe(data, "route_name");
        }
        if (name.isEmpty()) name = optStringSafe(obj, "name");
        if (name.isEmpty()) name = optStringSafe(obj, "title");
        route.setName(name);

        String code = "";
        if (data != null) {
            code = optStringSafe(data, "code");
            if (code.isEmpty()) code = optStringSafe(data, "route_code");
        }
        if (code.isEmpty()) code = optStringSafe(obj, "code");
        route.setCode(code);

        String dest = "";
        if (data != null) {
            dest = optStringSafe(data, "destination");
            if (dest.isEmpty()) dest = optStringSafe(data, "path");
        }
        if (dest.isEmpty()) dest = optStringSafe(obj, "destination");
        if (dest.isEmpty()) dest = optStringSafe(obj, "path");
        route.setDestination(dest);

        // Pickup points / stops
        org.json.JSONArray stopsArr = null;
        if (data != null) {
            stopsArr = data.optJSONArray("pickupPoints");
            if (stopsArr == null) stopsArr = data.optJSONArray("stops");
        }
        if (stopsArr == null) {
            stopsArr = obj.optJSONArray("stops");
            if (stopsArr == null) stopsArr = obj.optJSONArray("pickupPoints");
        }

        List<String> points = new java.util.ArrayList<>();
        if (stopsArr != null) {
            for (int i = 0; i < stopsArr.length(); i++) {
                String pt = stopsArr.optString(i, "").trim();
                if (!pt.isEmpty() && !"null".equalsIgnoreCase(pt)) {
                    points.add(pt);
                }
            }
        }
        route.setPickupPoints(points);

        // Schedule / stoppageTimes / pickupTimes
        org.json.JSONObject schedObj = null;
        if (data != null) {
            schedObj = data.optJSONObject("pickupTimes");
            if (schedObj == null) schedObj = data.optJSONObject("stoppageTimes");
            if (schedObj == null) schedObj = data.optJSONObject("schedule");
        }
        if (schedObj == null) {
            schedObj = obj.optJSONObject("schedule");
            if (schedObj == null) schedObj = obj.optJSONObject("stoppageTimes");
            if (schedObj == null) schedObj = obj.optJSONObject("pickupTimes");
        }

        java.util.Map<String, String> schedMap = new java.util.HashMap<>();
        if (schedObj != null) {
            java.util.Iterator<String> keys = schedObj.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                schedMap.put(k, optStringSafe(schedObj, k));
            }
        }
        route.setStoppageTimes(schedMap);

        String trackUrl = "";
        if (data != null) trackUrl = optStringSafe(data, "tracking_url");
        if (trackUrl.isEmpty()) trackUrl = optStringSafe(obj, "tracking_url");
        if (!trackUrl.isEmpty()) {
            route.setObhaiUsername(trackUrl);
        }

        return route;
    }
}
