// Routine API Layer (100% Pure Supabase DatabaseService)
import FirestoreService from "../services/FirestoreService";
import CacheManager from "../services/CacheManager";

export const routineApi = {
  getAll: async (forceRefresh = false) => {
    return await FirestoreService.getCachedCollection("routines", { forceRefresh });
  },

  create: async (routineData) => {
    const newId = routineData.id || `rot-${Date.now()}`;
    const payload = { ...routineData, id: newId };
    await FirestoreService.setDocument("routines", newId, payload);
    CacheManager.invalidate("routines");
    CacheManager.invalidate("count_routines");
    CacheManager.invalidate("dashboard_stats");
    return payload;
  },

  update: async (id, updatedData) => {
    await FirestoreService.updateDocument("routines", id, updatedData);
    CacheManager.invalidate("routines");
    CacheManager.invalidate("count_routines");
    CacheManager.invalidate("dashboard_stats");
    return { id, ...updatedData };
  },

  delete: async (id) => {
    await FirestoreService.deleteDocument("routines", id);
    CacheManager.invalidate("routines");
    CacheManager.invalidate("count_routines");
    CacheManager.invalidate("dashboard_stats");
    return id;
  },

  bulkDelete: async (ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    for (const id of ids) {
      await FirestoreService.deleteDocument("routines", id);
    }
    CacheManager.invalidate("routines");
    CacheManager.invalidate("count_routines");
    CacheManager.invalidate("dashboard_stats");
    return ids;
  },

  bulkImport: async (routines = [], department = "") => {
    if (!Array.isArray(routines) || routines.length === 0) return [];

    const preparedItems = routines.map((item, idx) => {
      const newId = item.id || `rot-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      return {
        ...item,
        id: newId,
        department,
      };
    });

    const chunkSize = 200;
    for (let i = 0; i < preparedItems.length; i += chunkSize) {
      const chunk = preparedItems.slice(i, i + chunkSize);
      await FirestoreService.batchWrite("routines", chunk);
    }

    CacheManager.invalidate("routines");
    CacheManager.invalidate("count_routines");
    CacheManager.invalidate("dashboard_stats");
    return preparedItems;
  },
};

export default routineApi;
