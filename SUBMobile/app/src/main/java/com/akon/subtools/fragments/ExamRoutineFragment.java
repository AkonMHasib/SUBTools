package com.akon.subtools.fragments;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.akon.subtools.R;
import com.akon.subtools.adapters.ExamRoutineAdapter;
import com.akon.subtools.models.ExamRoutine;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.DepartmentHelper;
import com.akon.subtools.utils.SupabaseAuthBridge;
import com.akon.subtools.viewmodels.AuthViewModel;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class ExamRoutineFragment extends Fragment {

    private RecyclerView recyclerView;
    private ExamRoutineAdapter adapter;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private LinearLayout layoutEmpty;
    private EditText etSearch;
    private Spinner spinnerDept;
    private Spinner spinnerExamType;

    private final List<ExamRoutine> allExams = new ArrayList<>();
    private final List<ExamRoutine> filteredExams = new ArrayList<>();

    private String selectedDept = "All";
    private String selectedType = "All";
    private String currentSearch = "";
    private User currentUser;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_exam_routine, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        recyclerView = view.findViewById(R.id.recycler_exam_routine);
        swipeRefresh = view.findViewById(R.id.swipe_refresh_exams);
        progressBar = view.findViewById(R.id.progress_exam_loading);
        layoutEmpty = view.findViewById(R.id.layout_exam_empty);
        etSearch = view.findViewById(R.id.et_exam_search);
        spinnerDept = view.findViewById(R.id.spinner_exam_dept);
        spinnerExamType = view.findViewById(R.id.spinner_exam_type);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new ExamRoutineAdapter();
        recyclerView.setAdapter(adapter);

        setupDeptSpinner();
        setupExamTypeSpinner();
        setupSearch();

        swipeRefresh.setOnRefreshListener(this::loadExams);

        // Fetch current user department if available and restrict to student's department
        AuthViewModel authViewModel = new ViewModelProvider(requireActivity()).get(AuthViewModel.class);
        authViewModel.getUserLiveData().observe(getViewLifecycleOwner(), user -> {
            currentUser = user;
            if (user != null && user.getDepartment() != null && !user.getDepartment().trim().isEmpty()) {
                String normalizedDept = DepartmentHelper.getDeptCode(user.getDepartment().trim());
                selectedDept = normalizedDept;
                selectDeptInSpinner(normalizedDept);
                if (spinnerDept != null) {
                    spinnerDept.setEnabled(false); // Locked to student's department
                }
                applyFilter();
            }
        });

        loadExams();
    }

    private void setupDeptSpinner() {
        String[] depts = DepartmentHelper.getDepartmentFilterOptions();
        ArrayAdapter<String> spinnerAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, depts);
        spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerDept.setAdapter(spinnerAdapter);

        spinnerDept.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                if (currentUser != null && currentUser.getDepartment() != null && !currentUser.getDepartment().trim().isEmpty()) {
                    selectedDept = DepartmentHelper.getDeptCode(currentUser.getDepartment().trim());
                } else {
                    selectedDept = position == 0 ? "All" : depts[position];
                }
                applyFilter();
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void setupExamTypeSpinner() {
        if (spinnerExamType == null) return;
        String[] types = {"All Types", "Midterm", "Final", "CT", "Quiz"};
        ArrayAdapter<String> typeAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, types);
        typeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerExamType.setAdapter(typeAdapter);

        spinnerExamType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                selectedType = position == 0 ? "All" : types[position];
                applyFilter();
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void selectDeptInSpinner(String deptName) {
        for (int i = 0; i < spinnerDept.getCount(); i++) {
            if (spinnerDept.getItemAtPosition(i).toString().equalsIgnoreCase(deptName)) {
                spinnerDept.setSelection(i);
                break;
            }
        }
    }

    private void setupSearch() {
        etSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                currentSearch = s.toString().trim();
                applyFilter();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void loadExams() {
        progressBar.setVisibility(View.VISIBLE);
        layoutEmpty.setVisibility(View.GONE);

        // Supabase exam_routines table query
        SupabaseAuthBridge.queryTable("exam_routines", "select=*&order=exam_date.asc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                if (!isAdded()) return;
                requireActivity().runOnUiThread(() -> {
                    allExams.clear();
                    try {
                        JSONArray array = new JSONArray(responseBody);
                        for (int i = 0; i < array.length(); i++) {
                            JSONObject obj = array.getJSONObject(i);
                            ExamRoutine exam = ExamRoutine.fromJson(obj);
                            if (exam != null) {
                                allExams.add(exam);
                            }
                        }
                    } catch (Exception e) {
                        // Response might be empty or error object
                    }
                    progressBar.setVisibility(View.GONE);
                    swipeRefresh.setRefreshing(false);
                    applyFilter();

                    // Schedule notification alarms for all upcoming exams, CTs, and quizzes
                    if (getContext() != null && !allExams.isEmpty()) {
                        com.akon.subtools.alarms.ExamAlarmScheduler.scheduleExamAlarms(getContext(), allExams);
                    }
                });
            }

            @Override
            public void onError(String error) {
                if (!isAdded()) return;
                requireActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    swipeRefresh.setRefreshing(false);
                    Toast.makeText(getContext(), "Failed to load exam routines", Toast.LENGTH_SHORT).show();
                    applyFilter();
                });
            }
        });
    }

    private void applyFilter() {
        filteredExams.clear();
        String studentDept = (currentUser != null && currentUser.getDepartment() != null)
                ? DepartmentHelper.getDeptCode(currentUser.getDepartment().trim()) : "";

        for (ExamRoutine exam : allExams) {
            String examDept = DepartmentHelper.getDeptCode(exam.getDepartment());
            boolean matchesDept;
            if (!studentDept.isEmpty() && !"ALL".equalsIgnoreCase(studentDept)) {
                matchesDept = examDept.equalsIgnoreCase(studentDept) ||
                        exam.getDepartment().equalsIgnoreCase(studentDept) ||
                        exam.getDepartment().equalsIgnoreCase("ALL");
            } else {
                matchesDept = "All".equalsIgnoreCase(selectedDept) ||
                        examDept.equalsIgnoreCase(selectedDept) ||
                        exam.getDepartment().equalsIgnoreCase(selectedDept) ||
                        exam.getDepartment().equalsIgnoreCase("ALL");
            }

            boolean matchesType = "All".equalsIgnoreCase(selectedType) ||
                    exam.getExamType().equalsIgnoreCase(selectedType);

            boolean matchesSearch = currentSearch.isEmpty() ||
                    exam.getCourseCode().toLowerCase().contains(currentSearch.toLowerCase()) ||
                    exam.getCourseTitle().toLowerCase().contains(currentSearch.toLowerCase()) ||
                    exam.getRoom().toLowerCase().contains(currentSearch.toLowerCase()) ||
                    exam.getExamDate().toLowerCase().contains(currentSearch.toLowerCase());

            if (matchesDept && matchesType && matchesSearch) {
                filteredExams.add(exam);
            }
        }

        adapter.setExams(filteredExams);
        layoutEmpty.setVisibility(filteredExams.isEmpty() ? View.VISIBLE : View.GONE);
    }
}
