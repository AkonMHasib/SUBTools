import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FiTrendingUp,
  FiBarChart2,
  FiClock,
  FiCalendar,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiExternalLink,
  FiCheckCircle,
  FiSmartphone,
  FiLayers,
  FiHome,
  FiMaximize2,
  FiSearch,
  FiSettings,
  FiPlay,
  FiArrowUpRight,
  FiArrowDownRight,
  FiActivity,
} from "react-icons/fi";
import {
  PLACEMENTS,
  fetchRawAdClickLogs,
  fetchAdSettingsSummary,
  computeAdsAnalytics,
  recordTestAdClick,
  exportAdLogsToCSV,
  getPlacementLabel,
  getPlacementColor,
  normalizePlacement,
} from "../../services/AdsAnalyticsService";

export const AdsAnalytics = () => {
  const { user } = useSelector((state) => state.auth);

  // Filter States
  const [timeFilter, setTimeFilter] = useState("today"); // today, yesterday, week, month, year, all
  const [placementFilter, setPlacementFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data States
  const [rawLogs, setRawLogs] = useState([]);
  const [settingsSummary, setSettingsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Test Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simPlacement, setSimPlacement] = useState(PLACEMENTS.HOMEPAGE);
  const [simTargetUrl, setSimTargetUrl] = useState("https://sub.edu.bd");

  // Pagination for logs table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load data
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const [logs, summary] = await Promise.all([
        fetchRawAdClickLogs({ forceRefresh }),
        fetchAdSettingsSummary(),
      ]);

      setRawLogs(Array.isArray(logs) ? logs : []);
      setSettingsSummary(summary);
    } catch (err) {
      console.error("Failed to load ad analytics:", err);
      toast.error("Could not load ad analytics data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Compute analytics
  const analytics = useMemo(() => {
    return computeAdsAnalytics({
      rawLogs: Array.isArray(rawLogs) ? rawLogs : [],
      timeFilter,
      placementFilter,
      settingsSummary,
    });
  }, [rawLogs, timeFilter, placementFilter, settingsSummary]);

  // Filter logs for table
  const filteredLogs = useMemo(() => {
    if (!analytics.logs) return [];
    if (!searchQuery.trim()) return analytics.logs;
    const q = searchQuery.toLowerCase().trim();
    return analytics.logs.filter((log) => {
      const idMatch = (log.id || "").toLowerCase().includes(q);
      const urlMatch = (log.details?.targetUrl || "").toLowerCase().includes(q);
      const placeMatch = getPlacementLabel(log.details?.placement).toLowerCase().includes(q);
      const devMatch = (log.details?.platform || "").toLowerCase().includes(q);
      return idMatch || urlMatch || placeMatch || devMatch;
    });
  }, [analytics.logs, searchQuery]);

  // Paginated logs
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Handle Test Click
  const handleSimulateClick = async (e) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await recordTestAdClick({
        placement: simPlacement,
        targetUrl: simTargetUrl,
        platform: "Admin Simulator",
      });

      if (res.success) {
        toast.success(`Recorded test click on ${getPlacementLabel(simPlacement)}!`);
        await loadData(true);
      } else {
        toast.error("Failed to record test click");
      }
    } catch (err) {
      toast.error(err.message || "Simulation error");
    } finally {
      setIsSimulating(false);
    }
  };

  const timeFilterOptions = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "year", label: "This Year" },
    { id: "all", label: "All Time" },
  ];

  const placementFilterOptions = [
    { id: "all", label: "All Placements" },
    { id: PLACEMENTS.HOMEPAGE, label: "Homepage" },
    { id: PLACEMENTS.APP_DRAWER, label: "App Drawer" },
    { id: PLACEMENTS.NAV_DRAWER, label: "Nav Drawer" },
    { id: PLACEMENTS.FULLSCREEN, label: "Startup Splash" },
  ];

  // Maximum value for SVG chart scaling
  const maxTrendClicks = Math.max(...analytics.trendData.map((d) => d.clicks), 1);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Quick Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <FiTrendingUp className="text-xl" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight">
              Ads Click & Performance Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time telemetry tracking impressions and click-through rates across Mobile Homepage, App Drawer, and Nav Drawer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <FiRefreshCw className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => exportAdLogsToCSV(filteredLogs)}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <FiDownload className="mr-2" />
            Export CSV
          </button>

          <Link
            to="/admin/ads"
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            <FiSettings className="mr-2" />
            Manage Ads
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Time Interval Tabs */}
        <div className="flex items-center overflow-x-auto pb-1 lg:pb-0 gap-1.5 scrollbar-thin">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1.5 flex items-center shrink-0">
            <FiClock className="mr-1" /> Interval:
          </span>
          {timeFilterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setTimeFilter(opt.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                timeFilter === opt.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Placement Dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 flex items-center">
            <FiFilter className="mr-1" /> Placement:
          </span>
          <select
            value={placementFilter}
            onChange={(e) => {
              setPlacementFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            {placementFilterOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Selected Period Clicks */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 sm:p-5 text-white shadow-xs relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-1 flex items-center justify-between">
              <span>{timeFilterOptions.find((t) => t.id === timeFilter)?.label} Clicks</span>
              <FiActivity className="text-blue-200" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {analytics.periodTotal.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center text-[11px] font-medium text-blue-100">
              {analytics.growthRate >= 0 ? (
                <span className="inline-flex items-center text-emerald-200 font-bold mr-1">
                  <FiArrowUpRight className="mr-0.5" /> +{analytics.growthRate}%
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-200 font-bold mr-1">
                  <FiArrowDownRight className="mr-0.5" /> {analytics.growthRate}%
                </span>
              )}
              <span>vs previous period</span>
            </div>
          </div>
          <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Today's Clicks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 flex items-center justify-between">
            <span>Today</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {analytics.todayCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Clicks since midnight
          </p>
        </div>

        {/* Yesterday's Clicks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 flex items-center justify-between">
            <span>Yesterday</span>
            <FiClock className="text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {analytics.yesterdayCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Full 24h cycle
          </p>
        </div>

        {/* Top Placement */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 flex items-center justify-between">
            <span>Top Placement</span>
            <FiBarChart2 className="text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {analytics.topPlacement ? analytics.topPlacement.label : "No clicks yet"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {analytics.topPlacement ? `${analytics.topPlacement.percent}% of period total` : "Awaiting data"}
          </p>
        </div>

        {/* Daily Velocity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 flex items-center justify-between">
            <span>Daily Velocity</span>
            <FiTrendingUp className="text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {analytics.avgDailyClicks}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Average clicks / day
          </p>
        </div>
      </div>

      {/* Interactive Time-Series Bar/Trend Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Click Volume Trend ({timeFilterOptions.find((t) => t.id === timeFilter)?.label})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Breakdown across time intervals showing user engagement patterns.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="inline-flex items-center text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 mr-1.5" /> Homepage
            </span>
            <span className="inline-flex items-center text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 mr-1.5" /> App Drawer
            </span>
            <span className="inline-flex items-center text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 mr-1.5" /> Nav Drawer
            </span>
          </div>
        </div>

        {/* SVG / CSS Bar Chart */}
        <div className="h-56 sm:h-64 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-thin">
          {analytics.trendData.map((d, index) => {
            const heightPercent = Math.max(Math.round((d.clicks / maxTrendClicks) * 100), d.clicks > 0 ? 8 : 2);
            return (
              <div
                key={index}
                className="flex-1 min-w-[28px] sm:min-w-[36px] flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 shadow-lg whitespace-nowrap">
                  <div className="font-bold">{d.label}</div>
                  <div>{d.clicks} clicks</div>
                </div>

                {/* Stacked or Single Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[28px] rounded-t-md transition-all duration-300 group-hover:brightness-110 flex flex-col justify-end overflow-hidden shadow-xs"
                >
                  {d.clicks === 0 ? (
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-t-sm" />
                  ) : (
                    <div className="w-full h-full bg-blue-500 dark:bg-blue-600 flex flex-col justify-end">
                      {d.navDrawer > 0 && (
                        <div
                          style={{ height: `${(d.navDrawer / d.clicks) * 100}%` }}
                          className="bg-amber-500 w-full"
                        />
                      )}
                      {d.appDrawer > 0 && (
                        <div
                          style={{ height: `${(d.appDrawer / d.clicks) * 100}%` }}
                          className="bg-emerald-500 w-full"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* X-axis Label */}
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-mono truncate max-w-full text-center">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Placement Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Homepage Banner Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <FiHome className="mr-1.5" /> Homepage Banner
              </span>
              <span className="text-xs font-bold text-slate-400">Ratio 16:9</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {analytics.placementCounts[PLACEMENTS.HOMEPAGE].toLocaleString()}
              <span className="text-xs font-normal text-slate-500 ml-2">clicks</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                style={{
                  width: `${
                    analytics.periodTotal > 0
                      ? Math.round((analytics.placementCounts[PLACEMENTS.HOMEPAGE] / analytics.periodTotal) * 100)
                      : 0
                  }%`,
                }}
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Share of Period Clicks</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {analytics.periodTotal > 0
                ? Math.round((analytics.placementCounts[PLACEMENTS.HOMEPAGE] / analytics.periodTotal) * 100)
                : 0}
              %
            </span>
          </div>
        </div>

        {/* App Drawer Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <FiSmartphone className="mr-1.5" /> App Drawer Banner
              </span>
              <span className="text-xs font-bold text-slate-400">Ratio 16:9</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {analytics.placementCounts[PLACEMENTS.APP_DRAWER].toLocaleString()}
              <span className="text-xs font-normal text-slate-500 ml-2">clicks</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                style={{
                  width: `${
                    analytics.periodTotal > 0
                      ? Math.round((analytics.placementCounts[PLACEMENTS.APP_DRAWER] / analytics.periodTotal) * 100)
                      : 0
                  }%`,
                }}
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Share of Period Clicks</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {analytics.periodTotal > 0
                ? Math.round((analytics.placementCounts[PLACEMENTS.APP_DRAWER] / analytics.periodTotal) * 100)
                : 0}
              %
            </span>
          </div>
        </div>

        {/* Navigation Drawer Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <FiLayers className="mr-1.5" /> Navigation Drawer
              </span>
              <span className="text-xs font-bold text-slate-400">Ratio 16:9</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {analytics.placementCounts[PLACEMENTS.NAV_DRAWER].toLocaleString()}
              <span className="text-xs font-normal text-slate-500 ml-2">clicks</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                style={{
                  width: `${
                    analytics.periodTotal > 0
                      ? Math.round((analytics.placementCounts[PLACEMENTS.NAV_DRAWER] / analytics.periodTotal) * 100)
                      : 0
                  }%`,
                }}
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Share of Period Clicks</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {analytics.periodTotal > 0
                ? Math.round((analytics.placementCounts[PLACEMENTS.NAV_DRAWER] / analytics.periodTotal) * 100)
                : 0}
              %
            </span>
          </div>
        </div>
      </div>

      {/* Simulator Card & Test Click Tool */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <FiPlay className="mr-2 text-blue-500" />
              Ad Telemetry Tester & Click Simulator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simulate ad click events to verify that your Supabase telemetry pipeline and Android client hooks are logging accurately.
            </p>
          </div>
        </div>

        <form onSubmit={handleSimulateClick} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Placement Target
            </label>
            <select
              value={simPlacement}
              onChange={(e) => setSimPlacement(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value={PLACEMENTS.HOMEPAGE}>Homepage Banner</option>
              <option value={PLACEMENTS.APP_DRAWER}>App Drawer Banner</option>
              <option value={PLACEMENTS.NAV_DRAWER}>Navigation Drawer</option>
              <option value={PLACEMENTS.FULLSCREEN}>Startup Splash Ad</option>
            </select>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Target Destination URL
            </label>
            <input
              type="url"
              value={simTargetUrl}
              onChange={(e) => setSimTargetUrl(e.target.value)}
              placeholder="https://sub.edu.bd"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSimulating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                <>
                  <FiPlay className="mr-1.5" />
                  Record Test Click
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Raw Click Event Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Header & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <FiActivity className="mr-2 text-blue-500" />
              Real-Time Ad Click Event Stream
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Individual student and device click transactions logged in Supabase.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search click events..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Placement</th>
                <th className="py-3 px-4">Destination Link</th>
                <th className="py-3 px-4">Platform / Source</th>
                <th className="py-3 px-4">Click Event ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching click records from Supabase...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <FiActivity className="mx-auto text-3xl text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      No ad clicks recorded for this period
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Clicks made by students in the SUBMobile app or via the simulator above will appear here live.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const colors = getPlacementColor(log.details?.placement);
                  const logTime = new Date(log.timestamp || log.created_at || Date.now());
                  const formattedDate = logTime.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const formattedTime = logTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formattedTime}
                        </div>
                        <div className="text-[11px] text-slate-400">{formattedDate}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colors.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} mr-1.5`} />
                          {getPlacementLabel(log.details?.placement)}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-[220px]">
                        {log.details?.targetUrl ? (
                          <a
                            href={log.details.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline truncate max-w-full font-mono text-[11px]"
                          >
                            <span className="truncate">{log.details.targetUrl}</span>
                            <FiExternalLink className="ml-1 shrink-0 text-xs" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Direct Ad</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {log.details?.platform || "SUBMobile App"}
                        </div>
                        {log.details?.simulated && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            (Simulated)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {log.id}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {filteredLogs.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} events
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdsAnalytics;
