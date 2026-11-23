// Pure Supabase compatibility layer for legacy Firebase references
import { getSystemSettings, updateSystemSettings } from "../supabase/config";

export const app = null;
export const auth = {
  currentUser: null,
  onAuthStateChanged: () => () => {},
  signOut: async () => {},
};
export const db = { type: "supabase" };
export const storage = null;
export const firebaseConfig = {};

export const doc = (dbInstance, collectionOrPath, ...segments) => {
  const allSegments = [collectionOrPath, ...segments].filter(Boolean);
  const id = allSegments[allSegments.length - 1] || "default";
  return { collection: allSegments[0], id, path: allSegments.join("/") };
};

export const collection = (dbInstance, name) => ({ name });
export const query = (...args) => ({ args });
export const where = (...args) => ({ args });
export const orderBy = (...args) => ({ args });
export const limit = (...args) => ({ args });

export const getDoc = async (docRef) => {
  const id = docRef?.id || (typeof docRef === "string" ? docRef : "default");
  const data = await getSystemSettings(id);
  return {
    exists: () => Boolean(data),
    data: () => data || {},
    id,
  };
};

export const getDocs = async () => ({
  empty: true,
  size: 0,
  docs: [],
  forEach: () => {},
});

export const setDoc = async (docRef, data) => {
  const id = docRef?.id || "default";
  return await updateSystemSettings(id, data);
};

export const updateDoc = async (docRef, data) => {
  const id = docRef?.id || "default";
  return await updateSystemSettings(id, data);
};

export const deleteDoc = async () => true;

export default firebaseConfig;
