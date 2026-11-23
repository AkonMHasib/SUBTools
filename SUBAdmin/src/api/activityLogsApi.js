import FirestoreService from "../services/FirestoreService";

export const activityLogsApi = {
  getAll: async () => {
    try {
      const logs = await FirestoreService.getCachedCollection("activityLogs");
      // Filter out non-admin telemetry logs (heartbeat, session_start/end, ad_clicks)
      const ignoredActions = new Set(["heartbeat", "session_start", "session_end", "ad_click"]);
      const adminLogs = logs.filter((log) => {
        if (!log) return false;
        const act = String(log.action || "").toLowerCase().trim();
        if (ignoredActions.has(act)) return false;
        // Require either an adminName, adminEmail, or an administrative action
        const hasAdminInfo = Boolean(log.adminName || log.adminEmail || log.targetCollection || log.targetId);
        return hasAdminInfo || ["create", "update", "delete", "ban", "unban", "verify", "unverify"].includes(act);
      });
      return adminLogs.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });
    } catch (error) {
      console.error("Failed to fetch activity logs from Firestore:", error);
      return [];
    }
  },

  revert: async (logId) => {
    const logData = await FirestoreService.getDocument("activityLogs", logId);
    if (!logData) throw new Error("Log entry not found");
    if (logData.reverted) throw new Error("Activity already reverted");

    const { action, targetCollection, targetId, previousState } = logData;

    if (action === "create") {
      await FirestoreService.deleteDocument(targetCollection, targetId);
    } else if (action === "delete" || action === "update") {
      await FirestoreService.setDocument(targetCollection, targetId, previousState);
    } else if (action === "ban" || action === "unban") {
      const isBanRevert = action === "unban";
      await FirestoreService.setDocument("users", targetId, { status: isBanRevert ? "Banned" : "Active" });
    } else if (action === "verify" || action === "unverify") {
      const isVerifyRevert = action === "unverify";
      await FirestoreService.setDocument("users", targetId, { emailVerified: isVerifyRevert });
    }

    await FirestoreService.updateDocument("activityLogs", logId, {
      reverted: true,
      revertedAt: new Date().toISOString(),
    });
    return { logId };
  },
};

export default activityLogsApi;
