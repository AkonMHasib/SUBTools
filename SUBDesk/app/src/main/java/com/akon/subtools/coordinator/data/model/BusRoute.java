package com.akon.subtools.coordinator.data.model;

public class BusRoute {
    private String id;
    private String name;
    private String number;           // e.g. DM-SA-11-0277
    private String code;             // short code e.g. R-101
    private String routeId;
    private String driverName;       // alias for driver
    private String driverPhone;
    private String status;           // Active, Delayed, In Maintenance, Cancelled
    private String departureTime;    // alias for startTime
    private String startingPoint;
    private String startLocation;    // alias for startingPoint
    private String destination;
    private String leavingCampusTime;
    private String gpsUrl;
    private int capacity;

    private boolean isTemporaryOverride;
    private String overrideDate;

    private String defaultDriver;
    private String defaultDriverPhone;
    private String defaultRouteId;
    private int defaultCapacity;
    private String defaultStartingPoint;
    private String defaultStartTime;
    private String defaultLeavingCampusTime;

    public BusRoute() {}

    public BusRoute(String id, String name, String code, String driverName, String driverPhone,
                    String status, String departureTime, String startLocation, String destination) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.driverName = driverName;
        this.driverPhone = driverPhone;
        this.status = status;
        this.departureTime = departureTime;
        this.startLocation = startLocation;
        this.startingPoint = startLocation;
        this.destination = destination;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getNumber() { return number; }
    public void setNumber(String number) { this.number = number; }

    public String getCode() { return code != null ? code : (number != null ? number : ""); }
    public void setCode(String code) { this.code = code; }

    public String getRouteId() { return routeId; }
    public void setRouteId(String routeId) { this.routeId = routeId; }

    public String getDriverName() {
        return driverName != null ? driverName : "";
    }
    public void setDriverName(String driverName) {
        this.driverName = driverName;
    }

    public String getDriver() {
        return getDriverName();
    }
    public void setDriver(String driver) {
        this.driverName = driver;
    }

    public String getDriverPhone() { return driverPhone != null ? driverPhone : ""; }
    public void setDriverPhone(String driverPhone) { this.driverPhone = driverPhone; }

    public String getStatus() { return status != null ? status : "Active"; }
    public void setStatus(String status) { this.status = status; }

    public String getDepartureTime() {
        return departureTime != null ? departureTime : "";
    }
    public void setDepartureTime(String departureTime) { this.departureTime = departureTime; }

    public String getStartTime() { return getDepartureTime(); }
    public void setStartTime(String startTime) { this.departureTime = startTime; }

    public String getStartingPoint() {
        return startingPoint != null ? startingPoint : (startLocation != null ? startLocation : "");
    }
    public void setStartingPoint(String startingPoint) {
        this.startingPoint = startingPoint;
        this.startLocation = startingPoint;
    }

    public String getStartLocation() { return getStartingPoint(); }
    public void setStartLocation(String startLocation) {
        this.startLocation = startLocation;
        this.startingPoint = startLocation;
    }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getLeavingCampusTime() { return leavingCampusTime; }
    public void setLeavingCampusTime(String leavingCampusTime) { this.leavingCampusTime = leavingCampusTime; }

