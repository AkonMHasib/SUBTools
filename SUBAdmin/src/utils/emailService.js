// EmailJS Email Service — Per-Bus GPS Reminder Utility
// Uses @emailjs/browser to send emails client-side without a backend.
// Credentials (Service ID, Template ID, Public Key) are stored in Firestore at admin/email_config.

import emailjs from "@emailjs/browser";
import { getSystemSettings, updateSystemSettings } from "../supabase/config";
import DatabaseService from "../services/DatabaseService";

/**
 * Calculates per-bus GPS reminder status and metadata.
 * @param {object} bus  Bus document from Firestore
 * @returns {object} status metrics
 */
export const getGpsReminderStatus = (bus, reminderInterval = 20) => {
  const interval = parseInt(reminderInterval, 10) || 20;

  if (!bus) {
    return {
      statusText: "No GPS URL Set",
      shortStatus: "No GPS URL Set",
      badgeColor: "gray",
      badgeBg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      daysElapsed: 0,
      daysRemaining: interval,
      overdueDays: 0,
      isDue: false,
      isOverdue: false,
      lastUpdatedStr: "Never",
      updatedBy: "N/A",
      nextReminderStr: "N/A",
    };
  }

  const lastUpdatedRaw = bus.lastGpsUrlUpdatedAt || bus.gpsUrlUpdatedAt || null;
  if (!lastUpdatedRaw || !bus.gpsUrl || !bus.gpsUrl.trim()) {
    return {
      statusText: "No GPS URL Set",
      shortStatus: "No GPS URL Set",
      badgeColor: "gray",
      badgeBg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      daysElapsed: 0,
      daysRemaining: interval,
      overdueDays: 0,
      isDue: false,
      isOverdue: false,
      lastUpdatedStr: "Never",
      updatedBy: bus.lastGpsUrlUpdatedBy || "N/A",
      nextReminderStr: "N/A",
    };
  }

  const lastUpdated = new Date(lastUpdatedRaw);
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - lastUpdated.getTime());
  const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const nextReminder = bus.nextGpsReminderAt
    ? new Date(bus.nextGpsReminderAt)
    : new Date(lastUpdated.getTime() + interval * 24 * 60 * 60 * 1000);

  const daysRemaining = Math.max(0, interval - daysElapsed);
  const overdueDays = Math.max(0, daysElapsed - interval);

  const lastUpdatedStr = lastUpdated.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const nextReminderStr = nextReminder.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const updatedBy = bus.lastGpsUrlUpdatedBy || "Admin";

  if (daysElapsed > interval) {
    return {
      statusText: `🔴 ${overdueDays} ${overdueDays === 1 ? "day" : "days"} overdue`,
      shortStatus: `🔴 ${overdueDays}d overdue`,
      badgeColor: "red",
      badgeBg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
      daysElapsed,
      daysRemaining: 0,
      overdueDays,
      isDue: true,
      isOverdue: true,
      lastUpdatedStr,
      updatedBy,
      nextReminderStr,
    };
  } else if (daysElapsed === interval) {
    return {
      statusText: `🔴 Due Today`,
      shortStatus: `🔴 Due Today`,
      badgeColor: "amber",
      badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      daysElapsed,
      daysRemaining: 0,
      overdueDays: 0,
      isDue: true,
      isOverdue: false,
      lastUpdatedStr,
      updatedBy,
      nextReminderStr,
    };
  } else if (daysRemaining <= 3) {
    return {
      statusText: `🟡 ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining`,
      shortStatus: `🟡 ${daysRemaining}d remaining`,
      badgeColor: "amber",
      badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      daysElapsed,
      daysRemaining,
      overdueDays: 0,
      isDue: daysRemaining <= 2,
      isOverdue: false,
      lastUpdatedStr,
      updatedBy,
      nextReminderStr,
    };
  } else {
    return {
      statusText: `✓ Up to Date (${daysRemaining} days remaining)`,
      shortStatus: `✓ Up to Date (${daysRemaining}d remaining)`,
      badgeColor: "emerald",
      badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      daysElapsed,
      daysRemaining,
      overdueDays: 0,
      isDue: false,
      isOverdue: false,
      lastUpdatedStr,
      updatedBy,
      nextReminderStr,
    };
  }
};

/**
 * Reads EmailJS config from Supabase system_settings.
 */
