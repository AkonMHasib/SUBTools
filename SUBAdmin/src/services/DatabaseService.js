// DatabaseService.js - 100% Pure Supabase PostgreSQL REST Access Layer
import CacheManager from "./CacheManager";
import RequestManager from "./RequestManager";
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase/config";

const COLLECTION_TO_SUPABASE_TABLE = {
  routines: "routines",
  subjects: "subjects",
  faculty: "faculty",
  buses: "buses",
  routes: "routes",
  notices: "notices",
  lostFound: "lost_found",
  coverPages: "cover_pages",
  system: "system_settings",
  admin: "system_settings",
  scheduled_notices: "notices",
  activityLogs: "activity_logs",
  analytics_cover_pages: "analytics_cover_pages",
  exam_routines: "exam_routines",
  tuitions: "tuitions",
  sublets: "sublets",
  holidays: "holidays",
  system_ads: "system_settings",
  slides: "slides",
  users: "users",
  admins: "users",
};

const TABLE_COLUMNS = {
  notices: [
    "id", "title", "body", "category", "department", "target", "attachments",
    "pinned", "author", "data", "created_at", "updated_at"
  ],
  system_settings: ["id", "settings", "created_at", "updated_at"],
  routines: [
    "id", "department", "batch", "day", "slot", "room", "course_code",
    "course_title", "teacher_initial", "data", "created_at", "updated_at"
  ],
  subjects: [
    "id", "code", "name", "department", "credits", "type", "data",
    "created_at", "updated_at"
  ],
  faculty: [
    "id", "name", "initial", "department", "designation", "email", "phone",
    "data", "created_at", "updated_at"
  ],
  buses: [
    "id", "name", "route", "driver_name", "driver_phone", "tracking_link",
    "data", "created_at", "updated_at"
  ],
  routes: [
    "id", "title", "path", "tracking_url", "stops", "schedule", "data",
    "created_at", "updated_at"
  ],
  activity_logs: ["id", "user_id", "action", "details", "timestamp"],
  users: [
    "id", "uid", "email", "name", "full_name", "studentId", "student_id",
    "department", "batch", "phone", "dob", "role", "roles", "avatar_url",
    "photoUrl", "status", "section", "semester", "academicLevel", "bloodGroup",
    "city", "area", "location", "data", "created_at", "updated_at"
  ],
};

const getValidSupabaseToken = () => {
  const token = localStorage.getItem("subtools_supabase_token");
  if (token && token.startsWith("eyJ")) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return SUPABASE_ANON_KEY;
        }
        return token;
      }
    } catch (_) {}
  }
  return token || SUPABASE_ANON_KEY;
};

const getHeaders = (extra = {}) => {
  const token = getValidSupabaseToken();
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    ...extra,
  };
};

class DatabaseServiceClass {
  log(tag, path, extra = "") {
    // Suppressed in production builds; only errors are logged
  }

  formatError(err, action, collectionName) {
    return new Error(`Failed to ${action} in '${collectionName}': ${err?.message || err}`);
  }

  getTableName(collectionName) {
    return COLLECTION_TO_SUPABASE_TABLE[collectionName] || collectionName;
  }

  /**
   * Fetch an entire collection using Smart Caching + In-Flight Deduplication via Supabase REST
   */
  async getCachedCollection(collectionName, options = {}) {
    const { customCacheKey, forceRefresh = false, customTTL = null } = options;
    const cacheKey = customCacheKey || collectionName;

    if (!forceRefresh) {
      const { data, isExpired } = CacheManager.get(cacheKey);
      if (data) {
        if (isExpired) {
          this.log("STALE-WHILE-REVALIDATE", collectionName, "Triggering background update...");
          this.fetchAndCacheCollection(collectionName, cacheKey, customTTL).catch((err) =>
            console.warn(`Background fetch failed for ${collectionName}:`, err)
          );
        }
        return data;
      }
    }

    return RequestManager.deduplicate(cacheKey, () =>
      this.fetchAndCacheCollection(collectionName, cacheKey, customTTL),
    );
  }

