package com.akon.subtools.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

@Entity(tableName = "buses")
public class Bus implements Serializable {
    @PrimaryKey
    @NonNull
    private String id = "";
    private String name;
    private String number;
    private String routeId;
    private String driver;
    private String driverPhone;
    private int capacity;
    private String startingPoint;
    private String startTime;
    private String leavingCampusTime;
    private boolean isTemporaryOverride;
    private String gpsUrl;
    private Map<String, String> pickupTimes;

    public Bus() {
        this.pickupTimes = new HashMap<>();
    }

    @androidx.room.Ignore
    public Bus(String id, String name, String number, String routeId, String driver, String driverPhone, int capacity, String startingPoint, String startTime, String leavingCampusTime, boolean isTemporaryOverride) {
        this.id = id != null ? id : "";
        this.name = name;
        this.number = number;
        this.routeId = routeId;
        this.driver = driver;
        this.driverPhone = driverPhone;
        this.capacity = capacity;
        this.startingPoint = startingPoint;
        this.startTime = startTime;
        this.leavingCampusTime = leavingCampusTime;
        this.isTemporaryOverride = isTemporaryOverride;
        this.pickupTimes = new HashMap<>();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getNumber() { return number; }
    public void setNumber(String number) { this.number = number; }

    public String getRouteId() { return routeId; }
    public void setRouteId(String routeId) { this.routeId = routeId; }

    public String getDriver() { return driver; }
    public void setDriver(String driver) { this.driver = driver; }

    public String getDriverPhone() { return driverPhone; }
    public void setDriverPhone(String driverPhone) { this.driverPhone = driverPhone; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public String getStartingPoint() { return startingPoint; }
    public void setStartingPoint(String startingPoint) { this.startingPoint = startingPoint; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getLeavingCampusTime() { return leavingCampusTime; }
    public void setLeavingCampusTime(String leavingCampusTime) { this.leavingCampusTime = leavingCampusTime; }

    public boolean isTemporaryOverride() { return isTemporaryOverride; }
    public void setTemporaryOverride(boolean temporaryOverride) { isTemporaryOverride = temporaryOverride; }

    public String getGpsUrl() { return gpsUrl; }
    public void setGpsUrl(String gpsUrl) { this.gpsUrl = gpsUrl; }

    public Map<String, String> getPickupTimes() {
        if (pickupTimes == null) {
            pickupTimes = new HashMap<>();
        }
        return pickupTimes;
    }
    public void setPickupTimes(Map<String, String> pickupTimes) {
        this.pickupTimes = pickupTimes != null ? pickupTimes : new HashMap<>();
    }

    private static String optStringSafe(org.json.JSONObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.isNull(key)) return "";
        String val = obj.optString(key, "").trim();
        return "null".equalsIgnoreCase(val) ? "" : val;
    }

    public static Bus fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        Bus bus = new Bus();
        org.json.JSONObject data = obj.optJSONObject("data");

        String id = optStringSafe(obj, "id");
        if (id.isEmpty() && data != null) id = optStringSafe(data, "id");
        bus.setId(id);

        String name = optStringSafe(obj, "name");
        if (name.isEmpty() && data != null) name = optStringSafe(data, "name");
        if (name.isEmpty() && data != null) name = optStringSafe(data, "bus_name");
        bus.setName(name);

        String number = optStringSafe(obj, "number");
        if (number.isEmpty() && data != null) number = optStringSafe(data, "number");
        if (number.isEmpty() && data != null) number = optStringSafe(data, "bus_number");
        if (number.isEmpty() && data != null) number = optStringSafe(data, "busNumber");
        if (number.isEmpty()) number = optStringSafe(obj, "bus_number");
        if (number.isEmpty()) number = optStringSafe(obj, "busNumber");
        bus.setNumber(number);

        // Check data.routeId first or obj.route_id, ensuring "route": null doesn't poison it
        String route = "";
        if (data != null) {
            route = optStringSafe(data, "routeId");
            if (route.isEmpty()) route = optStringSafe(data, "route_id");
            if (route.isEmpty()) route = optStringSafe(data, "defaultRouteId");
            if (route.isEmpty()) route = optStringSafe(data, "route");
        }
        if (route.isEmpty()) route = optStringSafe(obj, "route_id");
        if (route.isEmpty()) route = optStringSafe(obj, "routeId");
        if (route.isEmpty()) route = optStringSafe(obj, "route");
        bus.setRouteId(route);

        String driver = optStringSafe(obj, "driver_name");
        if (driver.isEmpty()) driver = optStringSafe(obj, "driver");
        if (driver.isEmpty() && data != null) {
            driver = optStringSafe(data, "driver");
            if (driver.isEmpty()) driver = optStringSafe(data, "driver_name");
            if (driver.isEmpty()) driver = optStringSafe(data, "driverName");
            if (driver.isEmpty()) driver = optStringSafe(data, "defaultDriver");
        }
        bus.setDriver(driver);

        String phone = optStringSafe(obj, "driver_phone");
        if (phone.isEmpty()) phone = optStringSafe(obj, "driverPhone");
        if (phone.isEmpty() && data != null) {
            phone = optStringSafe(data, "driverPhone");
            if (phone.isEmpty()) phone = optStringSafe(data, "driver_phone");
            if (phone.isEmpty()) phone = optStringSafe(data, "phone");
            if (phone.isEmpty()) phone = optStringSafe(data, "defaultDriverPhone");
        }
        bus.setDriverPhone(phone);

        int capacity = 0;
        if (data != null) capacity = data.optInt("capacity", 0);
        if (capacity == 0) capacity = obj.optInt("capacity", 0);
        if (capacity == 0 && data != null) capacity = data.optInt("defaultCapacity", 0);
        if (capacity == 0) capacity = 40;
        bus.setCapacity(capacity);

        String startPt = "";
        if (data != null) {
            startPt = optStringSafe(data, "startingPoint");
            if (startPt.isEmpty()) startPt = optStringSafe(data, "starting_point");
            if (startPt.isEmpty()) startPt = optStringSafe(data, "defaultStartingPoint");
        }
        if (startPt.isEmpty()) startPt = optStringSafe(obj, "starting_point");
        if (startPt.isEmpty()) startPt = optStringSafe(obj, "startingPoint");
        bus.setStartingPoint(startPt);

        String startTime = "";
        if (data != null) {
            startTime = optStringSafe(data, "startTime");
            if (startTime.isEmpty()) startTime = optStringSafe(data, "start_time");
            if (startTime.isEmpty()) startTime = optStringSafe(data, "defaultStartTime");
        }
        if (startTime.isEmpty()) startTime = optStringSafe(obj, "start_time");
        if (startTime.isEmpty()) startTime = optStringSafe(obj, "startTime");
        bus.setStartTime(startTime);

        String leaveTime = "";
        if (data != null) {
            leaveTime = optStringSafe(data, "leavingCampusTime");
            if (leaveTime.isEmpty()) leaveTime = optStringSafe(data, "leaving_campus_time");
            if (leaveTime.isEmpty()) leaveTime = optStringSafe(data, "defaultLeavingCampusTime");
        }
        if (leaveTime.isEmpty()) leaveTime = optStringSafe(obj, "leaving_campus_time");
        if (leaveTime.isEmpty()) leaveTime = optStringSafe(obj, "leavingCampusTime");
        bus.setLeavingCampusTime(leaveTime);

        boolean temp = false;
        if (data != null) temp = data.optBoolean("isTemporaryOverride", false);
        if (!temp && data != null) temp = data.optBoolean("is_temporary_override", false);
        if (!temp) temp = obj.optBoolean("is_temporary_override", false);
        if (!temp) temp = obj.optBoolean("isTemporaryOverride", false);
        bus.setTemporaryOverride(temp);

        // Fetch gpsUrl from data.gpsUrl, data.liveTrackingUrl, or obj columns
        String gps = "";
        if (data != null) {
            gps = optStringSafe(data, "gpsUrl");
            if (gps.isEmpty()) gps = optStringSafe(data, "liveTrackingUrl");
            if (gps.isEmpty()) gps = optStringSafe(data, "gps_url");
            if (gps.isEmpty()) gps = optStringSafe(data, "tracking_link");
            if (gps.isEmpty()) gps = optStringSafe(data, "trackingLink");
        }
        if (gps.isEmpty()) gps = optStringSafe(obj, "gps_url");
        if (gps.isEmpty()) gps = optStringSafe(obj, "gpsUrl");
        if (gps.isEmpty()) gps = optStringSafe(obj, "tracking_link");
        if (gps.isEmpty()) gps = optStringSafe(obj, "trackingLink");
        bus.setGpsUrl(gps);

        // pickupTimes
        org.json.JSONObject pTimes = null;
        if (data != null) pTimes = data.optJSONObject("pickupTimes");
        if (pTimes == null && data != null) pTimes = data.optJSONObject("defaultPickupTimes");
        if (pTimes == null) pTimes = obj.optJSONObject("pickupTimes");
        if (pTimes != null) {
            Map<String, String> map = new HashMap<>();
            java.util.Iterator<String> keys = pTimes.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                map.put(k, optStringSafe(pTimes, k));
            }
            bus.setPickupTimes(map);
        }

        return bus;
    }
}
