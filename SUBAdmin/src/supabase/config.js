// Supabase Client and REST API Bridge for Hybrid Firebase Ecosystem
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

export const supabaseHeaders = (extraHeaders = {}) => {
  let token = null;
  if (typeof window !== "undefined") {
    const candidate =
      localStorage.getItem("subtools_supabase_token") ||
      localStorage.getItem("subtools_token") ||
      localStorage.getItem("token");

    if (candidate && candidate.startsWith("eyJ")) {
      try {
        const parts = candidate.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          // Check if expired
          if (!payload.exp || payload.exp * 1000 > Date.now()) {
            token = candidate;
          }
        }
      } catch (_) {}
    }
  }

  const finalToken = token || SUPABASE_ANON_KEY;

  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${finalToken}`,
    ...extraHeaders,
  };
};

/**
 * Resolves a login identifier (Student ID, Phone, or Email) using
 * Supabase PostgreSQL RPC function `get_email_by_identifier`
 */
export const resolveEmailViaSupabase = async (identifier) => {
  if (!isSupabaseConfigured()) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_email_by_identifier`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ identifier: identifier.trim() }),
    });

    if (res.ok) {
      const email = await res.json();
      return email || null;
    }
  } catch (err) {
    console.warn("Supabase identifier lookup error:", err);
  }

  return null;
};

/**
 * Authenticates against Supabase Auth (GoTrue REST API)
 * Returns { session, user } with user_metadata and app_metadata
 */
export const signInWithSupabase = async (email, password) => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.message || "Invalid Supabase login credentials.");
  }

  return data; // { access_token, refresh_token, user: { id, email, user_metadata, app_metadata } }
};

/**
 * Signs up a new user directly in Supabase GoTrue (/auth/v1/signup)
 */
export const signUpWithSupabase = async (email, password, userMetadata = {}) => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      data: userMetadata,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.message || "Failed to create account in Supabase.");
  }

  return data;
};

/**
 * Checks if a Student ID already exists in the Supabase users table
 */
export const checkStudentIdExists = async (studentId) => {
  if (!isSupabaseConfigured() || !studentId) return false;
  try {
    const cleanId = encodeURIComponent(studentId.trim().toUpperCase());
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?student_id=eq.${cleanId}&select=id&limit=1`, {
      headers: supabaseHeaders(),
    });
    if (res.ok) {
      const arr = await res.json();
      return Array.isArray(arr) && arr.length > 0;
    }
  } catch (err) {
    console.warn("Student ID check error:", err);
  }
  return false;
};


/**
 * Calls the Supabase Edge Function to exchange a Supabase access_token
 * for a Firebase Custom Token signed with the same UID and claims.
 */
export const fetchFirebaseCustomToken = async (supabaseAccessToken) => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-firebase-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAccessToken}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to retrieve Firebase Custom Token from Supabase Edge Function.");
  }

  return data.firebaseCustomToken;
};

export const DEFAULT_SITE_URL = typeof window !== "undefined" ? window.location.origin : "https://sub-tools.vercel.app/";

/**
 * Automatically refreshes an expired session using Supabase GoTrue grant_type=refresh_token
 */
export const refreshSupabaseSession = async (refreshToken) => {
  if (!isSupabaseConfigured() || !refreshToken) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (res.ok) {
      const data = await res.json();
      return data; // { access_token, refresh_token, user, ... }
    }
  } catch (err) {
    console.warn("Failed to refresh Supabase session:", err);
  }
  return null;
};

/**
 * Validates and retrieves current user profile directly from Supabase GoTrue (/auth/v1/user)
 */
export const getSupabaseUser = async (token) => {
  if (!isSupabaseConfigured() || !token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 401 || res.status === 403) {
      // Try refresh token if available before discarding session
      const refreshToken = localStorage.getItem("subtools_refresh_token");
      if (refreshToken) {
        const refreshed = await refreshSupabaseSession(refreshToken);
        if (refreshed && refreshed.access_token) {
          localStorage.setItem("subtools_token", refreshed.access_token);
          localStorage.setItem("subtools_supabase_token", refreshed.access_token);
          if (refreshed.refresh_token) {
            localStorage.setItem("subtools_refresh_token", refreshed.refresh_token);
          }
          return refreshed.user;
        }
      }
      return null;
    }
  } catch (err) {
    console.warn("Failed to fetch user from Supabase Auth:", err);
  }
  return null;
};

/**
 * Updates user attributes (password, user_metadata) via Supabase GoTrue (/auth/v1/user)
 */
export const updateSupabaseUser = async (token, updates = {}) => {
  if (!isSupabaseConfigured() || !token) throw new Error("Missing Supabase configuration or token.");
  let payload = { ...updates };
  // If caller passed top-level user fields without 'data', or passed 'user_metadata', wrap under 'data'
  if (!payload.data) {
    if (payload.user_metadata) {
      payload.data = payload.user_metadata;
      delete payload.user_metadata;
    } else if (!payload.password && !payload.email) {
      payload = { data: updates };
    }
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error_description || "Failed to update profile in Supabase Auth.");
  }
  return data;
};

/**
 * Signs out session from Supabase GoTrue (/auth/v1/logout)
 */
export const signOutSupabase = async (token) => {
  if (!isSupabaseConfigured() || !token) return;
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (_) {}
};

const SITE_ORIGIN = (
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "https://sub-tools.vercel.app")
).replace(/\/+$/, "");

/**
 * Triggers a password reset email via Supabase GoTrue with redirect_to URL
 */
export const sendSupabasePasswordReset = async (email, redirectTo = `${SITE_ORIGIN}/reset-password`) => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const encodedRedirect = encodeURIComponent(redirectTo);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodedRedirect}`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({ email: cleanEmail }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.msg ||
      errData.error_description ||
      errData.message ||
      `Failed to send recovery email (Status ${res.status})`
    );
  }

  return true;
};

