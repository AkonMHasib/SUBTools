package com.akon.subtools.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.akon.subtools.models.Subject;
import com.akon.subtools.models.User;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

public class CreditHelper {

    private static final Map<String, Double> DEFAULT_CREDITS = new HashMap<>();

    static {
        DEFAULT_CREDITS.put("CSE", 140.0);
        DEFAULT_CREDITS.put("DSE", 140.0);
        DEFAULT_CREDITS.put("B.PHARM", 164.0);
        DEFAULT_CREDITS.put("PHARMACY", 164.0);
        DEFAULT_CREDITS.put("LLB", 140.0);
        DEFAULT_CREDITS.put("LAW", 140.0);
        DEFAULT_CREDITS.put("BBA", 130.0);
        DEFAULT_CREDITS.put("ENGLISH", 130.0);
        DEFAULT_CREDITS.put("ENG", 130.0);
        DEFAULT_CREDITS.put("EEE", 144.0);
        DEFAULT_CREDITS.put("ARCH", 190.0);
        DEFAULT_CREDITS.put("ARCHITECTURE", 190.0);
        DEFAULT_CREDITS.put("ES", 140.0);
        DEFAULT_CREDITS.put("FENS", 145.0);
        DEFAULT_CREDITS.put("JCMS", 140.0);
        DEFAULT_CREDITS.put("MIB", 140.0);
        DEFAULT_CREDITS.put("MICROBIOLOGY", 140.0);
        DEFAULT_CREDITS.put("DEFAULT", 140.0);
    }

    public static double getTotalRequiredCredits(Context context, String department) {
        String deptCode = DepartmentHelper.getDeptCode(department);
        if (context != null) {
            SharedPreferences prefs = context.getSharedPreferences("app_credits_prefs", Context.MODE_PRIVATE);
            float cached = prefs.getFloat("credit_" + deptCode.toUpperCase(), -1f);
            if (cached > 0) return (double) cached;

            // Check alias variations in cache
            if ("ENG".equalsIgnoreCase(deptCode) || "ENGLISH".equalsIgnoreCase(deptCode)) {
                float v = prefs.getFloat("credit_ENGLISH", -1f);
                if (v <= 0) v = prefs.getFloat("credit_ENG", -1f);
                if (v > 0) return (double) v;
            } else if ("ARCH".equalsIgnoreCase(deptCode) || "ARCHITECTURE".equalsIgnoreCase(deptCode)) {
                float v = prefs.getFloat("credit_ARCH", -1f);
                if (v <= 0) v = prefs.getFloat("credit_ARCHITECTURE", -1f);
                if (v > 0) return (double) v;
            } else if ("LLB".equalsIgnoreCase(deptCode) || "LAW".equalsIgnoreCase(deptCode)) {
                float v = prefs.getFloat("credit_LLB", -1f);
                if (v <= 0) v = prefs.getFloat("credit_LAW", -1f);
                if (v > 0) return (double) v;
            } else if ("B.PHARM".equalsIgnoreCase(deptCode) || "PHARMACY".equalsIgnoreCase(deptCode)) {
                float v = prefs.getFloat("credit_B.PHARM", -1f);
                if (v <= 0) v = prefs.getFloat("credit_PHARMACY", -1f);
                if (v > 0) return (double) v;
            }
        }

        if (deptCode != null && DEFAULT_CREDITS.containsKey(deptCode.toUpperCase())) {
            return DEFAULT_CREDITS.get(deptCode.toUpperCase());
        }
        return DEFAULT_CREDITS.get("DEFAULT");
    }

    public static void syncDepartmentCredits(Context context) {
        if (!SupabaseAuthBridge.isConfigured() || context == null) return;
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                JSONArray arr = SupabaseAuthBridge.queryTable("system_settings", "id=eq.department_credits&select=*");
                if (arr != null && arr.length() > 0) {
                    JSONObject row = arr.getJSONObject(0);
                    JSONObject data = row.optJSONObject("data");
                    if (data == null) data = row.optJSONObject("settings");
                    if (data != null) {
                        SharedPreferences.Editor editor = context.getSharedPreferences("app_credits_prefs", Context.MODE_PRIVATE).edit();
                        java.util.Iterator<String> keys = data.keys();
                        while (keys.hasNext()) {
                            String k = keys.next();
                            double val = data.optDouble(k, 0.0);
                            if (val > 0) {
                                editor.putFloat("credit_" + k.toUpperCase().trim(), (float) val);
                            }
                        }
                        editor.apply();
                    }
                }
            } catch (Exception ignored) {}
        });
    }

    public static double calculateTermCredits(List<Subject> allSubjects, List<String> enrolledCodes) {
        if (allSubjects == null || enrolledCodes == null) return 0.0;
        double total = 0.0;
        for (Subject s : allSubjects) {
            if (s != null && s.getCode() != null && s.getCredit() != null) {
                String clean = AcademicHelper.normalizeSubjectCode(s.getCode());
                for (String enc : enrolledCodes) {
                    if (enc != null && AcademicHelper.normalizeSubjectCode(enc).equals(clean)) {
                        try {
                            total += Double.parseDouble(s.getCredit().trim());
                        } catch (NumberFormatException ignored) {}
                        break;
                    }
                }
            }
        }
        return total;
    }
}
