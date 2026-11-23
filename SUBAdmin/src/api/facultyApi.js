// Faculty Management API Layer with Smart Caching & Image Preloading
import FirestoreService from "../services/FirestoreService";
import ImageCacheManager from "../services/ImageCacheManager";
import { logAdminActivity } from "../utils/activityLogger";

export const facultyApi = {
  getAll: async (forceRefresh = false) => {
    const facultyList = await FirestoreService.getCachedCollection("faculty", { forceRefresh });
    
    // Preload faculty photo avatars in background
    const photoUrls = facultyList.map((f) => f.image || f.photoUrl).filter(Boolean);
    if (photoUrls.length > 0) {
      ImageCacheManager.preloadImages(photoUrls).catch(() => {});
    }

    return facultyList;
  },

  create: async (facultyData) => {
    const newId = facultyData.id || `fac-${(facultyData.email || facultyData.name).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
    const img = facultyData.photoUrl || facultyData.image || "";
    const payload = {
      ...facultyData,
      id: newId,
      photoUrl: img,
      image: img,
    };
    await FirestoreService.setDocument("faculty", newId, payload);
    logAdminActivity("create", "faculty", newId, null, payload);
    return payload;
  },

  update: async (id, updatedData) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("faculty", id);
    } catch (e) {}

    const img = updatedData.photoUrl || updatedData.image || previousState?.photoUrl || previousState?.image || "";
    const payload = {
      ...updatedData,
      photoUrl: img,
      image: img,
    };

    await FirestoreService.updateDocument("faculty", id, payload);
    logAdminActivity("update", "faculty", id, previousState, { ...previousState, ...payload });
    return { id, ...payload };
  },

  delete: async (id) => {
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("faculty", id);
    } catch (e) {}

    await FirestoreService.deleteDocument("faculty", id);
    logAdminActivity("delete", "faculty", id, previousState, null);
    return id;
  },
};

export default facultyApi;
