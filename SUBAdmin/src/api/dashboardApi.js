// Dashboard API Layer - Smart Caching & Server-Side Count Aggregations
import { normalizeDepartment, getDepartmentName } from "../utils/academic";
import DashboardService from "../services/DashboardService";
import FirestoreService from "../services/FirestoreService";
import CacheManager from "../services/CacheManager";
import { getSystemSettings, SUPABASE_URL, supabaseHeaders } from "../supabase/config";

export const dashboardApi = {
  getStats: async (forceRefresh = true) => {
    try {
      // 1. Fetch server-side count aggregations via DashboardService
      const stats = await DashboardService.getDashboardStats(forceRefresh);

      // 2. Fetch users for active/banned status count from fresh users collection
      const usersList = await FirestoreService.getCachedCollection("users", { forceRefresh });

      let activeUsersCount = 0;
      let bannedUsersCount = 0;
      let computedAdminsCount = 0;

      usersList.forEach((u) => {
        const st = String(u.status || "")
          .trim()
          .toLowerCase();
        if (st === "banned" || st === "disabled" || st === "inactive" || st === "restricted") {
          bannedUsersCount++;
        } else {
          activeUsersCount++;
        }

        const role = String(u.role || "").toLowerCase().trim();
        const roles = Array.isArray(u.roles) ? u.roles.map((r) => String(r).toLowerCase().trim()) : [];
        if (
          role === "admin" ||
          role === "super_admin" ||
          role === "coordinator" ||
          role === "moderator" ||
          roles.includes("admin") ||
          roles.includes("super_admin") ||
          roles.includes("coordinator") ||
          roles.includes("moderator") ||
          u.isAdmin ||
          u.data?.isAdmin
        ) {
          computedAdminsCount++;
        }
      });

      // Calculate online users from Supabase activity_logs heartbeats (source of truth) and presence
      const now = Date.now();
      const fifteenMinsAgo = new Date(now - 15 * 60 * 1000).toISOString();
      let onlineUsersCount = 0;

      try {
        const { data: activeLogs } = await supabase
          .from("activity_logs")
          .select("user_id")
          .in("action", ["heartbeat", "session_start"])
          .gte("timestamp", fifteenMinsAgo);

        if (Array.isArray(activeLogs)) {
          const uniqueOnlineUsers = new Set();
          activeLogs.forEach((l) => {
            if (l.user_id && typeof l.user_id === "string" && !l.user_id.startsWith("test_")) {
              uniqueOnlineUsers.add(l.user_id.trim());
            }
          });
          onlineUsersCount = uniqueOnlineUsers.size;
        }
      } catch (hbErr) {
        console.warn("Could not query activity_logs for dashboard online users:", hbErr);
      }

      const actualUsersCount =
        Number(stats.totalUsers) > 0 ? Number(stats.totalUsers) : usersList.length;
      const actualAdminsCount =
        Number(stats.totalAdmins) > 0 ? Number(stats.totalAdmins) : computedAdminsCount;

      // Fetch Ads Clicks directly from Supabase activity_logs (source of truth) and system_settings (counters)
      let totalAdClicks = 0;
      let navAdClicks = 0;
      let homeAdClicks = 0;
      let appAdClicks = 0;
      let fsAdClicks = 0;

      try {
        const actRes = await fetch(
          `${SUPABASE_URL}/rest/v1/activity_logs?action=eq.ad_click&select=details`,
          {
            headers: supabaseHeaders(),
          }
        );
        if (actRes.ok) {
          const actLogs = await actRes.json();
          if (Array.isArray(actLogs)) {
            totalAdClicks = actLogs.length;
            actLogs.forEach((log) => {
              const p = String(log?.details?.placement || "").toLowerCase();
              if (p.includes("nav")) navAdClicks++;
              else if (p.includes("app") || p.includes("tool")) appAdClicks++;
              else if (p.includes("home")) homeAdClicks++;
              else if (p.includes("full") || p.includes("splash")) fsAdClicks++;
            });
          }
        }

        // Secondary fallback to persistent system_settings counters
        const sysAdsData = await getSystemSettings("ads");
        if (sysAdsData) {
          const sTotal = Number(sysAdsData.totalClicks || 0);
          const sNav = Number(sysAdsData.navClicks || sysAdsData.nav_drawer?.clicks || 0);
          const sHome = Number(sysAdsData.homeClicks || sysAdsData.homepage?.clicks || 0);
          const sApp = Number(sysAdsData.appDrawerClicks || 0);

          navAdClicks = Math.max(navAdClicks, sNav);
          homeAdClicks = Math.max(homeAdClicks, sHome);
          appAdClicks = Math.max(appAdClicks, sApp);
          totalAdClicks = Math.max(totalAdClicks, sTotal, navAdClicks + homeAdClicks + appAdClicks + fsAdClicks);
        }
      } catch (adErr) {
        console.warn("Could not query ad clicks for dashboard:", adErr);
      }

      return {
        totalUsers: actualUsersCount,
        totalAdmins: actualAdminsCount,
        activeUsers: activeUsersCount,
        bannedUsers: bannedUsersCount,
        onlineUsers: onlineUsersCount,
        totalFaculty: stats.totalFaculty,
        totalSubjects: stats.totalSubjects,
        totalCoverPagesGenerated: stats.totalCoverPages || 0,
        totalBuses: stats.totalBuses || 0,
        totalRoutes: stats.totalRoutes || 0,
        totalClassRoutines: stats.totalRoutines,
        totalAdClicks,
        navAdClicks,
        homeAdClicks,
        appAdClicks,
        fsAdClicks,
      };
    } catch (e) {
      console.error("Dashboard stats query error:", e);
      return {
        totalUsers: 0,
        totalAdmins: 0,
        activeUsers: 0,
        bannedUsers: 0,
        onlineUsers: 0,
        totalFaculty: 0,
        totalSubjects: 0,
        totalCoverPagesGenerated: 0,
        totalBuses: 0,
        totalRoutes: 0,
        totalClassRoutines: 0,
      };
    }
  },

  getRegistrationTrend: async (forceRefresh = true) => {
    try {
      const usersList = await FirestoreService.getCachedCollection("users", { forceRefresh });
      const today = new Date();
      const last7Days = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateKey = `${year}-${month}-${day}`;
        last7Days.push({ label, dateKey, count: 0 });
      }

      usersList.forEach((u) => {
        // Priority 1: Auth creationTime metadata
        const rawDate =
          u.creationTime ||
          u.authCreatedAt ||
          u.metadata?.creationTime ||
          u.createdAt ||
          u.created_at ||
          u.registeredAt ||
          u.joinedAt ||
          u.timestamp ||
          u.date;

        if (rawDate) {
          let dateObj = null;
          if (typeof rawDate?.toDate === "function") {
            dateObj = rawDate.toDate();
          } else if (typeof rawDate === "object" && typeof rawDate.seconds === "number") {
            dateObj = new Date(rawDate.seconds * 1000);
          } else if (typeof rawDate === "number" || typeof rawDate === "string") {
            dateObj = new Date(rawDate);
          }

          if (dateObj && !isNaN(dateObj.getTime())) {
            const localY = dateObj.getFullYear();
            const localM = String(dateObj.getMonth() + 1).padStart(2, "0");
            const localD = String(dateObj.getDate()).padStart(2, "0");
            const localKey = `${localY}-${localM}-${localD}`;

            const utcY = dateObj.getUTCFullYear();
            const utcM = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
            const utcD = String(dateObj.getUTCDate()).padStart(2, "0");
            const utcKey = `${utcY}-${utcM}-${utcD}`;

            const match = last7Days.find(
              (dayItem) => dayItem.dateKey === localKey || dayItem.dateKey === utcKey,
            );
            if (match) match.count++;
          }
        }
      });

      return last7Days.map((d) => ({ date: d.label, count: d.count }));
    } catch (e) {
      console.warn("Failed to generate dynamic registration trend:", e);
      return [];
    }
  },

  getCoverPageStats: async (forceRefresh = true) => {
    try {
      const [list1, list2] = await Promise.all([
        FirestoreService.getCachedCollection("analytics_cover_pages", { forceRefresh }).catch(
          () => [],
        ),
        FirestoreService.getCachedCollection("coverPages", { forceRefresh }).catch(() => []),
      ]);

      const docMap = new Map();
      [...(list1 || []), ...(list2 || [])].forEach((c) => {
        if (c && c.id) docMap.set(c.id, c);
      });
      const coverList = Array.from(docMap.values());
      const monthlyMap = {};

      coverList.forEach((c) => {
        let dateObj = null;
        if (c.timestamp) {
          dateObj = new Date(c.timestamp);
        } else if (c.createdAt) {
          dateObj = new Date(c.createdAt);
        }

        if (dateObj) {
          const monthLabel = dateObj.toLocaleDateString("en-US", { month: "short" });
          const term = String(c.term || "Midterm")
            .toLowerCase()
            .includes("final")
            ? "Final"
            : "Midterm";

          if (!monthlyMap[monthLabel]) {
            monthlyMap[monthLabel] = { month: monthLabel, Midterm: 0, Final: 0 };
          }

          monthlyMap[monthLabel][term]++;
        }
      });

      const monthsOrder = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return Object.values(monthlyMap).sort(
        (a, b) => monthsOrder.indexOf(a.month) - monthsOrder.indexOf(b.month),
      );
    } catch (e) {
      console.warn("Failed to generate dynamic cover page stats:", e);
      return [];
    }
  },

  getDeptDistribution: async (forceRefresh = true) => {
    try {
      const usersList = await FirestoreService.getCachedCollection("users", { forceRefresh });
      const deptMap = {};

      usersList.forEach((u) => {
        if (!u.department) return;
        const code = normalizeDepartment(u.department);
        if (!code || code.toUpperCase() === "UNKNOWN" || code.toUpperCase() === "N/A") return;
        const label = getDepartmentName(code) || code;
        deptMap[label] = (deptMap[label] || 0) + 1;
      });

      const colors = [
        "#3b82f6",
        "#10b981",
        "#ef4444",
        "#8b5cf6",
        "#f59e0b",
        "#6366f1",
        "#ec4899",
        "#14b8a6",
        "#06b6d4",
        "#f97316",
        "#84cc16",
      ];

      return Object.entries(deptMap)
        .filter(
          ([name]) => name && name.toUpperCase() !== "UNKNOWN" && name.toUpperCase() !== "N/A",
        )
        .sort((a, b) => b[1] - a[1])
        .map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length],
        }));
    } catch (e) {
      console.warn("Failed to generate dynamic department distribution:", e);
      return [];
    }
  },

  getActivities: async () => {
    try {
      return await DashboardService.getRecentActivities(10);
    } catch (e) {
      console.warn("Failed to retrieve activity feed:", e);
      return [];
    }
  },
};

export default dashboardApi;
