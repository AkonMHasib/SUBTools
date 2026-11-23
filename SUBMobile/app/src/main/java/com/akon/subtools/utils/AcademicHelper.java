package com.akon.subtools.utils;

import com.akon.subtools.models.Routine;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class AcademicHelper {

    public static String getDeptCode(String dept) {
        return DepartmentHelper.getDeptCode(dept);
    }

    public static String normalizeSubjectCode(String code) {
        if (code == null) return "";
        return code.replaceAll("[^a-zA-Z0-9]", "").toUpperCase().trim();
    }

    public static boolean isSameSubjectCode(String code1, String code2) {
        if (code1 == null || code2 == null) return false;
        String n1 = normalizeSubjectCode(code1);
        String n2 = normalizeSubjectCode(code2);
        return !n1.isEmpty() && n1.equals(n2);
    }

    public static boolean isSameDay(String d1, String d2) {
        if (d1 == null || d2 == null) return false;
        String clean1 = d1.trim().toLowerCase();
        String clean2 = d2.trim().toLowerCase();
        if (clean1.equals(clean2)) return true;        
        if (clean1.startsWith("sat") && clean2.startsWith("sat")) return true;
        if (clean1.startsWith("sun") && clean2.startsWith("sun")) return true;
        if (clean1.startsWith("mon") && clean2.startsWith("mon")) return true;
        if (clean1.startsWith("tue") && clean2.startsWith("tue")) return true;
        if (clean1.startsWith("wed") && clean2.startsWith("wed")) return true;
        if (clean1.startsWith("thu") && clean2.startsWith("thu")) return true;
        if (clean1.startsWith("fri") && clean2.startsWith("fri")) return true;
        return false;
    }

    public static long calculateAdmissionDate(String system, String currentTerm, long currentDateMs) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(currentDateMs);
        
        int termNumber = 1;
        try {
            String clean = currentTerm.replaceAll("[^0-9]", "");
            termNumber = Integer.parseInt(clean);
        } catch (Exception ignored) {}
        
        int currentYear = cal.get(Calendar.YEAR);
        int currentMonth = cal.get(Calendar.MONTH);
        
        Calendar termStart = Calendar.getInstance();
        termStart.set(Calendar.YEAR, currentYear);
        termStart.set(Calendar.HOUR_OF_DAY, 0);
        termStart.set(Calendar.MINUTE, 0);
        termStart.set(Calendar.SECOND, 0);
        termStart.set(Calendar.MILLISECOND, 0);
        
        int monthsPerTerm = 6;
        if ("Trimester".equalsIgnoreCase(system)) {
            monthsPerTerm = 4;
            if (currentMonth >= Calendar.SEPTEMBER) {
                termStart.set(Calendar.MONTH, Calendar.SEPTEMBER);
                termStart.set(Calendar.DAY_OF_MONTH, 1);
            } else if (currentMonth >= Calendar.MAY) {
                termStart.set(Calendar.MONTH, Calendar.MAY);
                termStart.set(Calendar.DAY_OF_MONTH, 1);
            } else {
                termStart.set(Calendar.MONTH, Calendar.JANUARY);
                termStart.set(Calendar.DAY_OF_MONTH, 1);
            }
        } else {
            monthsPerTerm = 6;
            if (currentMonth >= Calendar.JULY) {
                termStart.set(Calendar.MONTH, Calendar.JULY);
                termStart.set(Calendar.DAY_OF_MONTH, 1);
            } else {
                termStart.set(Calendar.MONTH, Calendar.JANUARY);
                termStart.set(Calendar.DAY_OF_MONTH, 1);
            }
        }
        
        termStart.add(Calendar.MONTH, -(termNumber - 1) * monthsPerTerm);
        return termStart.getTimeInMillis();
    }

    public static int calculateCurrentLevel(String system, long admissionDateMs, long currentDateMs) {
        Calendar adminCal = Calendar.getInstance();
        adminCal.setTimeInMillis(admissionDateMs);
        
        Calendar currentCal = Calendar.getInstance();
        currentCal.setTimeInMillis(currentDateMs);

        int currentYear = currentCal.get(Calendar.YEAR);
        int currentMonth = currentCal.get(Calendar.MONTH);
        
        Calendar currentTermStart = Calendar.getInstance();
        currentTermStart.set(Calendar.YEAR, currentYear);
        currentTermStart.set(Calendar.HOUR_OF_DAY, 0);
        currentTermStart.set(Calendar.MINUTE, 0);
        currentTermStart.set(Calendar.SECOND, 0);
        currentTermStart.set(Calendar.MILLISECOND, 0);

        int monthsPerTerm = 6;
        if ("Trimester".equalsIgnoreCase(system)) {
            monthsPerTerm = 4;
            if (currentMonth >= Calendar.SEPTEMBER) {
                currentTermStart.set(Calendar.MONTH, Calendar.SEPTEMBER);
                currentTermStart.set(Calendar.DAY_OF_MONTH, 1);
            } else if (currentMonth >= Calendar.MAY) {
                currentTermStart.set(Calendar.MONTH, Calendar.MAY);
                currentTermStart.set(Calendar.DAY_OF_MONTH, 1);
            } else {
                currentTermStart.set(Calendar.MONTH, Calendar.JANUARY);
                currentTermStart.set(Calendar.DAY_OF_MONTH, 1);
            }
        } else {
            monthsPerTerm = 6;
            if (currentMonth >= Calendar.JULY) {
                currentTermStart.set(Calendar.MONTH, Calendar.JULY);
                currentTermStart.set(Calendar.DAY_OF_MONTH, 1);
            } else {
                currentTermStart.set(Calendar.MONTH, Calendar.JANUARY);
                currentTermStart.set(Calendar.DAY_OF_MONTH, 1);
            }
        }

        int diffYears = currentTermStart.get(Calendar.YEAR) - adminCal.get(Calendar.YEAR);
        int diffMonths = diffYears * 12 + (currentTermStart.get(Calendar.MONTH) - adminCal.get(Calendar.MONTH));

        int elapsedTerms = diffMonths / monthsPerTerm;
        if (elapsedTerms < 0) {
            elapsedTerms = 0;
        }

        return 1 + elapsedTerms;
    }

    public static String getAcademicLevelString(String system, int level) {
        int maxVal = 8;
        String prefix = "Semester ";
        if ("Architecture".equalsIgnoreCase(system)) {
            maxVal = 10;
            prefix = "Studio ";
        } else if ("Trimester".equalsIgnoreCase(system)) {
            maxVal = 12;
            prefix = "Trimester ";
        }
        
        if (level > maxVal) {
            return "Completed";
        }
        return prefix + level;
    }

    public static String calculateCurrentSeason(String system, long currentDateMs) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(currentDateMs);
        int month = cal.get(Calendar.MONTH);
        
        if ("Trimester".equalsIgnoreCase(system)) {
            if (month >= Calendar.SEPTEMBER) {
                return "Fall";
            } else if (month >= Calendar.MAY) {
                return "Summer";
            } else {
                return "Spring";
            }
        } else {
            if (month >= Calendar.JULY) {
                return "Fall";
            } else {
                return "Spring";
            }
        }
    }

    public static String getSeasonWithYear(String system, long currentDateMs) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(currentDateMs);
        String season = calculateCurrentSeason(system, currentDateMs);
        int year = cal.get(Calendar.YEAR);
        return season + " " + year;
    }

    public static int parseTimeToMinutes(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) return 9999;
        String cleanStr = timeStr.trim().toUpperCase();
        try {
            boolean isPM = cleanStr.contains("PM");
            boolean isAM = cleanStr.contains("AM");
            String digits = cleanStr.replaceAll("[^0-9:]", "");
            String[] parts = digits.split(":");
            if (parts.length >= 1 && !parts[0].isEmpty()) {
                int hour = Integer.parseInt(parts[0]);
                int minute = parts.length >= 2 && !parts[1].isEmpty() ? Integer.parseInt(parts[1]) : 0;
                
                if (isPM && hour < 12) {
                    hour += 12;
                } else if (isAM && hour == 12) {
                    hour = 0;
                }
                return hour * 60 + minute;
            }
        } catch (Exception ignored) {}
        return 9999;
    }

    public static boolean isSameTermOrLevel(String studentTerm, String routineTerm) {
        if (studentTerm == null || studentTerm.trim().isEmpty()) {
            return true;
        }
        if (routineTerm == null || routineTerm.trim().isEmpty() || "all".equalsIgnoreCase(routineTerm.trim())) {
            return true;
        }

        String sClean = studentTerm.trim().toLowerCase();
        String sDigits = sClean.replaceAll("[^0-9]", "");

        String[] parts = routineTerm.split("[,/;|]");
        for (String p : parts) {
            String pClean = p.trim().toLowerCase();
            if (pClean.isEmpty() || "all".equals(pClean)) return true;

            String pDigits = pClean.replaceAll("[^0-9]", "");

            // If both contain numbers (e.g. Semester 1 vs Semester 10), they must match numerically
            if (!sDigits.isEmpty() && !pDigits.isEmpty()) {
                if (sDigits.equals(pDigits)) {
                    return true;
                }
                // Digits do not match -> not the same term
                continue;
            }

            if (pClean.equals(sClean)) {
                return true;
            }
        }

        return false;
    }

    public static boolean matchesSection(String studentSection, String routineSection) {
        if (studentSection == null || studentSection.trim().isEmpty()) {
            return true;
        }
        if (routineSection == null || routineSection.trim().isEmpty() || "all".equalsIgnoreCase(routineSection.trim())) {
            return true;
        }

        String sClean = studentSection.trim().toUpperCase();
        String sLetter = sClean.replaceAll("[^A-Z]", "");
        if (sLetter.isEmpty()) sLetter = sClean;

        String[] parts = routineSection.split("[,;|]");
        for (String p : parts) {
            String pClean = p.trim().toUpperCase();
            if (pClean.isEmpty() || "ALL".equals(pClean) || "N/A".equals(pClean) || "NOT APPLICABLE".equals(pClean) || "NA".equals(pClean)) return true;

            String pLetter = pClean.replaceAll("[^A-Z]", "");
            if (pLetter.isEmpty()) pLetter = pClean;

            if (sClean.equals(pClean) || sLetter.equalsIgnoreCase(pLetter) || pClean.contains(sClean) || sClean.contains(pClean)) {
                return true;
            }
        }

        return false;
    }

    public static List<Routine> filterPersonalizedRoutine(
            List<Routine> allRoutines,
            String department,
            String term,
            String section,
            List<String> studentSubjects,
            List<String> completedSubjects
    ) {
        List<Routine> result = new ArrayList<>();
        if (allRoutines == null || studentSubjects == null || studentSubjects.isEmpty()) {
            return result;
        }

        String studentDeptCode = getDeptCode(department);
        java.util.Set<String> addedRoutineKeys = new java.util.HashSet<>();

        // 1. Build set of completed / passed subject codes
        java.util.Set<String> completedCodeSet = new java.util.HashSet<>();
        if (completedSubjects != null) {
            for (String comp : completedSubjects) {
                if (comp == null || comp.trim().isEmpty()) continue;
                String normComp = normalizeSubjectCode(comp);
                if (!normComp.isEmpty()) {
                    completedCodeSet.add(normComp);
                }
            }
        }

        // 2. Filter active enrolled subjects from auth data (excluding any passed/completed subjects)
        List<String> activeSubjects = new ArrayList<>();
        for (String sub : studentSubjects) {
            if (sub == null || sub.trim().isEmpty()) continue;
            String normSub = normalizeSubjectCode(sub);
            if (!normSub.isEmpty() && !completedCodeSet.contains(normSub)) {
                activeSubjects.add(normSub);
            }
        }

        // If student has no active enrolled subjects, strictly return empty (never fall back to all routines)
        if (activeSubjects.isEmpty()) {
            return result;
        }

        // 3. Match routines strictly for active enrolled subjects and current term
        for (Routine r : allRoutines) {
            if (r == null) continue;

            String routineDeptCode = getDeptCode(r.getDepartment());
            boolean matchesDept = studentDeptCode.isEmpty()
                    || routineDeptCode.isEmpty()
                    || routineDeptCode.equalsIgnoreCase("ALL")
                    || routineDeptCode.contains("ALL")
                    || studentDeptCode.equalsIgnoreCase(routineDeptCode);

            if (!matchesDept) continue;
            if (!matchesSection(section, r.getSection())) continue;

            String sanitizedRotCode = normalizeSubjectCode(r.getCode());
            String sanitizedRotSubject = r.getSubject() != null
                    ? r.getSubject().replaceAll("[^a-zA-Z0-9]", "").toUpperCase() : "";

            // Check if routine is for a passed/completed subject -> skip!
            if ((!sanitizedRotCode.isEmpty() && completedCodeSet.contains(sanitizedRotCode))
                    || (!sanitizedRotSubject.isEmpty() && completedCodeSet.contains(sanitizedRotSubject))) {
                continue;
            }

            // Strictly match subjects selected by the student
            boolean matchesSubject = false;
            for (String subCode : activeSubjects) {
                if (!sanitizedRotCode.isEmpty()) {
                    if (sanitizedRotCode.equals(subCode)) {
                        matchesSubject = true;
                        break;
                    }
                } else if (!sanitizedRotSubject.isEmpty() && sanitizedRotSubject.equals(subCode)) {
                    matchesSubject = true;
                    break;
                }
            }

            if (!matchesSubject) {
                continue;
            }

            String key = (r.getId() != null && !r.getId().trim().isEmpty())
                    ? r.getId().trim()
                    : (r.getCode() + "_" + r.getDay() + "_" + r.getStartTime() + "_" + r.getEndTime() + "_" + r.getClassroom());
            if (!addedRoutineKeys.contains(key)) {
                addedRoutineKeys.add(key);
                result.add(r);
            }
        }

        // Return ONLY matching personalized routines. Strictly no fallback to all routines!
        return result;
    }

    public static List<Routine> filterPersonalizedRoutine(List<Routine> allRoutines, String department, String term, String section, List<String> studentSubjects) {
        return filterPersonalizedRoutine(allRoutines, department, term, section, studentSubjects, null);
    }

    public static List<Routine> filterPersonalizedRoutine(List<Routine> allRoutines, String department, String term, List<String> studentSubjects) {
        return filterPersonalizedRoutine(allRoutines, department, term, "", studentSubjects, null);
    }

    public static boolean checkAndApplyProgression(com.akon.subtools.models.User user) {
        if (user == null) {
            return false;
        }
        
        String system = user.getAcademicSystem() != null ? user.getAcademicSystem() : "Semester";
        long now = System.currentTimeMillis();
        String calculatedSeasonStr = getSeasonWithYear(system, now);
        
        boolean modified = false;
        
        if ("Trimester".equalsIgnoreCase(system)) {
            if (!calculatedSeasonStr.equals(user.getTrimester())) {
                user.setTrimester(calculatedSeasonStr);
                modified = true;
            }
            if (user.getSemester() != null) {
                user.setSemester(null);
                modified = true;
            }
        } else {
            if (!calculatedSeasonStr.equals(user.getSemester())) {
                user.setSemester(calculatedSeasonStr);
                modified = true;
            }
            if (user.getTrimester() != null) {
                user.setTrimester(null);
                modified = true;
            }
        }
        if (modified) {
            // Term/season updated when semester/trimester progresses.
            // Completed credits are preserved and managed directly via Subject Manager.
        }
        
        return modified;
    }
}
