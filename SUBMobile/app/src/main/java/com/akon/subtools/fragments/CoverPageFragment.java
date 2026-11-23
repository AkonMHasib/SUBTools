package com.akon.subtools.fragments;

import android.app.DatePickerDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.akon.subtools.R;
import com.akon.subtools.databinding.FragmentCoverPageBinding;
import com.akon.subtools.models.Routine;
import com.akon.subtools.models.Subject;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.DepartmentHelper;
import com.akon.subtools.utils.PdfGenerator;
import com.akon.subtools.utils.SupabaseAuthBridge;
import com.akon.subtools.viewmodels.AuthViewModel;
import com.akon.subtools.viewmodels.RoutineViewModel;
import com.akon.subtools.viewmodels.SubjectViewModel;

import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CoverPageFragment extends Fragment {
    private FragmentCoverPageBinding binding;
    private AuthViewModel authViewModel;
    private SubjectViewModel subjectViewModel;
    private RoutineViewModel routineViewModel;

    private User currentUser;
    private final List<Subject> studentEnrolledSubjects = new ArrayList<>();
    private final List<Routine> allRoutines = new ArrayList<>();
    
    private final String[] examTypes = {"Assignment", "Midterm Exam", "Final Exam", "Lab Report", "Project Proposal", "Presentation"};
    private final String[] templates = {
            "Classic Standard",
            "Modern Minimalist",
            "Double Border Elite",
            "Emerald Dotted Border",
            "Formal Grid Table",
            "Header & Footer Accent",
            "Modern Green Horizon",
            "Pro Academic Frame",
            "Clean Simple Layout",
            "Watermark Crest Edition",
            "Dark Emerald Premium",
            "Nordic Elegant Edition",
            "Teal Gradient Wave",
            "Corporate Executive Suite",
            "Classic Printmaster",
            "Modern Studio Edition",
            "Pro Framed Executive",
            "Formal Institutional",
            "Header & Footer Elite",
            "Clean Typographic",
            "Watermark Gold Edition"
    };
    private final String[] fonts = {
            "Poppins", "Roboto", "Inter", "Source Sans Pro", "Arial", 
            "Montserrat", "Bebas Neue", "League Spartan", "Playfair Display", 
            "Oswald", "Space Grotesk", "Cormorant Garamond"
    };

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentCoverPageBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        authViewModel = new ViewModelProvider(requireActivity()).get(AuthViewModel.class);
        subjectViewModel = new ViewModelProvider(this).get(SubjectViewModel.class);
        routineViewModel = new ViewModelProvider(this).get(RoutineViewModel.class);

        setupExamTypeSpinner();
        setupTemplatesSpinner();
        setupFontsSpinner();
        setupObservers();
        setupListeners();

        subjectViewModel.loadSubjects();
        // Load routines from Room cache only (no Firestore hit)
        routineViewModel.loadRoutines();
    }

    private void setupExamTypeSpinner() {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(requireContext(), R.layout.item_spinner_selected, examTypes);
        adapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerExamType.setAdapter(adapter);
    }

    private void setupTemplatesSpinner() {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(requireContext(), R.layout.item_spinner_selected, templates);
        adapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerTemplates.setAdapter(adapter);
    }

    private void setupFontsSpinner() {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(requireContext(), R.layout.item_spinner_selected, fonts);
        adapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerFonts.setAdapter(adapter);
    }

    private void setupObservers() {
        authViewModel.getUserLiveData().observe(getViewLifecycleOwner(), user -> {
            if (user != null) {
                currentUser = user;
                String dept = user.getDepartment() != null ? user.getDepartment() : "";
                if (!dept.isEmpty()) {
                    subjectViewModel.loadSubjectsForDept(dept);
                } else {
                    subjectViewModel.loadSubjects();
                }
                matchEnrolledSubjects();
            }
        });

        subjectViewModel.getSubjectsList().observe(getViewLifecycleOwner(), subjects -> {
            if (subjects != null) {
                matchEnrolledSubjects();
            }
        });

        routineViewModel.getRoutineList().observe(getViewLifecycleOwner(), routines -> {
            if (routines != null) {
                allRoutines.clear();
                allRoutines.addAll(routines);
                if (binding != null && binding.spinnerSubjects.getSelectedItemPosition() >= 0) {
                    updateTeacherNameFromRoutine(binding.spinnerSubjects.getSelectedItemPosition());
                }
            }
        });

        subjectViewModel.getLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        });
    }

    private boolean isSubjectEnrolled(String subjectCode, List<String> enrolledList) {
        if (subjectCode == null || enrolledList == null) return false;
        for (String e : enrolledList) {
            if (e != null && com.akon.subtools.utils.AcademicHelper.isSameSubjectCode(subjectCode, e)) {
                return true;
            }
        }
        return false;
    }

    private void matchEnrolledSubjects() {
        if (currentUser == null) return;

        List<Subject> allSubjects = subjectViewModel.getSubjectsList().getValue();
        List<String> enrolledCodes = currentUser.getSubjects();
        studentEnrolledSubjects.clear();

        if (enrolledCodes != null && !enrolledCodes.isEmpty()) {
            java.util.Set<String> matched = new java.util.HashSet<>();
            if (allSubjects != null) {
                for (Subject s : allSubjects) {
                    if (s != null && isSubjectEnrolled(s.getCode(), enrolledCodes)) {
                        String clean = com.akon.subtools.utils.AcademicHelper.normalizeSubjectCode(s.getCode());
                        if (!matched.contains(clean)) {
                            matched.add(clean);
                            studentEnrolledSubjects.add(s);
                        }
                    }
                }
            }
            // Include enrolled codes that might not be in allSubjects (matching web portal)
            for (String code : enrolledCodes) {
                if (code != null && !code.trim().isEmpty()) {
                    String clean = com.akon.subtools.utils.AcademicHelper.normalizeSubjectCode(code);
                    if (!matched.contains(clean)) {
                        matched.add(clean);
                        Subject fallback = new Subject();
                        fallback.setCode(code.trim());
                        fallback.setName(code.trim());
                        fallback.setDepartment(currentUser.getDepartment() != null ? currentUser.getDepartment() : "");
                        studentEnrolledSubjects.add(fallback);
                    }
                }
            }
        }

        // STRICTLY DO NOT FALLBACK TO ALL UNIVERSITY COURSES
        List<String> displayList = new ArrayList<>();
        if (studentEnrolledSubjects.isEmpty()) {
            displayList.add("No enrolled subjects (Select in Subject Manager)");
        } else {
            for (Subject s : studentEnrolledSubjects) {
                displayList.add(s.getCode() + " - " + s.getName());
            }
        }

        if (getContext() == null || binding == null) return;
        ArrayAdapter<String> adapter = new ArrayAdapter<>(requireContext(), R.layout.item_spinner_selected, displayList);
        adapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerSubjects.setAdapter(adapter);

        binding.spinnerSubjects.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                if (!studentEnrolledSubjects.isEmpty()) {
                    updateTeacherNameFromRoutine(position);
                } else {
                    if (binding != null) {
                        binding.inputTeacher.setText("");
                    }
                }
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        if (!studentEnrolledSubjects.isEmpty()) {
            updateTeacherNameFromRoutine(0);
        } else {
            if (binding != null) {
                binding.inputTeacher.setText("");
            }
        }
    }

    private void updateTeacherNameFromRoutine(int position) {
        if (position < 0 || position >= studentEnrolledSubjects.size()) return;
        Subject selectedSubject = studentEnrolledSubjects.get(position);
        if (selectedSubject == null) return;

        // 1. Try from already-loaded in-memory routines first (instant, no DB hit)
        String foundTeacher = findTeacherInList(allRoutines, selectedSubject);
        if (!foundTeacher.isEmpty()) {
            if (binding != null) {
                binding.inputTeacher.setText(foundTeacher);
            }
            return;
        }

        // Clear previous teacher name while searching
        if (binding != null) {
            binding.inputTeacher.setText("");
        }

        // 2. allRoutines not yet loaded or empty match — read directly from Room on background thread (no Firestore hit)
        Context ctx = getContext();
        if (ctx == null) return;
        Context appContext = ctx.getApplicationContext();

        com.akon.subtools.database.AppDatabase.databaseWriteExecutor.execute(() -> {
            try {
                List<Routine> cachedRoutines = com.akon.subtools.database.AppDatabase
                        .getDatabase(appContext)
                        .routineDao()
                        .getAllRoutines();

                if (cachedRoutines != null && !cachedRoutines.isEmpty()) {
                    String teacher = findTeacherInList(cachedRoutines, selectedSubject);
                    if (isAdded() && getActivity() != null) {
                        final String finalTeacher = teacher;
                        getActivity().runOnUiThread(() -> {
                            allRoutines.clear();
                            allRoutines.addAll(cachedRoutines);
                            if (binding != null && !finalTeacher.isEmpty()) {
                                binding.inputTeacher.setText(finalTeacher);
                            }
                        });
                    }
                }
            } catch (Exception ignored) {}
        });
    }

    private String findTeacherInList(List<Routine> routines, Subject selectedSubject) {
        if (routines == null || routines.isEmpty() || selectedSubject == null) return "";

        String subCode = selectedSubject.getCode() != null ? selectedSubject.getCode() : "";
        String subName = selectedSubject.getName() != null ? selectedSubject.getName() : "";

        String cleanSubCode = com.akon.subtools.utils.AcademicHelper.normalizeSubjectCode(subCode);
        String cleanSubName = subName.replaceAll("[^a-zA-Z0-9]", "").toUpperCase().trim();

        // 1st Pass: Alphanumeric match on code (e.g., CSE 1101 vs CSE-1101 vs CSE1101)
        if (!cleanSubCode.isEmpty()) {
            for (Routine r : routines) {
                if (r == null || r.getTeachers() == null || r.getTeachers().isEmpty()) continue;

                String rotCode = r.getCode() != null ? r.getCode() : "";
                String cleanRotCode = com.akon.subtools.utils.AcademicHelper.normalizeSubjectCode(rotCode);

                if (!cleanRotCode.isEmpty()) {
                    if (cleanRotCode.equals(cleanSubCode) || cleanRotCode.startsWith(cleanSubCode) || cleanSubCode.startsWith(cleanRotCode)) {
                        String formatted = formatTeachers(r.getTeachers());
                        if (!formatted.isEmpty()) return formatted;
                    }
                }
            }
        }

        // 2nd Pass: Subject name matching or code contained in subject string (Uppercase normalized)
        for (Routine r : routines) {
            if (r == null || r.getTeachers() == null || r.getTeachers().isEmpty()) continue;

            String rotCode = r.getCode() != null ? r.getCode() : "";
            String rotSubject = r.getSubject() != null ? r.getSubject() : "";

            String cleanRotCode = rotCode.replaceAll("[^a-zA-Z0-9]", "").toUpperCase().trim();
            String cleanRotSubject = rotSubject.replaceAll("[^a-zA-Z0-9]", "").toUpperCase().trim();

            boolean codeMatch = !cleanSubCode.isEmpty() && !cleanRotCode.isEmpty() && (cleanRotCode.contains(cleanSubCode) || cleanSubCode.contains(cleanRotCode));
            boolean nameMatch = !cleanSubName.isEmpty() && !cleanRotSubject.isEmpty() && (cleanRotSubject.contains(cleanSubName) || cleanSubName.contains(cleanRotSubject));
            boolean codeInSubject = !cleanSubCode.isEmpty() && !cleanRotSubject.isEmpty() && cleanRotSubject.contains(cleanSubCode);

            if (codeMatch || nameMatch || codeInSubject) {
                String formatted = formatTeachers(r.getTeachers());
                if (!formatted.isEmpty()) return formatted;
            }
        }

        return "";
    }

    private String formatTeachers(List<String> teachers) {
        if (teachers == null || teachers.isEmpty()) return "";
        List<String> valid = new ArrayList<>();
        for (String t : teachers) {
            if (t != null && !t.trim().isEmpty()) {
                // If a single string has commas like "Teacher A, Teacher B"
                String[] split = t.split("(?i)[,\\n\\r/]+|\\band\\b");
                for (String s : split) {
                    String clean = s.trim();
                    if (!clean.isEmpty() && !valid.contains(clean)) {
                        valid.add(clean);
                    }
                }
            }
        }
        return android.text.TextUtils.join("\n", valid);
    }

    private void setupListeners() {
        // Date picker for Submission Date
        binding.inputSubmissionDate.setOnClickListener(v -> {
            Calendar calendar = Calendar.getInstance();
            int year = calendar.get(Calendar.YEAR);
            int month = calendar.get(Calendar.MONTH);
            int day = calendar.get(Calendar.DAY_OF_MONTH);

            DatePickerDialog datePickerDialog = new DatePickerDialog(
                    requireContext(),
                    (view, selectedYear, selectedMonth, selectedDay) -> {
                        String dateStr = selectedDay + "/" + (selectedMonth + 1) + "/" + selectedYear;
                        binding.inputSubmissionDate.setText(dateStr);
                    }, year, month, day);
            datePickerDialog.show();
        });

        // Stage 1 -> Stage 2 Navigation
        binding.btnNextToTemplates.setOnClickListener(v -> {
            if (currentUser == null) {
                Toast.makeText(getContext(), "Please wait for profile details to load.", Toast.LENGTH_SHORT).show();
                return;
            }
            if (studentEnrolledSubjects.isEmpty()) {
                Toast.makeText(getContext(), "Please select your enrolled subjects in Subject Manager first.", Toast.LENGTH_LONG).show();
                return;
            }

            String title = binding.inputAssignmentTitle.getText().toString().trim();
            String num = binding.inputAssignmentNum.getText().toString().trim();
            String date = binding.inputSubmissionDate.getText().toString().trim();
            String teacherName = binding.inputTeacher.getText().toString().trim();

            if (TextUtils.isEmpty(title)) {
                binding.inputAssignmentTitle.setError("Title is required");
                return;
            }
            if (TextUtils.isEmpty(num)) {
                binding.inputAssignmentNum.setError("Number is required");
                return;
            }
            if (TextUtils.isEmpty(date)) {
                binding.inputSubmissionDate.setError("Submission date is required");
                return;
            }
            if (TextUtils.isEmpty(teacherName)) {
                binding.inputTeacher.setError("Teacher Name is required");
                return;
            }

            // Switch to Stage 2: Template selection
            binding.layoutStage1Info.setVisibility(View.GONE);
            binding.layoutStage2Templates.setVisibility(View.VISIBLE);
        });

        // Stage 2 -> Stage 1 Navigation
        binding.btnBackToInfo.setOnClickListener(v -> {
            binding.layoutStage2Templates.setVisibility(View.GONE);
            binding.layoutStage1Info.setVisibility(View.VISIBLE);
        });

        // Generate PDF
        binding.btnGeneratePdf.setOnClickListener(v -> {
            if (currentUser == null || studentEnrolledSubjects.isEmpty()) return;

            String title = binding.inputAssignmentTitle.getText().toString().trim();
            String num = binding.inputAssignmentNum.getText().toString().trim();
            String date = binding.inputSubmissionDate.getText().toString().trim();
            String teacherName = binding.inputTeacher.getText().toString().trim();

            int subjectPos = binding.spinnerSubjects.getSelectedItemPosition();
            Subject selectedSubject = studentEnrolledSubjects.get(subjectPos);

            String examType = binding.spinnerExamType.getSelectedItem() != null ? binding.spinnerExamType.getSelectedItem().toString() : "Assignment";
            String selectedTemplate = binding.spinnerTemplates.getSelectedItem().toString();
            String selectedFont = binding.spinnerFonts.getSelectedItem().toString();

            // Show loading progress
            binding.progressBar.setVisibility(View.VISIBLE);
            binding.btnGeneratePdf.setEnabled(false);

            PdfGenerator.generateAssignmentCover(
                    requireContext(),
                    currentUser,
                    selectedSubject.getCode(),
                    selectedSubject.getName(),
                    teacherName,
                    title,
                    num,
                    examType,
                    date,
                    "",
                    selectedTemplate,
                    selectedFont,
                    new PdfGenerator.PdfCallback() {
                        @Override
                        public void onSuccess(File pdfFile) {
                            binding.progressBar.setVisibility(View.GONE);
                            binding.btnGeneratePdf.setEnabled(true);
                            if (pdfFile != null) {
                                PdfGenerator.printPdf(requireContext(), pdfFile);
                            }
                            sendCoverPageAnalytics(currentUser, selectedSubject.getCode(), selectedSubject.getName(), selectedTemplate, selectedFont, examType);
                        }

                        @Override
                        public void onFailure(Exception e) {
                            binding.progressBar.setVisibility(View.GONE);
                            binding.btnGeneratePdf.setEnabled(true);
                            Toast.makeText(getContext(), "Failed to generate PDF: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    }
            );
        });
    }

    private void sendCoverPageAnalytics(User user, String subjectCode, String subjectName, String template, String font, String examType) {
        if (user == null) return;
        try {
            SharedPreferences prefs = requireContext().getSharedPreferences("analytics_prefs", Context.MODE_PRIVATE);
            long lastSent = prefs.getLong("last_cover_analytics_time", 0);
            long now = System.currentTimeMillis();

            if (now - lastSent < 30000) return;
            prefs.edit().putLong("last_cover_analytics_time", now).apply();

            JSONObject payload = new JSONObject();
            payload.put("id", "cp-" + now);
            payload.put("user_id", user.getUid() != null ? user.getUid() : "");
            payload.put("template_id", template != null ? template : "");

            JSONObject data = new JSONObject();
            data.put("subject", subjectName != null ? subjectName : "");
            data.put("subjectCode", subjectCode != null ? subjectCode : "");
            data.put("department", user.getDepartment() != null ? DepartmentHelper.getDeptCode(user.getDepartment()) : "");
            data.put("term", "");
            data.put("template", template != null ? template : "");
            data.put("font", font != null ? font : "");
            data.put("examType", examType != null ? examType : "");
            data.put("studentId", user.getStudentId() != null ? user.getStudentId() : "");
            data.put("studentName", user.getName() != null ? user.getName() : "");
            data.put("timestamp", now);

            payload.put("data", data);

            SupabaseAuthBridge.insertRecord("analytics_cover_pages", payload, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String responseBody) {}

                @Override
                public void onError(String error) {}
            });
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
