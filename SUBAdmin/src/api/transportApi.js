// Transport Management API Layer with Smart Caching
import FirestoreService from "../services/FirestoreService";
import { logAdminActivity } from "../utils/activityLogger";

export const transportApi = {
  getBuses: async (forceRefresh = false) => {
    const rawBuses = await FirestoreService.getCachedCollection("buses", { forceRefresh });
    let todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    const buses = [];

    for (const b of rawBuses) {
      if (b.isTemporaryOverride && b.overrideDate && b.overrideDate !== todayStr) {
        const resetPayload = {
          driver: b.defaultDriver,
          driverPhone: b.defaultDriverPhone,
          routeId: b.defaultRouteId,
          capacity: b.defaultCapacity,
          startingPoint: b.defaultStartingPoint || '',
          startTime: b.defaultStartTime || '',
          leavingCampusTime: b.defaultLeavingCampusTime || '',
          pickupTimes: b.defaultPickupTimes || {},
          isTemporaryOverride: false,
          overrideDate: null,
        };
        await FirestoreService.updateDocument("buses", b.id, resetPayload);
        buses.push({ ...b, ...resetPayload });
      } else {
        buses.push(b);
      }
    }
    return buses;
  },

  createBus: async (busData) => {
    const newId = busData.id || `bus-${Date.now()}`;
    const payload = {
      ...busData,
      id: newId,
      gpsUrl: busData.gpsUrl || "",
      defaultDriver: busData.driver,
      defaultDriverPhone: busData.driverPhone,
      defaultRouteId: busData.routeId,
      defaultCapacity: busData.capacity,
      defaultStartingPoint: busData.startingPoint || '',
      defaultStartTime: busData.startTime || '',
      defaultLeavingCampusTime: busData.leavingCampusTime || '',
      defaultPickupTimes: busData.pickupTimes || {},
      isTemporaryOverride: false,
      overrideDate: null,
    };
    await FirestoreService.setDocument("buses", newId, payload);
    logAdminActivity("create", "buses", newId, null, payload);
    return payload;
  },

  updateBus: async (id, updatedData) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("buses", id);
    } catch (e) {}

    if (updatedData.isTemporaryOverride) {
      await FirestoreService.updateDocument("buses", id, updatedData);
      logAdminActivity("update", "buses", id, previousState, { ...previousState, ...updatedData });
      return { id, ...updatedData };
    } else {
      const fullPayload = {
        ...updatedData,
        gpsUrl: updatedData.gpsUrl || "",
        defaultDriver: updatedData.driver,
        defaultDriverPhone: updatedData.driverPhone,
        defaultRouteId: updatedData.routeId,
        defaultCapacity: updatedData.capacity,
        defaultStartingPoint: updatedData.startingPoint || '',
        defaultStartTime: updatedData.startTime || '',
        defaultLeavingCampusTime: updatedData.leavingCampusTime || '',
        defaultPickupTimes: updatedData.pickupTimes || {},
        isTemporaryOverride: false,
        overrideDate: null,
      };
      await FirestoreService.updateDocument("buses", id, fullPayload);
      logAdminActivity("update", "buses", id, previousState, fullPayload);
      return { id, ...fullPayload };
    }
  },

  deleteBus: async (id) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("buses", id);
    } catch (e) {}

    await FirestoreService.deleteDocument("buses", id);
    logAdminActivity("delete", "buses", id, previousState, null);
    return id;
  },

  getRoutes: async (forceRefresh = false) => {
    return await FirestoreService.getCachedCollection("routes", { forceRefresh, customCacheKey: "bus_routes" });
  },

  createRoute: async (routeData) => {
    const newId = routeData.id || `route-${Date.now()}`;
    const payload = { ...routeData, id: newId };
    await FirestoreService.setDocument("routes", newId, payload);
    logAdminActivity("create", "routes", newId, null, payload);
    return payload;
  },

  updateRoute: async (id, updatedData) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("routes", id);
    } catch (e) {}

    await FirestoreService.updateDocument("routes", id, updatedData);
    logAdminActivity("update", "routes", id, previousState, { ...previousState, ...updatedData });
    return { id, ...updatedData };
  },

  deleteRoute: async (id) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("routes", id);
    } catch (e) {}

    await FirestoreService.deleteDocument("routes", id);
    logAdminActivity("delete", "routes", id, previousState, null);
    return id;
  },

  resetBusOverrides: async () => {
    const rawBuses = await FirestoreService.getCachedCollection("buses", { forceRefresh: true });
    for (const b of rawBuses) {
      if (b.isTemporaryOverride) {
        const resetPayload = {
          driver: b.defaultDriver,
          driverPhone: b.defaultDriverPhone,
          routeId: b.defaultRouteId,
          capacity: b.defaultCapacity,
          startingPoint: b.defaultStartingPoint || '',
          startTime: b.defaultStartTime || '',
          leavingCampusTime: b.defaultLeavingCampusTime || '',
          pickupTimes: b.defaultPickupTimes || {},
          isTemporaryOverride: false,
          overrideDate: null,
        };
        await FirestoreService.updateDocument("buses", b.id, resetPayload);
      }
    }

    return await FirestoreService.getCachedCollection("buses", { forceRefresh: true });
  },
};

export default transportApi;
