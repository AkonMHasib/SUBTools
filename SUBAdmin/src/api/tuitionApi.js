import FirestoreService from "../services/FirestoreService";
import CacheManager from "../services/CacheManager";

export const tuitionApi = {
  getAll: async (forceRefresh = false) => {
    return await FirestoreService.getCachedCollection("tuitions", { forceRefresh });
  },

  approve: async (id) => {
    await FirestoreService.updateDocument("tuitions", id, {
      approvalStatus: "approved",
      status: "Available",
      approvedAt: new Date().toISOString(),
    });
    CacheManager.invalidate("tuitions");
    return { id, approvalStatus: "approved" };
  },

  reject: async (id) => {
    await FirestoreService.updateDocument("tuitions", id, {
      approvalStatus: "rejected",
      status: "Rejected",
    });
    CacheManager.invalidate("tuitions");
    return { id, approvalStatus: "rejected" };
  },

  delete: async (id) => {
    await FirestoreService.deleteDocument("tuitions", id);
    CacheManager.invalidate("tuitions");
    return id;
  },
};
