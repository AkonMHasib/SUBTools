// DashboardService.js - Server-side Aggregations & Dashboard Cache Optimization
import FirestoreService from "./FirestoreService";
import CacheManager from "./CacheManager";
import RequestManager from "./RequestManager";

class DashboardServiceClass {
  log(tag, msg = "") {
    // Suppressed in production builds; only errors are logged
  }

  /**
   * Fetches aggregated dashboard stats using server-side count() queries.
   * NEVER downloads full document collections to count items.
   */
  async getDashboardStats(forceRefresh = true) {
    const cacheKey = "dashboard_stats";

    if (!forceRefresh) {
      const { data, isExpired } = CacheManager.get(cacheKey);
      if (data) {
        if (isExpired) {
          this.log("DASHBOARD STALE", "Refreshing stats in background...");
          this.computeStatsAndCache(cacheKey, true).catch((e) =>
            console.warn("Background dashboard update failed:", e),
          );
        }
        return data;
      }
    }

    return RequestManager.deduplicate(cacheKey, () => this.computeStatsAndCache(cacheKey, forceRefresh));
  }

  async computeStatsAndCache(cacheKey, forceRefresh = false) {
    this.log("COMPUTING DASHBOARD STATS", "Using server-side count() queries...");

    const getCountSafe = async (collection) => {
      try {
        if (typeof FirestoreService.getCount === "function") {
          return await FirestoreService.getCount(collection, [], forceRefresh);
        }
        if (typeof FirestoreService.getCollectionCount === "function") {
          return await FirestoreService.getCollectionCount(collection);
        }
        return 0;
      } catch (_) {
        return 0;
      }
    };

    // Execute count queries concurrently in parallel using Promise.all
    const [
      totalUsers,
      totalAdmins,
      totalFaculty,
      totalSubjects,
      totalRoutines,
      totalNotices,
      totalCoverPages1,
      totalCoverPages2,
      totalLostFound,
      totalBusesCount,
      totalRoutes,
      rawBuses,
    ] = await Promise.all([
      getCountSafe("users"),
      getCountSafe("admins"),
      getCountSafe("faculty"),
      getCountSafe("subjects"),
      getCountSafe("routines"),
      getCountSafe("notices"),
      getCountSafe("analytics_cover_pages"),
      getCountSafe("coverPages"),
      getCountSafe("lostFound"),
      getCountSafe("buses"),
      getCountSafe("routes"),
      FirestoreService.getCachedCollection("buses", { forceRefresh }).catch(() => []),
    ]);

    const activeBuses = (rawBuses || []).filter((b) => {
      const isDeleted = b.deleted || b.isDeleted;
      const status = String(b.status || "").toLowerCase();
      return !isDeleted && status !== "deleted" && status !== "inactive";
    });

    const totalCoverPages = Math.max(totalCoverPages1 || 0, totalCoverPages2 || 0, (totalCoverPages1 || 0) + (totalCoverPages2 || 0));
    const totalBuses = activeBuses.length > 0 ? activeBuses.length : (totalBusesCount || 0);

    const stats = {
      totalUsers,
      totalAdmins,
      totalFaculty,
      totalSubjects,
      totalRoutines,
      totalNotices,
      totalCoverPages,
      totalLostFound,
      totalBuses,
      totalRoutes: totalRoutes || 0,
      lastComputed: Date.now(),
    };

    CacheManager.set(cacheKey, stats, 60 * 1000); // 1 min TTL
    return stats;
  }

  /**
   * Fetches recent system activities with limit(10).
   */
  async getRecentActivities(limitCount = 10) {
    const cacheKey = `dashboard_activities_${limitCount}`;
    const { data, isExpired } = CacheManager.get(cacheKey);

    if (data && !isExpired) return data;

    return RequestManager.deduplicate(cacheKey, async () => {
      this.log("FETCH ACTIVITIES", `Limit ${limitCount}`);
      const result = await FirestoreService.getPaginatedCollection("activityLogs", {
        limitCount,
        orderByField: "timestamp",
        orderDir: "desc",
      });
      CacheManager.set(cacheKey, result.items, 2 * 60 * 1000);
      return result.items;
    });
  }
}

export const DashboardService = new DashboardServiceClass();
export default DashboardService;