export const loadEmailConfig = async () => {
  try {
    return await getSystemSettings("email_config");
  } catch (e) {
    console.error("Failed to load email config:", e);
  }
  return null;
};

/**
 * Saves EmailJS config to Supabase system_settings.
 */
export const saveEmailConfig = async (config) => {
  await updateSystemSettings("email_config", config);
};

/**
 * Builds a consolidated multi-bus email payload listing all buses that require GPS URL updates in a single email.
 */
export const buildGroupedGpsReminderPayload = (dueBuses = [], adminName = "Admin") => {
  const today = new Date().toLocaleDateString("en-BD", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Dhaka",
  });

  const busCount = dueBuses.length;
  const busNames = dueBuses.map((b) => b.name).join(", ");

  const subject = busCount === 1
    ? `🚌 [SUBTools Admin] GPS Tracker Update Required for ${dueBuses[0].name}`
    : `🚌 [SUBTools Admin] GPS Tracker Update Required for ${busCount} Buses (${busNames})`;

  const busRowsHtml = dueBuses.map((bus, idx) => `
    <tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:12px 16px;font-weight:700;color:#1e293b">${idx + 1}. ${bus.name}</td>
      <td style="padding:12px 16px;font-family:monospace;color:#64748b;font-size:12px">${bus.number || "N/A"}</td>
      <td style="padding:12px 16px;color:#475569;font-size:12px">${bus.reminderStatus.lastUpdatedStr} (by ${bus.reminderStatus.updatedBy})</td>
      <td style="padding:12px 16px;font-weight:700;font-size:12px">${bus.reminderStatus.statusText}</td>
    </tr>
  `).join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>GPS URL Reminder</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
    <tr>
      <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 40px">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">🚌 SUBTools Admin — Fleet GPS Tracker Review</h1>
        <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px">Automated Fleet Reminder — SUBTools Transport</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px">
        <p style="color:#334155;font-size:14px;margin:0 0 16px">Hi <strong>${adminName}</strong>,</p>
        <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0 0 24px">
          The following <strong>${busCount}</strong> campus shuttle bus(es) require a GPS tracking URL update to ensure students have uninterrupted live tracking access:
        </p>

        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;text-align:left;border-collapse:collapse">
            <thead>
              <tr style="background:#f1f5f9;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">
                <th style="padding:10px 16px">Bus Name</th>
                <th style="padding:10px 16px">Plate</th>
                <th style="padding:10px 16px">Last Updated</th>
                <th style="padding:10px 16px">Status</th>
              </tr>
            </thead>
            <tbody>
              ${busRowsHtml}
            </tbody>
          </table>
        </div>

        <div style="padding:16px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px">
          <p style="margin:0;font-size:12px;color:#1d4ed8;line-height:1.6">
            <strong>Action Required:</strong> Log in to <strong>SUBTools Admin → Transport → Bus Registry</strong> and update the GPS URL for ${busCount === 1 ? 'this bus' : 'these buses'}. Updating the URL resets the reminder timer.
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0">
        <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">
          Automated Fleet GPS Reminder from <strong>SUBTools Admin System</strong>.<br>
          Sent on ${today} · Resets automatically upon GPS URL update.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const busListText = dueBuses.map((b, idx) => 
    `${idx + 1}. ${b.name} (${b.number || "Bus"})\n   • Status: ${b.reminderStatus.statusText}\n   • Last Updated: ${b.reminderStatus.lastUpdatedStr} (by ${b.reminderStatus.updatedBy})`
  ).join("\n\n");

  const body = `Hi ${adminName},\n\nGPS tracker URL review is due for ${busCount} shuttle bus(es):\n\n${busListText}\n\nPlease update the URLs in SUBAdmin to reset the reminder timers.\n\nSUBTools Admin System`;

  return { subject, body, html };
};

// Legacy alias
export const buildSingleBusGpsReminderPayload = buildGroupedGpsReminderPayload;

/**
 * Sends an email using EmailJS using the high-availability API Key Pool with strategy support (Priority or Round-Robin).
 */
