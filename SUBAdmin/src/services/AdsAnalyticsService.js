// Service for Ad Click Analytics & Tracking
import { isSupabaseConfigured, supabaseHeaders, getSystemSettings, updateSystemSettings } from "../supabase/config";
import CacheManager from "./CacheManager";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const CACHE_KEY = "subadmin_ads_analytics_logs";
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache

export const PLACEMENTS = {
  HOMEPAGE: "homepage",
  APP_DRAWER: "app_drawer",
  NAV_DRAWER: "nav_drawer",
  FULLSCREEN: "fullscreen_ad",
};

export const normalizePlacement = (key) => {
  if (!key) return "unknown";
  const lower = String(key).toLowerCase().trim();
  if (lower.includes("nav")) return PLACEMENTS.NAV_DRAWER;
  if (lower.includes("app") || lower.includes("tools")) return PLACEMENTS.APP_DRAWER;
  if (lower.includes("home")) return PLACEMENTS.HOMEPAGE;
  if (lower.includes("full") || lower.includes("splash") || lower.includes("startup")) return PLACEMENTS.FULLSCREEN;
  return lower;
};

export const getPlacementLabel = (placementKey) => {
  const norm = normalizePlacement(placementKey);
  switch (norm) {
    case PLACEMENTS.HOMEPAGE:
      return "Homepage Banner";
    case PLACEMENTS.APP_DRAWER:
      return "App Drawer Banner";
    case PLACEMENTS.NAV_DRAWER:
      return "Navigation Drawer";
    case PLACEMENTS.FULLSCREEN:
      return "Startup Splash / Fullscreen";
    default:
      return placementKey || "Unknown";
  }
};

export const getPlacementColor = (placementKey) => {
  const norm = normalizePlacement(placementKey);
  switch (norm) {
    case PLACEMENTS.HOMEPAGE:
      return {
        badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        fill: "#3b82f6",
        dot: "bg-blue-500",
      };
    case PLACEMENTS.APP_DRAWER:
      return {
        badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        fill: "#10b981",
        dot: "bg-emerald-500",
      };
    case PLACEMENTS.NAV_DRAWER:
      return {
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        fill: "#f59e0b",
        dot: "bg-amber-500",
      };
    case PLACEMENTS.FULLSCREEN:
      return {
        badge: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        fill: "#8b5cf6",
        dot: "bg-purple-500",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        fill: "#64748b",
        dot: "bg-slate-500",
      };
  }
};

/**
 * Fetch raw ad click events from Supabase activity_logs
 */