/**
 * Verifies OTP or recovery token directly via Supabase GoTrue (/auth/v1/verify)
 */
export const verifySupabaseOtp = async ({ token, type = "recovery", email }) => {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const payload = { token, type };
  if (email) payload.email = email.trim().toLowerCase();

  const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error_description || "Verification link is invalid or expired.");
  }
  return data;
};

/**
 * Provisions an administrator in Supabase Auth & Firebase Auth via the Edge Function
 */
export const provisionAdminViaSupabase = async ({ email, password, name, role, department }) => {
  if (!isSupabaseConfigured()) return null;
  const token = localStorage.getItem("subtools_supabase_token");
  if (!token) return null;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-firebase-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "provision-admin",
      email,
      password,
      name,
      role,
      department,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to provision administrator in Supabase Auth.");
  }
  return data;
};

/**
 * Uploads a file (Blob or File) to Supabase Storage bucket (default: 'ads')
 * Returns the public URL of the uploaded file.
 */
export const uploadToSupabaseStorage = async (blob, bucket = "ads", path = null) => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  }

  const cleanFileName = (path || `ad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`).replace(/^\/+/, "");
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${cleanFileName}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": blob.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: blob,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Upload to Supabase bucket "${bucket}" failed (status ${res.status}).`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanFileName}`;
};

/**
 * Reads a document data JSON from Supabase system_settings table
 * @param {string} id
 * @returns {Promise<any>}
 */
export const getSystemSettings = async (id) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?id=eq.${encodeURIComponent(id)}&select=*`, {
      headers: supabaseHeaders(),
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!arr || arr.length === 0) return null;
    return arr[0].settings !== undefined && arr[0].settings !== null ? arr[0].settings : arr[0].data;
  } catch (err) {
    console.warn(`Failed to fetch system_settings for ${id}:`, err);
    return null;
  }
};

/**
 * Checks system-wide maintenance mode across system_settings
 * Matches Android SupabaseAuthBridge.checkMaintenanceMode
 * @returns {Promise<{ isMaintenance: boolean, message: string }>}
 */
export const checkMaintenanceMode = async () => {
  if (!isSupabaseConfigured()) return { isMaintenance: false, message: "" };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=*&limit=10`, {
      headers: supabaseHeaders(),
    });
    if (!res.ok) return { isMaintenance: false, message: "" };
    const arr = await res.json();
    if (Array.isArray(arr)) {
      for (const row of arr) {
        const s = row.settings || row.data;
        if (s) {
          const isMm = Boolean(s.maintenanceMode || s.maintenance);
          if (isMm) {
            return {
              isMaintenance: true,
              message:
                s.maintenanceMessage ||
                "SUBTools is currently undergoing scheduled maintenance to improve services. Normal operations will resume shortly.",
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to check maintenance mode:", err);
  }
  return { isMaintenance: false, message: "" };
};

/**
 * Queries total count of records matching criteria using PostgREST GET with Prefer count=exact.
 * Matches Android SupabaseAuthBridge.getTableCount
 * @param {string} table
 * @param {string} queryParams
 * @returns {Promise<number>}
 */
export const getTableCount = async (table, queryParams = "select=id") => {
  if (!isSupabaseConfigured()) return 0;
  try {
    const queryStr = queryParams || "select=id";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${queryStr}&limit=1`, {
      method: "GET",
      headers: {
        ...supabaseHeaders(),
        Prefer: "count=exact",
      },
    });
    const contentRange = res.headers.get("content-range") || res.headers.get("Content-Range");
    if (contentRange && contentRange.includes("/")) {
      const totalStr = contentRange.substring(contentRange.lastIndexOf("/") + 1).trim();
      const count = parseInt(totalStr, 10);
      if (!isNaN(count)) return count;
    }
  } catch (err) {
    console.warn(`Failed to count table ${table}:`, err);
  }
  return 0;
};

/**
 * Fetches lightweight user counts: total registered students and online within 15 min
 * Matches Android MainActivity.setupUserStats
 * @returns {Promise<{ totalUsers: number, onlineUsers: number }>}
 */
export const getUserStats = async () => {
  if (!isSupabaseConfigured()) return { totalUsers: 0, onlineUsers: 0 };
  try {
    const totalUsers = await getTableCount("users", "select=id");
    const onlineCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    // Query active unique user_ids from activity_logs within past 15 minutes
    let onlineUsers = 0;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/activity_logs?action=in.(heartbeat,session_start)&timestamp=gte.${encodeURIComponent(onlineCutoff)}&select=user_id`,
        {
          method: "GET",
          headers: {
            ...supabaseHeaders(),
          },
        }
      );
      if (res.ok) {
        const logs = await res.json();
        if (Array.isArray(logs)) {
          const uniqueUsers = new Set();
          logs.forEach((l) => {
            if (l.user_id && typeof l.user_id === "string" && !l.user_id.startsWith("test_")) {
              uniqueUsers.add(l.user_id.trim());
            }
          });
          onlineUsers = uniqueUsers.size;
        }
      }
    } catch (queryErr) {
      console.warn("Failed to query unique active users:", queryErr);
    }

    const finalTotal = totalUsers;
    const finalOnline = Math.min(finalTotal, Math.max(0, onlineUsers));
    return { totalUsers: finalTotal, onlineUsers: finalOnline };
  } catch (err) {
    console.warn("Failed to fetch user stats:", err);
    return { totalUsers: 0, onlineUsers: 0 };
  }
};

/**
 * Updates user online status by inserting a lightweight heartbeat into activity_logs.
 * This completely prevents touching or corrupting the user profile metadata in auth.users / public.users!
 * @param {string} uid
 * @param {boolean} online
 * @returns {Promise<boolean>}
 */
export const updateUserPresence = async (uid, online = true) => {
  if (!isSupabaseConfigured() || !uid) return false;
  try {
    const logEntry = {
      id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      user_id: uid,
      action: online ? "heartbeat" : "session_end",
      details: {
        online,
        client: "web_portal",
        last_seen: Date.now(),
      },
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(logEntry),
    });
    return res.ok;
  } catch (err) {
    console.warn("Failed to update user presence heartbeat:", err);
    return false;
  }
};