export const sendEmailWithFailover = async (rawConfig, templateParams) => {
  let config = rawConfig;
  if (!config?.keys && !config?.emailjs_keys) {
    const latest = await loadEmailConfig();
    if (latest) config = { ...latest, ...rawConfig };
  }

  const pool = config?.emailjs_keys || config?.keys || [];
  const strategy = config?.emailjs_strategy || config?.strategy || "priority"; // "priority" | "round_robin"

  let candidateKeys = [];

  if (pool.length > 0) {
    candidateKeys = pool.filter((k) => k.isActive !== false && k.serviceId && k.templateId && k.publicKey);
    if (strategy === "round_robin" && candidateKeys.length > 1) {
      candidateKeys = [...candidateKeys].sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
    }
  }

  // Fallback to legacy primary/backup fields if pool is empty
  if (candidateKeys.length === 0) {
    const primaryServiceId = config.serviceId || config.emailjs_service_id;
    const primaryTemplateId = config.templateId || config.emailjs_template_id;
    const primaryPublicKey = config.publicKey || config.emailjs_public_key;

    if (primaryServiceId && primaryTemplateId && primaryPublicKey) {
      candidateKeys.push({
        id: "legacy_primary",
        name: "Primary Key",
        serviceId: primaryServiceId,
        templateId: primaryTemplateId,
        publicKey: primaryPublicKey,
      });
    }

    const backupServiceId = config.backupServiceId || config.emailjs_backup_service_id;
    const backupTemplateId = config.backupTemplateId || config.emailjs_backup_template_id;
    const backupPublicKey = config.backupPublicKey || config.emailjs_backup_public_key;

    if (backupServiceId && backupTemplateId && backupPublicKey) {
      candidateKeys.push({
        id: "legacy_backup",
        name: "Backup Key",
        serviceId: backupServiceId,
        templateId: backupTemplateId,
        publicKey: backupPublicKey,
      });
    }
  }

  if (candidateKeys.length === 0) {
    throw new Error("EmailJS API credentials are not configured. Please add keys in Settings -> API Keys.");
  }

  let lastError = null;

  for (let i = 0; i < candidateKeys.length; i++) {
    const k = candidateKeys[i];
    try {
      await emailjs.send(k.serviceId.trim(), k.templateId.trim(), templateParams, k.publicKey.trim());

      if (pool.length > 0 && k.id && !k.id.startsWith("legacy_")) {
        const updatedPool = pool.map((item) =>
          item.id === k.id
            ? { ...item, usageCount: (item.usageCount || 0) + 1, lastUsedAt: new Date().toISOString(), status: "active" }
            : item
        );
        saveEmailConfig({ emailjs_keys: updatedPool }).catch(() => {});
      }

      return { success: true, usedKeyName: k.name || `Key #${i + 1}`, usedKeyId: k.id };
    } catch (err) {
      console.warn(`EmailJS key "${k.name || k.id}" failed:`, err);
      lastError = err;

      if (pool.length > 0 && k.id && !k.id.startsWith("legacy_")) {
        const errText = err?.text || err?.message || "";
        const isQuota = errText.toLowerCase().includes("quota") || errText.toLowerCase().includes("limit") || errText.toLowerCase().includes("exceeded");
        const updatedPool = pool.map((item) =>
          item.id === k.id ? { ...item, status: isQuota ? "quota_exceeded" : "error" } : item
        );
        saveEmailConfig({ emailjs_keys: updatedPool }).catch(() => {});
      }
    }
  }

  throw new Error(`All ${candidateKeys.length} EmailJS API key(s) failed. Last error: ${lastError?.text || lastError?.message || "Send failed"}`);
};

/**
 * Helper to check if a reminder was already sent today (same calendar date).
 */
const isSentToday = (lastSentIso) => {
  if (!lastSentIso) return false;
  const sentDate = new Date(lastSentIso).toDateString();
  const todayDate = new Date().toDateString();
  return sentDate === todayDate;
};

/**
 * Groups all overdue/due buses for GPS review and sends ONE single consolidated email.
 * Checks daily: if a bus remains overdue and hasn't been updated, resends daily.
 */
