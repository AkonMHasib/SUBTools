package com.akon.subtools.coordinator.utils;

import com.opencsv.CSVReader;
import com.akon.subtools.coordinator.data.model.ClassRoutine;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.StringReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class ExcelCsvParser {

    public static List<ClassRoutine> parseContent(String content, String defaultDept) throws Exception {
        if (content == null || content.trim().isEmpty()) {
            return new ArrayList<>();
        }

        String trimmed = content.trim();
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
            return parseJson(trimmed, defaultDept);
        } else {
            return parseCsv(trimmed, defaultDept);
        }
    }

    private static List<ClassRoutine> parseCsv(String csvContent, String defaultDept) throws Exception {
        List<ClassRoutine> result = new ArrayList<>();
        try (CSVReader reader = new CSVReader(new StringReader(csvContent))) {
            List<String[]> lines = reader.readAll();
            if (lines.isEmpty()) return result;

            // Check header row indices
            String[] header = lines.get(0);
            int codeIdx = -1, subjectIdx = -1, termIdx = -1, dayIdx = -1, startIdx = -1, endIdx = -1, towerIdx = -1, roomIdx = -1, teacherIdx = -1, levelIdx = -1;

            for (int i = 0; i < header.length; i++) {
                String h = header[i].toLowerCase().trim().replace("_", "").replace(" ", "");
                if (h.contains("code")) codeIdx = i;
                else if (h.contains("subject") || h.contains("course") || h.contains("title")) subjectIdx = i;
                else if (h.contains("term") || h.contains("semester")) termIdx = i;
                else if (h.contains("day") || h.contains("weekday")) dayIdx = i;
                else if (h.contains("start")) startIdx = i;
                else if (h.contains("end")) endIdx = i;
                else if (h.contains("tower") || h.contains("building")) towerIdx = i;
                else if (h.contains("room") || h.contains("class")) roomIdx = i;
                else if (h.contains("teacher") || h.contains("faculty")) teacherIdx = i;
                else if (h.contains("level") || h.contains("year")) levelIdx = i;
            }

            int startRow = (codeIdx != -1 || subjectIdx != -1) ? 1 : 0;

            for (int r = startRow; r < lines.size(); r++) {
                String[] row = lines.get(r);
                if (row.length == 0 || (row.length == 1 && row[0].trim().isEmpty())) continue;

                ClassRoutine routine = new ClassRoutine();
                routine.setDepartment(defaultDept);

                String code = getVal(row, codeIdx, 0);
                String subject = getVal(row, subjectIdx, 1);
                String day = getVal(row, dayIdx, 2);
                String startTime = getVal(row, startIdx, 3);
                String endTime = getVal(row, endIdx, 4);
                String room = getVal(row, roomIdx, 5);
                String tower = getVal(row, towerIdx, 6);
                String teacherStr = getVal(row, teacherIdx, 7);
                String term = getVal(row, termIdx, 8);
                String level = getVal(row, levelIdx, 9);

                routine.setCode(code);
                routine.setSubject(subject);
                routine.setDay(day);
                routine.setStartTime(startTime);
                routine.setEndTime(endTime);
                routine.setClassroom(room);
                routine.setTower(tower.isEmpty() ? "Shadhinota Tower" : tower);
                routine.setTerm(term.isEmpty() ? "Term 1" : term);
                routine.setAcademicLevel(level.isEmpty() ? "Undergraduate" : level);

                if (!teacherStr.isEmpty()) {
                    String[] teachers = teacherStr.split("[,/;|]");
                    List<String> teacherList = new ArrayList<>();
                    for (String t : teachers) {
                        if (!t.trim().isEmpty()) teacherList.add(t.trim());
                    }
                    routine.setTeachers(teacherList);
                } else {
                    routine.setTeachers(Arrays.asList("TBA"));
                }

                result.add(routine);
            }
        }
        return result;
    }

    private static List<ClassRoutine> parseJson(String jsonContent, String defaultDept) throws Exception {
        List<ClassRoutine> result = new ArrayList<>();
        JSONArray array;
        if (jsonContent.startsWith("{")) {
            JSONObject obj = new JSONObject(jsonContent);
            array = obj.optJSONArray("routines");
            if (array == null) array = obj.optJSONArray("data");
            if (array == null) return result;
        } else {
            array = new JSONArray(jsonContent);
        }

        for (int i = 0; i < array.length(); i++) {
            JSONObject obj = array.getJSONObject(i);
            ClassRoutine routine = new ClassRoutine();
            routine.setDepartment(defaultDept);
            routine.setCode(obj.optString("code", obj.optString("courseCode", "")));
            routine.setSubject(obj.optString("subject", obj.optString("subjectName", obj.optString("name", ""))));
            routine.setTerm(obj.optString("term", "Term 1"));
            routine.setAcademicLevel(obj.optString("academicLevel", "Undergraduate"));
            routine.setDay(obj.optString("day", obj.optString("weekday", "")));
            routine.setStartTime(obj.optString("startTime", ""));
            routine.setEndTime(obj.optString("endTime", ""));
            routine.setTower(obj.optString("tower", "Shadhinota Tower"));
            routine.setClassroom(obj.optString("classroom", obj.optString("room", "")));

            JSONArray teachersArr = obj.optJSONArray("teachers");
            if (teachersArr != null) {
                List<String> tList = new ArrayList<>();
                for (int t = 0; t < teachersArr.length(); t++) {
                    tList.add(teachersArr.getString(t));
                }
                routine.setTeachers(tList);
            } else if (obj.has("teacher")) {
                routine.setTeachers(Arrays.asList(obj.getString("teacher")));
            }

            result.add(routine);
        }

        return result;
    }

    private static String getVal(String[] row, int explicitIdx, int fallbackIdx) {
        if (explicitIdx != -1 && explicitIdx < row.length) {
            return row[explicitIdx].trim();
        }
        if (fallbackIdx < row.length) {
            return row[fallbackIdx].trim();
        }
        return "";
    }
}
