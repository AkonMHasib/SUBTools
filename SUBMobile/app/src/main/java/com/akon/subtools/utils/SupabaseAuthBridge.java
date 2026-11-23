package com.akon.subtools.utils;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Supabase Auth Bridge for SUBMobile (Student Mobile App)
 * Connects Supabase Auth with Firebase Authentication via Custom Token Exchange.
 */
public class SupabaseAuthBridge {

    public static String SUPABASE_URL = "https://yxlnnmskctidhmusjypk.supabase.co"; 
    public static String SUPABASE_ANON_KEY = "sb_publishable_n30MSDl93IlJn2xgOzp7GA_VwVi-t02";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static volatile android.content.Context appContext = null;
    private static volatile String cachedAccessToken = null;
    private static volatile String cachedRefreshToken = null;

    public interface BridgeCallback {
        void onSuccess(String firebaseCustomToken, String email, String uid);
        void onFailure(String errorMessage);
    }

    private static final SupabaseAuthBridge INSTANCE = new SupabaseAuthBridge();

    public static void init(android.content.Context context) {
        if (context != null) {
            appContext = context.getApplicationContext();
            if (cachedAccessToken == null) {
                android.content.SharedPreferences prefs = appContext.getSharedPreferences("supabase_auth_prefs", android.content.Context.MODE_PRIVATE);
                cachedAccessToken = prefs.getString("supabase_access_token", null);
                cachedRefreshToken = prefs.getString("supabase_refresh_token", null);
            }
        }
    }

    /** Returns a shared instance. All bridge methods are static; this exists for instance-style callers. */
    public static SupabaseAuthBridge getInstance(android.content.Context context) {
        if (context != null && appContext == null) {
            init(context);
        }
        return INSTANCE;
    }

    public static void setCachedAccessToken(String token) {
        cachedAccessToken = token;
        if (appContext != null) {
            android.content.SharedPreferences prefs = appContext.getSharedPreferences("supabase_auth_prefs", android.content.Context.MODE_PRIVATE);
            prefs.edit().putString("supabase_access_token", token).apply();
        }
    }

    public static void setCachedTokens(String accessToken, String refreshToken) {
        cachedAccessToken = accessToken;
        cachedRefreshToken = refreshToken;
        if (appContext != null) {
            android.content.SharedPreferences prefs = appContext.getSharedPreferences("supabase_auth_prefs", android.content.Context.MODE_PRIVATE);
            android.content.SharedPreferences.Editor editor = prefs.edit();
            editor.putString("supabase_access_token", accessToken);
            if (refreshToken != null) {
                editor.putString("supabase_refresh_token", refreshToken);
            }
            editor.apply();
        }
    }

    public static String getCachedRefreshToken() {
        if (cachedRefreshToken == null && appContext != null) {
            android.content.SharedPreferences prefs = appContext.getSharedPreferences("supabase_auth_prefs", android.content.Context.MODE_PRIVATE);
            cachedRefreshToken = prefs.getString("supabase_refresh_token", null);
        }
        return cachedRefreshToken;
    }

