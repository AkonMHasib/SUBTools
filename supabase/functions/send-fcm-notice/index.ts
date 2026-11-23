import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeApp, cert, getApps } from "npm:firebase-admin@12.0.0/app";
import { getMessaging } from "npm:firebase-admin@12.0.0/messaging";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getFirebaseMessaging() {
  if (getApps().length > 0) {
    return getMessaging(getApps()[0]);
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

  return getMessaging(app);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => null);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Empty or invalid JSON payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Support both Supabase Database Webhook format and direct invocation
    const record = payload.record || payload;
    const eventType = payload.type || "INSERT";

    // Verify record exists and is published
    if (!record || !record.id) {
      return new Response(
        JSON.stringify({ message: "No valid record found to process." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = (record.status || "published").toLowerCase().trim();
    if (status === "scheduled" || status === "draft" || status === "archived") {
      return new Response(
        JSON.stringify({ message: `Skipping notification for notice with status: ${status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messaging = getFirebaseMessaging();

    const title = record.title || "University Notice";
    const rawContent = record.content || record.description || record.body || "";
    const cleanContent = rawContent.length > 250 ? rawContent.substring(0, 247) + "..." : rawContent;
    const department = (record.department || "ALL").trim();

    // Determine target topic
    const topic = (department.toUpperCase() === "ALL" || department === "")
      ? "all_students"
      : `dept_${department.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

    const message = {
      topic: topic,
      notification: {
        title: title,
        body: cleanContent || "A new notice has been published.",
      },
      data: {
        notice_id: String(record.id || ""),
        notice_title: String(title),
        notice_content: String(rawContent),
        notice_department: String(department),
        notice_priority: String(record.priority || "Normal"),
        notice_category: String(record.category || record.type || "General"),
      },
      android: {
        priority: "high" as const,
        notification: {
          channelId: "university_notices_channel",
          sound: "default",
          priority: "high" as const,
        },
      },
    };

    const response = await messaging.send(message);

    // If sent to a specific department topic, also send to all_notices topic for general subscribers
    if (topic !== "all_students") {
      try {
        await messaging.send({ ...message, topic: "all_notices" });
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({ success: true, messageId: response, topic, event: eventType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("FCM Send Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to dispatch FCM notification." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
