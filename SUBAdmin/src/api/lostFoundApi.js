// Lost and Found Management API Layer
import FirestoreService from "../services/FirestoreService";
import { logAdminActivity } from "../utils/activityLogger";

export const lostFoundApi = {
  getAll: async () => {
    try {
      const items = await FirestoreService.getCachedCollection("lostFound");
      return items
        .map((d) => ({
          ...d,
          createdAt: d.createdAt
            ? typeof d.createdAt.toDate === "function"
              ? d.createdAt.toDate().toISOString()
              : d.createdAt
            : null,
        }))
        .filter((item) => !item.approvalStatus || item.approvalStatus === "approved")
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } catch (error) {
      return [];
    }
  },

  getPendingItems: async () => {
    try {
      const items = await FirestoreService.getCachedCollection("lostFound");
      return items
        .map((d) => ({
          ...d,
          createdAt: d.createdAt
            ? typeof d.createdAt.toDate === "function"
              ? d.createdAt.toDate().toISOString()
              : d.createdAt
            : null,
        }))
        .filter((item) => item.approvalStatus === "pending")
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } catch (error) {
      console.error("Failed to fetch pending lost/found items:", error);
      return [];
    }
  },

  approveLostFoundItem: async (id) => {
    await FirestoreService.updateDocument("lostFound", id, {
      approvalStatus: "approved",
      approvedAt: new Date().toISOString(),
    });
    logAdminActivity("approve", "lostFound", id, { approvalStatus: "pending" }, { approvalStatus: "approved" });
    return id;
  },

  rejectLostFoundItem: async (id) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("lostFound", id);
    } catch (e) { }
    await FirestoreService.deleteDocument("lostFound", id);
    logAdminActivity("reject", "lostFound", id, previousState, null);
    return id;
  },

  create: async (itemData) => {
    const payload = {
      ...itemData,
      approvalStatus: "approved",
      createdAt: itemData.createdAt || new Date().toISOString(),
    };
    const res = await FirestoreService.addDocument("lostFound", payload);
    const result = { id: res.id, ...payload };
    logAdminActivity("create", "lostFound", result.id, null, result);
    return result;
  },

  update: async (id, updatedData) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("lostFound", id);
    } catch (e) { }

    await FirestoreService.updateDocument("lostFound", id, updatedData);
    const result = { id, ...updatedData };
    logAdminActivity("update", "lostFound", id, previousState, { ...previousState, ...updatedData });
    return result;
  },

  delete: async (id) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("lostFound", id);
    } catch (e) { }

    await FirestoreService.deleteDocument("lostFound", id);
    logAdminActivity("delete", "lostFound", id, previousState, null);
    return id;
  },
};

export default lostFoundApi;
