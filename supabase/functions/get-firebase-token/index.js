import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { initializeApp, cert, getApps } from "npm:firebase-admin@12.0.0/app";
import { getAuth } from "npm:firebase-admin@12.0.0/auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Firebase Admin SDK safely
function getFirebaseAdminAuth() {
  if (getApps().length > 0) {
    return getAuth(getApps()[0]);
  }

  const rawServiceAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!rawServiceAccount) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret in Supabase Edge Functions.");
  }

  const serviceAccount = typeof rawServiceAccount === "string" 
    ? JSON.parse(rawServiceAccount) 
    : rawServiceAccount;

  const app = initializeApp({
    credential: cert(serviceAccount),
  });

  return getAuth(app);
}

serve(async (req) => {
  // Handle CORS Pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or malformed Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Verify caller using Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: SUPABASE_URL or SUPABASE_ANON_KEY missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired Supabase authentication session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract authorization metadata directly from Supabase Auth app_metadata
    const appMetadata = user.app_metadata || {};
    const userMetadata = user.user_metadata || {};

    const status = (appMetadata.status || "active").toLowerCase();
    if (status === "banned") {
      return new Response(
        JSON.stringify({ error: "Account is restricted or banned." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roles = Array.isArray(appMetadata.roles) && appMetadata.roles.length > 0
      ? appMetadata.roles.map((r) => String(r).toLowerCase())
      : (appMetadata.role ? [String(appMetadata.role).toLowerCase()] : ["student"]);
    const role = roles[0] || "student";

    const department = (appMetadata.department || userMetadata.department || "CSE").toUpperCase();

    // Check if caller is requesting an administrative action (e.g. provision new admin)
    let body = {};
    try {
      body = await req.json();
    } catch (_) {}

    const firebaseAuth = getFirebaseAdminAuth();

    if (body && body.action === "admin-reset-password") {
      const isAdminUser = role === "super_admin" || roles.includes("super_admin") || role === "admin" || roles.includes("admin");
      if (!isAdminUser) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Only administrators can reset user passwords." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetEmail = String(body.targetEmail || body.email || "").trim().toLowerCase();
      const rawTargetUid = String(body.targetUid || body.uid || "").trim();
      const newPassword = String(body.newPassword || body.password || "");
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTargetUid);
      const targetUid = isUuid ? rawTargetUid : "";

      if (!newPassword || newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters long." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on Edge Function." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      let updatedId = null;

      // 1. Try finding by targetUid if valid UUID
      if (targetUid) {
        const { data: uData } = await supabaseAdmin.auth.admin.getUserById(targetUid);
        if (uData?.user) {
          updatedId = uData.user.id;
        }
      }

      // 2. If not found by UID, search by email
      if (!updatedId && targetEmail) {
        const { data: usersRes } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const matched = usersRes?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
        if (matched) {
          updatedId = matched.id;
        }
      }

      // 3. Update existing user or auto-create if not yet in Supabase Auth
      if (updatedId) {
        const { error: sbUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(updatedId, {
          password: newPassword,
        });
        if (sbUpdateErr) {
          return new Response(
            JSON.stringify({ error: sbUpdateErr.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (targetEmail) {
        // Auto-provision user in Supabase Auth if not yet registered
        const { data: newSbUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: targetEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            name: body.targetName || "",
            student_id: body.studentId || body.targetStudentId || rawTargetUid || "",
          },
          app_metadata: {
            roles: ["student"],
            status: "active",
          },
        });
        if (createErr) {
          return new Response(
            JSON.stringify({ error: createErr.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updatedId = newSbUser?.user?.id;
      } else {
        return new Response(
          JSON.stringify({ error: "Target UID or Email is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 4. Sync password in Firebase Auth if account exists
      if (firebaseAuth && targetEmail) {
        try {
          const fbUser = await firebaseAuth.getUserByEmail(targetEmail);
          if (fbUser) {
            await firebaseAuth.updateUser(fbUser.uid, { password: newPassword });
          }
        } catch (_) {}
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Password successfully updated in Supabase Auth.",
          uid: updatedId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body && body.action === "admin-generate-recovery-link") {
      const isAdminUser = role === "super_admin" || roles.includes("super_admin") || role === "admin" || roles.includes("admin");
      if (!isAdminUser) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Only administrators can generate recovery links." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetEmail = String(body.targetEmail || body.email || "").trim().toLowerCase();
      if (!targetEmail) {
        return new Response(
          JSON.stringify({ error: "Email is required to generate recovery link." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on Edge Function." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const redirectTo = String(body.redirectTo || "https://subtools-admin.vercel.app/reset-password");

      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: targetEmail,
        options: { redirectTo },
      });

      if (linkErr) {
        return new Response(
          JSON.stringify({ error: linkErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          action_link: linkData?.properties?.action_link,
          email_otp: linkData?.properties?.email_otp,
          hashed_token: linkData?.properties?.hashed_token,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body && body.action === "provision-admin") {
      const isSuper = role === "super_admin" || roles.includes("super_admin");
      if (!isSuper) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Only super_admin accounts can provision administrators." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetEmail = String(body.email || "").trim().toLowerCase();
      const targetPassword = String(body.password || "");
      const targetName = String(body.name || "").trim();
      const targetRole = String(body.role || "admin").trim().toLowerCase();
      const targetDept = String(body.department || "CSE").trim().toUpperCase();

      if (!targetEmail || !targetPassword) {
        return new Response(
          JSON.stringify({ error: "Email and password are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 1: Ensure user exists in Firebase Auth
      let fbUid = null;
      try {
        const existingFbUser = await firebaseAuth.getUserByEmail(targetEmail);
        fbUid = existingFbUser.uid;
      } catch (notFound) {
        const newFbUser = await firebaseAuth.createUser({
          email: targetEmail,
          password: targetPassword,
          displayName: targetName,
        });
        fbUid = newFbUser.uid;
      }

      // Step 2: Ensure user exists in Supabase Auth with target app_metadata
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const targetPayload = {
          id: fbUid,
          email: targetEmail,
          password: targetPassword,
          email_confirm: true,
          user_metadata: {
            name: targetName,
            department: targetDept,
          },
          app_metadata: {
            roles: [targetRole],
            isAdmin: targetRole === "admin" || targetRole === "super_admin",
            department: targetDept,
            status: "active",
          },
        };

        const { error: sbCreateErr } = await supabaseAdmin.auth.admin.createUser(targetPayload);
        if (sbCreateErr) {
          // If already registered in Supabase, update metadata
          await supabaseAdmin.auth.admin.updateUserById(fbUid, {
            user_metadata: targetPayload.user_metadata,
            app_metadata: targetPayload.app_metadata,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          uid: fbUid,
          email: targetEmail,
          role: targetRole,
          department: targetDept,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: Mint Firebase Custom Token carrying the exact original Firebase UID & Claims
    const targetFirebaseUid = appMetadata.firebase_uid || userMetadata.firebase_uid || user.id;
    const firebaseCustomToken = await firebaseAuth.createCustomToken(targetFirebaseUid, {
      role,
      roles,
      department,
      email: user.email,
      supabase_uid: user.id,
    });

    return new Response(
      JSON.stringify({
        firebaseCustomToken,
        uid: targetFirebaseUid,
        supabase_uid: user.id,
        role,
        roles,
        department,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Token Exchange Error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to generate Firebase Custom Token." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
