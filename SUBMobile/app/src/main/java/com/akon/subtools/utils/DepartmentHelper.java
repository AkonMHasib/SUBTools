package com.akon.subtools.utils;

/**
 * Central authority for all department code/name resolution across the app.
 *
 * Internal standard:
 *   - Always use shortcodes (ARCH, CSE, etc.) for Firestore queries, filtering, and storage.
 *   - Use getFullDepartmentName() for UI display (returns e.g. "Architecture").
 *   - Use getDeptCode() to normalize any input (full name or code) to a standard shortcode.
 */
public class DepartmentHelper {

    /**
     * Official canonical SUB department codes matching Admin Panel:
     * CSE, DSE, ARCH, BBA, ENG, ES, FENS, JCMS, LLB, B.PHARM, MIB.
     */
    public static final String[] ALL_CODES = {
        "CSE", "DSE", "ARCH", "BBA", "ENG", "ES", "FENS", "JCMS", "LLB", "B.PHARM", "MIB"
    };

    public static final String[] ALL_NAMES = {
        "B.Sc. in Computer Science & Engineering (CSE)",
        "B.Sc. in Data Science and Engineering",
        "Bachelor of Architecture (B.Arch)",
        "Bachelor of Business Administration",
        "BA (Hons) in English",
        "B.Sc. in Environmental Science",
        "B.Sc. in Food Engineering and Nutrition Science",
        "BSS (Hons) in Journalism, Communication and Media Studies",
        "LL.B. (Hons) - Bachelor of Laws",
        "B. Pharm (Bachelor of Pharmacy)",
        "Bachelor of Science in Microbiology"
    };

    /**
     * Standard centralized options for department filter dropdowns.
     */
    public static String[] getDepartmentFilterOptions() {
        return new String[]{
            "All Departments", "CSE", "DSE", "ARCH", "BBA", "ENG", "ES", "FENS", "JCMS", "LLB", "B.PHARM", "MIB"
        };
    }

    /**
     * Normalizes any department input (shortcode, legacy alias, or full name) to its standard canonical shortcode.
     */
    public static String getDeptCode(String input) {
        if (input == null || input.trim().isEmpty()) return "";
        String upper = input.trim().toUpperCase()
                .replace("DEPARTMENT OF ", "")
                .replace("DEPT OF ", "")
                .trim();

        if (upper.equals("CSE") || upper.contains("COMPUTER SCIENCE")) return "CSE";
        if (upper.equals("DSE") || upper.contains("DATA SCIENCE")) return "DSE";
        if (upper.equals("ARCH") || upper.contains("ARCHITECTURE") || upper.contains("B.ARCH")) return "ARCH";
        if (upper.equals("BBA") || upper.equals("BUS") || upper.contains("BUSINESS")) return "BBA";
        if (upper.equals("ENG") || upper.equals("ENGLISH") || upper.contains("ENGLISH STUDIES")) return "ENG";
        if (upper.equals("ES") || upper.equals("ENV") || upper.contains("ENVIRONMENTAL")) return "ES";
        if (upper.equals("FENS") || upper.contains("FOOD ENGINEERING")) return "FENS";
        if (upper.equals("JCMS") || upper.equals("JCM") || upper.contains("JOURNALISM") || upper.contains("MEDIA")) return "JCMS";
        if (upper.equals("LLB") || upper.equals("LAW") || upper.contains("LAWS") || upper.contains("LL.B") || upper.contains("LLB")) return "LLB";
        if (upper.equals("B.PHARM") || upper.equals("PHAR") || upper.equals("PHARMACY") || upper.contains("PHARM")) return "B.PHARM";
        if (upper.equals("MIB") || upper.equals("MICROBIOLOGY") || upper.equals("MIC")) return "MIB";

        return upper;
    }

    /**
    /**
     * Returns the Display Name (without "Department of " prefix unless requested).
     */
    public static String getFullDepartmentName(String code) {
        if (code == null || code.trim().isEmpty() || "N/A".equalsIgnoreCase(code.trim())) {
            return "N/A";
        }
        if ("All Departments".equalsIgnoreCase(code.trim())) {
            return "All Departments";
        }
        String normalized = getDeptCode(code);
        switch (normalized) {
            case "CSE":     return "B.Sc. in Computer Science & Engineering (CSE)";
            case "DSE":     return "B.Sc. in Data Science and Engineering";
            case "ARCH":    return "Bachelor of Architecture (B.Arch)";
            case "BBA":     return "Bachelor of Business Administration";
            case "ENG":     return "BA (Hons) in English";
            case "ES":      return "B.Sc. in Environmental Science";
            case "FENS":    return "B.Sc. in Food Engineering and Nutrition Science";
            case "JCMS":    return "BSS (Hons) in Journalism, Communication and Media Studies";
            case "LLB":     return "LL.B. (Hons) - Bachelor of Laws";
            case "B.PHARM": return "B. Pharm (Bachelor of Pharmacy)";
            case "MIB":     return "Bachelor of Science in Microbiology";
            default:
                String lower = code.trim().toLowerCase();
                if (lower.startsWith("department of ")) {
                    return code.substring(14).trim();
                }
                return code.trim();
        }
    }

    /**
     * Returns a clean, concise, user-friendly department name suitable for user badges and cards
     * (e.g. "Architecture", "Computer Science & Engineering", "Pharmacy", "Data Science & Engineering").
     */
    public static String getUserFriendlyDeptName(String code) {
        if (code == null || code.trim().isEmpty() || "N/A".equalsIgnoreCase(code.trim())) {
            return "General";
        }
        String normalized = getDeptCode(code);
        switch (normalized) {
            case "CSE":     return "Computer Science & Engineering";
            case "DSE":     return "Data Science & Engineering";
            case "ARCH":    return "Architecture";
            case "BBA":     return "Business Administration";
            case "ENG":     return "English";
            case "ES":      return "Environmental Science";
            case "FENS":    return "Food Engineering & Nutrition Science";
            case "JCMS":    return "Journalism & Media Studies";
            case "LLB":     return "Law (LL.B.)";
            case "B.PHARM": return "Pharmacy";
            case "MIB":     return "Microbiology";
            default:
                return getFullDepartmentName(code);
        }
    }

    /**
     * Returns the Cover Page Department Name formatted as "Department of <Academic Department>".
     * Canonical standard: B.PHARM -> "Department of Pharmacy".
     */
    public static String getCoverPageDeptName(String code) {
        String normalized = getDeptCode(code);
        switch (normalized) {
            case "CSE":     return "Department of Computer Science & Engineering";
            case "DSE":     return "Department of Data Science and Engineering";
            case "ARCH":    return "Department of Architecture";
            case "BBA":     return "Department of Business Administration";
            case "ENG":     return "Department of English";
            case "ES":      return "Department of Environmental Science";
            case "FENS":    return "Department of Food Engineering and Nutrition Science";
            case "JCMS":    return "Department of Journalism, Communication and Media Studies";
            case "LLB":     return "Department of Law";
            case "B.PHARM": return "Department of Pharmacy";
            case "MIB":     return "Department of Microbiology";
            default:
                String fullName = getFullDepartmentName(code);
                if (fullName == null || fullName.trim().isEmpty() || "N/A".equalsIgnoreCase(fullName.trim())) {
                    return "Department of Computer Science & Engineering";
                }
                if (fullName.toLowerCase().startsWith("department of ")) {
                    return fullName;
                }
                return "Department of " + fullName;
        }
    }
}
