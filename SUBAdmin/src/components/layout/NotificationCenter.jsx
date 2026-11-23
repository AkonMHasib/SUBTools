// Notification Center Dropdown Component
import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiCalendar,
  FiX,
  FiCheck,
  FiChevronRight,
  FiActivity,
} from "react-icons/fi";
import { fetchBusesAndRoutes } from "../../redux/slices/transportSlice";
import { isGpsReminderDue, getGpsReminderStatus } from "../../utils/emailService";

export const NotificationCenter = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'overdue' | 'alerts'
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("subadmin_read_notifications") || "[]");
    } catch {
      return [];
    }
  });

  const buses = useSelector((state) => state.transport?.buses || []);
  const routines = useSelector((state) => state.routines?.list || []);
  const userError = useSelector((state) => state.users?.error);
  const routineError = useSelector((state) => state.routines?.error);
  const transportError = useSelector((state) => state.transport?.error);

  useEffect(() => {
    if (buses.length === 0) {
      dispatch(fetchBusesAndRoutes());
    }
  }, [dispatch, buses.length]);

  // Generate dynamic system notifications
  const notifications = [];

  // 1. Check each individual bus for overdue GPS or unconfigured tracker link
  buses.forEach((bus) => {
    const reminder = getGpsReminderStatus(bus, 20);
    const busName = bus.name || bus.number || "Unnamed Shuttle Bus";
    const busPlate = bus.number ? ` (${bus.number})` : "";
    const busKey = bus.id || bus.number || bus.name;

    if (!bus.gpsUrl || !bus.gpsUrl.trim()) {
      notifications.push({
        id: `bus-nogps-${busKey}`,
        type: "overdue",
        title: `No GPS URL: ${busName}${busPlate}`,
        message: `Bus "${busName}" does not have a live GPS tracking URL configured. Students cannot track this bus live.`,
        time: "Setup required",
        icon: FiTruck,
        color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40",
        path: "/admin/transport",
        severity: "warning",
      });
    } else if (reminder.isOverdue) {
      notifications.push({
        id: `bus-overdue-${busKey}`,
        type: "overdue",
        title: `GPS Overdue: ${busName}${busPlate}`,
        message: `GPS link for "${busName}" is ${reminder.overdueDays} day(s) overdue for verification. Last verified: ${reminder.lastUpdatedStr}.`,
        time: `${reminder.overdueDays}d overdue`,
        icon: FiTruck,
        color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40",
        path: "/admin/transport",
        severity: "error",
      });
    } else if (reminder.isDue) {
      notifications.push({
        id: `bus-due-${busKey}`,
        type: "overdue",
        title: `GPS Due Today: ${busName}${busPlate}`,
        message: `GPS link for "${busName}" is due for scheduled 20-day review today.`,
        time: "Due today",
        icon: FiTruck,
        color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40",
        path: "/admin/transport",
        severity: "warning",
      });
    }
  });

  // 2. Check 20-day GPS Email Reminder Overdue
  const lastGpsSent = localStorage.getItem("subadmin_last_gps_sent");
  if (isGpsReminderDue(lastGpsSent)) {
    notifications.push({
      id: "gps-reminder-due",
      type: "overdue",
      title: "20-Day GPS Tracker Audit Due",
      message: "The 20-day transport fleet GPS URL audit is overdue. Review bus links now.",
      time: "Scheduled audit",
      icon: FiClock,
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40",
      path: "/admin/transport",
      severity: "error",
    });
  }

  // 3. API Error notifications
  const apiErrors = [userError, routineError, transportError].filter(Boolean);
  if (apiErrors.length > 0) {
    notifications.push({
      id: "api-error-log",
      type: "alerts",
      title: "Firebase API Error Detected",
      message: `System logged network failure: ${apiErrors[0]}`,
      time: "Recent log",
      icon: FiAlertCircle,
      color: "text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/40",
      path: "/admin/dashboard",
      severity: "error",
    });
  }

  // 4. Temporary Reschedules active
  const tempRoutines = routines.filter((r) => r.isTemporary);
  if (tempRoutines.length > 0) {
    notifications.push({
      id: "temp-reschedule-notice",
      type: "alerts",
      title: "Temporary Rescheduled Lectures Active",
      message: `There are ${tempRoutines.length} temporary routine adjustment(s) currently active on the schedule.`,
      time: "Schedule update",
      icon: FiCalendar,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40",
      path: "/admin/routines",
      severity: "info",
    });
  }

  // Fallback info notification if system status is clean
  if (notifications.length === 0) {
    notifications.push({
      id: "system-healthy",
      type: "all",
      title: "All Systems Operational",
      message: "GPS tracking, routine syncs, and database APIs are running without errors.",
      time: "Just now",
      icon: FiCheckCircle,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40",
      path: "/admin/dashboard",
      severity: "success",
    });
  }

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  // Filter by active tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "overdue") return n.type === "overdue";
    if (activeTab === "alerts") return n.type === "alerts";
    return true;
  });

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("subadmin_read_notifications", JSON.stringify(allIds));
  };

  const markItemRead = (id, e) => {
    e.stopPropagation();
    const updated = Array.from(new Set([...readIds, id]));
    setReadIds(updated);
    localStorage.setItem("subadmin_read_notifications", JSON.stringify(updated));
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        title="System Notifications & Alerts"
      >
        <FiBell className="text-lg" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden slide-in-down">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
            <div className="flex items-center space-x-2">
              <FiActivity className="text-blue-500 text-sm" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                System Alerts
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center"
              >
                <FiCheck className="mr-1 text-xs" /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-2 py-1 space-x-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("overdue")}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "overdue"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              Overdue ({notifications.filter((n) => n.type === "overdue").length})
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "alerts"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              Alerts ({notifications.filter((n) => n.type === "alerts").length})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                <FiCheckCircle2 className="mx-auto text-2xl mb-1 text-emerald-500" />
                <p className="font-semibold">No alerts in this view</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const Icon = item.icon;
                const isRead = readIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setIsOpen(false);
                      navigate(item.path);
                    }}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex items-start space-x-3 ${
                      !isRead ? "bg-blue-50/30 dark:bg-blue-950/10" : ""
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${item.color}`}>
                      <Icon className="text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-xs font-bold truncate ${
                            !isRead ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {item.title}
                        </h4>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug font-medium">
                        {item.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/50 dark:border-slate-800/30">
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 flex items-center">
                          <FiClock className="mr-1 text-[10px]" /> {item.time}
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center hover:underline">
                          View details <FiChevronRight className="ml-0.5 text-xs" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/admin/transport");
              }}
              className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Open Fleet & System Diagnostics →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
