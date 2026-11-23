import DatabaseService from "../services/DatabaseService";
import { logAdminActivity } from "../utils/activityLogger";

export const slidesApi = {
  getAll: async (department = null, subjectCode = null) => {
    try {
      let list = await DatabaseService.getCachedCollection("slides", { forceRefresh: true });
      if (department && department !== "all") {
        list = list.filter((s) => (s.department || "").toLowerCase() === department.toLowerCase());
      }
      if (subjectCode && subjectCode !== "all") {
        list = list.filter((s) => (s.subjectCode || "").toLowerCase() === subjectCode.toLowerCase());
      }
      return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (err) {
      console.error("Failed to load slides:", err);
      return [];
    }
  },

  create: async (slideData) => {
    const id = slideData.id || `slide-${Date.now()}`;
    const payload = {
      ...slideData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await DatabaseService.setDocument("slides", id, payload);
    logAdminActivity("create", "slides", id, null, payload);
    return payload;
  },

  update: async (id, slideData) => {
    const payload = {
      ...slideData,
      updatedAt: Date.now(),
    };
    await DatabaseService.setDocument("slides", id, payload);
    logAdminActivity("update", "slides", id, null, payload);
    return payload;
  },

  delete: async (id) => {
    await DatabaseService.deleteDocument("slides", id);
    logAdminActivity("delete", "slides", id, null, null);
    return { success: true, id };
  },
};

export default slidesApi;
