// Users Management API Layer (100% Pure Supabase DatabaseService)
import FirestoreService from "../services/FirestoreService";
import { logAdminActivity } from "../utils/activityLogger";
import apiClient from "./apiClient";

const getComparableIds = (user) =>
  new Set([user?.id, user?.uid, user?.studentId, user?.student_id].filter(Boolean).map(String));

const ensureUniqueStudentIdentifiers = async (userData, currentId = null) => {
  const checks = [
    { field: "studentId", value: userData.studentId, label: "Student ID" },
    { field: "email", value: userData.email, label: "University email" },
    { field: "phone", value: userData.phone, label: "Phone number" },
  ].filter((item) => item.value);

  const allowedIds = new Set([currentId, userData.uid, userData.studentId, userData.student_id].filter(Boolean).map(String));

  try {
    const users = await FirestoreService.getCachedCollection("users");
    for (const check of checks) {
      for (const entry of users) {
        const entryVal = entry[check.field] || (check.field === "studentId" ? entry.student_id : null);
        if (entryVal && String(entryVal).trim().toLowerCase() === String(check.value).trim().toLowerCase()) {
          const ids = getComparableIds(entry);
          const isSelf = [...ids].some((id) => allowedIds.has(id));
          if (!isSelf) {
            throw new Error(`${check.label} already exists. Please use a unique ${check.label.toLowerCase()}.`);
          }
        }
      }
    }
  } catch (err) {
    if (err.message && err.message.includes("already exists")) {
      throw err;
    }
  }
};

const resolveUserDocId = async (identifier, userData = null) => {
  if (userData?.uid) return userData.uid;
  if (userData?.id) return userData.id;

  const targetId = String(identifier || "").trim();
  if (!targetId) return "";

  try {
    const users = await FirestoreService.getCachedCollection("users");
    const found = users.find(
      (u) =>
        u.studentId === targetId ||
        u.student_id === targetId ||
        u.id === targetId ||
        u.uid === targetId
    );
    if (found) return found.id || found.uid;
  } catch (_) {}

  return targetId;
};

export const usersApi = {
  getAll: async (forceRefresh = false) => {
    try {
      const usersList = await FirestoreService.getCachedCollection("users", { forceRefresh });
      return usersList.map((data) => ({
        id: data.id || data.uid || data.studentId || data.student_id,
        uid: data.uid || data.id,
        ...data,
        authMissing: false,
        emailVerified: data.manuallyVerified || data.emailVerified || false,
        disabled: data.status === "Banned",
        fallbackMode: false,
      }));
    } catch (err) {
      console.warn("Could not load users collection from Supabase:", err);
      return [];
    }
  },

  create: async (userData) => {
    const docId = userData.uid || userData.id || userData.studentId;
    await ensureUniqueStudentIdentifiers(userData);
    await FirestoreService.setDocument("users", docId, userData);
    logAdminActivity("create", "users", docId, null, userData);
    return { ...userData, id: docId, uid: userData.uid || docId };
  },

  inviteAdmin: async (adminData) => {
    return await apiClient.post("/invite-admin", adminData);
  },

  update: async (studentId, updatedData) => {
    const docId = await resolveUserDocId(studentId, updatedData);
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("users", docId);
    } catch (e) {}

    await ensureUniqueStudentIdentifiers(updatedData, docId);
    await FirestoreService.updateDocument("users", docId, updatedData);
    logAdminActivity("update", "users", docId, previousState, { ...previousState, ...updatedData });
    return { studentId, uid: docId, ...updatedData };
  },

  delete: async (studentId) => {
    const docId = await resolveUserDocId(studentId);
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("users", docId);
    } catch (e) {}

    await FirestoreService.deleteDocument("users", docId);
    logAdminActivity("delete", "users", docId, previousState, null);
    return studentId;
  },

  ban: async (studentId) => {
    const docId = await resolveUserDocId(studentId);
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("users", docId);
    } catch (e) {}

    await FirestoreService.updateDocument("users", docId, { status: "Banned" });
    logAdminActivity("ban", "users", docId, previousState, { ...previousState, status: "Banned" });
    return { studentId, docId, status: "Banned" };
  },

  unban: async (studentId) => {
    const docId = await resolveUserDocId(studentId);
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("users", docId);
    } catch (e) {}

    await FirestoreService.updateDocument("users", docId, { status: "Active" });
    logAdminActivity("unban", "users", docId, previousState, { ...previousState, status: "Active" });
    return { studentId, docId, status: "Active" };
  },

  verify: async (studentId) => {
    const docId = await resolveUserDocId(studentId);
    let previousState = null;
    try {
      previousState = await FirestoreService.getDocument("users", docId);
    } catch (e) {}

    await FirestoreService.updateDocument("users", docId, { manuallyVerified: true });
    logAdminActivity("verify", "users", docId, previousState, { ...previousState, emailVerified: true, manuallyVerified: true });
    return { studentId, docId, manuallyVerified: true };
  },
};

export default usersApi;
