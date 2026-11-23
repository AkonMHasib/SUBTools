import FirestoreService from "../services/FirestoreService";
import CacheManager from "../services/CacheManager";

export const subletApi = {
  getAll: async (forceRefresh = false) => {
    return await FirestoreService.getCachedCollection("sublets", { forceRefresh });
  },

  approve: async (id) => {
    await FirestoreService.updateDocument("sublets", id, {
      approvalStatus: "approved",
      status: "Active",
      approvedAt: new Date().toISOString(),
    });
    CacheManager.invalidate("sublets");
    return { id, approvalStatus: "approved" };
  },

  reject: async (id) => {
    await FirestoreService.updateDocument("sublets", id, {
      approvalStatus: "rejected",
      status: "Rejected",
    });
    CacheManager.invalidate("sublets");
    return { id, approvalStatus: "rejected" };
  },

  delete: async (id) => {
    await FirestoreService.deleteDocument("sublets", id);
    CacheManager.invalidate("sublets");
    return id;
  },
};
