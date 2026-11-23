package com.akon.subtools.coordinator.utils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class DepartmentUtils {

    private static final Map<String, String> CODE_TO_NAME_MAP = new LinkedHashMap<>();
    private static final Map<String, String> NAME_TO_CODE_MAP = new LinkedHashMap<>();

    static {
        addDepartment("CSE", "B.Sc. in Computer Science & Engineering (CSE)");
        addDepartment("DSE", "B.Sc. in Data Science and Engineering");
        addDepartment("ARCH", "Bachelor of Architecture (B.Arch)");
        addDepartment("BBA", "Bachelor of Business Administration");
        addDepartment("ENG", "BA (Hons) in English");
        addDepartment("ES", "B.Sc. in Environmental Science");
        addDepartment("FENS", "B.Sc. in Food Engineering and Nutrition Science");
        addDepartment("JCMS", "BSS (Hons) in Journalism, Communication and Media Studies");
        addDepartment("LLB", "LL.B. (Hons) - Bachelor of Laws");
        addDepartment("B.PHARM", "B. Pharm (Bachelor of Pharmacy)");
        addDepartment("MIB", "Bachelor of Science in Microbiology");

        // Code aliases for bi-directional resolution
        NAME_TO_CODE_MAP.put("COMPUTER SCIENCE & ENGINEERING", "CSE");
        NAME_TO_CODE_MAP.put("COMPUTER SCIENCE AND ENGINEERING", "CSE");
        NAME_TO_CODE_MAP.put("DATA SCIENCE & ENGINEERING", "DSE");
        NAME_TO_CODE_MAP.put("DATA SCIENCE AND ENGINEERING", "DSE");
        NAME_TO_CODE_MAP.put("ARCHITECTURE", "ARCH");
        NAME_TO_CODE_MAP.put("B.ARCH", "ARCH");
        NAME_TO_CODE_MAP.put("BUS", "BBA");
        NAME_TO_CODE_MAP.put("BUSINESS", "BBA");
        NAME_TO_CODE_MAP.put("BUSINESS STUDIES", "BBA");
        NAME_TO_CODE_MAP.put("BUSINESS ADMINISTRATION", "BBA");
        NAME_TO_CODE_MAP.put("ENV", "ES");
        NAME_TO_CODE_MAP.put("ENVIRONMENTAL SCIENCE", "ES");
        NAME_TO_CODE_MAP.put("FOOD ENGINEERING & NUTRITION SCIENCE", "FENS");
        NAME_TO_CODE_MAP.put("FOOD ENGINEERING AND NUTRITION SCIENCE", "FENS");
        NAME_TO_CODE_MAP.put("JOURNALISM, COMMUNICATION & MEDIA STUDIES", "JCMS");
        NAME_TO_CODE_MAP.put("JOURNALISM, COMMUNICATION AND MEDIA STUDIES", "JCMS");
        NAME_TO_CODE_MAP.put("LAW", "LLB");
        NAME_TO_CODE_MAP.put("LAWS", "LLB");
        NAME_TO_CODE_MAP.put("BACHELOR OF LAWS", "LLB");
        NAME_TO_CODE_MAP.put("LL.B. (HONS)", "LLB");
        NAME_TO_CODE_MAP.put("PHAR", "B.PHARM");
        NAME_TO_CODE_MAP.put("PHARM", "B.PHARM");
        NAME_TO_CODE_MAP.put("PHARMACY", "B.PHARM");
        NAME_TO_CODE_MAP.put("BACHELOR OF PHARMACY", "B.PHARM");
        NAME_TO_CODE_MAP.put("B.PHARMA", "B.PHARM");
        NAME_TO_CODE_MAP.put("BPHARM", "B.PHARM");
        NAME_TO_CODE_MAP.put("ENGLISH", "ENG");
        NAME_TO_CODE_MAP.put("ENGLISH STUDIES", "ENG");
        NAME_TO_CODE_MAP.put("PHR", "B.PHARM");
        NAME_TO_CODE_MAP.put("ALL", "ALL");
        NAME_TO_CODE_MAP.put("ALL DEPARTMENTS", "ALL");
        NAME_TO_CODE_MAP.put("GENERAL", "ALL");
        NAME_TO_CODE_MAP.put("GLOBAL", "ALL");
        NAME_TO_CODE_MAP.put("UNIVERSITY", "ALL");
    }

    private static void addDepartment(String code, String name) {
        CODE_TO_NAME_MAP.put(code, name);
        NAME_TO_CODE_MAP.put(code.toUpperCase(), code);
        NAME_TO_CODE_MAP.put(name.toUpperCase(), code);
    }

    public static boolean isAllDepartments(String raw) {
        if (raw == null || raw.trim().isEmpty()) return true;
        String upper = raw.trim().toUpperCase();
        return "ALL".equals(upper)
                || "ALL DEPARTMENTS".equals(upper)
                || "GENERAL".equals(upper)
                || "GLOBAL".equals(upper)
                || "UNIVERSITY".equals(upper);
    }

    /**
     * Returns the full human-readable department name for a given code or alias (e.g. "CSE" -> "Computer Science & Engineering").
     */
    public static String getDepartmentFullName(String raw) {
        if (isAllDepartments(raw)) {
            return "All Departments";
        }
        String clean = raw.trim();
        String code = getDepartmentCode(clean);
        switch (code) {
            case "CSE": return "Department of Computer Science & Engineering";
            case "ARCH": return "Department of Architecture";
            case "BBA": return "Department of Business Administration";
            case "ENG": return "Department of English";
            case "LLB": return "Department of Law";
            case "B.PHARM": return "Department of Pharmacy";
            case "DSE": return "Department of Data Science & Engineering";
            case "ES": return "Department of Environmental Science";
            case "FENS": return "Department of Food Engineering & Nutrition Science";
            case "JCMS": return "Department of Journalism & Media Studies";
            case "MIB": return "Department of Microbiology";
            default:
                if (CODE_TO_NAME_MAP.containsKey(code)) {
                    return CODE_TO_NAME_MAP.get(code);
                }
                return clean;
        }
    }

    public static String inferDepartmentFromEmail(String email) {
        if (email == null || email.trim().isEmpty()) return null;
        String lower = email.toLowerCase().trim();
        if (lower.contains(".arch.") || lower.contains("_arch_") || lower.contains("arch")) return "ARCH";
        if (lower.contains(".cse.") || lower.contains("_cse_")) return "CSE";
        if (lower.contains(".dse.") || lower.contains("_dse_")) return "DSE";
        if (lower.contains(".bba.") || lower.contains("business")) return "BBA";
        if (lower.contains(".eng.") || lower.contains("english")) return "ENG";
        if (lower.contains(".law.") || lower.contains("llb")) return "LLB";
        if (lower.contains(".phar.") || lower.contains("pharm") || lower.contains("bpharm")) return "B.PHARM";
        if (lower.contains(".mib.") || lower.contains("micro")) return "MIB";
        if (lower.contains(".env.") || lower.contains(".es.")) return "ES";
        if (lower.contains(".fens.")) return "FENS";
        if (lower.contains(".jcms.")) return "JCMS";
        return null;
    }

    /**
     * Normalizes any raw department string/name/alias into its official short uppercase code (e.g. "Computer Science & Engineering" -> "CSE").
     */
    public static String getDepartmentCode(String raw) {
        if (isAllDepartments(raw)) {
            return "ALL";
        }
        String upper = raw.trim().toUpperCase();
        if (NAME_TO_CODE_MAP.containsKey(upper)) {
            return NAME_TO_CODE_MAP.get(upper);
        }
        if (CODE_TO_NAME_MAP.containsKey(upper)) {
            return upper;
        }
        return upper;
    }

    public static List<String> getDepartmentCodes() {
        return new ArrayList<>(CODE_TO_NAME_MAP.keySet());
    }

    public static List<String> getDepartmentFullNames() {
        return new ArrayList<>(CODE_TO_NAME_MAP.values());
    }

    /**
     * Returns known persisted representations for a department. This supports
     * indexed Firestore queries while legacy documents are gradually normalized.
     */
    public static List<String> getDepartmentQueryValues(String raw) {
        String code = getDepartmentCode(raw);
        List<String> values = new ArrayList<>();
        values.add(code);

        String fullName = CODE_TO_NAME_MAP.get(code);
        if (fullName != null && !values.contains(fullName)) {
            values.add(fullName);
        }

        for (Map.Entry<String, String> entry : NAME_TO_CODE_MAP.entrySet()) {
            if (code.equals(entry.getValue()) && !values.contains(entry.getKey())) {
                values.add(entry.getKey());
            }
        }
        return values;
    }

    /**
     * Normalizes section strings so that A=1, B=2, C=3, D=4, E=5:
     * "A" -> "A/1", "1" -> "A/1", "A/1" -> "A/1"
     * "B" -> "B/2", "2" -> "B/2", "B/2" -> "B/2"
     * "C" -> "C/3", "3" -> "C/3", "C/3" -> "C/3"
     * "D" -> "D/4", "4" -> "D/4", "D/4" -> "D/4"
     * "E" -> "E/5", "5" -> "E/5", "E/5" -> "E/5"
     * "All", "All Sections" -> "All"
     * "N/A" -> "N/A"
     */
    public static String normalizeSection(String raw) {
        if (raw == null || raw.trim().isEmpty()) return "All";
        String s = raw.trim().toUpperCase();
        if (s.equals("A") || s.equals("1") || s.equals("A/1") || s.equals("1/A") || s.equals("SECTION A") || s.equals("SECTION 1")) return "A/1";
        if (s.equals("B") || s.equals("2") || s.equals("B/2") || s.equals("2/B") || s.equals("SECTION B") || s.equals("SECTION 2")) return "B/2";
        if (s.equals("C") || s.equals("3") || s.equals("C/3") || s.equals("3/C") || s.equals("SECTION C") || s.equals("SECTION 3")) return "C/3";
        if (s.equals("D") || s.equals("4") || s.equals("D/4") || s.equals("4/D") || s.equals("SECTION D") || s.equals("SECTION 4")) return "D/4";
        if (s.equals("E") || s.equals("5") || s.equals("E/5") || s.equals("5/E") || s.equals("SECTION E") || s.equals("SECTION 5")) return "E/5";
        if (s.contains("ALL")) return "All";
        if (s.equals("N/A") || s.equals("NA") || s.equals("NONE")) return "N/A";
        return s;
    }

    public static boolean isSectionMatch(String sec1, String sec2) {
        if (sec1 == null || sec2 == null) return true;
        String n1 = normalizeSection(sec1);
        String n2 = normalizeSection(sec2);
        if ("All".equalsIgnoreCase(n1) || "All".equalsIgnoreCase(n2)) return true;
        return n1.equalsIgnoreCase(n2);
    }
}
