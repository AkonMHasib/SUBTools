package com.akon.subtools.coordinator.data.repository;

import com.akon.subtools.coordinator.data.model.BusRoute;
import com.akon.subtools.coordinator.data.model.Route;
import com.akon.subtools.coordinator.utils.AppCache;
import com.akon.subtools.coordinator.utils.DateUtils;
import com.akon.subtools.coordinator.utils.GpsReminderUtils;
import com.akon.subtools.coordinator.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class TransportRepository {

    public interface DataCallback<T> {
        void onSuccess(T data);
        void onError(String errorMessage);
    }

    private static final String CACHE_KEY = "transport_buses";
    private static final String CACHE_KEY_ROUTES = "transport_routes_master";

    public TransportRepository() {}

    public void getBusRoutes(DataCallback<List<BusRoute>> callback) {
        getBusRoutes(false, callback);
    }

    public void getBusRoutes(boolean forceRefresh, DataCallback<List<BusRoute>> callback) {
        java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<List<BusRoute>>(){}.getType();
        if (!forceRefresh) {
            List<BusRoute> cached = AppCache.get(CACHE_KEY, type);
            if (cached != null && !cached.isEmpty()) {
                callback.onSuccess(cached);
                return;
            }
        } else {
            AppCache.invalidate(CACHE_KEY);
        }

        String todayIso = DateUtils.getTodayIsoDate();

        SupabaseAuthBridge.queryTable("buses", "select=*&order=name.asc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                List<BusRoute> routes = new ArrayList<>();
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject doc = arr.getJSONObject(i);
                        BusRoute bus = BusRoute.fromJson(doc);
                        if (bus != null) {
                            // Auto-reset expired temporary overrides
                            if (bus.isTemporaryOverride() && bus.getOverrideDate() != null && !todayIso.equals(bus.getOverrideDate())) {
                                resetBusToDefaults(bus);
                            }
                            routes.add(bus);
                        }
                    }
                    AppCache.put(CACHE_KEY, routes, AppCache.TTL_SHORT);
                    callback.onSuccess(routes);
                } catch (Exception e) {
                    callback.onError("Failed to parse buses: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to load buses from Supabase: " + errorMessage);
            }
        });
    }

    private void resetBusToDefaults(BusRoute bus) {
        try {
            JSONObject resetPayload = new JSONObject();
            if (bus.getDefaultDriver() != null) resetPayload.put("driver", bus.getDefaultDriver());
            if (bus.getDefaultDriverPhone() != null) resetPayload.put("driverPhone", bus.getDefaultDriverPhone());
            if (bus.getDefaultRouteId() != null) resetPayload.put("routeId", bus.getDefaultRouteId());
            if (bus.getDefaultCapacity() > 0) resetPayload.put("capacity", bus.getDefaultCapacity());
            if (bus.getDefaultStartingPoint() != null) resetPayload.put("startingPoint", bus.getDefaultStartingPoint());
            if (bus.getDefaultStartTime() != null) resetPayload.put("startTime", bus.getDefaultStartTime());
            if (bus.getDefaultLeavingCampusTime() != null) resetPayload.put("leavingCampusTime", bus.getDefaultLeavingCampusTime());
            resetPayload.put("isTemporaryOverride", false);
            resetPayload.put("overrideDate", JSONObject.NULL);

            bus.setTemporaryOverride(false);
            bus.setOverrideDate(null);
            if (bus.getDefaultDriver() != null) bus.setDriver(bus.getDefaultDriver());
            if (bus.getDefaultStartingPoint() != null) bus.setStartingPoint(bus.getDefaultStartingPoint());
            if (bus.getDefaultStartTime() != null) bus.setStartTime(bus.getDefaultStartTime());

            String filter = "id=eq." + URLEncoder.encode(bus.getId(), StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.updateRecord("buses", filter, resetPayload, null);
        } catch (Exception ignored) {}
    }

    public void updateRouteStatus(String routeId, String newStatus, DataCallback<Void> callback) {
        try {
            JSONObject patch = new JSONObject();
            patch.put("status", newStatus);
            String filter = "id=eq." + URLEncoder.encode(routeId, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.updateRecord("buses", filter, patch, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidate(CACHE_KEY);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to update status: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error preparing update: " + e.getMessage());
        }
    }

    public void updateGpsUrl(String busId, String newGpsUrl, String updatedBy, DataCallback<Void> callback) {
        if (busId == null || busId.trim().isEmpty()) {
            callback.onError("Invalid bus ID.");
            return;
        }

        try {
            JSONObject updates = new JSONObject();
            String cleanUrl = newGpsUrl != null ? newGpsUrl.trim() : "";
            String nowIso = GpsReminderUtils.formatIsoNow();
            String nextReminderIso = GpsReminderUtils.formatIsoDaysFromNow(20);
            String adminName = (updatedBy != null && !updatedBy.trim().isEmpty()) ? updatedBy.trim() : "STC Admin";

            updates.put("tracking_link", cleanUrl);
            updates.put("gpsUrl", cleanUrl);
            updates.put("liveTrackingUrl", cleanUrl);
            updates.put("lastGpsUrlUpdatedAt", nowIso);
            updates.put("gpsUrlUpdatedAt", nowIso);
            updates.put("lastGpsUrlUpdatedBy", adminName);
            updates.put("nextGpsReminderAt", nextReminderIso);
            updates.put("lastGpsReminderSentAt", JSONObject.NULL);
            updates.put("gpsReminderSent", false);

            String filter = "id=eq." + URLEncoder.encode(busId, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.updateRecord("buses", filter, updates, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidate(CACHE_KEY);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to update GPS URL: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error updating GPS URL: " + e.getMessage());
        }
    }

    public void createRoute(BusRoute route, DataCallback<Void> callback) {
        String docId = (route.getId() != null && !route.getId().trim().isEmpty())
                ? route.getId() : "bus-" + System.currentTimeMillis();
        route.setId(docId);

        JSONObject payload = route.toSupabaseJson();
        SupabaseAuthBridge.insertRecord("buses", payload, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                AppCache.invalidate(CACHE_KEY);
                callback.onSuccess(null);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to create bus: " + errorMessage);
            }
        });
    }

    public void updateRoute(BusRoute route, DataCallback<Void> callback) {
        if (route.getId() == null || route.getId().trim().isEmpty()) {
            callback.onError("Invalid bus ID for update.");
            return;
        }

        JSONObject payload = route.toSupabaseJson();
        SupabaseAuthBridge.insertRecord("buses", payload, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                AppCache.invalidate(CACHE_KEY);
                callback.onSuccess(null);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to update bus: " + errorMessage);
            }
        });
    }

    public void deleteRoute(String routeId, DataCallback<Void> callback) {
        if (routeId == null || routeId.trim().isEmpty()) {
            callback.onError("Invalid bus ID for deletion.");
            return;
        }

        try {
            String filter = "id=eq." + URLEncoder.encode(routeId, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.deleteRecord("buses", filter, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidate(CACHE_KEY);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to delete bus: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error deleting bus: " + e.getMessage());
        }
    }

    public void resetTemporaryOverrides(DataCallback<Void> callback) {
        SupabaseAuthBridge.queryTable("buses", "select=*&isTemporaryOverride=eq.true", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject doc = arr.getJSONObject(i);
                        BusRoute bus = BusRoute.fromJson(doc);
                        if (bus != null) {
                            resetBusToDefaults(bus);
                        }
                    }
                    AppCache.invalidate(CACHE_KEY);
                    callback.onSuccess(null);
                } catch (Exception e) {
                    callback.onError("Failed to parse buses: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to reset overrides: " + errorMessage);
            }
        });
    }

    public void getRoutes(DataCallback<List<Route>> callback) {
        java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<List<Route>>(){}.getType();
        List<Route> cached = AppCache.get(CACHE_KEY_ROUTES, type);
        if (cached != null && !cached.isEmpty()) {
            callback.onSuccess(cached);
            return;
        }

        SupabaseAuthBridge.queryTable("routes", "select=*&order=name.asc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                List<Route> list = new ArrayList<>();
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject doc = arr.getJSONObject(i);
                        Route r = Route.fromJson(doc);
                        if (r != null) {
                            list.add(r);
                        }
                    }
                    AppCache.put(CACHE_KEY_ROUTES, list, AppCache.TTL_SHORT);
                    callback.onSuccess(list);
                } catch (Exception e) {
                    callback.onError("Failed to parse routes: " + e.getMessage());
                }
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to load routes: " + errorMessage);
            }
        });
    }

    public void saveRouteMaster(Route route, DataCallback<Void> callback) {
        String docId = (route.getId() != null && !route.getId().trim().isEmpty())
                ? route.getId() : "route-" + System.currentTimeMillis();
        route.setId(docId);

        JSONObject payload = route.toSupabaseJson();
        SupabaseAuthBridge.insertRecord("routes", payload, new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                AppCache.invalidate(CACHE_KEY_ROUTES);
                callback.onSuccess(null);
            }

            @Override
            public void onError(String errorMessage) {
                callback.onError("Failed to save route: " + errorMessage);
            }
        });
    }

    public void deleteRouteMaster(String routeId, DataCallback<Void> callback) {
        if (routeId == null || routeId.trim().isEmpty()) {
            callback.onError("Invalid route ID for deletion.");
            return;
        }

        try {
            String filter = "id=eq." + URLEncoder.encode(routeId, StandardCharsets.UTF_8.name());
            SupabaseAuthBridge.deleteRecord("routes", filter, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    AppCache.invalidate(CACHE_KEY_ROUTES);
                    callback.onSuccess(null);
                }

                @Override
                public void onError(String errorMessage) {
                    callback.onError("Failed to delete route: " + errorMessage);
                }
            });
        } catch (Exception e) {
            callback.onError("Error deleting route: " + e.getMessage());
        }
    }
}
