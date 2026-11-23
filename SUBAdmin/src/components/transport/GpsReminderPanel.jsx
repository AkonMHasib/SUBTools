// GPS Reminder Panel — Embedded in Bus Management
// Allows admin to configure EmailJS credentials + recipient email,
// enable the 29-day auto-reminder, and send a test email on demand.

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  FiMail,
  FiSend,
  FiSave,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiKey,
  FiToggleLeft,
  FiToggleRight,
  FiInfo,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
} from "react-icons/fi";
import {
  loadEmailConfig,
  saveEmailConfig,
  sendGpsReminderEmail,
  isGpsReminderDue,
  checkAndSendPerBusGpsReminders,
  getGpsReminderStatus,
} from "../../utils/emailService";
import { getSystemSettings, updateSystemSettings } from "../../supabase/config";

const GPS_REMINDER_META_DOC = "admin/gps_reminder_meta";

export const GpsReminderPanel = ({ buses = [], routes = [] }) => {
  const [config, setConfig] = useState({
    serviceId: "",
    templateId: "",
    publicKey: "",
    recipientEmail: "",
    recipientName: "",
    enabled: false,
  });

  const [meta, setMeta] = useState({
    lastSentAt: null,
    nextDueAt: null,
  });

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load config + meta on mount
  const loadData = useCallback(async () => {
    try {
      const [cfg, metaData] = await Promise.all([
        loadEmailConfig(),
        getSystemSettings("gps_reminder_meta"),
      ]);
      if (cfg) {
        setConfig((prev) => ({
          ...prev,
          serviceId: cfg.emailjs_service_id || "",
          templateId: cfg.emailjs_template_id || "",
          publicKey: cfg.emailjs_public_key || "",
          backupServiceId: cfg.emailjs_backup_service_id || "",
          backupTemplateId: cfg.emailjs_backup_template_id || "",
          backupPublicKey: cfg.emailjs_backup_public_key || "",
          recipientEmail: cfg.gps_reminder_email || "",
          recipientName: cfg.gps_reminder_name || "",
          reminderIntervalDays: cfg.gps_reminder_days || 20,
          enabled: true, // Default to true as requested so user never misses emails
        }));

        if (cfg.gps_reminder_enabled !== true) {
          saveEmailConfig({ gps_reminder_enabled: true }).catch(() => {});
        }
      } else {
        setConfig((prev) => ({ ...prev, enabled: true }));
        saveEmailConfig({ gps_reminder_enabled: true }).catch(() => {});
      }
      if (metaData) {
        setMeta({
          lastSentAt: metaData.lastSentAt || null,
          nextDueAt: metaData.nextDueAt || null,
        });
      }
      setLoaded(true);
    } catch (e) {
      console.error("Failed to load GPS reminder config:", e);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-check on load: if enabled, send per-bus reminders if due
  useEffect(() => {
    if (!loaded || !config.enabled || !buses || buses.length === 0) return;
    checkAndSendPerBusGpsReminders(config, buses).then(({ sentCount }) => {
      if (sentCount > 0) {
        toast.info(`Sent GPS reminder notification email for ${sentCount} bus(es).`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, config.enabled]);

  const handleSave = async () => {
    if (!config.recipientEmail) {
      toast.error("Please enter a recipient email address.");
      return;
    }
    setSaving(true);
    try {
      await saveEmailConfig({
        gps_reminder_email: config.recipientEmail.trim(),
        gps_reminder_name: config.recipientName.trim(),
        gps_reminder_days: parseInt(config.reminderIntervalDays, 10) || 20,
        gps_reminder_enabled: config.enabled,
      });
      setSaved(true);
      toast.success("GPS reminder configuration saved!");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error("Failed to save config: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async (silent = false) => {
    if (buses.length === 0) {
      if (!silent) toast.error("No buses found to include in the reminder.");
      return;
    }
    setSending(true);
    try {
      const enrichedBuses = buses.map(bus => {
        const route = routes.find(r => r.id === bus.routeId);
        return {
          ...bus,
          routeName: route ? `${route.name} (${route.code})` : "Unassigned"
        };
      });

      const result = await sendGpsReminderEmail(config, enrichedBuses);

      if (result.success) {
        const now = new Date().toISOString();
        const intervalDays = parseInt(config.reminderIntervalDays, 10) || 20;
        const nextDue = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
        setMeta({ lastSentAt: now, nextDueAt: nextDue });
        await updateSystemSettings("gps_reminder_meta", {
          lastSentAt: now,
          nextDueAt: nextDue,
        });
        if (!silent) toast.success(`GPS reminder email sent to ${config.recipientEmail}!`);
      } else {
        if (!silent) toast.error(result.error || "Failed to send email.");
      }
    } catch (err) {
      if (!silent) toast.error("Email sending failed: " + (err.message || "Unknown error"));
    } finally {
      setSending(false);
    }
  };

  const intervalDays = parseInt(config.reminderIntervalDays, 10) || 20;
  const calculatedNextDue = meta.lastSentAt
    ? new Date(new Date(meta.lastSentAt).getTime() + intervalDays * 24 * 60 * 60 * 1000)
    : null;

  const daysUntilDue = calculatedNextDue
    ? Math.max(0, Math.ceil((calculatedNextDue - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isDue = isGpsReminderDue(meta.lastSentAt);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border-b border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <FiMail size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              GPS Tracker URL Auto-Reminder
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Sends a single grouped email every {intervalDays} days listing all shuttle buses for review.
            </p>
          </div>
        </div>

        {/* Enable toggle */}
        <button
          onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${config.enabled
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}
          title={config.enabled ? "Disable auto-reminder" : "Enable auto-reminder"}
        >
          {config.enabled ? (
            <><FiToggleRight size={16} /><span>Enabled</span></>
          ) : (
            <><FiToggleLeft size={16} /><span>Disabled</span></>
          )}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Bar */}
        <div className={`flex flex-col sm:flex-row gap-3 sm:items-center p-4 rounded-xl border ${isDue
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50"
            : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50"
          }`}>
          <div className="flex items-center gap-2 flex-1">
            {isDue ? (
              <FiAlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <FiCheckCircle size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div>
              {meta.lastSentAt ? (
                <p className={`text-[11px] font-semibold ${isDue ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  Last sent: {new Date(meta.lastSentAt).toLocaleDateString("en-BD", {
                    weekday: "short", year: "numeric", month: "short", day: "numeric",
                  })}
                </p>
              ) : (
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  No reminder has been sent yet.
                </p>
              )}
              {daysUntilDue !== null && !isDue && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                  <FiClock size={10} />
                  Next reminder due in <strong>{daysUntilDue} days</strong>
                  {calculatedNextDue && ` (${calculatedNextDue.toLocaleDateString("en-BD", { month: "short", day: "numeric" })})`}
                </p>
              )}
              {isDue && meta.lastSentAt && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  ⚠ {intervalDays} days have passed — reminder is overdue!
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <FiInfo size={10} />
            {buses.length} buses registered
          </div>
        </div>

        {/* Functional Settings: Recipient & Reminder Interval */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <FiMail size={10} />
            Reminder Target & Frequency
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                placeholder="subtools.admin@gmail.com"
                value={config.recipientEmail}
                onChange={(e) => setConfig((c) => ({ ...c, recipientEmail: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                placeholder="Akon Hasib"
                value={config.recipientName}
                onChange={(e) => setConfig((c) => ({ ...c, recipientName: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Reminder Interval (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                placeholder="20"
                value={config.reminderIntervalDays || 20}
                onChange={(e) => setConfig((c) => ({ ...c, reminderIntervalDays: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
            <FiInfo size={11} />
            EmailJS API credentials (Service ID, Template ID, Public Key) are managed under{" "}
            <a href="/settings" className="text-blue-500 hover:underline font-semibold">
              Settings → API Keys
            </a>.
          </p>
        </div>

        {/* Bus Fleet Status & Preview */}
        {buses.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                Registered Shuttle Buses ({buses.length})
              </h4>
              <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/40">
                {buses.filter(b => getGpsReminderStatus(b, intervalDays).isDue).length} Overdue / Require Email Notice
              </span>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950">
                    <th className="text-left px-4 py-2.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-wide">Bus Name</th>
                    <th className="text-left px-4 py-2.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-wide">Plate</th>
                    <th className="text-left px-4 py-2.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-wide">Reminder Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {buses.slice(0, 8).map((bus) => {
                    const st = getGpsReminderStatus(bus, intervalDays);
                    return (
                      <tr key={bus.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors">
                        <td className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300">{bus.name}</td>
                        <td className="px-4 py-2 font-mono text-slate-500 dark:text-slate-400 text-[10px]">{bus.number}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] ${st.badgeBg}`}>
                            {st.statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {buses.length > 8 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-slate-400 dark:text-slate-500 text-center text-[10px]">
                        +{buses.length - 8} more buses in fleet registry
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Save Config */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50 ${saved
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "btn-primary-gradient text-white shadow-sm"
              }`}
          >
            {saved ? (
              <><FiCheckCircle size={13} /><span>Saved!</span></>
            ) : saving ? (
              <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving...</span></>
            ) : (
              <><FiSave size={13} /><span>Save Configuration</span></>
            )}
          </button>

          {/* Test Email */}
          <button
            onClick={() => handleSendEmail(false)}
            disabled={sending || !config.recipientEmail || !config.serviceId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title={!config.serviceId ? "Configure EmailJS credentials first" : `Send test email to ${config.recipientEmail}`}
          >
            {sending ? (
              <><span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /><span>Sending...</span></>
            ) : (
              <><FiSend size={13} /><span>Send Test Email Now</span></>
            )}
          </button>

          {/* Refresh status */}
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors ml-auto"
            title="Reload reminder status"
          >
            <FiRefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default GpsReminderPanel;