export const fetchRawAdClickLogs = async ({ forceRefresh = false, limit = 1000 } = {}) => {
  if (!forceRefresh) {
    const cached = CacheManager.get(CACHE_KEY);
    if (cached?.data && Array.isArray(cached.data) && !cached.isExpired) {
      return cached.data;
    }
  }

  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    // Read directly from activity_logs where ad clicks are stored
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/activity_logs?action=eq.ad_click&order=timestamp.desc&limit=${limit}&select=*`,
      {
        headers: supabaseHeaders(),
      }
    );

    if (!res.ok) {
      console.warn("Failed to fetch ad clicks from activity_logs:", res.statusText);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn("activity_logs returned non-array payload:", data);
      return [];
    }
    CacheManager.set(CACHE_KEY, data, CACHE_TTL);
    return data;
  } catch (err) {
    console.error("Error fetching ad click logs:", err);
    return [];
  }
};

/**
 * Fetch persistent system_settings ad counter fallbacks
 */
export const fetchAdSettingsSummary = async () => {
  try {
    const [adsData, appUpdateData] = await Promise.all([
      getSystemSettings("ads").catch(() => null),
      getSystemSettings("app_update").catch(() => null),
    ]);
    return {
      adsData: adsData || {},
      appUpdateData: appUpdateData || {},
    };
  } catch {
    return { adsData: {}, appUpdateData: {} };
  }
};

/**
 * Record an ad click event in Supabase activity_logs and update aggregated click counters in system_settings
 */
export const recordAdClickEvent = async ({ placement, targetUrl = "", userId = null }) => {
  const normPlacement = normalizePlacement(placement);
  const nowIso = new Date().toISOString();

  // 1. Post to dedicated ad_clicks table and activity_logs
  try {
    if (isSupabaseConfigured()) {
      // Direct write to ad_clicks
      fetch(`${SUPABASE_URL}/rest/v1/ad_clicks`, {
        method: "POST",
        headers: {
          ...supabaseHeaders(),
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          placement: normPlacement,
          target_url: targetUrl || "",
          user_id: userId || null,
          platform: "Web Portal",
          details: {
            placement: normPlacement,
            targetUrl: targetUrl || "",
          },
          created_at: nowIso,
        }),
      }).catch(() => {});

      // Mirror write to activity_logs
      await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
        method: "POST",
        headers: {
          ...supabaseHeaders(),
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          action: "ad_click",
          user_id: userId || null,
          details: {
            placement: normPlacement,
            targetUrl: targetUrl || "",
          },
          timestamp: nowIso,
        }),
      });
      // Invalidate analytics cache
      CacheManager.delete(CACHE_KEY);
    }
  } catch (e) {
    console.warn("Failed to insert ad_click telemetry:", e);
  }

  // 2. Also increment persistent counter in system_settings (matching AdRepository.java dual tracking)
  try {
    const isNav = normPlacement === PLACEMENTS.NAV_DRAWER;
    const isHome = normPlacement === PLACEMENTS.HOMEPAGE;
    const clickField = isNav ? "navClicks" : isHome ? "homeClicks" : "fullscreenClicks";

    const adsData = await getSystemSettings("ads").catch(() => ({}));
    const currentTotal = Number(adsData?.totalClicks || 0);
    const currentPlacement = Number(adsData?.[clickField] || 0);

    await Promise.all([
      updateSystemSettings("ads", {
        totalClicks: currentTotal + 1,
        [clickField]: currentPlacement + 1,
        lastClickAt: nowIso,
      }).catch(() => null),
      updateSystemSettings("app_update", {
        totalAdClicks: currentTotal + 1,
        [clickField]: currentPlacement + 1,
        lastClickAt: nowIso,
      }).catch(() => null),
    ]);
  } catch (err) {
    console.warn("Silent fallback updating ad settings counts:", err);
  }
};


/**
 * Compute detailed analytics for selected time range and placement filter
 */
export const computeAdsAnalytics = ({
  rawLogs = [],
  timeFilter = "today", // 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all'
  placementFilter = "all", // 'all' | 'homepage' | 'app_drawer' | 'nav_drawer' | 'fullscreen_ad'
  settingsSummary = null,
}) => {
  const safeLogs = Array.isArray(rawLogs) ? rawLogs : [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 0, 0, 0, 0, -1);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Filter logs by placement first if specified
  const placementFilteredLogs = safeLogs.filter((log) => {
    if (placementFilter === "all") return true;
    const norm = normalizePlacement(log?.details?.placement);
    return norm === placementFilter;
  });

  // Calculate global summary counts across all time
  let totalAllTime = safeLogs.length;
  let todayCount = 0;
  let yesterdayCount = 0;
  let weekCount = 0;
  let monthCount = 0;
  let yearCount = 0;

  // Track placement distributions
  const placementCounts = {
    [PLACEMENTS.HOMEPAGE]: 0,
    [PLACEMENTS.APP_DRAWER]: 0,
    [PLACEMENTS.NAV_DRAWER]: 0,
    [PLACEMENTS.FULLSCREEN]: 0,
  };

  // Determine current period boundary
  let periodStart = null;
  let periodEnd = null;
  let prevPeriodStart = null;
  let prevPeriodEnd = null;

  switch (timeFilter) {
    case "today":
      periodStart = startOfToday;
      periodEnd = now;
      prevPeriodStart = startOfYesterday;
      prevPeriodEnd = endOfYesterday;
      break;
    case "yesterday":
      periodStart = startOfYesterday;
      periodEnd = endOfYesterday;
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
      prevPeriodEnd = new Date(startOfYesterday.getTime() - 1);
      break;
    case "week":
      periodStart = startOfWeek;
      periodEnd = now;
      prevPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevPeriodEnd = startOfWeek;
      break;
    case "month":
      periodStart = startOfMonth;
      periodEnd = now;
      prevPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      prevPeriodEnd = startOfMonth;
      break;
    case "year":
      periodStart = startOfYear;
      periodEnd = now;
      prevPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
      prevPeriodEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      break;
    case "all":
    default:
      periodStart = new Date(0);
      periodEnd = now;
      break;
  }

  let periodLogs = [];
  let prevPeriodCount = 0;

  // Process all logs for metrics
  safeLogs.forEach((log) => {
    const logTime = new Date(log.timestamp || log.created_at || 0);
    const normPlacement = normalizePlacement(log.details?.placement);

    // Global counters
    if (logTime >= startOfToday) todayCount++;
    if (logTime >= startOfYesterday && logTime <= endOfYesterday) yesterdayCount++;
    if (logTime >= startOfWeek) weekCount++;
    if (logTime >= startOfMonth) monthCount++;
    if (logTime >= startOfYear) yearCount++;

    // Period filtering
    const inPeriod = (!periodStart || logTime >= periodStart) && (!periodEnd || logTime <= periodEnd);
    const inPrevPeriod = prevPeriodStart && prevPeriodEnd && logTime >= prevPeriodStart && logTime <= prevPeriodEnd;

    const matchesPlacement = placementFilter === "all" || normPlacement === placementFilter;

    if (inPeriod && matchesPlacement) {
      periodLogs.push(log);
      if (placementCounts[normPlacement] !== undefined) {
        placementCounts[normPlacement]++;
      }
    }

    if (inPrevPeriod && matchesPlacement) {
      prevPeriodCount++;
    }
  });

  // Merge with settings fallback if database logs are zero or fresh
  const sysTotal =
    (settingsSummary?.adsData?.totalClicks || settingsSummary?.appUpdateData?.totalAdClicks || 0);
  const sysHome =
    (settingsSummary?.adsData?.homeClicks || settingsSummary?.appUpdateData?.homeClicks || 0);
  const sysNav =
    (settingsSummary?.adsData?.navClicks || settingsSummary?.appUpdateData?.navClicks || 0);
  const sysApp =
    (settingsSummary?.adsData?.appDrawerClicks || settingsSummary?.appUpdateData?.appDrawerClicks || 0);

  if (periodLogs.length === 0 && sysTotal > 0 && timeFilter === "all") {
    totalAllTime = Math.max(totalAllTime, sysTotal);
    placementCounts[PLACEMENTS.HOMEPAGE] = Math.max(placementCounts[PLACEMENTS.HOMEPAGE], sysHome);
    placementCounts[PLACEMENTS.NAV_DRAWER] = Math.max(placementCounts[PLACEMENTS.NAV_DRAWER], sysNav);
    placementCounts[PLACEMENTS.APP_DRAWER] = Math.max(placementCounts[PLACEMENTS.APP_DRAWER], sysApp);
  }

  const periodTotal = periodLogs.length;
  const growthRate = prevPeriodCount > 0
    ? Math.round(((periodTotal - prevPeriodCount) / prevPeriodCount) * 100)
    : periodTotal > 0 ? 100 : 0;

  // Build Time-Series Trend Buckets
  const trendData = [];
  if (timeFilter === "today" || timeFilter === "yesterday") {
    // 24 Hourly buckets
    const baseDate = timeFilter === "today" ? startOfToday : startOfYesterday;
    for (let h = 0; h < 24; h++) {
      const hourStr = `${String(h).padStart(2, "0")}:00`;
      const bucketLogs = periodLogs.filter((l) => {
        const d = new Date(l.timestamp || 0);
        return d.getHours() === h;
      });
      trendData.push({
        label: hourStr,
        clicks: bucketLogs.length,
        homepage: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.HOMEPAGE).length,
        appDrawer: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.APP_DRAWER).length,
        navDrawer: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.NAV_DRAWER).length,
        fullscreen: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.FULLSCREEN).length,
      });
    }
  } else if (timeFilter === "week") {
    // 7 Daily buckets
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59);
      const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

      const bucketLogs = periodLogs.filter((l) => {
        const d = new Date(l.timestamp || 0);
        return d >= dayStart && d <= dayEnd;
      });

      trendData.push({
        label: dayLabel,
        clicks: bucketLogs.length,
        homepage: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.HOMEPAGE).length,
        appDrawer: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.APP_DRAWER).length,
        navDrawer: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.NAV_DRAWER).length,
        fullscreen: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.FULLSCREEN).length,
      });
    }
  } else if (timeFilter === "month") {
    // 30 Daily buckets
    for (let i = 29; i >= 0; i -= 2) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() + 1, 23, 59, 59);
      const dayLabel = dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const bucketLogs = periodLogs.filter((l) => {
        const d = new Date(l.timestamp || 0);
        return d >= dayStart && d <= dayEnd;
      });

      trendData.push({
        label: dayLabel,
        clicks: bucketLogs.length,
        homepage: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.HOMEPAGE).length,
        appDrawer: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.APP_DRAWER).length,
        navDrawer: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.NAV_DRAWER).length,
        fullscreen: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.FULLSCREEN).length,
      });
    }
  } else {
    // 12 Monthly buckets
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = now.getFullYear();
    for (let m = 0; m < 12; m++) {
      const bucketLogs = periodLogs.filter((l) => {
        const d = new Date(l.timestamp || 0);
        return d.getFullYear() === currentYear && d.getMonth() === m;
      });
      trendData.push({
        label: months[m],
        clicks: bucketLogs.length,
        homepage: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.HOMEPAGE).length,
        appDrawer: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.APP_DRAWER).length,
        navDrawer: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.NAV_DRAWER).length,
        fullscreen: bucketLogs.filter((l) => normalizePlacement(l.details?.placement) === PLACEMENTS.FULLSCREEN).length,
      });
    }
  }

  // Find Top Performing Placement
  const sortedPlacements = Object.entries(placementCounts).sort((a, b) => b[1] - a[1]);
  const topPlacement = sortedPlacements[0] && sortedPlacements[0][1] > 0
    ? {
        key: sortedPlacements[0][0],
        label: getPlacementLabel(sortedPlacements[0][0]),
        count: sortedPlacements[0][1],
        percent: periodTotal > 0 ? Math.round((sortedPlacements[0][1] / periodTotal) * 100) : 0,
      }
    : null;

  // Average Daily Clicks for period
  const dayDivisor = timeFilter === "today" || timeFilter === "yesterday"
    ? 1
    : timeFilter === "week"
    ? 7
    : timeFilter === "month"
    ? 30
    : 365;
  const avgDailyClicks = (periodTotal / dayDivisor).toFixed(1);

  return {
    timeFilter,
    placementFilter,
    periodTotal,
    growthRate,
    allTimeTotal: totalAllTime,
    todayCount,
    yesterdayCount,
    weekCount,
    monthCount,
    yearCount,
    placementCounts,
    topPlacement,
    avgDailyClicks,
    trendData,
    logs: periodLogs,
  };
};

/**
 * Record a live test click event in Supabase activity_logs and update system_settings
 */
export const recordTestAdClick = async ({
  placement = PLACEMENTS.HOMEPAGE,
  targetUrl = "https://sub.edu.bd",
  platform = "Web Admin Simulator",
}) => {
  const normPlacement = normalizePlacement(placement);
  const nowIso = new Date().toISOString();
  const id = `ad_click_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const logPayload = {
    id,
    action: "ad_click",
    user_id: null,
    details: {
      placement: normPlacement,
      targetUrl,
      platform,
      device: "Admin Panel Test Client",
      simulated: true,
      timestamp: nowIso,
    },
    timestamp: nowIso,
  };

  try {
    // 1. Insert into Supabase activity_logs
    if (isSupabaseConfigured()) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
        method: "POST",
        headers: supabaseHeaders({
          Prefer: "return=representation",
        }),
        body: JSON.stringify(logPayload),
      });

      if (!res.ok) {
        console.warn("Could not insert ad click into activity_logs:", res.statusText);
      }
    }

    // 2. Increment counters in system_settings for hybrid compatibility
    const keyMap = {
      [PLACEMENTS.HOMEPAGE]: "homeClicks",
      [PLACEMENTS.NAV_DRAWER]: "navClicks",
      [PLACEMENTS.APP_DRAWER]: "appDrawerClicks",
      [PLACEMENTS.FULLSCREEN]: "fullscreenClicks",
    };
    const counterKey = keyMap[normPlacement] || "otherClicks";

    const [currentAds, currentUpdate] = await Promise.all([
      getSystemSettings("ads").catch(() => ({})),
      getSystemSettings("app_update").catch(() => ({})),
    ]);

    const newTotal = (currentAds.totalClicks || 0) + 1;
    const newPlacementCount = (currentAds[counterKey] || 0) + 1;

    await Promise.all([
      updateSystemSettings("ads", {
        totalClicks: newTotal,
        [counterKey]: newPlacementCount,
        lastClickAt: nowIso,
        lastPlacement: normPlacement,
      }).catch(() => null),
      updateSystemSettings("app_update", {
        totalAdClicks: newTotal,
        [counterKey]: newPlacementCount,
        lastClickAt: nowIso,
      }).catch(() => null),
    ]);

    // Invalidate cache
    CacheManager.invalidate(CACHE_KEY);

    return { success: true, log: logPayload };
  } catch (err) {
    console.error("Failed to record test ad click:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Export ad click logs as CSV
 */
export const exportAdLogsToCSV = (logs = []) => {
  if (!logs || logs.length === 0) return;

  const headers = ["Click ID", "Placement", "Target URL", "Timestamp", "Platform", "Simulated"];
  const rows = logs.map((log) => [
    `"${log.id || ""}"`,
    `"${getPlacementLabel(log.details?.placement)}"`,
    `"${(log.details?.targetUrl || "").replace(/"/g, '""')}"`,
    `"${log.timestamp || log.created_at || ""}"`,
    `"${log.details?.platform || "Mobile"}"`,
    `"${log.details?.simulated ? "Yes" : "No"}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `subtools_ad_clicks_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
