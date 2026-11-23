package com.akon.subtools.coordinator.utils;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Supabase Auth Bridge for STC (Coordinator Mobile)
 * Bridges Supabase Auth with Firebase Authentication via Custom Token Exchange.
 */
public class SupabaseAuthBridge {

    // Supabase project credentials
    public static String SUPABASE_URL = "https://yxlnnmskctidhmusjypk.supabase.co"; 
    public static String SUPABASE_ANON_KEY = "sb_publishable_n30MSDl93IlJn2xgOzp7GA_VwVi-t02";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    private static volatile String cachedAccessToken = null;

    public static void setCachedAccessToken(String token) {
        cachedAccessToken = token;
    }

    public static boolean isJwtExpired(String token) {
        if (token == null || token.trim().isEmpty()) return true;
        String trimmed = token.trim();
        if (trimmed.startsWith("sb_publishable_")) return false;
        try {
            String[] parts = trimmed.split("\\.");
            if (parts.length < 2) return false;
            byte[] decoded = android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP | android.util.Base64.NO_PADDING);
            JSONObject payload = new JSONObject(new String(decoded, StandardCharsets.UTF_8));
            long exp = payload.optLong("exp", 0);
            if (exp > 0) {
                // If it expires within the next 30 seconds or has expired, treat as expired
                return (System.currentTimeMillis() / 1000) >= (exp - 30);
            }
        } catch (Exception ignored) {}
        return false;
    }

    public static String getCachedAccessToken() {
        if (cachedAccessToken != null && !cachedAccessToken.trim().isEmpty()) {
            if (!isJwtExpired(cachedAccessToken)) {
                return cachedAccessToken.trim();
            } else {
                cachedAccessToken = null;
            }
        }
        return SUPABASE_ANON_KEY.trim();
    }

    public interface TokenRefreshCallback {
        void onSuccess(String newAccessToken, String newRefreshToken);
        void onError(String error);
    }

    public static void refreshSession(String refreshToken, TokenRefreshCallback callback) {
        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            if (callback != null) callback.onError("No refresh token");
            return;
        }
        executor.execute(() -> {
            try {
                URL url = new URL(SUPABASE_URL.trim() + "/auth/v1/token?grant_type=refresh_token");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                JSONObject body = new JSONObject();
                body.put("refresh_token", refreshToken.trim());
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (conn.getResponseCode() >= 200 && conn.getResponseCode() < 300) {
                    JSONObject res = new JSONObject(readStream(conn.getInputStream()));
                    String newAccess = res.getString("access_token");
                    String newRefresh = res.optString("refresh_token", refreshToken.trim());
                    setCachedAccessToken(newAccess);
                    if (callback != null) {
                        mainHandler.post(() -> callback.onSuccess(newAccess, newRefresh));
                    }
                    return;
                }
            } catch (Exception ignored) {}
            if (callback != null) {
                mainHandler.post(() -> callback.onError("Token refresh failed"));
            }
        });
    }

    public interface SupabaseCallback {
        void onSuccess(String responseBody);
        void onError(String error);
    }

    public static boolean isConfigured() {
        return SUPABASE_URL != null && !SUPABASE_URL.trim().isEmpty() &&
               SUPABASE_ANON_KEY != null && !SUPABASE_ANON_KEY.trim().isEmpty();
    }

    public static void getTableCount(String table, java.util.function.IntConsumer callback) {
        executor.execute(() -> {
            int count = 0;
            try {
                URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?select=id");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("HEAD");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setRequestProperty("Prefer", "count=exact");
                conn.setRequestProperty("Range", "0-0");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                int code = conn.getResponseCode();
                if (code == 401 && cachedAccessToken != null) {
                    cachedAccessToken = null;
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("HEAD");
                    conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                    conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                    conn.setRequestProperty("Prefer", "count=exact");
                    conn.setRequestProperty("Range", "0-0");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                }
                String range = conn.getHeaderField("Content-Range");
                if (range != null && range.contains("/")) {
                    count = Integer.parseInt(range.substring(range.lastIndexOf('/') + 1));
                }
            } catch (Exception ignored) {}
            final int result = count;
            mainHandler.post(() -> {
                if (callback != null) callback.accept(result);
            });
        });
    }

    public static void getTableDepartmentCounts(String table, String department, java.util.function.Consumer<int[]> callback) {
        executor.execute(() -> {
            int totalCount = 0;
            int deptCount = 0;
            String cleanDept = department != null ? department.trim() : "";
            if (cleanDept.isEmpty() || "GENERAL".equalsIgnoreCase(cleanDept) || "ALL".equalsIgnoreCase(cleanDept)) {
                cleanDept = "CSE";
            }
            String target = DepartmentUtils.getDepartmentCode(cleanDept);

            // 1. Query total count using HEAD with Prefer: count=exact
            try {
                URL totalUrl = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?select=id");
                HttpURLConnection conn = (HttpURLConnection) totalUrl.openConnection();
                conn.setRequestMethod("HEAD");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setRequestProperty("Prefer", "count=exact");
                conn.setRequestProperty("Range", "0-0");
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                if (conn.getResponseCode() == 401 && cachedAccessToken != null) {
                    cachedAccessToken = null;
                    conn = (HttpURLConnection) totalUrl.openConnection();
                    conn.setRequestMethod("HEAD");
                    conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                    conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                    conn.setRequestProperty("Prefer", "count=exact");
                    conn.setRequestProperty("Range", "0-0");
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(6000);
                }
                String range = conn.getHeaderField("Content-Range");
                if (range != null && range.contains("/")) {
                    totalCount = Integer.parseInt(range.substring(range.lastIndexOf('/') + 1));
                }
            } catch (Exception ignored) {}

            // 2. Query department count using PostgREST exact filter with HEAD
            try {
                List<String> queryValues = DepartmentUtils.getDepartmentQueryValues(target);
                StringBuilder orParam = new StringBuilder("or=(");
                for (int i = 0; i < queryValues.size(); i++) {
                    if (i > 0) orParam.append(",");
                    orParam.append("department.eq.").append(java.net.URLEncoder.encode(queryValues.get(i), StandardCharsets.UTF_8.name()));
                }
                if ("notices".equalsIgnoreCase(table)) {
                    orParam.append(",department.eq.ALL,department.eq.All%20Departments");
                }
                orParam.append(")&select=id");

                URL deptUrl = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + orParam.toString());
                HttpURLConnection conn = (HttpURLConnection) deptUrl.openConnection();
                conn.setRequestMethod("HEAD");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                conn.setRequestProperty("Prefer", "count=exact");
                conn.setRequestProperty("Range", "0-0");
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                if (conn.getResponseCode() == 401 && cachedAccessToken != null) {
                    cachedAccessToken = null;
                    conn = (HttpURLConnection) deptUrl.openConnection();
                    conn.setRequestMethod("HEAD");
                    conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                    conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                    conn.setRequestProperty("Prefer", "count=exact");
                    conn.setRequestProperty("Range", "0-0");
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(6000);
                }
                String range = conn.getHeaderField("Content-Range");
                if (range != null && range.contains("/")) {
                    deptCount = Integer.parseInt(range.substring(range.lastIndexOf('/') + 1));
                }
            } catch (Exception ignored) {}

            // 3. Fallback scan if deptCount is still 0: Check rows checking both top-level and jsonb data
            if (deptCount == 0 && totalCount > 0) {
                try {
                    URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?select=id,department,data&limit=1000");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                    conn.setRequestProperty("Authorization", "Bearer " + getCachedAccessToken());
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                    if (conn.getResponseCode() == 401 && cachedAccessToken != null) {
                        cachedAccessToken = null;
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                        conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                        conn.setConnectTimeout(8000);
                        conn.setReadTimeout(8000);
                    }
                    if (conn.getResponseCode() >= 200 && conn.getResponseCode() < 300) {
                        String response = readStream(conn.getInputStream());
                        org.json.JSONArray rows = new org.json.JSONArray(response);
                        int count = 0;
                        for (int i = 0; i < rows.length(); i++) {
                            org.json.JSONObject row = rows.optJSONObject(i);
                            if (row == null) continue;
                            String rawDepartment = row.isNull("department") ? "" : row.optString("department", "").trim();
                            if (rawDepartment.isEmpty() || "null".equalsIgnoreCase(rawDepartment)) {
                                org.json.JSONObject data = row.optJSONObject("data");
                                if (data != null && !data.isNull("department")) {
                                    rawDepartment = data.optString("department", "").trim();
                                }
                            }
                            if ("null".equalsIgnoreCase(rawDepartment)) rawDepartment = "";
                            String code = DepartmentUtils.getDepartmentCode(rawDepartment);
                            if (code.equalsIgnoreCase(target) || ("notices".equalsIgnoreCase(table) && ("ALL".equalsIgnoreCase(code) || "GENERAL".equalsIgnoreCase(code)))) {
                                count++;
                            }
                        }
                        deptCount = count;
                    }
                } catch (Exception ignored) {}
            }

            final int[] res = new int[]{totalCount, deptCount};
            mainHandler.post(() -> {
                if (callback != null) callback.accept(res);
            });
        });
    }

    public static void getTableDepartmentCount(String table, String department, java.util.function.IntConsumer callback) {
        getTableDepartmentCounts(table, department, counts -> {
            if (callback != null) callback.accept(counts != null && counts.length > 1 ? counts[1] : 0);
        });
    }

    public static void getCoverPageCounts(String department, java.util.function.Consumer<int[]> callback) {
        executor.execute(() -> {
            int total = 0;
            int departmentCount = 0;
            try {
                String target = department != null ? department.trim().toUpperCase() : "";
                java.util.Set<String> ids = new java.util.HashSet<>();

                for (String table : new String[]{"analytics_cover_pages", "cover_pages"}) {
                    int offset = 0;
                    while (true) {
                        URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?select=*");
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                        conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                        conn.setRequestProperty("Range", offset + "-" + (offset + 999));
                        conn.setRequestProperty("Prefer", "count=exact");
                        conn.setConnectTimeout(10000);
                        conn.setReadTimeout(10000);

                        org.json.JSONArray rows = new org.json.JSONArray(readStream(conn.getInputStream()));
                        for (int i = 0; i < rows.length(); i++) {
                            org.json.JSONObject row = rows.optJSONObject(i);
                            if (row == null) continue;
                            String id = row.optString("id", "");
                            if (id.isEmpty() || !ids.add(id)) continue;
                            total++;

                            org.json.JSONObject data = row.optJSONObject("data");
                            String rawDepartment = row.optString("department", "");
                            if (rawDepartment.isEmpty() && data != null) {
                                rawDepartment = data.optString("department", "");
                            }
                            if (!target.isEmpty() && DepartmentUtils.getDepartmentCode(rawDepartment).equalsIgnoreCase(target)) {
                                departmentCount++;
                            }
                        }

                        if (rows.length() < 1000) break;
                        offset += 1000;
                    }
                }
            } catch (Exception ignored) {}
            final int[] result = new int[]{total, departmentCount};
            mainHandler.post(() -> {
                if (callback != null) callback.accept(result);
            });
        });
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
                    // Remove quotes if plain string returned
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
                if (code == 401 && cachedAccessToken != null) {
                    cachedAccessToken = null;
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                    conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                    code = conn.getResponseCode();
                }

                final int finalCode = code;
                if (finalCode >= 200 && finalCode < 300) {
                    String resp = readStream(conn.getInputStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onSuccess(resp));
                } else {
                    String err = readStream(conn.getErrorStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onError("HTTP " + finalCode + ": " + err));
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

            int code = conn.getResponseCode();
            if (code == 401 && cachedAccessToken != null) {
                cachedAccessToken = null;
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                code = conn.getResponseCode();
            }

            if (code >= 200 && code < 300) {
                String resp = readStream(conn.getInputStream()).trim();
                return new org.json.JSONArray(resp);
            }
        } catch (Exception ignored) {}
        return null;
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

            int code = conn.getResponseCode();
            if (code == 401 && cachedAccessToken != null) {
                cachedAccessToken = null;
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                code = conn.getResponseCode();
            }

            if (code >= 200 && code < 300) {
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
                String endpoint = SUPABASE_URL.trim() + "/rest/v1/" + table;
                if ("notices".equalsIgnoreCase(table)) {
                    endpoint += "?on_conflict=id";
                }
                URL url = new URL(endpoint);
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
     * Executes an asynchronous batch INSERT (POST) or upsert query on a Supabase REST table endpoint.
     */
    public static void insertRecords(String table, JSONArray dataArray, SupabaseCallback callback) {
        if (!isConfigured() || dataArray == null) {
            if (callback != null) mainHandler.post(() -> callback.onError("Supabase not configured or data null"));
            return;
        }
        executor.execute(() -> {
            try {
                String endpoint = SUPABASE_URL.trim() + "/rest/v1/" + table;
                URL url = new URL(endpoint);
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
     * Executes a synchronous INSERT (POST) or upsert query on a Supabase REST table endpoint.
     */
    public static boolean insertRecord(String table, JSONObject data) {
        if (!isConfigured() || data == null) return false;
        try {
            String endpoint = SUPABASE_URL.trim() + "/rest/v1/" + table;
            if ("notices".equalsIgnoreCase(table)) {
                endpoint += "?on_conflict=id";
            }
            URL url = new URL(endpoint);
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
     * Prepares update payloads for Supabase. Specifically, the "users" relation in Supabase
     * is a PostgreSQL view where calculated columns are read-only and base attributes reside
     * inside the "data" JSONB column. Merging into "data" enables atomic updates.
     */
    private static JSONObject prepareUpdatePayload(String table, String queryParams, JSONObject data) {
        if (data == null) return new JSONObject();

        if ("buses".equalsIgnoreCase(table)) {
            try {
                JSONObject currentData = null;
                String queryStr = (queryParams != null && !queryParams.isEmpty()) ? queryParams : "";
                URL getUrl = new URL(SUPABASE_URL.trim() + "/rest/v1/buses?" + queryStr + "&select=data");
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

                // If caller already passed { data: {...} }, unpack it first
                if (data.has("data") && data.optJSONObject("data") != null) {
                    JSONObject inner = data.optJSONObject("data");
                    java.util.Iterator<String> it = inner.keys();
                    while (it.hasNext()) {
                        String k = it.next();
                        currentData.put(k, inner.get(k));
                    }
                }

                // Copy all caller keys into currentData JSONB
                java.util.Iterator<String> it = data.keys();
                while (it.hasNext()) {
                    String key = it.next();
                    if (!"data".equals(key)) {
                        currentData.put(key, data.get(key));
                    }
                }

                // Extract tracking link
                String gpsUrl = "";
                if (data.has("tracking_link")) {
                    gpsUrl = data.optString("tracking_link", "").trim();
                } else if (data.has("gpsUrl")) {
                    gpsUrl = data.optString("gpsUrl", "").trim();
                } else if (data.has("liveTrackingUrl")) {
                    gpsUrl = data.optString("liveTrackingUrl", "").trim();
                }

                if (!gpsUrl.isEmpty()) {
                    currentData.put("gpsUrl", gpsUrl);
                    currentData.put("liveTrackingUrl", gpsUrl);
                    currentData.put("tracking_link", gpsUrl);
                }

                JSONObject wrapped = new JSONObject();
                wrapped.put("data", currentData);

                // Set allowed root columns on buses table
                if (data.has("tracking_link") || data.has("gpsUrl") || data.has("liveTrackingUrl")) {
                    wrapped.put("tracking_link", gpsUrl.isEmpty() ? JSONObject.NULL : gpsUrl);
                }
                if (data.has("name")) wrapped.put("name", data.get("name"));
                if (data.has("route")) wrapped.put("route", data.get("route"));
                if (data.has("routeId") && !wrapped.has("route")) wrapped.put("route", data.get("routeId"));
                if (data.has("driver_name")) wrapped.put("driver_name", data.get("driver_name"));
                if (data.has("driver") && !wrapped.has("driver_name")) wrapped.put("driver_name", data.get("driver"));
                if (data.has("driver_phone")) wrapped.put("driver_phone", data.get("driver_phone"));
                if (data.has("driverPhone") && !wrapped.has("driver_phone")) wrapped.put("driver_phone", data.get("driverPhone"));

                return wrapped;
            } catch (Exception e) {
                return data;
            }
        }

        if (!"users".equalsIgnoreCase(table) || data.has("data")) {
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
        if (!isConfigured() || queryParams == null) return false;
        try {
            URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryParams);
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
                URL url = new URL(SUPABASE_URL.trim() + "/rest/v1/" + table + "?" + queryParams);
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
        void onSuccess(String accessToken, String refreshToken, String userId, String email, JSONObject appMetadata, JSONObject userMetadata);
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
                    try {
                        URL rpcUrl = new URL(SUPABASE_URL.trim() + "/rest/v1/rpc/get_email_by_identifier");
                        HttpURLConnection rpcConn = (HttpURLConnection) rpcUrl.openConnection();
                        rpcConn.setRequestMethod("POST");
                        rpcConn.setRequestProperty("Content-Type", "application/json");
                        rpcConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                        rpcConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                        rpcConn.setDoOutput(true);
                        rpcConn.setConnectTimeout(8000);
                        rpcConn.setReadTimeout(8000);

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
                    } catch (Exception ignored) {}

                    // Secondary fallback: query public.users directly if RPC didn't resolve
                    if (!android.util.Patterns.EMAIL_ADDRESS.matcher(resolvedEmail).matches()) {
                        try {
                            String enc = java.net.URLEncoder.encode(emailOrId.trim(), "UTF-8");
                            String userQuery = "or=(student_id.eq." + enc + ",phone.eq." + enc + ",studentId.eq." + enc + ")&select=email";
                            URL tableUrl = new URL(SUPABASE_URL.trim() + "/rest/v1/users?" + userQuery);
                            HttpURLConnection tConn = (HttpURLConnection) tableUrl.openConnection();
                            tConn.setRequestMethod("GET");
                            tConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                            tConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
                            tConn.setConnectTimeout(6000);
                            tConn.setReadTimeout(6000);
                            if (tConn.getResponseCode() >= 200 && tConn.getResponseCode() < 300) {
                                String tResp = readStream(tConn.getInputStream()).trim();
                                JSONArray tArr = new JSONArray(tResp);
                                if (tArr.length() > 0) {
                                    String em = tArr.getJSONObject(0).optString("email", "");
                                    if (android.util.Patterns.EMAIL_ADDRESS.matcher(em).matches()) {
                                        resolvedEmail = em;
                                    }
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                }

                // If still not a valid email, identifier lookup failed
                if (!android.util.Patterns.EMAIL_ADDRESS.matcher(resolvedEmail).matches()) {
                    mainHandler.post(() -> callback.onFailure("No staff account found matching identifier: " + emailOrId));
                    return;
                }

                // 2. GoTrue login
                URL authUrl = new URL(SUPABASE_URL.trim() + "/auth/v1/token?grant_type=password");
                HttpURLConnection authConn = (HttpURLConnection) authUrl.openConnection();
                authConn.setRequestMethod("POST");
                authConn.setRequestProperty("Content-Type", "application/json");
                authConn.setRequestProperty("apikey", SUPABASE_ANON_KEY.trim());
                authConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY.trim());
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
                String refreshToken = authResponse.optString("refresh_token", "");
                cachedAccessToken = accessToken;
                JSONObject userObj = authResponse.getJSONObject("user");
                String uid = userObj.getString("id");
                JSONObject appMeta = userObj.optJSONObject("app_metadata");
                JSONObject userMeta = userObj.optJSONObject("user_metadata");

                final JSONObject finalUserMeta = userMeta != null ? userMeta : new JSONObject();
                final JSONObject finalAppMeta = appMeta != null ? appMeta : new JSONObject();

                // Merge roles, role, is_admin from userObj directly if present
                if (userObj.has("roles") && !finalUserMeta.has("roles")) {
                    try { finalUserMeta.put("roles", userObj.get("roles")); } catch (Exception ignored) {}
                }
                if (userObj.has("role") && !finalUserMeta.has("role")) {
                    try { finalUserMeta.put("role", userObj.get("role")); } catch (Exception ignored) {}
                }
                if (userObj.has("is_admin") && !finalUserMeta.has("is_admin")) {
                    try { finalUserMeta.put("is_admin", userObj.getBoolean("is_admin")); } catch (Exception ignored) {}
                }

                // Decode JWT access_token payload to extract custom claims like roles or claims_admin
                try {
                    String[] parts = accessToken.split("\\.");
                    if (parts.length >= 2) {
                        byte[] decoded = android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP | android.util.Base64.NO_PADDING);
                        JSONObject jwtPayload = new JSONObject(new String(decoded, StandardCharsets.UTF_8));
                        if (jwtPayload.has("roles") && !finalUserMeta.has("roles")) {
                            finalUserMeta.put("roles", jwtPayload.get("roles"));
                        }
                        if (jwtPayload.has("role") && !finalUserMeta.has("role")) {
                            finalUserMeta.put("role", jwtPayload.get("role"));
                        }
                        if (jwtPayload.has("is_admin") && !finalUserMeta.has("is_admin")) {
                            finalUserMeta.put("is_admin", jwtPayload.optBoolean("is_admin", false));
                        }
                        JSONObject jUserMeta = jwtPayload.optJSONObject("user_metadata");
                        if (jUserMeta != null && jUserMeta.has("roles") && !finalUserMeta.has("roles")) {
                            finalUserMeta.put("roles", jUserMeta.get("roles"));
                        }
                        JSONObject jAppMeta = jwtPayload.optJSONObject("app_metadata");
                        if (jAppMeta != null && jAppMeta.has("roles") && !finalAppMeta.has("roles")) {
                            finalAppMeta.put("roles", jAppMeta.get("roles"));
                        }
                    }
                } catch (Exception ignored) {}

                final String finalEmail = resolvedEmail;
                mainHandler.post(() -> callback.onSuccess(accessToken, refreshToken, uid, finalEmail, finalAppMeta, finalUserMeta));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onFailure("Supabase connection error: " + (e.getMessage() != null ? e.getMessage() : "Unknown error")));
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
                    String resp = readStream(conn.getInputStream()).trim();
                    if (callback != null) mainHandler.post(() -> callback.onSuccess(resp));
                } else {
                    String err = readStream(conn.getErrorStream()).trim();
                    String msg = "Failed to update password.";
                    try {
                        JSONObject errObj = new JSONObject(err);
                        if (errObj.has("msg")) msg = errObj.getString("msg");
                        else if (errObj.has("message")) msg = errObj.getString("message");
                        else if (errObj.has("error_description")) msg = errObj.getString("error_description");
                    } catch (Exception ignored) {}
                    final String finalMsg = msg;
                    if (callback != null) mainHandler.post(() -> callback.onError(finalMsg));
                }
            } catch (Exception e) {
                if (callback != null) mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error"));
            }
        });
    }
}
