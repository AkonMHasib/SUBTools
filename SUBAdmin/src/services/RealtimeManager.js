// RealtimeManager.js - Scoped Realtime Listener Gateway (Supabase Realtime / Polling)
import CacheManager from "./CacheManager";
import DatabaseService from "./DatabaseService";

class RealtimeManagerClass {
  constructor() {
    this.activeListeners = new Map();
  }

  log(tag, key, msg = "") {
    // Suppressed in production builds; only errors are logged
  }

  /**
   * Listens to live notices and updates CacheManager automatically.
   * Returns unsubscribe function.
   */
  subscribeToLiveNotices(onUpdateCallback) {
    const listenerKey = "live_notices";

    if (this.activeListeners.has(listenerKey)) {
      this.log("REALTIME LISTEN", listenerKey, "(Reusing active listener)");
      return this.activeListeners.get(listenerKey).unsubscribe;
    }

    this.log("REALTIME ATTACH", listenerKey);

    const fetchNotices = async () => {
      try {
        const notices = await DatabaseService.getCachedCollection("notices", { forceRefresh: true });
        CacheManager.set("notices", notices, 5 * 60 * 1000);
        if (onUpdateCallback) onUpdateCallback(notices);
      } catch (error) {
        console.warn("Realtime notice polling error:", error);
      }
    };

    fetchNotices();
    const intervalId = setInterval(fetchNotices, 30000); // 30s background refresh

    const cleanup = () => {
      this.log("REALTIME DETACH", listenerKey);
      clearInterval(intervalId);
      this.activeListeners.delete(listenerKey);
    };

    this.activeListeners.set(listenerKey, { unsubscribe: cleanup });
    return cleanup;
  }

  unsubscribeAll() {
    this.activeListeners.forEach(({ unsubscribe }) => unsubscribe());
    this.activeListeners.clear();
    this.log("REALTIME CLEANUP", "All listeners detached");
  }
}

export const RealtimeManager = new RealtimeManagerClass();
export default RealtimeManager;