/**
 * Upserts/updates a document data JSON in Supabase system_settings table
 * @param {string} id
 * @param {any} data
 * @returns {Promise<boolean>}
 */
export const updateSystemSettings = async (id, data) => {
  if (!isSupabaseConfigured()) return false;
  try {
    const now = new Date().toISOString();
    
    // Safely retrieve current settings to merge fields
    let current = {};
    try {
      current = (await getSystemSettings(id)) || {};
    } catch (_) {
      current = {};
    }

    const mergedSettings =
      typeof data === "object" && data !== null && !Array.isArray(data) && typeof current === "object" && current !== null && !Array.isArray(current)
        ? { ...current, ...data }
        : data;

    const payload = {
      settings: mergedSettings,
      updated_at: now,
    };

    // 1. Try PATCH on existing record
    const res = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        ...supabaseHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const arr = await res.json().catch(() => []);
      if (Array.isArray(arr) && arr.length > 0) return true;
    }

    // 2. If row didn't exist or PATCH returned 0 rows, upsert via POST with resolution=merge-duplicates
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?on_conflict=id`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        id,
        settings: mergedSettings,
        updated_at: now,
      }),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text().catch(() => "");
      console.warn(`Failed to upsert system_settings for ${id}: ${upsertRes.status} ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`Failed to update system_settings for ${id}:`, err);
    return false;
  }
};

/**
 * Directly resets/sets a user's password via Supabase Edge Function using service_role admin privileges.
 */
export const adminResetUserPassword = async ({ targetUid, targetEmail, targetName, newPassword }) => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const token = localStorage.getItem("subtools_supabase_token");
  if (!token) {
    throw new Error("Admin session expired. Please log in again.");
  }

  // Ensure only valid UUIDs are passed as targetUid to avoid PostgreSQL syntax errors
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUid || "");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-firebase-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "admin-reset-password",
      targetUid: isUuid ? targetUid : undefined,
      targetEmail,
      targetName,
      newPassword,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to reset user password.");
  }
  return data;
};

/**
 * Generates an instant password recovery link directly via Supabase Auth Admin API
 * Returns { action_link, email_otp, hashed_token }
 */
export const adminGenerateRecoveryLink = async ({ targetEmail, redirectTo = `${SITE_ORIGIN}/reset-password` }) => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const token = localStorage.getItem("subtools_supabase_token");
  if (!token) {
    throw new Error("Admin session expired. Please log in again.");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-firebase-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "admin-generate-recovery-link",
      targetEmail: (targetEmail || "").trim().toLowerCase(),
      redirectTo,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to generate recovery link.");
  }
  return data;
};

export default {
  isSupabaseConfigured,
  resolveEmailViaSupabase,
  signInWithSupabase,
  fetchFirebaseCustomToken,
  sendSupabasePasswordReset,
  adminResetUserPassword,
  adminGenerateRecoveryLink,
  provisionAdminViaSupabase,
  uploadToSupabaseStorage,
  getSystemSettings,
  updateSystemSettings,
};