    public String getGpsUrl() { return gpsUrl; }
    public void setGpsUrl(String gpsUrl) { this.gpsUrl = gpsUrl; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public boolean isTemporaryOverride() { return isTemporaryOverride; }
    public void setTemporaryOverride(boolean temporaryOverride) { isTemporaryOverride = temporaryOverride; }

    public String getOverrideDate() { return overrideDate; }
    public void setOverrideDate(String overrideDate) { this.overrideDate = overrideDate; }

    public String getDefaultDriver() { return defaultDriver; }
    public void setDefaultDriver(String defaultDriver) { this.defaultDriver = defaultDriver; }

    public String getDefaultDriverPhone() { return defaultDriverPhone; }
    public void setDefaultDriverPhone(String defaultDriverPhone) { this.defaultDriverPhone = defaultDriverPhone; }

    public String getDefaultRouteId() { return defaultRouteId; }
    public void setDefaultRouteId(String defaultRouteId) { this.defaultRouteId = defaultRouteId; }

    public int getDefaultCapacity() { return defaultCapacity; }
    public void setDefaultCapacity(int defaultCapacity) { this.defaultCapacity = defaultCapacity; }

    public String getDefaultStartingPoint() { return defaultStartingPoint; }
    public void setDefaultStartingPoint(String defaultStartingPoint) { this.defaultStartingPoint = defaultStartingPoint; }

    public String getDefaultStartTime() { return defaultStartTime; }
    public void setDefaultStartTime(String defaultStartTime) { this.defaultStartTime = defaultStartTime; }

    public String getDefaultLeavingCampusTime() { return defaultLeavingCampusTime; }
    public void setDefaultLeavingCampusTime(String defaultLeavingCampusTime) { this.defaultLeavingCampusTime = defaultLeavingCampusTime; }

    private String lastGpsUrlUpdatedAt;
    private String lastGpsUrlUpdatedBy;
    private String nextGpsReminderAt;
    private String lastGpsReminderSentAt;
    private boolean gpsReminderSent;

    private java.util.Map<String, String> pickupTimes;
    private java.util.Map<String, String> defaultPickupTimes;

    public java.util.Map<String, String> getPickupTimes() { return pickupTimes; }
    public void setPickupTimes(java.util.Map<String, String> pickupTimes) { this.pickupTimes = pickupTimes; }

    public java.util.List<String> getPickupPoints() {
        if (pickupTimes == null) return new java.util.ArrayList<>();
        return new java.util.ArrayList<>(pickupTimes.keySet());
    }

    public java.util.Map<String, String> getDefaultPickupTimes() { return defaultPickupTimes; }
    public void setDefaultPickupTimes(java.util.Map<String, String> defaultPickupTimes) { this.defaultPickupTimes = defaultPickupTimes; }

    public String getLastGpsUrlUpdatedAt() { return lastGpsUrlUpdatedAt; }
    public void setLastGpsUrlUpdatedAt(String lastGpsUrlUpdatedAt) { this.lastGpsUrlUpdatedAt = lastGpsUrlUpdatedAt; }

    public String getLastGpsUrlUpdatedBy() { return lastGpsUrlUpdatedBy; }
    public void setLastGpsUrlUpdatedBy(String lastGpsUrlUpdatedBy) { this.lastGpsUrlUpdatedBy = lastGpsUrlUpdatedBy; }

    public String getNextGpsReminderAt() { return nextGpsReminderAt; }
    public void setNextGpsReminderAt(String nextGpsReminderAt) { this.nextGpsReminderAt = nextGpsReminderAt; }

    public String getLastGpsReminderSentAt() { return lastGpsReminderSentAt; }
    public void setLastGpsReminderSentAt(String lastGpsReminderSentAt) { this.lastGpsReminderSentAt = lastGpsReminderSentAt; }

    public boolean isGpsReminderSent() { return gpsReminderSent; }
    public void setGpsReminderSent(boolean gpsReminderSent) { this.gpsReminderSent = gpsReminderSent; }

    public static BusRoute fromJson(org.json.JSONObject obj) {
        if (obj == null) return null;
        BusRoute bus = new BusRoute();
        org.json.JSONObject data = obj.optJSONObject("data");

        bus.setId(obj.optString("id", data != null ? data.optString("id", "") : ""));
        bus.setName(obj.optString("name", data != null ? data.optString("name", "") : ""));
        bus.setNumber(obj.optString("number", data != null ? data.optString("number", "") : ""));
        bus.setCode(obj.optString("code", data != null ? data.optString("code", "") : ""));
        bus.setRouteId(obj.optString("routeId", data != null ? data.optString("routeId", "") : ""));

        String driver = obj.optString("driverName", obj.optString("driver", data != null ? data.optString("driverName", data.optString("driver", "")) : ""));
        bus.setDriverName(driver);

        bus.setDriverPhone(obj.optString("driverPhone", data != null ? data.optString("driverPhone", "") : ""));
        bus.setStatus(obj.optString("status", data != null ? data.optString("status", "Active") : "Active"));

        String departure = obj.optString("departureTime", obj.optString("startTime", data != null ? data.optString("departureTime", data.optString("startTime", "")) : ""));
        bus.setDepartureTime(departure);

        String startPoint = obj.optString("startingPoint", obj.optString("startLocation", data != null ? data.optString("startingPoint", data.optString("startLocation", "")) : ""));
        bus.setStartingPoint(startPoint);

        bus.setDestination(obj.optString("destination", data != null ? data.optString("destination", "") : ""));
        bus.setLeavingCampusTime(obj.optString("leavingCampusTime", data != null ? data.optString("leavingCampusTime", "") : ""));
        bus.setGpsUrl(obj.optString("gpsUrl", data != null ? data.optString("gpsUrl", "") : ""));
        bus.setCapacity(obj.optInt("capacity", data != null ? data.optInt("capacity", 0) : 0));

        bus.setTemporaryOverride(obj.optBoolean("isTemporaryOverride", data != null && data.optBoolean("isTemporaryOverride", false)));
        bus.setOverrideDate(obj.optString("overrideDate", data != null ? data.optString("overrideDate", null) : null));

        bus.setDefaultDriver(obj.optString("defaultDriver", data != null ? data.optString("defaultDriver", "") : ""));
        bus.setDefaultDriverPhone(obj.optString("defaultDriverPhone", data != null ? data.optString("defaultDriverPhone", "") : ""));
        bus.setDefaultRouteId(obj.optString("defaultRouteId", data != null ? data.optString("defaultRouteId", "") : ""));
        bus.setDefaultCapacity(obj.optInt("defaultCapacity", data != null ? data.optInt("defaultCapacity", 0) : 0));
        bus.setDefaultStartingPoint(obj.optString("defaultStartingPoint", data != null ? data.optString("defaultStartingPoint", "") : ""));
        bus.setDefaultStartTime(obj.optString("defaultStartTime", data != null ? data.optString("defaultStartTime", "") : ""));
        bus.setDefaultLeavingCampusTime(obj.optString("defaultLeavingCampusTime", data != null ? data.optString("defaultLeavingCampusTime", "") : ""));

        org.json.JSONObject pickupJson = obj.optJSONObject("pickupTimes");
        if (pickupJson == null && data != null) pickupJson = data.optJSONObject("pickupTimes");
        if (pickupJson != null) {
            java.util.Map<String, String> map = new java.util.HashMap<>();
            java.util.Iterator<String> keys = pickupJson.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                map.put(k, pickupJson.optString(k, ""));
            }
            bus.setPickupTimes(map);
        }

        return bus;
    }

