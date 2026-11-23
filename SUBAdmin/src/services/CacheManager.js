// CacheManager.js - Central Cache & Multi-Tab Sync Engine
const CACHE_VERSION = 3;
const CACHE_PREFIX = "subadmin_cache_";
const CHANNEL_NAME = "subadmin_cache_bus";

// Expiration TTL Matrix (in milliseconds)
export const TTL_MATRIX = {
  dashboard_stats: 5 * 60 * 1000,       // 5 minutes
  notices: 5 * 60 * 1000,               // 5 minutes
  users: 10 * 60 * 1000,                // 10 minutes
  faculty: 24 * 60 * 60 * 1000,         // 24 hours
  subjects: 24 * 60 * 60 * 1000,        // 24 hours
  bus_routes: 24 * 60 * 60 * 1000,      // 24 hours
  bus_stops: 24 * 60 * 60 * 1000,       // 24 hours
  roles: 24 * 60 * 60 * 1000,           // 24 hours
  calendar: 24 * 60 * 60 * 1000,        // 24 hours
  routines: 5 * 60 * 1000,              // 5 minutes (reduced from 24h for faster cross-app sync)
  departments: 30 * 24 * 60 * 60 * 1000,// 30 days
  settings: 30 * 24 * 60 * 60 * 1000,   // 30 days
  default: 5 * 60 * 1000,               // 5 minutes fallback
};

class CacheManagerService {
  constructor() {
    this.memoryCache = new Map();
    this.broadcastChannel = null;
    this.listeners = new Set();

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => this.handleChannelMessage(event);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => this.handleStorageEvent(event));
    }

    this.verifyCacheVersion();
  }

  log(tag, key, extra = "") {
    // Suppressed in production builds; only errors are logged
  }

  verifyCacheVersion() {
    try {
      const savedVersion = localStorage.getItem(`${CACHE_PREFIX}version`);
      if (savedVersion !== String(CACHE_VERSION)) {
        this.log("CACHE CLEAR", "Version mismatch - Purging old caches");
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem(`${CACHE_PREFIX}version`, String(CACHE_VERSION));
      }
    } catch (e) {
      console.warn("Storage access warning:", e);
    }
  }

  getTTL(key) {
    const baseKey = key.split("_")[0];
    return TTL_MATRIX[baseKey] || TTL_MATRIX[key] || TTL_MATRIX.default;
  }

  get(key) {
    const now = Date.now();

    // 1. Check Memory Cache
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (cached.version === CACHE_VERSION) {
        if (now < cached.expiresAt) {
          this.log("CACHE HIT", key, "(Memory)");
          return { data: cached.data, isExpired: false };
        } else {
          this.log("CACHE EXPIRED", key, "(Memory)");
          return { data: cached.data, isExpired: true };
        }
      }
    }

    // 2. Check LocalStorage
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.version === CACHE_VERSION) {
          this.memoryCache.set(key, cached); // Sync to memory
          if (now < cached.expiresAt) {
            this.log("CACHE HIT", key, "(LocalStorage)");
            return { data: cached.data, isExpired: false };
          } else {
            this.log("CACHE EXPIRED", key, "(LocalStorage)");
            return { data: cached.data, isExpired: true };
          }
        }
      }
    } catch (e) {
      console.warn("Cache parse error:", e);
    }

    this.log("CACHE MISS", key);
    return { data: null, isExpired: true };
  }

  set(key, data, customTTL = null) {
    const now = Date.now();
    const ttl = customTTL || this.getTTL(key);
    const cacheObj = {
      data,
      lastUpdated: now,
      expiresAt: now + ttl,
      version: CACHE_VERSION,
    };

    this.memoryCache.set(key, cacheObj);

    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheObj));
    } catch (e) {
      console.warn("LocalStorage set error (quota reached?):", e);
    }

    this.log("CACHE UPDATED", key, `(TTL: ${Math.round(ttl / 1000)}s)`);

    // Notify other tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: "CACHE_UPDATED", key, lastUpdated: now });
    }

    this.notifyListeners(key, data);
  }

  invalidate(key) {
    this.memoryCache.delete(key);
    const sliceKey = `subtools_${key}_cache`;
    this.memoryCache.delete(sliceKey);

    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      localStorage.removeItem(sliceKey);
      // Also remove count keys if applicable
      localStorage.removeItem(`${CACHE_PREFIX}count_${key}`);
    } catch (e) {
      console.warn("LocalStorage remove error:", e);
    }

    this.log("CACHE INVALIDATED", key);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: "CACHE_INVALIDATED", key });
    }

    this.notifyListeners(key, null);
  }

  remove(key) {
    this.invalidate(key);
  }

  clearAllAdminCaches() {
    this.memoryCache.clear();
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(CACHE_PREFIX) || k.startsWith("subtools_")) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.warn("Error clearing admin caches:", e);
    }
    this.log("CACHE PURGE", "All admin caches cleared");
  }

  handleChannelMessage(event) {
    if (!event.data) return;
    const { type, key } = event.data;
    if (type === "CACHE_UPDATED" || type === "CACHE_INVALIDATED") {
      this.memoryCache.delete(key);
      this.log("MULTI-TAB SYNC", key, `Received ${type}`);
      this.notifyListeners(key, null);
    }
  }

  handleStorageEvent(event) {
    if (event.key && event.key.startsWith(CACHE_PREFIX)) {
      const key = event.key.replace(CACHE_PREFIX, "");
      this.memoryCache.delete(key);
      this.log("STORAGE EVENT", key);
      this.notifyListeners(key, null);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(key, data) {
    this.listeners.forEach((fn) => fn(key, data));
  }
}

export const CacheManager = new CacheManagerService();
export default CacheManager;
