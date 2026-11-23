import DatabaseService from "../services/DatabaseService";

/**
 * Logs administrator activities securely to Supabase PostgreSQL activity_logs table.
 * @param {string} action The type of action (create, update, delete, ban, unban, verify, unverify).
 * @param {string} targetCollection The collection/table target.
 * @param {string} targetId The ID of the document being modified.
 * @param {object} previousState The state before modification (null for creations).
 * @param {object} currentState The state after modification (null for deletions).
 */
export const logAdminActivity = async (
  action,
  targetCollection,
  targetId,
  previousState = null,
  currentState = null
) => {
  try {
    const { store } = await import("../redux/store");
    const authState = store?.getState()?.auth;
    const user = authState?.user;

    // Only log activities if user is logged in
    if (!user) {
      return;
    }

    const logPayload = {
      adminId: user.uid || user.id || "system",
      adminName: user.name || user.displayName || "Admin",
      adminEmail: user.email || "",
      action,
      targetCollection,
      targetId,
      previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : null,
      currentState: currentState ? JSON.parse(JSON.stringify(currentState)) : null,
      timestamp: new Date().toISOString(),
      reverted: false,
    };

    await DatabaseService.addDocument("activityLogs", logPayload);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Admin activity log write skipped:", error?.message || error);
    }
  }
};
export default logAdminActivity;
