// BackgroundSyncService.js - Network State & Background Cache Revalidation
import CacheManager from "./CacheManager";

class BackgroundSyncServiceClass {
  constructor() {
    this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    this.networkListeners = new Set();

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
    }
  }

  log(tag, msg = "") {
    // Suppressed in production builds; only errors are logged
  }

  handleNetworkChange(onlineStatus) {
    this.isOnline = onlineStatus;
    this.log("NETWORK STATUS", onlineStatus ? "ONLINE (Connection Restored)" : "OFFLINE (Offline Mode Active)");

    if (onlineStatus) {
      this.triggerBackgroundSync();
    }

    this.networkListeners.forEach((fn) => fn(onlineStatus));
  }

  subscribe(listener) {
    this.networkListeners.add(listener);
    return () => this.networkListeners.delete(listener);
  }

  async triggerBackgroundSync() {
    this.log("BACKGROUND SYNC", "Revalidating stale caches after network reconnect...");
    try {
      // Invalidate dashboard stats to force background refresh on next render
      CacheManager.invalidate("dashboard_stats");
    } catch (e) {
      console.warn("Background sync error:", e);
    }
  }
}

export const BackgroundSyncService = new BackgroundSyncServiceClass();
export default BackgroundSyncService;