    public org.json.JSONObject toSupabaseJson() {
        org.json.JSONObject json = new org.json.JSONObject();
        try {
            if (id != null && !id.isEmpty()) json.put("id", id);
            json.put("name", name != null ? name : "");
            json.put("number", number != null ? number : "");
            json.put("code", getCode());
            json.put("routeId", routeId != null ? routeId : "");
            json.put("driver", getDriverName());
            json.put("driverName", getDriverName());
            json.put("driverPhone", driverPhone != null ? driverPhone : "");
            json.put("status", getStatus());
            json.put("departureTime", getDepartureTime());
            json.put("startTime", getDepartureTime());
            json.put("startingPoint", getStartingPoint());
            json.put("startLocation", getStartingPoint());
            json.put("destination", destination != null ? destination : "");
            json.put("leavingCampusTime", leavingCampusTime != null ? leavingCampusTime : "");
            json.put("gpsUrl", gpsUrl != null ? gpsUrl : "");
            json.put("capacity", capacity);
            json.put("isTemporaryOverride", isTemporaryOverride);
            if (overrideDate != null) json.put("overrideDate", overrideDate);
            json.put("defaultDriver", defaultDriver != null ? defaultDriver : "");
            json.put("defaultDriverPhone", defaultDriverPhone != null ? defaultDriverPhone : "");
            json.put("defaultRouteId", defaultRouteId != null ? defaultRouteId : "");
            json.put("defaultCapacity", defaultCapacity);
            json.put("defaultStartingPoint", defaultStartingPoint != null ? defaultStartingPoint : "");
            json.put("defaultStartTime", defaultStartTime != null ? defaultStartTime : "");
            json.put("defaultLeavingCampusTime", defaultLeavingCampusTime != null ? defaultLeavingCampusTime : "");

            if (pickupTimes != null) {
                org.json.JSONObject pt = new org.json.JSONObject();
                for (java.util.Map.Entry<String, String> entry : pickupTimes.entrySet()) {
                    pt.put(entry.getKey(), entry.getValue());
                }
                json.put("pickupTimes", pt);
            }

            // Parity with SUBAdmin JSONB data
            org.json.JSONObject data = new org.json.JSONObject(json.toString());
            json.put("data", data);
        } catch (org.json.JSONException e) {
            e.printStackTrace();
        }
        return json;
    }
}
