import { useState, useMemo } from "react";
import {
  FiTruck,
  FiNavigation,
  FiClock,
  FiUser,
  FiCheckCircle,
  FiPhone,
  FiMapPin,
  FiExternalLink,
  FiMaximize2,
  FiRefreshCw,
  FiX,
  FiEye,
  FiEyeOff,
  FiSearch,
  FiList,
} from "react-icons/fi";

export const StudentTransport = ({ buses = [], routes = [] }) => {
  // Boarding Point Search State
  const [selectedBoardingPoint, setSelectedBoardingPoint] = useState("All Boarding Points");
  const [boardingSearchQuery, setBoardingSearchQuery] = useState("");

  // Map Collapse and Fullscreen Modal States
  const [collapsedMapState, setCollapsedMapState] = useState({});
  const [activeModalBus, setActiveModalBus] = useState(null);
  const [activeRouteSheetBus, setActiveRouteSheetBus] = useState(null);
  const [refreshKeys, setRefreshKeys] = useState({});

  // 1. Extract all unique boarding points from routes matching Android TransportFragment
  const boardingPoints = useMemo(() => {
    const pointsSet = new Set();
    routes.forEach((r) => {
      const stops = r.pickupPoints || r.stops || [];
      if (Array.isArray(stops)) {
        stops.forEach((pt) => {
          if (pt && typeof pt === "string" && pt.trim()) {
            pointsSet.add(pt.trim());
          }
        });
      }
    });

    // Also include bus starting points if not in routes
    buses.forEach((b) => {
      if (b.startingPoint && typeof b.startingPoint === "string" && b.startingPoint.trim()) {
        pointsSet.add(b.startingPoint.trim());
      }
    });

    const sorted = Array.from(pointsSet).sort((a, b) => a.localeCompare(b));
    return ["All Boarding Points", ...sorted];
  }, [routes, buses]);

  // Filter boarding points dropdown options if user is typing
  const filteredBoardingOptions = useMemo(() => {
    if (!boardingSearchQuery.trim()) return boardingPoints;
    const q = boardingSearchQuery.toLowerCase();
    return boardingPoints.filter((pt) => pt.toLowerCase().includes(q));
  }, [boardingPoints, boardingSearchQuery]);

  // Toggle webview map per card
  const toggleMap = (busId) => {
    setCollapsedMapState((prev) => ({
      ...prev,
      [busId]: !prev[busId],
    }));
  };

  const handleRefreshIframe = (busId, e) => {
    e.stopPropagation();
    setRefreshKeys((prev) => ({
      ...prev,
      [busId]: (prev[busId] || 0) + 1,
    }));
  };

  // 2. Filter buses matching Android TransportFragment.filterBusesList()
  const displayedBuses = useMemo(() => {
    const activePoint =
      selectedBoardingPoint === "All Boarding Points"
        ? ""
        : selectedBoardingPoint.trim().toLowerCase();

    if (!activePoint) return buses;

    return buses.filter((b) => {
      // Find matching route for this bus
      const bRouteId = String(b.routeId || b.route_id || b.route || "").trim().toLowerCase();
      const matchedRoute = routes.find((r) => {
        const rId = String(r.id || "").trim().toLowerCase();
        const rName = String(r.name || r.title || "").trim().toLowerCase();
        const rCode = String(r.code || "").trim().toLowerCase();
        return (
          bRouteId &&
          (rId === bRouteId ||
            rName === bRouteId ||
            rCode === bRouteId ||
            bRouteId.includes(rName) ||
            rName.includes(bRouteId))
        );
      });

      const stops = matchedRoute
        ? matchedRoute.pickupPoints || matchedRoute.stops || []
        : [];

      // Check if startingPoint matches directly
      const startPt = String(b.startingPoint || "").trim().toLowerCase();
      if (startPt && startPt === activePoint) {
        return true;
      }

      if (!stops || stops.length === 0) {
        return false;
      }

      // Find index of selected boarding point in the route
      const selectedIndex = stops.findIndex(
        (s) => String(s || "").trim().toLowerCase() === activePoint
      );

      if (selectedIndex < 0) {
        return false;
      }

      // Find index where this bus actually starts
      let busStartIndex = 0;
      if (startPt) {
        const foundIndex = stops.findIndex(
          (s) => String(s || "").trim().toLowerCase() === startPt
        );
        if (foundIndex >= 0) {
          busStartIndex = foundIndex;
        }
      }

      // Bus services this stop only if it starts at or before the stop
      return selectedIndex >= busStartIndex;
    });
  }, [buses, routes, selectedBoardingPoint]);

  // Helper to get route object for a bus
  const getRouteForBus = (bus) => {
    if (!bus) return null;
    const bRouteId = String(bus.routeId || bus.route_id || bus.route || "").trim().toLowerCase();
    return routes.find((r) => {
      const rId = String(r.id || "").trim().toLowerCase();
      const rName = String(r.name || r.title || r.data?.name || "").trim().toLowerCase();
      const rCode = String(r.code || "").trim().toLowerCase();
      return (
        bRouteId &&
        (rId === bRouteId ||
          rName === bRouteId ||
          rCode === bRouteId ||
          (rName && bRouteId.includes(rName)) ||
          (rName && rName.includes(bRouteId)))
      );
    });
  };

  // Helper to resolve human-readable route name (never raw internal IDs like 'route-1786805861123')
  const resolveRouteName = (bus, matchedRoute) => {
    const routeObj = matchedRoute || getRouteForBus(bus);
    const rName = routeObj?.name || routeObj?.title || routeObj?.data?.name;
    if (rName && !String(rName).toLowerCase().startsWith("route-")) {
      return rName;
    }
    const candidate = bus?.routeName || bus?.route;
    if (
      candidate &&
      typeof candidate === "string" &&
      !candidate.toLowerCase().startsWith("route-") &&
      !candidate.match(/^[0-9a-f-]{20,}$/i)
    ) {
      return candidate;
    }
    if (bus?.startingPoint) {
      return `${bus.startingPoint} Route`;
    }
    if (routeObj?.code) {
      return `${routeObj.code} Route`;
    }
    return "Shuttle Route";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <FiTruck className="mr-2 text-blue-600 dark:text-blue-400" />
            <span>University Shuttle Buses & GPS Tracking</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time fleet tracker with searchable boarding points, route stoppage timings, driver contacts, and live GPS webviews.
          </p>
        </div>
      </div>

      {/* Searchable Boarding Points Filter matching Android TransportFragment */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiMapPin className="text-blue-600 dark:text-blue-400 text-sm shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Select Your Boarding Point:
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-white">{displayedBuses.length}</strong> available shuttle{displayedBuses.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Boarding Point Dropdown Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-8 relative">
            <select
              value={selectedBoardingPoint}
              onChange={(e) => setSelectedBoardingPoint(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {filteredBoardingOptions.map((point) => (
                <option key={point} value={point}>
                  {point}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={boardingSearchQuery}
              onChange={(e) => setBoardingSearchQuery(e.target.value)}
              placeholder="Search points..."
              className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {boardingSearchQuery && (
              <button
                onClick={() => setBoardingSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {selectedBoardingPoint !== "All Boarding Points" && (
          <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/50">
            <span>
              Filtering shuttles that stop at: <strong>{selectedBoardingPoint}</strong>
            </span>
            <button
              onClick={() => setSelectedBoardingPoint("All Boarding Points")}
              className="underline font-semibold hover:text-blue-700 cursor-pointer"
            >
              Show all buses
            </button>
          </div>
        )}
      </div>

      {/* Buses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayedBuses.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
            <FiTruck className="mx-auto text-3xl text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No shuttles found for this boarding point.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try selecting &quot;All Boarding Points&quot; or choosing another nearby stop.
            </p>
            {selectedBoardingPoint !== "All Boarding Points" && (
              <button
                onClick={() => setSelectedBoardingPoint("All Boarding Points")}
                className="mt-3 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold rounded-lg hover:bg-blue-100 transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          displayedBuses.map((bus, i) => {
            const busId = bus.id || `bus-${i}`;
            const isMapHidden = collapsedMapState[busId] === true;
            const refreshKey = refreshKeys[busId] || 0;
            const matchedRoute = getRouteForBus(bus);

            return (
              <div
                key={busId}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Bus Name & Plate Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60">
                      {bus.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {bus.number && (
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                          {bus.number}
                        </span>
                      )}
                      <button
                        onClick={() => setActiveRouteSheetBus({ bus, route: matchedRoute })}
                        className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="View route stops & schedule"
                      >
                        <FiList className="text-xs text-blue-500" />
                        <span>Stops</span>
                      </button>
                    </div>
                  </div>

                  {/* Route Name */}
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                    <FiNavigation className="mr-1.5 text-blue-600 dark:text-blue-400 text-sm shrink-0" />
                    <span>{resolveRouteName(bus, matchedRoute)}</span>
                  </h4>

                  {/* Timing Row matching item_bus.xml */}
                  {(bus.startTime || bus.leavingCampusTime) && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 mb-3 text-xs">
                      <div className="flex items-center text-slate-700 dark:text-slate-300">
                        <FiClock className="mr-1.5 text-blue-600 dark:text-blue-400 text-xs shrink-0" />
                        <span>
                          {bus.startTime ? `To Campus: ${bus.startTime}` : ""}
                          {bus.startTime && bus.leavingCampusTime ? " • " : ""}
                          {bus.leavingCampusTime ? `From Campus: ${bus.leavingCampusTime}` : ""}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sequential Stoppages Preview on mobile if collapsed or always */}
                  {(() => {
                    const stops = matchedRoute?.pickupPoints || matchedRoute?.stops || [];
                    const stopTimes = bus.pickupTimes || matchedRoute?.stoppageTimes || {};
                    if (!stops || stops.length === 0) return null;

                    let startIndex = 0;
                    const busStart = String(bus.startingPoint || "").trim().toLowerCase();
                    if (busStart) {
                      const idx = stops.findIndex((s) => String(s || "").trim().toLowerCase() === busStart);
                      if (idx >= 0) startIndex = idx;
                    }
                    const activeStops = stops.slice(startIndex);
                    if (activeStops.length === 0) return null;

                    return (
                      <div className="md:hidden mb-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white mr-1">Route:</strong>
                        {activeStops.map((stop, sIdx) => {
                          const cleanStop = String(stop || "").trim();
                          const time = stopTimes[cleanStop] || "";
                          const label = time ? `${cleanStop} (${time})` : cleanStop;
                          const isSelected =
                            selectedBoardingPoint !== "All Boarding Points" &&
                            cleanStop.toLowerCase() === selectedBoardingPoint.toLowerCase();
                          return (
                            <span key={sIdx}>
                              {sIdx > 0 && " • "}
                              <span className={isSelected ? "font-bold text-blue-600 dark:text-blue-400" : ""}>
                                {label}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Starting Point & Driver Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {bus.startingPoint && (
                      <p className="flex items-center text-slate-700 dark:text-slate-300 truncate">
                        <FiMapPin className="mr-1.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="truncate">Starts: <strong className="text-slate-900 dark:text-white">{bus.startingPoint}</strong></span>
                      </p>
                    )}
                    <p className="flex items-center text-slate-700 dark:text-slate-300 truncate">
                      <FiUser className="mr-1.5 text-slate-400 shrink-0" />
                      <span className="truncate">Driver: <strong className="text-slate-900 dark:text-white">{bus.driver || "Assigned Driver"}</strong></span>
                    </p>
                    {bus.capacity && (
                      <p className="flex items-center text-slate-600 dark:text-slate-400">
                        <FiCheckCircle className="mr-1.5 text-slate-400 shrink-0" />
                        <span>Capacity: {bus.capacity} Seats</span>
                      </p>
                    )}
                    {bus.isTemporaryOverride && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 w-fit">
                        SCHEDULE CHANGED
                      </span>
                    )}
                  </div>

                  {/* Mobile Live Map Trigger Button (opens in popup modal) */}
                  {bus.gpsUrl && (
                    <div className="md:hidden mb-4">
                      <button
                        onClick={() => setActiveModalBus(bus)}
                        className="w-full py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span>Open Live GPS Tracker Map</span>
                        <FiMaximize2 className="text-xs" />
                      </button>
                    </div>
                  )}

                  {/* EMBEDDED WEBVIEW FOR EACH BUS CARD - HIDDEN ON MOBILE (< md), SHOWN ON LAPTOP/DESKTOP (>= md) */}
                  <div className="hidden md:block mb-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="relative flex h-2 w-2">
                          {bus.gpsUrl ? (
                            <>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </>
                          ) : (
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400" />
                          )}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white text-[11px] tracking-wide">
                          {bus.gpsUrl ? "Live GPS Tracker Webview" : "GPS Tracker"}
                        </span>
                      </div>

                      {bus.gpsUrl && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => handleRefreshIframe(busId, e)}
                            className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            title="Reload live map frame"
                          >
                            <FiRefreshCw className="text-xs" />
                          </button>
                          <button
                            onClick={() => setActiveModalBus(bus)}
                            className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            title="Expand to Fullscreen View"
                          >
                            <FiMaximize2 className="text-xs" />
                          </button>
                          <button
                            onClick={() => toggleMap(busId)}
                            className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            title={isMapHidden ? "Show Webview" : "Hide Webview"}
                          >
                            {isMapHidden ? <FiEye className="text-xs" /> : <FiEyeOff className="text-xs" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {bus.gpsUrl ? (
                      !isMapHidden ? (
                        <div className="relative w-full h-64 bg-slate-100 dark:bg-slate-950">
                          <iframe
                            key={refreshKey}
                            src={bus.gpsUrl}
                            title={`GPS Tracker - ${bus.name}`}
                            className="w-full h-full border-0"
                            allow="geolocation; fullscreen"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => toggleMap(busId)}
                          className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 cursor-pointer bg-slate-100/50 dark:bg-slate-950/40"
                        >
                          Map hidden. Click to show live GPS webview.
                        </div>
                      )
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-950/40">
                        <FiMapPin className="mx-auto text-xl text-slate-400 mb-1" />
                        <p>No live GPS tracker link configured for this shuttle.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  {bus.driverPhone && (
                    <a
                      href={`tel:${bus.driverPhone}`}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title={`Call driver ${bus.driver}`}
                    >
                      <FiPhone className="mr-1.5 text-blue-600 dark:text-blue-400" />
                      <span>Call Driver</span>
                    </a>
                  )}

                  <button
                    onClick={() => setActiveRouteSheetBus({ bus, route: matchedRoute })}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <FiList className="mr-1.5 text-xs text-blue-500" />
                    <span>Route & Stops</span>
                  </button>

                  {bus.gpsUrl && (
                    <a
                      href={bus.gpsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/30 flex items-center justify-center cursor-pointer shrink-0"
                      title="Open GPS tracker in browser"
                    >
                      <FiExternalLink className="text-xs" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FULLSCREEN GPS TRACKER MODAL */}
      {activeModalBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center">
                  <FiNavigation className="mr-2 text-blue-600 dark:text-blue-400" />
                  <span>{activeModalBus.name} — Live Fleet Tracking</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Route: {activeModalBus.route} • Driver: {activeModalBus.driver}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeModalBus.gpsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-xs font-semibold flex items-center gap-1.5"
                >
                  <FiExternalLink />
                  <span className="hidden sm:inline">Open URL</span>
                </a>
                <button
                  onClick={() => setActiveModalBus(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <FiX className="text-base" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950">
              <iframe
                src={activeModalBus.gpsUrl}
                title={`Fullscreen GPS - ${activeModalBus.name}`}
                className="w-full h-full border-0"
                allow="geolocation; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </div>
        </div>
      )}

      {/* ROUTE STOPS & SCHEDULE MODAL SHEET matching Android LayoutBusDetailsBottomSheet */}
      {activeRouteSheetBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
                  <FiTruck className="text-lg" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {activeRouteSheetBus.bus.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Plate: {activeRouteSheetBus.bus.number || "Official Fleet"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveRouteSheetBus(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FiX className="text-base" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Route Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 mb-1">
                  <FiNavigation className="text-blue-500" />
                  <span>
                    {resolveRouteName(activeRouteSheetBus.bus, activeRouteSheetBus.route)}
                  </span>
                  {activeRouteSheetBus.route?.code && (
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono">
                      {activeRouteSheetBus.route.code}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 mt-2">
                  <p>Starting Point: <strong>{activeRouteSheetBus.bus.startingPoint || "Campus"}</strong></p>
                  {activeRouteSheetBus.bus.startTime && (
                    <p>Departure Time (To Campus): <strong>{activeRouteSheetBus.bus.startTime}</strong></p>
                  )}
                  {activeRouteSheetBus.bus.leavingCampusTime && (
                    <p>Departure Time (From Campus): <strong>{activeRouteSheetBus.bus.leavingCampusTime}</strong></p>
                  )}
                </div>
              </div>

              {/* Driver and Assistant Contacts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Driver
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {activeRouteSheetBus.bus.driver || "Assigned Driver"}
                  </p>
                  {activeRouteSheetBus.bus.driverPhone && (
                    <a
                      href={`tel:${activeRouteSheetBus.bus.driverPhone}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <FiPhone className="text-[10px]" />
                      <span>{activeRouteSheetBus.bus.driverPhone}</span>
                    </a>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Bus Capacity
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {activeRouteSheetBus.bus.capacity || 50} Seats
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Air-conditioned</p>
                </div>
              </div>

              {/* Sequential Stoppages List matching Android LayoutBusDetailsBottomSheet */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-2.5 flex items-center gap-1.5">
                  <FiList className="text-blue-500" />
                  <span>Sequential Stoppages & Timings</span>
                </h4>

                {(() => {
                  const r = activeRouteSheetBus.route;
                  const stops = r?.pickupPoints || r?.stops || [];
                  const stopTimes =
                    activeRouteSheetBus.bus.pickupTimes ||
                    r?.stoppageTimes ||
                    {};

                  if (!stops || stops.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        No intermediate stoppage list configured for this route.
                      </p>
                    );
                  }

                  // Determine start index based on bus's starting point
                  let startIndex = 0;
                  const busStart = String(activeRouteSheetBus.bus.startingPoint || "").trim().toLowerCase();
                  if (busStart) {
                    const idx = stops.findIndex(
                      (s) => String(s || "").trim().toLowerCase() === busStart
                    );
                    if (idx >= 0) startIndex = idx;
                  }

                  const activeStops = stops.slice(startIndex);

                  return (
                    <div className="space-y-1.5 pl-2 border-l-2 border-blue-500/30 dark:border-blue-500/20 ml-2">
                      {activeStops.map((stop, idx) => {
                        const cleanStop = String(stop || "").trim();
                        const time = stopTimes[cleanStop] || "";
                        const isSelected =
                          selectedBoardingPoint !== "All Boarding Points" &&
                          cleanStop.toLowerCase() === selectedBoardingPoint.toLowerCase();
                        const isCampus = cleanStop.toLowerCase().includes("campus");

                        return (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? "bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 font-bold border border-blue-300 dark:border-blue-800"
                                : isCampus
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-blue-600" : isCampus ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                              <span>{cleanStop}</span>
                              {isSelected && (
                                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-semibold">
                                  Your Stop
                                </span>
                              )}
                            </div>

                            {time && (
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {time}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setActiveRouteSheetBus(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTransport;
