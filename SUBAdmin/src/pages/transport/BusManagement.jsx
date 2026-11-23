import { isSuperAdmin, isAdmin } from "../../utils/permissionUtils";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiPhone,
  FiUsers,
  FiMap,
  FiMapPin,
  FiLink,
  FiExternalLink,
} from "react-icons/fi";
import {
  loadEmailConfig,
  saveEmailConfig,
  sendGpsReminderEmail,
  isGpsReminderDue,
  getGpsReminderStatus,
  checkAndSendPerBusGpsReminders,
} from "../../utils/emailService";
import {
  fetchBusesAndRoutes,
  createBus,
  updateBus,
  deleteBus,
  resetBusOverrides,
  setSearchQuery,
  clearTransportStatus,
} from "../../redux/slices/transportSlice";
import Dialog from "../../components/common/Dialog";
import Badge from "../../components/common/Badge";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";


// Form validation schema
const schema = yup.object().shape({
  name: yup
    .string()
    .min(3, "Bus Name must be at least 3 characters")
    .required("Bus Name is required"),

  number: yup
    .string()
    .matches(/^DM-[A-Z]{2}-\d{2}-\d{4}$/, "Must match DM-SA-11-0277")
    .required("Bus Number is required"),

  routeId: yup.string().required("Assigned Route is required"),

  driver: yup
    .string()
    .min(3, "Driver Name must be at least 3 characters")
    .required("Driver Name is required"),

  driverPhone: yup
    .string()
    .matches(/^01\d{9}$/, "Use an 11-digit Bangladeshi phone number (e.g. 01811223344)")
    .required("Driver Phone is required"),

  capacity: yup
    .number()
    .integer()
    .positive()
    .min(10, "Minimum capacity is 10")
    .max(100, "Maximum capacity is 100")
    .required("Capacity is required"),

  startingPoint: yup.string().required("Starting Point is required"),
  startTime: yup.string().required("Starting Time is required"),
  leavingCampusTime: yup.string().required("Campus Leaving Time is required"),
  gpsUrl: yup
    .string()
    .transform((value) => (value === "" ? null : value))
    .test("is-url", "Must be a valid URL", (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch (e) {
        return false;
      }
    })
    .nullable(),
});