  async fetchAndCacheCollection(collectionName, cacheKey, customTTL = null) {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const tableName = this.getTableName(collectionName);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const rows = await res.json();
        const items = rows.map((r) => {
          const dataObj = r.data && typeof r.data === "object" ? r.data : {};
          const detailsObj = r.details && typeof r.details === "object" ? r.details : {};
          const merged = { ...r, ...detailsObj, ...dataObj, id: r.id || r.uid || dataObj.id || dataObj.uid };
          // Ensure non-empty string fields in r aren't replaced if dataObj has them, and vice versa
          for (const key of Object.keys(r)) {
            if (r[key] !== "" && r[key] !== null && r[key] !== undefined && (merged[key] === "" || merged[key] === null || merged[key] === undefined)) {
              merged[key] = r[key];
            }
          }
          for (const key of Object.keys(detailsObj)) {
            if (detailsObj[key] !== "" && detailsObj[key] !== null && detailsObj[key] !== undefined && (merged[key] === "" || merged[key] === null || merged[key] === undefined)) {
              merged[key] = detailsObj[key];
            }
          }
          for (const key of Object.keys(dataObj)) {
            if (dataObj[key] !== "" && dataObj[key] !== null && dataObj[key] !== undefined && (merged[key] === "" || merged[key] === null || merged[key] === undefined)) {
              merged[key] = dataObj[key];
            }
          }
          return merged;
        });
        this.log("SUPABASE FETCH", `${tableName} (${items.length} records)`);
        CacheManager.set(cacheKey, items, customTTL);
        return items;
      }
      if (res.status === 404) {
        CacheManager.set(cacheKey, [], customTTL || 60 * 1000);
        return [];
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      if (err?.message && !err.message.includes("404")) {
        console.warn(`Supabase collection fetch failed for '${collectionName}':`, err?.message || err);
      }
      const cached = CacheManager.get(cacheKey);
      return cached?.data || [];
    }
  }

  /**
   * Alias for getCollectionCount to maintain API compatibility
   */
  async getCount(collectionName, filters = [], forceRefresh = false) {
    return this.getCollectionCount(collectionName, forceRefresh);
  }

  /**
   * Get collection count using HTTP HEAD and Content-Range from Supabase PostgreSQL
   */
  async getCollectionCount(collectionName, forceRefresh = false) {
    const cacheKey = `count_${collectionName}`;
    if (!forceRefresh) {
      const cachedCount = CacheManager.get(cacheKey);
      if (cachedCount?.data !== null && cachedCount?.data !== undefined && !cachedCount.isExpired) {
        return cachedCount.data;
      }
    }

    return RequestManager.deduplicate(cacheKey, async () => {
      const tableName = this.getTableName(collectionName);
      try {
        let endpoint = `${SUPABASE_URL}/rest/v1/${tableName}?select=id`;
        if (collectionName === "admins") {
          endpoint = `${SUPABASE_URL}/rest/v1/users?or=(role.eq.admin,role.eq.super_admin,role.eq.coordinator)&select=id`;
        }

        const res = await fetch(endpoint, {
          method: "HEAD",
          headers: getHeaders({
            Range: "0-0",
            Prefer: "count=exact",
          }),
        });

        if (res.status === 404) {
          CacheManager.set(cacheKey, 0, 60 * 1000);
          return 0;
        }

        const contentRange = res.headers.get("content-range");
        if (contentRange && contentRange.includes("/")) {
          const total = parseInt(contentRange.split("/")[1], 10);
          if (!isNaN(total)) {
            this.log("SUPABASE COUNT", `${collectionName}: ${total}`);
            CacheManager.set(cacheKey, total, 60 * 1000);
            return total;
          }
        }
      } catch (sbErr) {
        // Silently return 0 for missing views/tables
      }

      // Fallback: Fetch collection and calculate length
      try {
        const items = await this.getCachedCollection(collectionName === "admins" ? "users" : collectionName, { forceRefresh });
        if (collectionName === "admins") {
          const adminCount = items.filter((u) => {
            const r = String(u.role || "").toLowerCase();
            const roles = Array.isArray(u.roles) ? u.roles.map((x) => String(x).toLowerCase()) : [];
            return (
              r === "admin" ||
              r === "super_admin" ||
              r === "coordinator" ||
              roles.includes("admin") ||
              roles.includes("super_admin") ||
              roles.includes("coordinator") ||
              u.isAdmin ||
              u.data?.isAdmin
            );
          }).length;
          CacheManager.set(cacheKey, adminCount, 60 * 1000);
          return adminCount;
        }
        CacheManager.set(cacheKey, items.length, 60 * 1000);
        return items.length;
      } catch (_) {
        return 0;
      }
    });
  }

  /**
   * Fetches paginated records from Supabase PostgreSQL
   */
  async getPaginatedCollection(collectionName, { limitCount = 10, offset = 0, orderByField = "created_at", orderDir = "desc" } = {}) {
    this.log("PAGINATED FETCH", collectionName, `Limit: ${limitCount}, Offset: ${offset}`);
    const tableName = this.getTableName(collectionName);

    try {
      const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=${limitCount}&offset=${offset}&order=${orderByField}.${orderDir}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const rows = await res.json();
        const docs = rows.map((r) => {
          const dataObj = r.data && typeof r.data === "object" ? r.data : {};
          const merged = { ...r, ...dataObj, id: r.id || r.uid || dataObj.id };
          for (const key of Object.keys(r)) {
            if (r[key] !== "" && r[key] !== null && r[key] !== undefined && (merged[key] === "" || merged[key] === null || merged[key] === undefined)) {
              merged[key] = r[key];
            }
          }
          for (const key of Object.keys(dataObj)) {
            if (dataObj[key] !== "" && dataObj[key] !== null && dataObj[key] !== undefined && (merged[key] === "" || merged[key] === null || merged[key] === undefined)) {
              merged[key] = dataObj[key];
            }
          }
          return merged;
        });
        return { docs, lastDocSnap: null, hasMore: docs.length === limitCount };
      }
    } catch (err) {
      console.warn(`Paginated fetch failed for '${collectionName}':`, err?.message || err);
    }
    return { docs: [], lastDocSnap: null, hasMore: false };
  }

  /**
   * Fetch a single document by ID from Supabase PostgreSQL
   */
  async getDocument(collectionName, docId, useCache = true) {
    const cacheKey = `doc_${collectionName}_${docId}`;
    if (useCache) {
      const { data, isExpired } = CacheManager.get(cacheKey);
      if (data && !isExpired) return data;
    }

    // Optimization: If looking up current user in 'users' collection, serve from active local session
    if (collectionName === "users") {
      const currentStored = localStorage.getItem("subtools_user");
      if (currentStored) {
        try {
          const parsed = JSON.parse(currentStored);
          if (parsed && (parsed.id === docId || parsed.uid === docId)) {
            CacheManager.set(cacheKey, parsed, 5 * 60 * 1000);
            return parsed;
          }
        } catch (_) {}
      }
    }

    return RequestManager.deduplicate(cacheKey, async () => {
      const tableName = this.getTableName(collectionName);
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${encodeURIComponent(docId)}&select=*`, {
          headers: getHeaders(),
        });
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length > 0) {
            const r = rows[0];
            const dataObj = r.data && typeof r.data === "object" ? r.data : {};
            const result = { ...r, ...dataObj, id: r.id || docId };
            for (const key of Object.keys(r)) {
              if (r[key] !== "" && r[key] !== null && r[key] !== undefined && (result[key] === "" || result[key] === null || result[key] === undefined)) {
                result[key] = r[key];
              }
            }
            for (const key of Object.keys(dataObj)) {
              if (dataObj[key] !== "" && dataObj[key] !== null && dataObj[key] !== undefined && (result[key] === "" || result[key] === null || result[key] === undefined)) {
                result[key] = dataObj[key];
              }
            }
            CacheManager.set(cacheKey, result);
            return result;
          }
        }
        if (res.status === 404) {
          CacheManager.set(cacheKey, null, 60 * 1000);
          return null;
        }
      } catch (sbErr) {
        if (!sbErr?.message?.includes("404")) {
          console.warn(`Supabase getDocument failed for '${collectionName}/${docId}':`, sbErr?.message);
        }
      }
      return null;
    });
  }

  buildTablePayload(collectionName, tableName, docId, data, isUpdate = false) {
    const nowIso = new Date().toISOString();

    if (tableName === "system_settings") {
      const incoming = { ...data };
      delete incoming.id;
      delete incoming.data;
      delete incoming.created_at;
      delete incoming.updated_at;
      const settings = data.settings ? { ...incoming, ...data.settings } : incoming;
      const payload = {
        settings,
        updated_at: nowIso,
      };
      if (!isUpdate) {
        payload.id = docId;
        payload.created_at = data.created_at || nowIso;
      }
      return payload;
    }

    if (tableName === "activity_logs" || collectionName === "activityLogs") {
      const payload = {
        user_id: data.user_id || data.adminId || data.userId || "system",
        action: data.action || "general_activity",
        details: data.details || {
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          targetCollection: data.targetCollection,
          targetId: data.targetId,
          previousState: data.previousState,
          currentState: data.currentState,
          reverted: data.reverted,
        },
        timestamp: data.timestamp || nowIso,
      };
      if (docId) payload.id = docId;
      return payload;
    }

    if (collectionName === "notices" || tableName === "notices") {
      const body = data.body || data.content || data.description || "";
      const category = data.category || data.type || "General";
      const department = data.department || data.targetDept || "ALL";
      const author = data.author || data.sender || data.authorName || "SUB Authority";
      const attachments = Array.isArray(data.attachments)
        ? data.attachments
        : (data.imageUrl || data.attachmentUrl ? [data.imageUrl || data.attachmentUrl] : []);
      const pinned = Boolean(data.pinned);
      const target = data.target || null;

      const nestedData = {
        id: docId,
        title: data.title || "",
        content: body,
        body: body,
        description: data.description || body,
        category: category,
        type: data.type || category,
        department: department,
        targetDept: data.targetDept || department,
        priority: data.priority || "Normal",
        sender: author,
        author: author,
        authorName: data.authorName || author,
        imageUrl: data.imageUrl || data.attachmentUrl || "",
        attachmentUrl: data.attachmentUrl || data.imageUrl || "",
        pdfUrl: data.pdfUrl || data.pdfLink || "",
        pdfLink: data.pdfLink || data.pdfUrl || "",
        pdfAttachment: data.pdfAttachment || data.pdfUrl || "",
        status: data.status || "published",
        isScheduled: Boolean(data.isScheduled),
        scheduledFor: data.scheduledFor || null,
        scheduledForLabel: data.scheduledForLabel || null,
        date: data.date || new Date().toLocaleString(),
        createdAt: data.createdAt || Date.now(),
        ...(data.data && typeof data.data === "object" ? data.data : {}),
        ...data,
      };

      const payload = {
        title: data.title || "",
        body: body,
        category: category,
        department: department,
        target: target,
        attachments: attachments,
        pinned: pinned,
        author: author,
        data: nestedData,
        updated_at: nowIso,
      };

      if (!isUpdate) {
        payload.id = docId;
        payload.created_at = data.created_at || (data.createdAt ? new Date(data.createdAt).toISOString() : nowIso);
      }
      return payload;
    }

    // Supabase public.users view mapping: persist directly to updatable 'data' (raw_user_meta_data)
    if (tableName === "users") {
      const rawData = { ...data };
      const currentNested = rawData.data && typeof rawData.data === "object" ? { ...rawData.data } : {};
      const pUrl = rawData.photo_url || rawData.photoURL || rawData.avatar_url || currentNested.photo_url || currentNested.photoURL;
      const combined = {
        ...currentNested,
        ...rawData,
        ...(pUrl ? { photo_url: pUrl, photoURL: pUrl, avatar_url: pUrl } : {}),
        updated_at: nowIso,
      };
      delete combined.id;
      delete combined.uid;
      delete combined.data;
      return {
        data: combined,
      };
    }

    // General table mapping based on TABLE_COLUMNS
    const validCols = TABLE_COLUMNS[tableName];
    const rawData = { ...data };
    const nestedData = { id: docId, ...rawData, ...(rawData.data && typeof rawData.data === "object" ? rawData.data : {}) };

    if (validCols) {
      const payload = {};
      if (validCols.includes("updated_at")) {
        payload.updated_at = nowIso;
      }
      if (!isUpdate && validCols.includes("id")) {
        payload.id = docId;
      }
      if (validCols.includes("data")) payload.data = nestedData;
      for (const col of validCols) {
        if (col !== "id" && col !== "updated_at" && col !== "data" && col in rawData) {
          payload[col] = rawData[col];
        }
      }
      if (!isUpdate && validCols.includes("created_at") && !payload.created_at) {
        payload.created_at = rawData.created_at || nowIso;
      }
      return payload;
    }

    const payload = {
      ...rawData,
      data: nestedData,
      updated_at: nowIso,
    };
    if (!isUpdate) {
      payload.id = docId;
      payload.created_at = rawData.created_at || nowIso;
    }
    return payload;
  }

  /**
   * Write/Update document with automatic cache invalidation in Supabase PostgreSQL
   */
  async setDocument(collectionName, docId, data, merge = true) {
    this.log("SUPABASE SET DOC", `${collectionName}/${docId}`);
    const tableName = this.getTableName(collectionName);

    try {
      const payload = this.buildTablePayload(collectionName, tableName, docId, data, false);

      const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?on_conflict=id`, {
        method: "POST",
        headers: getHeaders({
          Prefer: "resolution=merge-duplicates,return=representation",
        }),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        throw new Error(errObj.message || `HTTP ${res.status}: Failed to save record in ${tableName}`);
      }

      CacheManager.invalidate(collectionName);
      CacheManager.invalidate(`count_${collectionName}`);
      CacheManager.invalidate(`doc_${collectionName}_${docId}`);
      this.invalidateDashboardCache();
      return { id: docId, ...payload };
    } catch (err) {
      throw this.formatError(err, "save", collectionName);
    }
  }

  async addDocument(collectionName, data) {
    this.log("SUPABASE ADD DOC", collectionName);
    const tableName = this.getTableName(collectionName);
    const generatedId = data.id || data.uid || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    return await this.setDocument(collectionName, generatedId, data);
  }

  async updateDocument(collectionName, docId, data) {
    this.log("SUPABASE UPDATE DOC", `${collectionName}/${docId}`);
    const tableName = this.getTableName(collectionName);

    try {
      const payload = this.buildTablePayload(collectionName, tableName, docId, data, true);

      const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${encodeURIComponent(docId)}`, {
        method: "PATCH",
        headers: getHeaders({
          Prefer: "return=representation",
        }),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (tableName === "users") {
          const errObj = await res.json().catch(() => ({}));
          throw new Error(errObj.message || `HTTP ${res.status}: Failed to update profile`);
        }
        // If not found for patch, upsert with setDocument
        return await this.setDocument(collectionName, docId, data);
      }

      // If updating user profile and caller has user token, also sync to Supabase Auth (/auth/v1/user)
      if (tableName === "users" && payload.data) {
        const token = localStorage.getItem("subtools_supabase_token");
        if (token && token.startsWith("eyJ")) {
          try {
            await fetch(`${SUPABASE_URL}/auth/v1/user`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                data: payload.data,
              }),
            });
          } catch (_) {}
        }
      }

      CacheManager.invalidate(collectionName);
      CacheManager.invalidate(`doc_${collectionName}_${docId}`);
      this.invalidateDashboardCache();
      return { id: docId, ...payload };
    } catch (err) {
      throw this.formatError(err, "update", collectionName);
    }
  }

  async deleteDocument(collectionName, docId) {
    this.log("SUPABASE DELETE DOC", `${collectionName}/${docId}`);
    const tableName = this.getTableName(collectionName);

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${encodeURIComponent(docId)}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      CacheManager.invalidate(collectionName);
      CacheManager.invalidate(`count_${collectionName}`);
      CacheManager.invalidate(`doc_${collectionName}_${docId}`);
      this.invalidateDashboardCache();
      return { success: res.ok, id: docId };
    } catch (err) {
      throw this.formatError(err, "delete", collectionName);
    }
  }

  /**
   * Native Supabase PostgreSQL Batch Upsert
   */
  async batchWrite(collectionName, items = []) {
    if (!items || items.length === 0) return { count: 0 };
    const tableName = this.getTableName(collectionName);

    const payload = items.map((item) => {
      const docId = item.id || item.code || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
      return {
        id: docId,
        ...item,
        data: item,
        updated_at: new Date().toISOString(),
      };
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
      method: "POST",
      headers: getHeaders({
        Prefer: "resolution=merge-duplicates",
      }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errObj = await res.json().catch(() => ({}));
      throw new Error(errObj.message || `Failed to batch write ${items.length} records into ${tableName}`);
    }

    CacheManager.invalidate(collectionName);
    CacheManager.invalidate(`count_${collectionName}`);
    this.invalidateDashboardCache();
    return { count: items.length };
  }

  async batchExecute(callback) {
    const batchOperations = [];
    const batchProxy = {
      set: (ref, data) => batchOperations.push({ action: "set", ref, data }),
      update: (ref, data) => batchOperations.push({ action: "update", ref, data }),
      delete: (ref) => batchOperations.push({ action: "delete", ref }),
      commit: async () => true,
    };
    await callback(batchProxy);
  }

  invalidateDashboardCache() {
    CacheManager.invalidate("dashboard_stats");
    try {
      localStorage.removeItem("subtools_dashboard_cache");
      localStorage.removeItem("subtools_users_cache");
    } catch (_) {}
  }
}

export const DatabaseService = new DatabaseServiceClass();
export default DatabaseService;