    /** Returns the Supabase user id (JWT `sub`) from the cached access token, or null. */
    public static String getCurrentUserId() {
        String token = cachedAccessToken;
        if (token == null || token.isEmpty()) {
            if (appContext != null) {
                android.content.SharedPreferences prefs = appContext.getSharedPreferences("supabase_auth_prefs", android.content.Context.MODE_PRIVATE);
                token = prefs.getString("supabase_access_token", null);
                cachedAccessToken = token;
            }
        }
        if (token == null || token.isEmpty()) return null;
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            byte[] decoded = android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP | android.util.Base64.NO_PADDING);
            JSONObject payload = new JSONObject(new String(decoded, StandardCharsets.UTF_8));
            String sub = payload.optString("sub", "");
            return sub.isEmpty() ? null : sub;
        } catch (Exception e) {
            return null;
        }
    }

    public static boolean isConfigured() {
        return SUPABASE_URL != null && !SUPABASE_URL.trim().isEmpty() &&
               SUPABASE_ANON_KEY != null && !SUPABASE_ANON_KEY.trim().isEmpty();
    }

    /**
     * Resolves Student ID, Phone, or Email using Supabase SQL RPC get_email_by_identifier.
     */
    public static void resolveEmail(String identifier, java.util.function.Consumer<String> callback) {
        if (!isConfigured() || identifier == null || identifier.trim().isEmpty()) {
            mainHandler.post(() -> callback.accept(null));
            return;
        }

        executor.execute(() -> {
            try {
                URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/rpc/get_email_by_identifier");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                JSONObject payload = new JSONObject();
                payload.put("identifier", identifier.trim());

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (conn.getResponseCode() >= 200 && conn.getResponseCode() < 300) {
                    String resp = readStream(conn.getInputStream()).trim();
                    if (resp.startsWith("\"") && resp.endsWith("\"")) {
                        resp = resp.substring(1, resp.length() - 1);
                    }
                    final String finalEmail = resp.isEmpty() || "null".equals(resp) ? null : resp;
                    mainHandler.post(() -> callback.accept(finalEmail));
                    return;
                }
            } catch (Exception ignored) {}

            mainHandler.post(() -> callback.accept(null));
        });
    }

    /**
     * Authenticates with Supabase Auth (GoTrue), calls Edge Function get-firebase-token,
     * and returns the Firebase Custom Token ready for FirebaseAuth.signInWithCustomToken().
     */
    public static void authenticateAndGetFirebaseToken(String emailOrId, String password, BridgeCallback callback) {
        if (!isConfigured()) {
            callback.onFailure("Supabase bridge is not configured.");
            return;
        }

        executor.execute(() -> {
            try {
                // 1. Resolve email if an identifier was provided
                String resolvedEmail = emailOrId.trim();
                if (!android.util.Patterns.EMAIL_ADDRESS.matcher(resolvedEmail).matches()) {
                    URL rpcUrl = new URL(SUPABASE_URL.trim() + "/rest/v1/rpc/get_email_by_identifier");
                    HttpURLConnection rpcConn = (HttpURLConnection) rpcUrl.openConnection();
                    rpcConn.setRequestMethod("POST");
                    rpcConn.setRequestProperty("Content-Type", "application/json");
                    rpcConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                    rpcConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                    rpcConn.setDoOutput(true);
                    rpcConn.setConnectTimeout(8000);

                    JSONObject rpcBody = new JSONObject();
                    rpcBody.put("identifier", resolvedEmail);
                    try (OutputStream os = rpcConn.getOutputStream()) {
                        os.write(rpcBody.toString().getBytes(StandardCharsets.UTF_8));
                    }

                    if (rpcConn.getResponseCode() >= 200 && rpcConn.getResponseCode() < 300) {
                        String raw = readStream(rpcConn.getInputStream()).trim();
                        if (raw.startsWith("\"") && raw.endsWith("\"")) raw = raw.substring(1, raw.length() - 1);
                        if (!raw.isEmpty() && !"null".equals(raw)) {
                            resolvedEmail = raw;
                        }
                    }
                }

                // 2. Authenticate against Supabase GoTrue REST endpoint
                URL authUrl = new URL(SUPABASE_URL.trim() + "/auth/v1/token?grant_type=password");
                HttpURLConnection authConn = (HttpURLConnection) authUrl.openConnection();
                authConn.setRequestMethod("POST");
                authConn.setRequestProperty("Content-Type", "application/json");
                authConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                authConn.setDoOutput(true);
                authConn.setConnectTimeout(8000);
                authConn.setReadTimeout(8000);

                JSONObject authBody = new JSONObject();
                authBody.put("email", resolvedEmail.toLowerCase().trim());
                authBody.put("password", password);

                try (OutputStream os = authConn.getOutputStream()) {
                    os.write(authBody.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (authConn.getResponseCode() < 200 || authConn.getResponseCode() >= 300) {
                    String errJson = readStream(authConn.getErrorStream());
                    String msg = "Invalid login credentials.";
                    try {
                        JSONObject obj = new JSONObject(errJson);
                        if (obj.has("error_description")) msg = obj.getString("error_description");
                        else if (obj.has("msg")) msg = obj.getString("msg");
                        else if (obj.has("message")) msg = obj.getString("message");
                    } catch (Exception ignored) {}

                    final String errMsg = msg;
                    mainHandler.post(() -> callback.onFailure(errMsg));
                    return;
                }

                JSONObject authResponse = new JSONObject(readStream(authConn.getInputStream()));
                String accessToken = authResponse.getString("access_token");
                String refreshToken = authResponse.optString("refresh_token", null);
                setCachedTokens(accessToken, refreshToken);
                JSONObject userObj = authResponse.getJSONObject("user");
                String uid = userObj.getString("id");

                // 3. Call get-firebase-token Edge Function
                URL edgeUrl = new URL(SUPABASE_URL.trim() + "/functions/v1/get-firebase-token");
                HttpURLConnection edgeConn = (HttpURLConnection) edgeUrl.openConnection();
                edgeConn.setRequestMethod("POST");
                edgeConn.setRequestProperty("Content-Type", "application/json");
                edgeConn.setRequestProperty("Authorization", "Bearer " + accessToken);
                edgeConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                edgeConn.setConnectTimeout(10000);
                edgeConn.setReadTimeout(10000);

                if (edgeConn.getResponseCode() < 200 || edgeConn.getResponseCode() >= 300) {
                    String errJson = readStream(edgeConn.getErrorStream());
                    final String errMsg = "Failed to obtain Firebase authorization from Supabase: " + errJson;
                    mainHandler.post(() -> callback.onFailure(errMsg));
                    return;
                }

                JSONObject edgeResp = new JSONObject(readStream(edgeConn.getInputStream()));
                String customToken = edgeResp.getString("firebaseCustomToken");

                final String finalEmail = resolvedEmail;
                mainHandler.post(() -> callback.onSuccess(customToken, finalEmail, uid));

            } catch (Exception e) {
                mainHandler.post(() -> callback.onFailure("Supabase connection error: " + (e.getMessage() != null ? e.getMessage() : "Unknown error")));
            }
        });
    }

    public static String getCachedAccessToken() {
        if ((cachedAccessToken == null || cachedAccessToken.trim().isEmpty()) && appContext != null) {
            android.content.SharedPreferences prefs = appContext.getSharedPreferences("supabase_auth_prefs", android.content.Context.MODE_PRIVATE);
            cachedAccessToken = prefs.getString("supabase_access_token", null);
        }
        return cachedAccessToken != null && !cachedAccessToken.trim().isEmpty()
                ? cachedAccessToken.trim()
                : SUPABASE_ANON_KEY.trim();
    }

    public interface SupabaseCallback {
        void onSuccess(String responseBody);
        void onError(String error);
    }

    /**
     * Executes an asynchronous GET query on a Supabase REST table endpoint.
     */
    public static void queryTable(String table, String queryParams, SupabaseCallback callback) {
        if (!isConfigured()) {
            if (callback != null) mainHandler.post(() -> callback.onError("Supabase not configured"));
            return;
        }
        executor.execute(() -> {
            try {
                String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "select=*";
                URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String resp = readStream(conn.getInputStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onSuccess(resp));
                } else {
                    String err = readStream(conn.getErrorStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + code + ": " + err));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }

    /**
     * Executes a synchronous GET query on a Supabase REST table endpoint.
     */
    public static org.json.JSONArray queryTable(String table, String queryParams) {
        if (!isConfigured()) return null;
        try {
            String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "select=*";
            URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
            conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            if (conn.getResponseCode() >= 200 && conn.getResponseCode() < 300) {
                String resp = readStream(conn.getInputStream()).trim();
                return new org.json.JSONArray(resp);
            }
        } catch (Exception ignored) {}
        return null;
    }

    /**
     * Queries total count of records matching criteria using PostgREST HEAD count=exact.
     */
    public static int getTableCount(String table, String queryParams) {
        if (!isConfigured()) return 0;
        int count = tryGetTableCount(table, queryParams, getCachedAccessToken());
        if (count <= 0 && !SUPABASE_ANON_KEY.trim().equals(getCachedAccessToken())) {
            count = tryGetTableCount(table, queryParams, SUPABASE_ANON_KEY.trim());
        }
        return count;
    }

    private static int tryGetTableCount(String table, String queryParams, String authBearer) {
        try {
            String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "select=id";
            URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("HEAD");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
            conn.setRequestProperty("Authorization", "Bearer " + authBearer);
            conn.setRequestProperty("Prefer", "count=exact");
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);

            if (conn.getResponseCode() >= 200 && conn.getResponseCode() < 300) {
                String contentRange = conn.getHeaderField("Content-Range");
                if (contentRange != null && contentRange.contains("/")) {
                    String total = contentRange.substring(contentRange.lastIndexOf("/") + 1).trim();
                    return Integer.parseInt(total);
                }
            }
        } catch (Exception ignored) {}
        return 0;
    }

    /**
     * Executes a synchronous GET query on a Supabase REST table endpoint and returns raw response string.
     */
    public static String executeGet(String table, String queryParams) {
        if (!isConfigured()) return null;
        try {
            String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "select=*";
            URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
            conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            if (conn.getResponseCode() >= 200 && conn.getResponseCode() < 300) {
                return readStream(conn.getInputStream()).trim();
            }
        } catch (Exception ignored) {}
        return null;
    }

    /**
     * Executes an asynchronous INSERT (POST) or upsert query on a Supabase REST table endpoint.
     */
    public static void insertRecord(String table, JSONObject data, SupabaseCallback callback) {
        if (!isConfigured() || data == null) {
            if (callback != null) mainHandler.post(() -> callback.onError("Supabase not configured or data null"));
            return;
        }
        executor.execute(() -> {
            try {
                URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setRequestProperty("Prefer", "resolution=merge-duplicates,return=representation");
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                byte[] bytes = data.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(bytes, 0, bytes.length);
                    os.flush();
                }

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String resp = readStream(conn.getInputStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onSuccess(resp));
                } else {
                    String err = readStream(conn.getErrorStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + code + ": " + err));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }

    /**
     * Executes a synchronous INSERT (POST) or upsert query on a Supabase REST table endpoint.
     */
    public static boolean insertRecord(String table, JSONObject data) {
        if (!isConfigured() || data == null) return false;
        try {
            URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
            conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
            conn.setRequestProperty("Prefer", "resolution=merge-duplicates,return=representation");
            conn.setDoOutput(true);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            byte[] bytes = data.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(bytes, 0, bytes.length);
                os.flush();
            }

            int code = conn.getResponseCode();
            return (code >= 200 && code < 300);
        } catch (Exception ignored) {
            return false;
        }
    }

    /**
     * Executes an asynchronous batch INSERT (POST) or upsert query on a Supabase REST table endpoint.
     */
    public static void insertRecords(String table, org.json.JSONArray dataArray, SupabaseCallback callback) {
        if (!isConfigured() || dataArray == null) {
            if (callback != null) mainHandler.post(() -> callback.onError("Supabase not configured or data null"));
            return;
        }
        executor.execute(() -> {
            try {
                URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setRequestProperty("Prefer", "resolution=merge-duplicates,return=representation");
                conn.setDoOutput(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);

                byte[] bytes = dataArray.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(bytes, 0, bytes.length);
                    os.flush();
                }

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String resp = readStream(conn.getInputStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onSuccess(resp));
                } else {
                    String err = readStream(conn.getErrorStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + code + ": " + err));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }

    /**
     * Executes an UPDATE (PATCH) query on a Supabase REST table endpoint.
     */
    /**
     * Prepares update payloads for Supabase. Specifically, the "users" relation in Supabase
     * is a PostgreSQL view where calculated columns are read-only and base attributes reside
     * inside the "data" JSONB column. Merging into "data" enables atomic updates.
     */
    private static JSONObject prepareUpdatePayload(String table, String queryParams, JSONObject data) {
        if (!"users".equalsIgnoreCase(table) || data == null || data.has("data")) {
            return data;
        }
        try {
            JSONObject currentData = null;
            String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "";
            URL getUrl = new URL(SUPABASE_URL.trim() + "/rest/v1/users?" + queryStr + "&select=data");
            HttpURLConnection getConn = (HttpURLConnection) getUrl.openConnection();
            getConn.setRequestMethod("GET");
            getConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
            getConn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
            getConn.setConnectTimeout(6000);
            getConn.setReadTimeout(6000);

            if (getConn.getResponseCode() >= 200 && getConn.getResponseCode() < 300) {
                String resp = readStream(getConn.getInputStream()).trim();
                org.json.JSONArray arr = new org.json.JSONArray(resp);
                if (arr.length() > 0) {
                    currentData = arr.getJSONObject(0).optJSONObject("data");
                }
            }
            if (currentData == null) {
                currentData = new JSONObject();
            }

            java.util.Iterator<String> it = data.keys();
            while (it.hasNext()) {
                String key = it.next();
                Object val = data.get(key);
                currentData.put(key, val);
                if ("photoURL".equals(key) || "photoUrl".equals(key) || "avatar_url".equals(key) || "photo_url".equals(key)) {
                    currentData.put("avatar_url", val);
                    currentData.put("photoUrl", val);
                    currentData.put("photo_url", val);
                    currentData.put("photoURL", val);
                }
                if ("bloodGroup".equals(key) || "blood_group".equals(key)) {
                    currentData.put("bloodGroup", val);
                    currentData.put("blood_group", val);
                }
                if ("isDonor".equals(key) || "is_donor".equals(key)) {
                    currentData.put("isDonor", val);
                    currentData.put("is_donor", val);
                }
            }

            JSONObject wrapped = new JSONObject();
            wrapped.put("data", currentData);
            return wrapped;
        } catch (Exception e) {
            return data;
        }
    }

    /**
     * Executes an UPDATE (PATCH) query on a Supabase REST table endpoint.
     */
    public static boolean updateRecord(String table, String queryParams, JSONObject data) {
        if (!isConfigured() || data == null) return false;
        try {
            JSONObject payload = prepareUpdatePayload(table, queryParams, data);
            String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "";
            URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PATCH");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
            conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
            conn.setDoOutput(true);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(bytes, 0, bytes.length);
                os.flush();
            }

            int code = conn.getResponseCode();
            return (code >= 200 && code < 300);
        } catch (Exception ignored) {
            return false;
        }
    }

    /**
     * Executes an asynchronous UPDATE (PATCH) query on a Supabase REST table endpoint.
     */
    public static void updateRecord(String table, String queryParams, JSONObject data, SupabaseCallback callback) {
        if (!isConfigured() || data == null) {
            if (callback != null) mainHandler.post(() -> callback.onError("Supabase not configured or data null"));
            return;
        }
        executor.execute(() -> {
            try {
                JSONObject payload = prepareUpdatePayload(table, queryParams, data);
                String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "";
                URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setRequestProperty("Prefer", "return=representation");
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(bytes, 0, bytes.length);
                    os.flush();
                }

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String resp = readStream(conn.getInputStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onSuccess(resp));
                } else {
                    String err = readStream(conn.getErrorStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + code + ": " + err));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }

    /**
     * Executes a DELETE query on a Supabase REST table endpoint.
     */
    public static boolean deleteRecord(String table, String queryParams) {
        if (!isConfigured()) return false;
        try {
            String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "";
            URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("DELETE");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
            conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            int code = conn.getResponseCode();
            return (code >= 200 && code < 300);
        } catch (Exception ignored) {
            return false;
        }
    }

    /**
     * Executes an asynchronous DELETE query on a Supabase REST table endpoint.
     */
    public static void deleteRecord(String table, String queryParams, SupabaseCallback callback) {
        if (!isConfigured() || queryParams == null) {
            if (callback != null) mainHandler.post(() -> callback.onError("Supabase not configured or queryParams null"));
            return;
        }
        executor.execute(() -> {
            try {
                String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "";
                URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("DELETE");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    if (callback != null) mainHandler.post(() -> callback.onSuccess("OK"));
                } else {
                    String err = readStream(conn.getErrorStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + code + ": " + err));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }

    public interface DirectAuthCallback {
        void onSuccess(String accessToken, String userId, String email, JSONObject appMetadata, JSONObject userMetadata);
        void onFailure(String errorMessage);
    }

    /**
     * Authenticates directly against Supabase GoTrue Auth endpoint (/auth/v1/token?grant_type=password).
     */
    public static void authenticateDirect(String emailOrId, String password, DirectAuthCallback callback) {
        if (!isConfigured()) {
            callback.onFailure("Supabase bridge is not configured.");
            return;
        }

        executor.execute(() -> {
            try {
                // 1. Resolve email if identifier provided
                String resolvedEmail = emailOrId != null ? emailOrId.trim() : "";
                if (!android.util.Patterns.EMAIL_ADDRESS.matcher(resolvedEmail).matches()) {
                    URL rpcUrl = new URL(SUPABASE_URL.trim() + "/rest/v1/rpc/get_email_by_identifier");
                    HttpURLConnection rpcConn = (HttpURLConnection) rpcUrl.openConnection();
                    rpcConn.setRequestMethod("POST");
                    rpcConn.setRequestProperty("Content-Type", "application/json");
                    rpcConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                    rpcConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                    rpcConn.setDoOutput(true);
                    rpcConn.setConnectTimeout(8000);

                    JSONObject rpcBody = new JSONObject();
                    rpcBody.put("identifier", resolvedEmail);
                    try (OutputStream os = rpcConn.getOutputStream()) {
                        os.write(rpcBody.toString().getBytes(StandardCharsets.UTF_8));
                    }

                    if (rpcConn.getResponseCode() >= 200 && rpcConn.getResponseCode() < 300) {
                        String raw = readStream(rpcConn.getInputStream()).trim();
                        if (raw.startsWith("\"") && raw.endsWith("\"")) raw = raw.substring(1, raw.length() - 1);
                        if (!raw.isEmpty() && !"null".equals(raw)) {
                            resolvedEmail = raw;
                        }
                    }
                }

                // 2. GoTrue login
                URL authUrl = new URL(SUPABASE_URL.trim() + "/auth/v1/token?grant_type=password");
                HttpURLConnection authConn = (HttpURLConnection) authUrl.openConnection();
                authConn.setRequestMethod("POST");
                authConn.setRequestProperty("Content-Type", "application/json");
                authConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                authConn.setDoOutput(true);
                authConn.setConnectTimeout(8000);
                authConn.setReadTimeout(8000);

                JSONObject authBody = new JSONObject();
                authBody.put("email", resolvedEmail.toLowerCase().trim());
                authBody.put("password", password);

                try (OutputStream os = authConn.getOutputStream()) {
                    os.write(authBody.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (authConn.getResponseCode() < 200 || authConn.getResponseCode() >= 300) {
                    String errJson = readStream(authConn.getErrorStream());
                    String msg = "Invalid login credentials.";
                    try {
                        JSONObject obj = new JSONObject(errJson);
                        if (obj.has("error_description")) msg = obj.getString("error_description");
                        else if (obj.has("msg")) msg = obj.getString("msg");
                        else if (obj.has("message")) msg = obj.getString("message");
                    } catch (Exception ignored) {}

                    final String errMsg = msg;
                    mainHandler.post(() -> callback.onFailure(errMsg));
                    return;
                }

                JSONObject authResponse = new JSONObject(readStream(authConn.getInputStream()));
                String accessToken = authResponse.getString("access_token");
                String refreshToken = authResponse.optString("refresh_token", null);
                setCachedTokens(accessToken, refreshToken);
                JSONObject userObj = authResponse.getJSONObject("user");
                String uid = userObj.getString("id");
                JSONObject appMeta = userObj.optJSONObject("app_metadata");
                JSONObject userMeta = userObj.optJSONObject("user_metadata");

                final String finalEmail = resolvedEmail;
                mainHandler.post(() -> callback.onSuccess(accessToken, uid, finalEmail, appMeta, userMeta));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onFailure("Supabase connection error: " + (e.getMessage() != null ? e.getMessage() : "Unknown error")));
            }
        });
    }

    /**
     * Signs up a new user directly in Supabase GoTrue (/auth/v1/signup).
     */
    public static void signUpDirect(String email, String password, JSONObject userMetadata, DirectAuthCallback callback) {
        if (!isConfigured() || email == null || password == null) {
            if (callback != null) callback.onFailure("Supabase not configured or invalid credentials");
            return;
        }

        executor.execute(() -> {
            try {
                URL authUrl = new URL(SUPABASE_URL.trim() + "/auth/v1/signup");
                HttpURLConnection authConn = (HttpURLConnection) authUrl.openConnection();
                authConn.setRequestMethod("POST");
                authConn.setRequestProperty("Content-Type", "application/json");
                authConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                authConn.setDoOutput(true);
                authConn.setConnectTimeout(10000);
                authConn.setReadTimeout(10000);

                JSONObject payload = new JSONObject();
                payload.put("email", email.trim().toLowerCase());
                payload.put("password", password);
                if (userMetadata != null) {
                    payload.put("data", userMetadata);
                }

                try (OutputStream os = authConn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (authConn.getResponseCode() < 200 || authConn.getResponseCode() >= 300) {
                    String errJson = readStream(authConn.getErrorStream());
                    String msg = "Signup failed.";
                    try {
                        JSONObject obj = new JSONObject(errJson);
                        if (obj.has("error_description")) msg = obj.getString("error_description");
                        else if (obj.has("msg")) msg = obj.getString("msg");
                        else if (obj.has("message")) msg = obj.getString("message");
                    } catch (Exception ignored) {}

                    final String errMsg = msg;
                    mainHandler.post(() -> callback.onFailure(errMsg));
                    return;
                }

                JSONObject authResponse = new JSONObject(readStream(authConn.getInputStream()));
                String accessToken = authResponse.optString("access_token", "");
                String refreshToken = authResponse.optString("refresh_token", null);
                if (!accessToken.isEmpty()) {
                    setCachedTokens(accessToken, refreshToken);
                }
                JSONObject userObj = authResponse.optJSONObject("user");
                if (userObj == null) userObj = authResponse;

                String uid = userObj.optString("id", "");
                JSONObject appMeta = userObj.optJSONObject("app_metadata");
                JSONObject userMeta = userObj.optJSONObject("user_metadata");

                final String finalUid = uid;
                mainHandler.post(() -> callback.onSuccess(accessToken, finalUid, email, appMeta, userMeta));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onFailure("Supabase connection error: " + (e.getMessage() != null ? e.getMessage() : "Unknown error")));
            }
        });
    }

    /**
     * Refreshes the Supabase GoTrue Auth session using the stored refresh_token.
     */
    public static void refreshSession(SupabaseCallback callback) {
        String refreshToken = getCachedRefreshToken();
        if (!isConfigured() || refreshToken == null || refreshToken.trim().isEmpty()) {
            if (callback != null) mainHandler.post(() -> callback.onError("No refresh token available"));
            return;
        }

        executor.execute(() -> {
            try {
                URL authUrl = new URL(SUPABASE_URL.trim() + "/auth/v1/token?grant_type=refresh_token");
                HttpURLConnection conn = (HttpURLConnection) authUrl.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                JSONObject body = new JSONObject();
                body.put("refresh_token", refreshToken.trim());

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (conn.getResponseCode() >= 200 && conn.getResponseCode() < 300) {
                    JSONObject authResponse = new JSONObject(readStream(conn.getInputStream()));
                    String newAccess = authResponse.optString("access_token", "");
                    String newRefresh = authResponse.optString("refresh_token", refreshToken);
                    if (!newAccess.isEmpty()) {
                        setCachedTokens(newAccess, newRefresh);
                    }
                    if (callback != null) {
                        mainHandler.post(() -> callback.onSuccess(authResponse.toString()));
                    }
                } else {
                    String err = readStream(conn.getErrorStream());
                    if (callback != null) {
                        mainHandler.post(() -> callback.onError("Session refresh failed: " + err));
                    }
                }
            } catch (Exception e) {
                if (callback != null) {
                    mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Session refresh failed"));
                }
            }
        });
    }

    /**
     * Fetches current authenticated user profile directly from Supabase GoTrue Auth (/auth/v1/user).
     */
    public static void fetchAuthUser(SupabaseCallback callback) {
        if (!isConfigured()) {
            if (callback != null) mainHandler.post(() -> callback.onError("Supabase bridge not configured"));
            return;
        }

        executor.execute(() -> {
            try {
                URL url = new URL(SUPABASE_URL.trim() + "/auth/v1/user");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String resp = readStream(conn.getInputStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onSuccess(resp));
                } else if ((code == 401 || code == 403) && getCachedRefreshToken() != null) {
                    refreshSession(new SupabaseCallback() {
                        @Override
                        public void onSuccess(String refreshBody) {
                            fetchAuthUser(callback);
                        }

                        @Override
                        public void onError(String error) {
                            if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + code + ": Unauthorized"));
                        }
                    });
                } else {
                    String err = readStream(conn.getErrorStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + code + ": " + err));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }

    /**
     * Updates user metadata directly inside Supabase GoTrue Auth (/auth/v1/user).
     * Body format: {"data": metadata}
     */
    public static void updateUserAuthMetadata(JSONObject metadata, SupabaseCallback callback) {
        if (!isConfigured() || metadata == null) {
            if (callback != null) mainHandler.post(() -> callback.onError("Supabase not configured or metadata null"));
            return;
        }

        executor.execute(() -> {
            try {
                URL url = new URL(SUPABASE_URL.trim() + "/auth/v1/user");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                JSONObject payload = new JSONObject();
                payload.put("data", metadata);

                byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(bytes, 0, bytes.length);
                    os.flush();
                }

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String resp = readStream(conn.getInputStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onSuccess(resp));
                } else if ((code == 401 || code == 403) && getCachedRefreshToken() != null) {
                    refreshSession(new SupabaseCallback() {
                        @Override
                        public void onSuccess(String refreshBody) {
                            updateUserAuthMetadata(metadata, callback);
                        }

                        @Override
                        public void onError(String error) {
                            if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + code + ": Unauthorized"));
                        }
                    });
                } else {
                    String err = readStream(conn.getErrorStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + code + ": " + err));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }

    /**
     * Sends password recovery email via standard Supabase GoTrue (/auth/v1/recover).
     * Supabase sends the password recovery link directly to the user's email to be reset in their web browser.
     */
    public static void sendPasswordReset(String email, SupabaseCallback callback) {
        if (!isConfigured() || email == null || email.trim().isEmpty()) {
            if (callback != null) mainHandler.post(() -> callback.onError("Invalid email"));
            return;
        }
        executor.execute(() -> {
            try {
                URL url = new URL(SUPABASE_URL.trim() + "/auth/v1/recover");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                JSONObject payload = new JSONObject();
                payload.put("email", email.trim().toLowerCase());

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    if (callback != null) mainHandler.post(() -> callback.onSuccess("OK"));
                } else {
                    String err = readStream(conn.getErrorStream());
                    if (callback != null) mainHandler.post(() -> callback.onError("Error: " + err));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }

    /**
     * Updates the user's password in Supabase GoTrue (/auth/v1/user) using a recovery access token.
     */
    public static void updateUserPassword(String newPassword, String accessToken, SupabaseCallback callback) {
        if (!isConfigured() || newPassword == null || newPassword.trim().isEmpty()) {
            if (callback != null) mainHandler.post(() -> callback.onError("Password cannot be empty"));
            return;
        }

        executor.execute(() -> {
            try {
                URL url = new URL(SUPABASE_URL.trim() + "/auth/v1/user");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                String bearer = (accessToken != null && !accessToken.trim().isEmpty())
                        ? accessToken.trim()
                        : getCachedAccessToken();
                conn.setRequestProperty("Authorization", "Bearer " + bearer);
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                JSONObject payload = new JSONObject();
                payload.put("password", newPassword);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String response = readStream(conn.getInputStream());
                    if (callback != null) mainHandler.post(() -> callback.onSuccess(response));
                } else {
                    String err = readStream(conn.getErrorStream());
                    if (callback != null) mainHandler.post(() -> callback.onError("Password update failed: " + err));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }

    public interface MaintenanceCallback {
        void onResult(boolean isMaintenance, String message);
    }

    public static void checkMaintenanceMode(MaintenanceCallback callback) {
        if (!isConfigured()) {
            if (callback != null) mainHandler.post(() -> callback.onResult(false, null));
            return;
        }

        queryTable("system_settings", "select=*&limit=10", new SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                try {
                    org.json.JSONArray arr = new org.json.JSONArray(responseBody);
                    for (int i = 0; i < arr.length(); i++) {
                        org.json.JSONObject row = arr.getJSONObject(i);
                        String id = row.optString("id", "");
                        org.json.JSONObject settings = row.optJSONObject("settings");
                        if (settings == null) settings = row.optJSONObject("data");

                        if (settings != null) {
                            boolean mm = settings.optBoolean("maintenanceMode", settings.optBoolean("maintenance", false));
                            if (mm) {
                                String msg = settings.optString("maintenanceMessage", "The system is currently undergoing scheduled maintenance. Please check back shortly.");
                                if (callback != null) {
                                    mainHandler.post(() -> callback.onResult(true, msg));
                                }
                                return;
                            }
                        }
                    }
                } catch (Exception ignored) {}

                if (callback != null) {
                    mainHandler.post(() -> callback.onResult(false, null));
                }
            }

            @Override
            public void onError(String error) {
                if (callback != null) {
                    mainHandler.post(() -> callback.onResult(false, null));
                }
            }
        });
    }

    private static String readStream(InputStream is) throws Exception {
        if (is == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        }
    }
}
