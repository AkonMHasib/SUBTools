// Holiday API Layer for University-Wide Holiday Management
import FirestoreService from "../services/FirestoreService";
import { logAdminActivity } from "../utils/activityLogger";

export const holidayApi = {
  getAll: async (forceRefresh = false) => {
    const list = await FirestoreService.getCachedCollection("holidays", { forceRefresh });
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  getActiveHolidays: async () => {
    const list = await holidayApi.getAll();
    return list.filter((h) => h.enabled !== false);
  },

  create: async (holidayData) => {
    const id = holidayData.id || `holiday-${Date.now()}`;
    const payload = {
      ...holidayData,
      id,
      name: holidayData.name?.trim() || "",
      date: holidayData.date || new Date().toISOString().split("T")[0],
      description: holidayData.description?.trim() || "",
      enabled: holidayData.enabled !== false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await FirestoreService.setDocument("holidays", id, payload);
    logAdminActivity("create", "holidays", id, null, payload);
    return payload;
  },

  update: async (id, holidayData) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("holidays", id);
    } catch (_) {}

    const payload = {
      ...previousState,
      ...holidayData,
      id,
      updatedAt: Date.now(),
    };

    await FirestoreService.setDocument("holidays", id, payload);
    logAdminActivity("update", "holidays", id, previousState, payload);
    return payload;
  },

  delete: async (id) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("holidays", id);
    } catch (_) {}

    await FirestoreService.deleteDocument("holidays", id);
    logAdminActivity("delete", "holidays", id, previousState, null);
    return id;
  },

  toggleStatus: async (id, currentStatus) => {
    return holidayApi.update(id, { enabled: !currentStatus });
  },
};

export default holidayApi;
