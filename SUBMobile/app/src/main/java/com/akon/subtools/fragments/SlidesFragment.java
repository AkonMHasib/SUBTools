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

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.akon.subtools.R;
import com.akon.subtools.adapters.LectureSlideAdapter;
import com.akon.subtools.models.LectureSlide;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.DepartmentHelper;
import com.akon.subtools.utils.SupabaseAuthBridge;
import com.akon.subtools.viewmodels.AuthViewModel;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class SlidesFragment extends Fragment {

    private RecyclerView recyclerView;
    private LectureSlideAdapter adapter;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private LinearLayout layoutEmpty;
    private EditText etSearch;
    private Spinner spinnerDept, spinnerSubject;

    private final List<LectureSlide> allSlides = new ArrayList<>();
    private final List<LectureSlide> filteredSlides = new ArrayList<>();
    private final List<String> subjectFilterList = new ArrayList<>();

    private String selectedDept = "All";
    private String selectedSubject = "All Subjects";
    private String currentSearch = "";
    private User currentUser;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_slides, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        recyclerView = view.findViewById(R.id.recycler_slides);
        swipeRefresh = view.findViewById(R.id.swipe_refresh_slides);
        progressBar = view.findViewById(R.id.progress_slides_loading);
        layoutEmpty = view.findViewById(R.id.layout_slides_empty);
        etSearch = view.findViewById(R.id.et_slides_search);
        spinnerDept = view.findViewById(R.id.spinner_slides_dept);
        spinnerSubject = view.findViewById(R.id.spinner_slides_subject);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new LectureSlideAdapter();
        recyclerView.setAdapter(adapter);

        setupSpinners();
        setupSearch();

        swipeRefresh.setOnRefreshListener(this::loadSlides);

        AuthViewModel authViewModel = new ViewModelProvider(requireActivity()).get(AuthViewModel.class);
        authViewModel.getUserLiveData().observe(getViewLifecycleOwner(), user -> {
            currentUser = user;
            if (user != null && user.getDepartment() != null && !user.getDepartment().trim().isEmpty()) {
                String normDept = DepartmentHelper.getDeptCode(user.getDepartment().trim());
                selectedDept = normDept;
                selectDeptInSpinner(normDept);
                if (spinnerDept != null) {
                    spinnerDept.setEnabled(false); // Locked to student's department
                }
                updateSubjectSpinner();
                applyFilter();
            }
        });

        loadSlides();
    }

    private void setupSpinners() {
        String[] depts = DepartmentHelper.getDepartmentFilterOptions();
        ArrayAdapter<String> deptAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, depts);
        deptAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerDept.setAdapter(deptAdapter);

        spinnerDept.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                if (currentUser != null && currentUser.getDepartment() != null && !currentUser.getDepartment().trim().isEmpty()) {
                    selectedDept = DepartmentHelper.getDeptCode(currentUser.getDepartment().trim());
                } else {
                    selectedDept = position == 0 ? "All" : depts[position];
                }
                updateSubjectSpinner();
                applyFilter();
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        subjectFilterList.clear();
        subjectFilterList.add("All Subjects");
        ArrayAdapter<String> subAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, subjectFilterList);
        subAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerSubject.setAdapter(subAdapter);

        spinnerSubject.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                selectedSubject = subjectFilterList.get(position);
                applyFilter();
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void updateSubjectSpinner() {
        Set<String> uniqueCodes = new HashSet<>();
        for (LectureSlide s : allSlides) {
            String sDept = DepartmentHelper.getDeptCode(s.getDepartment());
            if ("All".equalsIgnoreCase(selectedDept) || sDept.equalsIgnoreCase(selectedDept) || s.getDepartment().equalsIgnoreCase(selectedDept)) {
                if (!s.getSubjectCode().isEmpty()) {
                    uniqueCodes.add(s.getSubjectCode().toUpperCase());
                }
            }
        }

        subjectFilterList.clear();
        subjectFilterList.add("All Subjects");
        subjectFilterList.addAll(uniqueCodes);

        ArrayAdapter<String> subAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, subjectFilterList);
        subAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerSubject.setAdapter(subAdapter);
        selectedSubject = "All Subjects";
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

    private void loadSlides() {
        progressBar.setVisibility(View.VISIBLE);
        layoutEmpty.setVisibility(View.GONE);

        SupabaseAuthBridge.queryTable("slides", "select=*&order=created_at.desc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                if (!isAdded()) return;
                requireActivity().runOnUiThread(() -> {
                    allSlides.clear();
                    try {
                        JSONArray array = new JSONArray(responseBody);
                        for (int i = 0; i < array.length(); i++) {
                            JSONObject obj = array.getJSONObject(i);
                            LectureSlide slide = LectureSlide.fromJson(obj);
                            if (slide != null) {
                                allSlides.add(slide);
                            }
                        }
                    } catch (Exception ignored) {}
                    progressBar.setVisibility(View.GONE);
                    swipeRefresh.setRefreshing(false);
                    updateSubjectSpinner();
                    applyFilter();
                });
            }

            @Override
            public void onError(String error) {
                if (!isAdded()) return;
                requireActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    swipeRefresh.setRefreshing(false);
                    applyFilter();
                });
            }
        });
    }

    private void applyFilter() {
        filteredSlides.clear();
        String studentDept = (currentUser != null && currentUser.getDepartment() != null)
                ? DepartmentHelper.getDeptCode(currentUser.getDepartment().trim()) : "";

        for (LectureSlide s : allSlides) {
            String sDept = DepartmentHelper.getDeptCode(s.getDepartment());
            boolean matchesDept;
            if (!studentDept.isEmpty() && !"ALL".equalsIgnoreCase(studentDept)) {
                matchesDept = sDept.equalsIgnoreCase(studentDept) ||
                        s.getDepartment().equalsIgnoreCase(studentDept) ||
                        s.getDepartment().equalsIgnoreCase("ALL");
            } else {
                matchesDept = "All".equalsIgnoreCase(selectedDept) ||
                        sDept.equalsIgnoreCase(selectedDept) ||
                        s.getDepartment().equalsIgnoreCase(selectedDept) ||
                        s.getDepartment().equalsIgnoreCase("ALL");
            }

            boolean matchesSub = "All Subjects".equalsIgnoreCase(selectedSubject) ||
                    s.getSubjectCode().equalsIgnoreCase(selectedSubject);

            boolean matchesSearch = currentSearch.isEmpty() ||
                    s.getTitle().toLowerCase().contains(currentSearch.toLowerCase()) ||
                    s.getSubjectCode().toLowerCase().contains(currentSearch.toLowerCase()) ||
                    s.getLectureNumber().toLowerCase().contains(currentSearch.toLowerCase());

            if (matchesDept && matchesSub && matchesSearch) {
                filteredSlides.add(s);
            }
        }

        adapter.setSlides(filteredSlides);
        layoutEmpty.setVisibility(filteredSlides.isEmpty() ? View.VISIBLE : View.GONE);
    }
}