export const checkAndSendPerBusGpsReminders = async (config, buses = []) => {
  if (!config?.enabled || !config?.recipientEmail) {
    return { sentCount: 0, errors: [] };
  }

  const interval = parseInt(config?.reminderIntervalDays, 10) || 20;
  const dueBuses = [];

  for (const bus of buses) {
    if (!bus.gpsUrl || !bus.gpsUrl.trim()) continue;
    const reminderStatus = getGpsReminderStatus(bus, interval);

    // ONLY include buses that are DUE/OVERDUE and have NOT received a reminder TODAY
    if (reminderStatus.isDue && !isSentToday(bus.lastGpsReminderSentAt)) {
      dueBuses.push({
        ...bus,
        reminderStatus,
      });
    }
  }

  if (dueBuses.length === 0) {
    return { sentCount: 0, errors: [] };
  }

  const payload = buildGroupedGpsReminderPayload(dueBuses, config.recipientName || "Admin");
  const errors = [];

  try {
    await sendEmailWithFailover(config, {
      to_email: config.recipientEmail,
      to_name: config.recipientName || "Admin",
      from_name: "SUBTools Admin",
      from_email: "subtools.admin@gmail.com",
      sender_name: "SUBTools Admin",
      user_name: "SUBTools Admin",
      subject: payload.subject,
      message: payload.body,
      html_message: payload.html,
      bus_name: dueBuses.map(b => b.name).join(", "),
      bus_number: dueBuses.map(b => b.number || "Bus").join(", "),
      bus_count: dueBuses.length,
      reply_to: "subtools.admin@gmail.com",
    });

    // Mark today's timestamp on all included buses
    const nowIso = new Date().toISOString();
    await Promise.all(
      dueBuses.map(bus =>
        DatabaseService.updateDocument("buses", bus.id, {
          gpsReminderSent: true,
          lastGpsReminderSentAt: nowIso,
        }).catch(() => null)
      )
    );

    return { sentCount: dueBuses.length, errors: [] };
  } catch (err) {
    console.error(`Failed to send consolidated GPS reminder email:`, err);
    errors.push({ busId: "ALL", busName: "Grouped Fleet", error: err?.message || "Failed to send" });
    return { sentCount: 0, errors };
  }
};

/**
 * Sends a test email containing ONLY overdue buses (or sample overdue bus if none).
 */
export const sendGpsReminderEmail = async (config, buses = []) => {
  if (!config?.recipientEmail) {
    return { success: false, error: "Recipient email address is not set in Transport settings." };
  }

  const interval = parseInt(config?.reminderIntervalDays, 10) || 20;
  const busesWithStatus = buses.map(bus => ({
    ...bus,
    reminderStatus: getGpsReminderStatus(bus, interval),
  }));

  // Target ONLY buses that are DUE/OVERDUE (reminderStatus.isDue === true)
  const overdueOnlyBuses = busesWithStatus.filter(b => b.gpsUrl && b.reminderStatus.isDue);

  const targetBuses = overdueOnlyBuses.length > 0
    ? overdueOnlyBuses
    : (busesWithStatus.filter(b => b.gpsUrl).length > 0
        ? [busesWithStatus.filter(b => b.gpsUrl)[0]]
        : [{ name: "Oporajita", number: "DM-SA-11-0727", reminderStatus: getGpsReminderStatus({ lastGpsUrlUpdatedAt: new Date(Date.now() - 25 * 86400000).toISOString(), gpsUrl: "https://example.com" }, interval) }]);

  const payload = buildGroupedGpsReminderPayload(targetBuses, config.recipientName || "Admin");

  try {
    const res = await sendEmailWithFailover(config, {
      to_email: config.recipientEmail,
      to_name: config.recipientName || "Admin",
      from_name: "SUBTools Admin",
      from_email: "subtools.admin@gmail.com",
      sender_name: "SUBTools Admin",
      user_name: "SUBTools Admin",
      subject: "[TEST REMINDER] " + payload.subject,
      message: payload.body,
      html_message: payload.html,
      bus_name: targetBuses.map(b => b.name).join(", "),
      bus_number: targetBuses.map(b => b.number || "Bus").join(", "),
      bus_count: targetBuses.length,
      reply_to: "subtools.admin@gmail.com",
    });
    return { success: true, usedBackup: res.usedBackup };
  } catch (err) {
    console.error("EmailJS test send error:", err);
    return { success: false, error: err?.message || "Failed to send test email via EmailJS." };
  }
};

/**
 * Checks if a GPS reminder is due (20 days since last sent).
 */
export const isGpsReminderDue = (lastSentAt) => {
  if (!lastSentAt) return true;
  const daysSince = (Date.now() - new Date(lastSentAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 20;
};