const convertTo12Hour = (timeStr) => {
  if (!timeStr) return "";
  if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
    return timeStr.trim();
  }
  const [hourStr, minuteStr] = timeStr.split(":");
  let hour = parseInt(hourStr, 10);
  const minutes = minuteStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${minutes} ${ampm}`;
};

const convertTo24Hour = (time12h) => {
  if (!time12h) return "";
  if (time12h.includes(":") && !time12h.toLowerCase().includes("am") && !time12h.toLowerCase().includes("pm")) {
    return time12h.trim();
  }
  const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12h;
  let [_, hours, minutes, ampm] = match;
  hours = parseInt(hours, 10);
  if (ampm.toUpperCase() === "PM" && hours < 12) {
    hours += 12;
  } else if (ampm.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

export const BusManagement = () => {
  const dispatch = useDispatch();
  const { filteredBuses, routes, searchQuery, loading, success, error } = useSelector(
    (state) => state.transport,
  );
  const { user } = useSelector((state) => state.auth);

  const isSuperAdminUser = isSuperAdmin(user);
  const isAdminUser = isAdmin(user);
  const adminDept = user?.department; // E.g. 'CSE'

  const hasAccessToBus = (bus) => {
    return isAdminUser;
  };

  // States
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeBus, setActiveBus] = useState(null);
  const [pickupTimes, setPickupTimes] = useState({});

  // Bulk Import States
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Quick GPS Update Modal States
  const [quickGpsBus, setQuickGpsBus] = useState(null);
  const [quickGpsUrl, setQuickGpsUrl] = useState("");
  const [savingQuickGps, setSavingQuickGps] = useState(false);

  const openQuickGpsModal = (bus) => {
    setQuickGpsBus(bus);
    setQuickGpsUrl(bus.gpsTrackingUrl || bus.tracking_link || "");
  };

  const handleSaveQuickGps = async () => {
    if (!quickGpsBus) return;
    setSavingQuickGps(true);
    try {
      const nowIso = new Date().toISOString();
      const updatedFields = {
        gpsTrackingUrl: quickGpsUrl.trim(),
        tracking_link: quickGpsUrl.trim(),
        gpsLastUpdated: nowIso,
        gpsUpdatedBy: user?.name || user?.email || "Admin",
      };

      await dispatch(
        updateBus({
          id: quickGpsBus.id,
          updatedData: updatedFields,
        })
      ).unwrap();

      toast.success(`Live GPS link for ${quickGpsBus.name} updated successfully!`);
      setQuickGpsBus(null);
    } catch (err) {
      toast.error("Failed to update GPS Link: " + (err.message || err));
    } finally {
      setSavingQuickGps(false);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const watchedRouteId = watch("routeId");
  const watchedStartingPoint = watch("startingPoint");

  // Compute stoppages for the currently watched route
  const selectedRouteObj = routes.find((r) => r.id === watchedRouteId);
  const routeStoppages = selectedRouteObj?.pickupPoints ? [...selectedRouteObj.pickupPoints] : [];
  if (watchedStartingPoint && !routeStoppages.includes(watchedStartingPoint)) {
    routeStoppages.push(watchedStartingPoint);
  }

  // Set default starting point based on the selected route's first pickup point
  useEffect(() => {
    if (watchedRouteId && !editMode) {
      const selectedRoute = routes.find((r) => r.id === watchedRouteId);
      if (selectedRoute) {
        const defaultStart = selectedRoute.pickupPoints?.[0] || "";
        setValue("startingPoint", defaultStart);
      }
    }
  }, [watchedRouteId, routes, setValue, editMode]);

  useEffect(() => {
    dispatch(fetchBusesAndRoutes({ forceRefresh: true }));
  }, [dispatch]);

  // Sync Thunk Success/Error
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearTransportStatus());
    }
    if (success) {
      toast.success(editMode ? "Bus details updated successfully!" : "Bus added to system!");
      setModalOpen(false);
      reset();
      dispatch(clearTransportStatus());
    }
  }, [success, error, editMode, dispatch, reset]);

  const handleSearchChange = (e) => {
    dispatch(setSearchQuery(e.target.value));
    setCurrentPage(1);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBuses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBuses.length / itemsPerPage);

  const onSubmit = (data) => {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    const existingGpsUrl = (activeBus?.gpsUrl || "").trim();
    const newGpsUrl = (data.gpsUrl || "").trim();
    const gpsUrlChanged = newGpsUrl !== existingGpsUrl;

    let gpsReminderFields = {};
    if (newGpsUrl && (gpsUrlChanged || !editMode)) {
      const nowIso = new Date().toISOString();
      const nextReminderDate = new Date();
      nextReminderDate.setDate(nextReminderDate.getDate() + 20);

      gpsReminderFields = {
        lastGpsUrlUpdatedAt: nowIso,
        gpsUrlUpdatedAt: nowIso,
        lastGpsUrlUpdatedBy: user?.name || user?.email || "Admin",
        nextGpsReminderAt: nextReminderDate.toISOString(),
        lastGpsReminderSentAt: null,
        gpsReminderSent: false,
      };
    }

    // convert times from pickupTimes to 12h
    const convertedTimes = {};
    for (const stop of Object.keys(pickupTimes)) {
       if (pickupTimes[stop]) {
         convertedTimes[stop] = convertTo12Hour(pickupTimes[stop]);
       }
    }

    const busPayload = {
      ...data,
      pickupTimes: convertedTimes,
      startTime: convertTo12Hour(data.startTime),
      leavingCampusTime: convertTo12Hour(data.leavingCampusTime),
      isTemporaryOverride: !!data.isTemporaryOverride,
      overrideDate: data.isTemporaryOverride ? todayStr : null,
      ...gpsReminderFields,
    };
    if (editMode) {
      dispatch(updateBus({ id: activeBus.id, updatedData: busPayload }));
    } else {
      dispatch(createBus(busPayload));
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setPickupTimes({});
    reset({
      name: "",
      number: "",
      routeId: routes[0]?.id || "",
      driver: "",
      driverPhone: "",
      capacity: 50,
      startingPoint: "",
      startTime: "07:30",
      leavingCampusTime: "13:05",
      isTemporaryOverride: false,
      gpsUrl: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (bus) => {
    setEditMode(true);
    setActiveBus(bus);
    const convertedTimes = {};
    if (bus.pickupTimes) {
      for (const stop of Object.keys(bus.pickupTimes)) {
         convertedTimes[stop] = convertTo24Hour(bus.pickupTimes[stop] || "");
      }
    }
    setPickupTimes(convertedTimes);
    reset({
      name: bus.name,
      number: bus.number,
      routeId: bus.routeId,
      driver: bus.driver,
      driverPhone: bus.driverPhone,
      capacity: bus.capacity,
      startingPoint: bus.startingPoint || "",
      startTime: convertTo24Hour(bus.startTime || ""),
      leavingCampusTime: convertTo24Hour(bus.leavingCampusTime || ""),
      isTemporaryOverride: !!bus.isTemporaryOverride,
      gpsUrl: bus.gpsUrl || "",
    });
    setModalOpen(true);
  };

  const openDeleteDialog = (bus) => {
    setActiveBus(bus);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (activeBus) {
      await dispatch(deleteBus(activeBus.id));
      toast.success("Bus deleted successfully!");
      setDeleteOpen(false);
      setActiveBus(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBulkJson(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleBulkImport = async () => {
    setBulkLoading(true);
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) {
        toast.error("JSON must be an array of bus objects.");
        setBulkLoading(false);
        return;
      }
      let successCount = 0;
      let errorCount = 0;
      for (const item of parsed) {
        const isValid =
          item.name &&
          item.number &&
          item.routeId &&
          item.driver &&
          item.driverPhone &&
          item.capacity;
        if (isValid) {
          await dispatch(
            createBus({
              ...item,
              id: item.id || `bus-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            }),
          );
          successCount++;
        } else {
          errorCount++;
        }
      }
      toast.success(`Successfully imported ${successCount} shuttle buses!`);
      if (errorCount > 0) {
        toast.warn(`${errorCount} buses skipped due to validation errors.`);
      }
      setBulkOpen(false);
      setBulkJson("");
    } catch (e) {
      toast.error("Invalid JSON format: " + e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Get Route Name helper
  const getRouteName = (routeId) => {
    if (!routeId) return "Unassigned";
    const cleanId = String(routeId).trim().toLowerCase();
    const route = routes.find((r) => {
      const rId = String(r.id || "").trim().toLowerCase();
      const rName = String(r.name || r.title || r.data?.name || "").trim().toLowerCase();
      return rId === cleanId || rName === cleanId;
    });
    const name = route?.name || route?.title || route?.data?.name;
    if (name && !name.toLowerCase().startsWith("route-")) {
      return route.code ? `${name} (${route.code})` : name;
    }
    return "Unassigned";
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bus Registry
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Manage shuttle buses, assign routes, monitor seating capacity, and driver profiles.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          {isSuperAdminUser && (
            <button
              onClick={() => setBulkOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-800"
            >
              <span>Bulk Import (JSON)</span>
            </button>
          )}
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer btn-primary-gradient"
          >
            <FiPlus className="text-sm" />
            <span>Add Shuttle Bus</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Overrides Control Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-xs text-slate-400 dark:text-slate-500">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" />
          <input
            type="text"
            placeholder="Search by bus name, driver name, number plate..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30"
          />
        </div>
        <button
          onClick={() => {
            dispatch(resetBusOverrides());
            toast.success(
              "Next day simulated! All temporary daily bus schedule overrides have been reverted to default.",
            );
          }}
          className="w-full md:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <span>Simulate Next Day (Revert Overrides)</span>
        </button>
      </div>

      {/* Bus Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentItems.length > 0 ? (
          currentItems.map((bus) => (
            <div
              key={bus.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              {/* Actions panels */}
              <div className="absolute top-4 right-4 flex space-x-1.5">
                {isAdminUser && (
                  <button
                    onClick={() => openEditModal(bus)}
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                    title="Edit Bus"
                  >
                    <FiEdit2 size={13} />
                  </button>
                )}
                {isAdminUser && (
                  <button
                    onClick={() => openDeleteDialog(bus)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                    title="Delete Bus"
                  >
                    <FiTrash2 size={13} />
                  </button>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                    {bus.number}
                  </span>
                  {bus.isTemporaryOverride && (
                    <Badge variant="warning" className="text-[8px] px-1 py-0.5 animate-pulse-slow">
                      Today Only
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1.5">
                  {bus.name}
                </h3>

                {/* Info block */}
                <div className="grid grid-cols-2 gap-3 mt-4 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  <div className="flex items-center">
                    <FiMap className="mr-1.5 text-blue-500 shrink-0" />
                    <span className="truncate">{getRouteName(bus.routeId)}</span>
                  </div>
                  <div className="flex items-center">
                    <FiUsers className="mr-1.5 text-indigo-500 shrink-0" />
                    <span>{bus.capacity} Seats capacity</span>
                  </div>
                </div>

                {/* Stoppage Sequence */}
                {bus.pickupTimes && Object.keys(bus.pickupTimes).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Shuttle Pickup Sequence</h4>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {routes.find(r => r.id === bus.routeId)?.pickupPoints
                        ?.slice(routes.find(r => r.id === bus.routeId)?.pickupPoints.indexOf(bus.startingPoint))
                        ?.map((point, idx, arr) => {
                          const time = bus.pickupTimes?.[point];
                          return (
                            <div key={idx} className="flex items-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 border border-slate-200/40 dark:border-slate-800 px-2 py-0.5 rounded-md">
                              <FiMapPin size={9} className="mr-1 text-slate-400 shrink-0" />
                              <span>{point}{time ? ` (${time})` : ''}</span>
                              {idx < arr.length - 1 && (
                                <span className="text-slate-300 dark:text-slate-700 ml-1.5">→</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Starting details & Times */}
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 bg-slate-50/50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40 text-[10px] text-slate-650 dark:text-slate-400 leading-snug">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider text-[8px] mb-0.5">
                      Starting Point
                    </span>
                    <strong className="text-slate-700 dark:text-slate-350 font-extrabold">
                      {bus.startingPoint || "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider text-[8px] mb-0.5">
                      Starting Time
                    </span>
                    <strong className="text-slate-700 dark:text-slate-350 font-extrabold">
                      {bus.startTime || "N/A"}
                    </strong>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/40 dark:border-slate-800 pt-1.5 mt-1 flex justify-between items-center">
                    <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[8px]">
                      Leaving Campus
                    </span>
                    <strong className="text-slate-700 dark:text-slate-350 font-extrabold">
                      {bus.leavingCampusTime || "N/A"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Overrides defaults metadata */}
              {bus.isTemporaryOverride && (
                <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl text-[9px] mt-4 text-slate-400 dark:text-slate-500 leading-snug">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5 uppercase tracking-wider text-[8px]">
                    Permanent Default Schedule:
                  </span>
                  <div>
                    Driver: {bus.defaultDriver} ({bus.defaultDriverPhone})
                  </div>
                  <div>Route: {getRouteName(bus.defaultRouteId)}</div>
                </div>
              )}

              {/* Driver block */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 mt-4 pt-3 flex justify-between items-center text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                <span className="text-slate-700 dark:text-slate-350">
                  Driver: <strong className="font-bold">{bus.driver}</strong>
                </span>
                <a
                  href={`tel:${bus.driverPhone}`}
                  className="flex items-center text-blue-500 hover:text-blue-600"
                >
                  <FiPhone className="mr-1" />
                  {bus.driverPhone}
                </a>
              </div>

              {/* Per-Bus GPS Reminder Metadata Block */}
              {(() => {
                const reminder = getGpsReminderStatus(bus);
                return (
                  <div className="border-t border-slate-100 dark:border-slate-800/80 mt-3 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          GPS Tracking URL
                        </span>
                        {isAdminUser && (
                          <button
                            onClick={() => openQuickGpsModal(bus)}
                            className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 hover:text-blue-700 transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer flex items-center space-x-1"
                            title="Update GPS tracking URL"
                          >
                            <FiLink size={10} />
                            <span>Update GPS Link</span>
                          </button>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${reminder.badgeBg}`}>
                        {reminder.statusText}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[10px] bg-slate-50/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-[8px] font-bold block uppercase tracking-wider">
                          Last Updated
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {reminder.lastUpdatedStr}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-[8px] font-bold block uppercase tracking-wider">
                          Updated By
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                          {reminder.updatedBy}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-[8px] font-bold block uppercase tracking-wider">
                          Next Reminder
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {reminder.nextReminderStr}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-[8px] font-bold block uppercase tracking-wider">
                          Status
                        </span>
                        <span className={`font-semibold ${reminder.isOverdue ? "text-red-500" : reminder.isDue ? "text-amber-500 font-bold" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {reminder.isOverdue
                            ? `${reminder.overdueDays} days overdue`
                            : reminder.isDue
                            ? "Update Due Today"
                            : `${reminder.daysRemaining} days remaining`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))
        ) : (
          <div className="col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 text-center text-slate-400 dark:text-slate-500 font-semibold">
            No shuttle buses registered in database matching queries.
          </div>
        )}
      </div>

      {/* Pagination panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            {filteredBuses.length > 0
              ? `Showing ${indexOfFirstItem + 1}–${Math.min(indexOfLastItem, filteredBuses.length)} of ${filteredBuses.length} Buses`
              : "No buses found"}
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={30}>30 / page</option>
          </select>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <FiChevronLeft className="text-sm" />
            </button>
            <span className="text-xs font-bold text-slate-650 dark:text-slate-400 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <FiChevronRight className="text-sm" />
            </button>
          </div>
        )}
      </div>


      {/* Add / Edit Bus Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMode ? "Edit Shuttle Bus Record" : "Register New Shuttle Bus"}
      >
        <form onSubmit={handleSubmit(onSubmit, (err) => {
          console.error("Validation Errors:", err);
          toast.error("Form validation failed: " + Object.keys(err).map(key => `${key}: ${err[key].message}`).join(", "));
        })} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bus Name */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Bus Name
              </label>
              <input
                type="text"
                placeholder="Campus Shuttle Red"
                {...register("name")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.name ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.name && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.name.message}
                </span>
              )}
            </div>

            {/* Bus Plate Number */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Bus Plate Number
              </label>
              <input
                type="text"
                placeholder="e.g. DM-SA-11-0277"
                {...register("number")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.number ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.number && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.number.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Route */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Assigned Route
              </label>
              <select
                {...register("routeId")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300"
              >
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name} ({route.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Capacity */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Seating Capacity
              </label>
              <input
                type="number"
                placeholder="50"
                {...register("capacity")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.capacity ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.capacity && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.capacity.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col border-t border-slate-100 dark:border-slate-850/50 pt-3 mt-2">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Starting Point (Stoppage)
            </label>
            <select
              {...register("startingPoint")}
              className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.startingPoint ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs cursor-pointer text-slate-700 dark:text-slate-350`}
            >
              {routeStoppages.length > 0 ? (
                routeStoppages.map((stop) => (
                  <option key={stop} value={stop}>
                    {stop}
                  </option>
                ))
              ) : (
                <option value="">No stops defined for this route</option>
              )}
            </select>
            {errors.startingPoint && (
              <span className="text-[9px] text-red-500 mt-1 font-semibold">
                {errors.startingPoint.message}
              </span>
            )}
          </div>

          {/* Dynamic Stoppage Times */}
          {watchedStartingPoint && routeStoppages.includes(watchedStartingPoint) && (
            <div className="flex flex-col border-t border-slate-100 dark:border-slate-850/50 pt-3 mt-2">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                Stoppage Times (From {watchedStartingPoint})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {routeStoppages.slice(routeStoppages.indexOf(watchedStartingPoint)).map((stop) => (
                  <div key={stop} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200/40 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mr-2 flex-1">{stop}</span>
                    <input
                      type="time"
                      value={pickupTimes[stop] || ""}
                      onChange={(e) => setPickupTimes({ ...pickupTimes, [stop]: e.target.value })}
                      className="bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-blue-500/30 px-1 py-0.5 text-[10px] w-28 text-slate-500 outline-hidden transition-colors cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Starting Time
              </label>
              <input
                type="time"
                {...register("startTime")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.startTime ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.startTime && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.startTime.message}
                </span>
              )}
            </div>

            {/* Leaving Campus Time input */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Campus Leaving Time
              </label>
              <input
                type="time"
                {...register("leavingCampusTime")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.leavingCampusTime ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.leavingCampusTime && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.leavingCampusTime.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Driver Name */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Driver Name
              </label>
              <input
                type="text"
                placeholder="Abdur Rahman"
                {...register("driver")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.driver ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.driver && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.driver.message}
                </span>
              )}
            </div>

            {/* Driver Phone */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Driver Phone
              </label>
              <input
                type="text"
                placeholder="01811223344"
                {...register("driverPhone")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.driverPhone ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.driverPhone && (
                <span className="text-[9px] text-red-500 mt-1 font-semibold">
                  {errors.driverPhone.message}
                </span>
              )}
            </div>
          </div>

          {/* GPS Tracker Link */}
          <div className="flex flex-col border-t border-slate-100 dark:border-slate-850/50 pt-3 mt-2">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Real-Time GPS Tracking URL (Manually Configured)
            </label>
            <input
              type="text"
              placeholder="e.g. https://bgd.tracksolidpro.com/api/share?ver=2&method=trackDevice_abr&deviceinfo=...&deviceName=...&deviceIMEI=..."
              {...register("gpsUrl")}
              className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.gpsUrl ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
            />
            {errors.gpsUrl && (
              <span className="text-[9px] text-red-500 mt-1 font-semibold">
                {errors.gpsUrl.message}
              </span>
            )}
          </div>

          {editMode && (
            <div className="flex items-start space-x-2 bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 mt-4">
              <input
                type="checkbox"
                id="isTemporaryOverride"
                {...register("isTemporaryOverride")}
                className="rounded border-slate-350 dark:border-slate-800 text-blue-655 focus:ring-blue-500 w-4 h-4 cursor-pointer mt-0.5"
              />
              <div className="flex flex-col">
                <label
                  htmlFor="isTemporaryOverride"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Apply as Today-Only Temporary Override
                </label>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                  Check this option to save edits as today-only deviations (auto-reverts at midnight). Uncheck this option to permanently overwrite the default shuttle schedule.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 justify-end mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm"
            >
              {loading ? "Processing..." : editMode ? "Update" : "Register"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        itemName={activeBus ? activeBus.name : ""}
        loading={loading}
      />

      {/* Bulk Import Dialog */}
      <Dialog
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Import Shuttle Buses"
      >
        <div className="space-y-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Select JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100/50 dark:hover:file:bg-blue-900/50 cursor-pointer"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Pasted JSON Data
            </label>
            <textarea
              rows={8}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={`[\n  {\n    "name": "Bus A",\n    "number": "Dhaka Metro-Chha-11-9999",\n    "routeId": "route-uid-1",\n    "driver": "Aslam Ali",\n    "driverPhone": "01712345678",\n    "capacity": 40,\n    "startingPoint": "Uttara Sector-7",\n    "startTime": "07:30 AM",\n    "leavingCampusTime": "05:00 PM"\n  }\n]`}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30"
            />
          </div>

          <div className="flex items-center space-x-3 justify-end border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-secondary-gradient"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkLoading || !bulkJson.trim()}
              onClick={handleBulkImport}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient"
            >
              {bulkLoading ? "Importing..." : "Import Data"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Quick GPS Tracking Link Update Dialog */}
      <Dialog
        isOpen={Boolean(quickGpsBus)}
        onClose={() => setQuickGpsBus(null)}
        title="Quick Update Live GPS Link"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {quickGpsBus?.name}
            </h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Plate: {quickGpsBus?.number} • Route: {getRouteName(quickGpsBus?.routeId)}
            </p>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Live GPS Tracking URL
            </label>
            <input
              type="url"
              value={quickGpsUrl}
              onChange={(e) => setQuickGpsUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=... or https://..."
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30"
              autoFocus
            />
            <span className="text-[10px] text-slate-400 mt-1">
              Updating this URL immediately resets the 15-day overdue reminder timer for this bus.
            </span>
          </div>

          {quickGpsUrl && quickGpsUrl.startsWith("http") && (
            <div className="flex justify-end">
              <a
                href={quickGpsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-500 hover:text-blue-600 font-semibold flex items-center space-x-1"
              >
                <span>Test GPS Link</span>
                <FiExternalLink size={11} />
              </a>
            </div>
          )}

          <div className="flex items-center space-x-3 justify-end border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setQuickGpsBus(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-secondary-gradient"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingQuickGps}
              onClick={handleSaveQuickGps}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient"
            >
              {savingQuickGps ? "Saving..." : "Save GPS Link"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default BusManagement;
