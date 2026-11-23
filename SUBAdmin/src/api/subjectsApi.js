// Subject Management API Layer with Smart Caching
import FirestoreService from "../services/FirestoreService";
import { logAdminActivity } from "../utils/activityLogger";

export const subjectsApi = {
  getAll: async (forceRefresh = false) => {
    return await FirestoreService.getCachedCollection("subjects", { forceRefresh });
  },

  create: async (subjectData) => {
    await FirestoreService.setDocument("subjects", subjectData.code, subjectData);
    logAdminActivity("create", "subjects", subjectData.code, null, subjectData);
    return subjectData;
  },

  update: async (code, updatedData) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("subjects", code);
    } catch (e) {}

    await FirestoreService.updateDocument("subjects", code, updatedData);
    logAdminActivity("update", "subjects", code, previousState, { ...previousState, ...updatedData });
    return { code, ...updatedData };
  },

  delete: async (code) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("subjects", code);
    } catch (e) {}

    await FirestoreService.deleteDocument("subjects", code);
    logAdminActivity("delete", "subjects", code, previousState, null);
    return code;
  },
};

export default subjectsApi;
