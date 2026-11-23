package com.akon.subtools.fragments;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.adapters.SubjectAdapter;
import com.akon.subtools.databinding.FragmentSubjectBinding;
import com.akon.subtools.models.Subject;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.CreditHelper;
import com.akon.subtools.utils.DepartmentHelper;
import com.akon.subtools.viewmodels.AuthViewModel;
import com.akon.subtools.viewmodels.SubjectViewModel;
import com.akon.subtools.viewmodels.UserViewModel;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class SubjectFragment extends Fragment {
    private FragmentSubjectBinding binding;
    private SubjectViewModel subjectViewModel;
    private UserViewModel userViewModel;
    private AuthViewModel authViewModel;

    private SubjectAdapter adapter;
    private final List<Subject> displayedSubjects = new ArrayList<>();
    private final List<Subject> allSubjects = new ArrayList<>();
    private final List<String> enrolledCodes = new ArrayList<>();
    private final List<String> completedCodes = new ArrayList<>();

    private User currentUser;
    private int currentTab = 0; // 0: Available, 1: Selected, 2: Completed

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentSubjectBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        authViewModel = new ViewModelProvider(requireActivity()).get(AuthViewModel.class);
        userViewModel = new ViewModelProvider(this).get(UserViewModel.class);
        subjectViewModel = new ViewModelProvider(this).get(SubjectViewModel.class);

        setupRecyclerView();
        setupObservers();
        setupListeners();
        setupTabs();

        CreditHelper.syncDepartmentCredits(getContext());

        currentUser = authViewModel.getUserLiveData().getValue();
        if (currentUser == null && getContext() != null) {
            currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(getContext());
        }
        if (currentUser != null) {
            enrolledCodes.clear();
            if (currentUser.getSubjects() != null) {
                for (String code : currentUser.getSubjects()) {
                    if (code != null && !code.trim().isEmpty()) {
                        String clean = sanitizeCode(code);
                        if (!clean.isEmpty() && !isSubjectEnrolled(clean)) {
                            enrolledCodes.add(clean);
                        }
                    }
                }
            }
            completedCodes.clear();
            if (currentUser.getCompletedSubjects() != null) {
                for (String code : currentUser.getCompletedSubjects()) {
                    if (code != null && !code.trim().isEmpty()) {
                        String clean = sanitizeCode(code);
                        if (!clean.isEmpty() && !isSubjectCompleted(clean)) {
                            completedCodes.add(clean);
                        }
                    }
                }
            }
            updateSummaryStats();
            filterSubjectsList();

            String dept = currentUser.getDepartment() != null ? currentUser.getDepartment() : "";
            if (!dept.isEmpty()) {
                subjectViewModel.loadSubjectsForDept(dept);
            } else {
                subjectViewModel.loadSubjects();
            }
        } else {
            subjectViewModel.loadSubjects();
        }
        authViewModel.checkCurrentUserSession();
    }

    private void setupTabs() {
        binding.tabLayoutSubjects.addTab(binding.tabLayoutSubjects.newTab().setText("Available"));
        binding.tabLayoutSubjects.addTab(binding.tabLayoutSubjects.newTab().setText("Selected"));
        binding.tabLayoutSubjects.addTab(binding.tabLayoutSubjects.newTab().setText("Completed"));
        binding.tabLayoutSubjects.addOnTabSelectedListener(new com.google.android.material.tabs.TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(com.google.android.material.tabs.TabLayout.Tab tab) {
                currentTab = tab.getPosition();
                filterSubjectsList();
            }
            @Override public void onTabUnselected(com.google.android.material.tabs.TabLayout.Tab tab) {}
            @Override public void onTabReselected(com.google.android.material.tabs.TabLayout.Tab tab) {}
        });
    }

    private String sanitizeCode(String code) {
        return com.akon.subtools.utils.AcademicHelper.normalizeSubjectCode(code);
    }

    private boolean isSubjectEnrolled(String code) {
        if (code == null || enrolledCodes == null) return false;
        for (String e : enrolledCodes) {
            if (e != null && com.akon.subtools.utils.AcademicHelper.isSameSubjectCode(code, e)) {
                return true;
            }
        }
        return false;
    }

    private boolean isSubjectCompleted(String code) {
        if (code == null || completedCodes == null) return false;
        for (String c : completedCodes) {
            if (c != null && com.akon.subtools.utils.AcademicHelper.isSameSubjectCode(code, c)) {
                return true;
            }
        }
        return false;
    }

    private void setupRecyclerView() {
        binding.recyclerSubjects.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new SubjectAdapter(displayedSubjects, enrolledCodes, completedCodes, new SubjectAdapter.OnSubjectClickListener() {
            @Override
            public void onAddClick(Subject subject) {
                if (currentUser != null && subject != null && subject.getCode() != null) {
                    String cleanCode = sanitizeCode(subject.getCode());
                    if (!isSubjectEnrolled(cleanCode)) {
                        enrolledCodes.add(cleanCode);
                        List<String> updatedList = new ArrayList<>(enrolledCodes);
                        currentUser.setSubjects(updatedList);
                        authViewModel.updateLocalUserSubjects(updatedList);
                        userViewModel.saveUserSubjects(currentUser.getUid(), updatedList);
                        filterSubjectsList();
                        updateSummaryStats();
                    }
                }
            }

            @Override
            public void onRemoveClick(Subject subject) {
                if (currentUser != null && subject != null && subject.getCode() != null) {
                    String cleanTarget = sanitizeCode(subject.getCode());
                    for (int i = enrolledCodes.size() - 1; i >= 0; i--) {
                        if (sanitizeCode(enrolledCodes.get(i)).equals(cleanTarget)) {
                            enrolledCodes.remove(i);
                        }
                    }
                    List<String> updatedList = new ArrayList<>(enrolledCodes);
                    currentUser.setSubjects(updatedList);
                    authViewModel.updateLocalUserSubjects(updatedList);
                    userViewModel.saveUserSubjects(currentUser.getUid(), updatedList);
                    filterSubjectsList();
                    updateSummaryStats();
                }
            }

            @Override
            public void onToggleCompletedClick(Subject subject) {
                toggleSubjectCompleted(subject);
            }
        });
        binding.recyclerSubjects.setAdapter(adapter);
    }

    private void toggleSubjectCompleted(Subject subject) {
        if (currentUser == null || subject == null || subject.getCode() == null) return;
        String cleanCode = sanitizeCode(subject.getCode());
        boolean isCompleted = isSubjectCompleted(cleanCode);

        if (isCompleted) {
            for (int i = completedCodes.size() - 1; i >= 0; i--) {
                if (sanitizeCode(completedCodes.get(i)).equals(cleanCode)) {
                    completedCodes.remove(i);
                }
            }
            Toast.makeText(getContext(), "Unmarked " + subject.getCode() + " from completed courses.", Toast.LENGTH_SHORT).show();
        } else {
            completedCodes.add(cleanCode);
            Toast.makeText(getContext(), "Marked " + subject.getCode() + " as completed!", Toast.LENGTH_SHORT).show();
        }

        // Calculate completed credits from all completed subjects
        double sumCredits = 0.0;
        for (String cCode : completedCodes) {
            sumCredits += getSubjectCreditValue(cCode);
        }

        currentUser.setCompletedSubjects(new ArrayList<>(completedCodes));
        currentUser.setCompletedCredits(sumCredits);
        userViewModel.saveCompletedSubjects(currentUser.getUid(), completedCodes, sumCredits);

        filterSubjectsList();
        updateSummaryStats();
    }

    private void showAdjustCompletedCreditsDialog() {
        if (currentUser == null || getContext() == null) return;

        EditText input = new EditText(getContext());
        input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL);
        input.setHint("e.g. 75.0");
        input.setText(String.format(Locale.ENGLISH, "%.1f", currentUser.getCompletedCredits()));

        FrameLayout container = new FrameLayout(getContext());
        int padding = (int) (20 * getResources().getDisplayMetrics().density);
        container.setPadding(padding, padding / 2, padding, padding / 2);
        container.addView(input);

        new MaterialAlertDialogBuilder(getContext())
                .setTitle("Adjust Completed Credits")
                .setMessage("If you have credit waivers, transferred credits, or legacy courses taken before SUBTools, enter your actual earned credits total:")
                .setView(container)
                .setPositiveButton("Save", (dialog, which) -> {
                    String str = input.getText() != null ? input.getText().toString().trim() : "";
                    try {
                        double val = Double.parseDouble(str);
                        if (val >= 0) {
                            currentUser.setCompletedCredits(val);
                            userViewModel.saveManualCompletedCredits(currentUser.getUid(), val);
                            updateSummaryStats();
                            Toast.makeText(getContext(), "Completed credits updated to " + val + " CR", Toast.LENGTH_SHORT).show();
                        }
                    } catch (NumberFormatException e) {
                        Toast.makeText(getContext(), "Please enter a valid credit number.", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void setupObservers() {
        authViewModel.getUserLiveData().observe(getViewLifecycleOwner(), user -> {
            if (user != null) {
                currentUser = user;

                // Sync enrolledCodes directly from user
                enrolledCodes.clear();
                if (user.getSubjects() != null) {
                    for (String code : user.getSubjects()) {
                        if (code != null && !code.trim().isEmpty()) {
                            String clean = sanitizeCode(code);
                            if (!clean.isEmpty() && !isSubjectEnrolled(clean)) {
                                enrolledCodes.add(clean);
                            }
                        }
                    }
                }

                // Sync completedCodes directly from user
                completedCodes.clear();
                if (user.getCompletedSubjects() != null) {
                    for (String code : user.getCompletedSubjects()) {
                        if (code != null && !code.trim().isEmpty()) {
                            String clean = sanitizeCode(code);
                            if (!clean.isEmpty() && !isSubjectCompleted(clean)) {
                                completedCodes.add(clean);
                            }
                        }
                    }
                }

                // Load subjects filtered by user's department
                String dept = user.getDepartment() != null ? user.getDepartment() : "";
                if (!dept.isEmpty()) {
                    subjectViewModel.loadSubjectsForDept(dept);
                } else {
                    subjectViewModel.loadSubjects();
                }
                updateSummaryStats();
                filterSubjectsList();
            }
        });

        subjectViewModel.getSubjectsList().observe(getViewLifecycleOwner(), subjects -> {
            binding.swipeRefreshSubjects.setRefreshing(false);
            if (subjects != null) {
                allSubjects.clear();
                java.util.Set<String> seenCodes = new java.util.HashSet<>();
                for (Subject s : subjects) {
                    if (s != null && s.getCode() != null) {
                        String clean = sanitizeCode(s.getCode());
                        if (!clean.isEmpty() && !seenCodes.contains(clean)) {
                            seenCodes.add(clean);
                            allSubjects.add(s);
                        }
                    }
                }
                updateSummaryStats();
                filterSubjectsList();
            }
        });

        subjectViewModel.getLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.progressBar.setVisibility(View.GONE);
            if (adapter != null) {
                adapter.setIsLoading(isLoading);
            }
        });

        userViewModel.getLoading().observe(getViewLifecycleOwner(), isLoading ->
                binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE));

        userViewModel.getSubjectsUpdated().observe(getViewLifecycleOwner(), success -> {
            if (success != null && success) {
                userViewModel.clearStatus();
            }
        });

        subjectViewModel.getError().observe(getViewLifecycleOwner(), this::handleError);
        userViewModel.getError().observe(getViewLifecycleOwner(), this::handleError);
    }

    private void handleError(String errorMsg) {
        if (errorMsg != null && !errorMsg.isEmpty()) {
            Toast.makeText(getContext(), errorMsg, Toast.LENGTH_LONG).show();
        }
    }

    private void setupListeners() {
        binding.searchInput.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterSubjectsList();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        binding.swipeRefreshSubjects.setOnRefreshListener(() -> {
            CreditHelper.syncDepartmentCredits(getContext());
            if (currentUser != null && currentUser.getDepartment() != null) {
                subjectViewModel.loadSubjectsForDept(currentUser.getDepartment());
            } else {
                subjectViewModel.refreshSubjects();
            }
        });

        // Allow students to tap on the Completed Credits number to manually adjust credits
        binding.textCompletedCredits.setOnClickListener(v -> showAdjustCompletedCreditsDialog());
    }

    private void filterSubjectsList() {
        if (binding == null || currentUser == null) return;

        String query = binding.searchInput.getText() != null
                ? binding.searchInput.getText().toString().trim().toLowerCase() : "";
        String sanitizedQuery = query.replaceAll("[^a-zA-Z0-9]", "");

        String studentDeptCode = DepartmentHelper.getDeptCode(currentUser.getDepartment());

        displayedSubjects.clear();
        java.util.Set<String> matchedCodes = new java.util.HashSet<>();

        for (Subject s : allSubjects) {
            if (s == null) continue;

            // 1. Dept filter: Applied only on Available Subjects tab (Tab 0).
            if (currentTab == 0) {
                String subjectDeptCode = DepartmentHelper.getDeptCode(s.getDepartment());
                boolean matchesDept;
                if (studentDeptCode.isEmpty() || "ALL".equalsIgnoreCase(studentDeptCode) || "N/A".equalsIgnoreCase(studentDeptCode)) {
                    matchesDept = true;
                } else if (subjectDeptCode.isEmpty() || "ALL".equalsIgnoreCase(subjectDeptCode) || "GENERAL".equalsIgnoreCase(subjectDeptCode) || "GED".equalsIgnoreCase(subjectDeptCode)) {
                    matchesDept = true;
                } else {
                    matchesDept = studentDeptCode.equalsIgnoreCase(subjectDeptCode);
                }
                if (!matchesDept) continue;
            }

            // 2. Tab filter
            boolean isEnrolled = isSubjectEnrolled(s.getCode());
            boolean isCompleted = isSubjectCompleted(s.getCode());

            if (currentTab == 0 && (isEnrolled || isCompleted)) continue; // Available: neither enrolled nor completed
            if (currentTab == 1 && !isEnrolled) continue;                 // Selected: enrolled
            if (currentTab == 2 && !isCompleted) continue;                // Completed: passed

            // 3. Search filter
            String codeStr = s.getCode() != null ? s.getCode().replaceAll("[^a-zA-Z0-9]", "").toLowerCase() : "";
            String nameStr = s.getName() != null ? s.getName().replaceAll("[^a-zA-Z0-9]", "").toLowerCase() : "";

            boolean matchesQuery = query.isEmpty()
                    || codeStr.contains(sanitizedQuery)
                    || nameStr.contains(sanitizedQuery);
            if (!matchesQuery) continue;

            displayedSubjects.add(s);
            if (s.getCode() != null) {
                matchedCodes.add(sanitizeCode(s.getCode()));
            }
        }

        // For Tab 1 (Selected), ensure ANY enrolled code not present in allSubjects is also rendered
        if (currentTab == 1) {
            for (String code : enrolledCodes) {
                String clean = sanitizeCode(code);
                if (!matchedCodes.contains(clean)) {
                    String codeClean = clean.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
                    if (query.isEmpty() || codeClean.contains(sanitizedQuery)) {
                        Subject fallbackSub = new Subject();
                        fallbackSub.setCode(code);
                        fallbackSub.setName(code);
                        fallbackSub.setDepartment(currentUser.getDepartment() != null ? currentUser.getDepartment() : "");
                        fallbackSub.setCredit(String.format(Locale.ENGLISH, "%.1f", getSubjectCreditValue(code)));
                        displayedSubjects.add(fallbackSub);
                    }
                }
            }
        }

        // For Tab 2 (Completed), ensure ANY completed code not present in allSubjects is also rendered
        if (currentTab == 2) {
            for (String code : completedCodes) {
                String clean = sanitizeCode(code);
                if (!matchedCodes.contains(clean)) {
                    String codeClean = clean.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
                    if (query.isEmpty() || codeClean.contains(sanitizedQuery)) {
                        Subject fallbackSub = new Subject();
                        fallbackSub.setCode(code);
                        fallbackSub.setName(code);
                        fallbackSub.setDepartment(currentUser.getDepartment() != null ? currentUser.getDepartment() : "");
                        fallbackSub.setCredit(String.format(Locale.ENGLISH, "%.1f", getSubjectCreditValue(code)));
                        displayedSubjects.add(fallbackSub);
                    }
                }
            }
        }

        // Chronological Term Sorting (UX-005)
        displayedSubjects.sort((a, b) -> {
            int termA = parseTermNumber(a.getTerm());
            int termB = parseTermNumber(b.getTerm());
            if (termA != termB) {
                return Integer.compare(termA, termB);
            }
            String codeA = a.getCode() != null ? a.getCode() : "";
            String codeB = b.getCode() != null ? b.getCode() : "";
            return codeA.compareToIgnoreCase(codeB);
        });

        adapter.notifyDataSetChanged();

        if (displayedSubjects.isEmpty()) {
            if (currentTab == 0) {
                binding.emptySubjectsText.setText("No available subjects found for your department.");
            } else if (currentTab == 1) {
                binding.emptySubjectsText.setText("You have not selected any subjects for this semester.");
            } else {
                binding.emptySubjectsText.setText("No completed subjects marked yet.");
            }
            binding.emptySubjectsText.setVisibility(View.VISIBLE);
        } else {
            binding.emptySubjectsText.setVisibility(View.GONE);
        }
    }

    private int parseTermNumber(String termStr) {
        if (termStr == null) return 999;
        String digits = termStr.replaceAll("[^0-9]", "");
        try {
            return digits.isEmpty() ? 999 : Integer.parseInt(digits);
        } catch (Exception e) {
            return 999;
        }
    }

    private double getSubjectCreditValue(String code) {
        if (code == null || code.trim().isEmpty()) return 3.0;
        String clean = sanitizeCode(code);
        for (Subject s : allSubjects) {
            if (s != null && s.getCode() != null && sanitizeCode(s.getCode()).equals(clean)) {
                if (s.getCredit() != null && !s.getCredit().trim().isEmpty()) {
                    try {
                        return Double.parseDouble(s.getCredit().trim());
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        return 3.0;
    }

    private void updateSummaryStats() {
        if (binding == null) return;
        int totalSelected = enrolledCodes.size();
        double totalCredits = 0.0;
        for (String code : enrolledCodes) {
            totalCredits += getSubjectCreditValue(code);
        }
        binding.textTotalSelected.setText(String.valueOf(totalSelected));
        binding.textTotalCredits.setText(String.format(Locale.ENGLISH, "%.1f", totalCredits));

        // Credit Progress Bar
        double targetCredits = 18.0;
        binding.textCreditProgressRatio.setText(String.format(Locale.ENGLISH, "%.1f Credits", totalCredits));
        int progressInt = (int) Math.min(180, (totalCredits / targetCredits) * 180);
        binding.progressCreditLoad.setProgress(progressInt);

        // Degree Credits: Completed, Remaining, Total dynamically derived from CreditHelper
        double totalRequired = 140.0;
        double completed = 0.0;
        if (currentUser != null) {
            totalRequired = CreditHelper.getTotalRequiredCredits(getContext(), currentUser.getDepartment());
            if (completedCodes != null && !completedCodes.isEmpty()) {
                for (String cCode : completedCodes) {
                    completed += getSubjectCreditValue(cCode);
                }
            } else {
                completed = currentUser.getCompletedCredits();
            }
        }
        double remaining = Math.max(0.0, totalRequired - completed);

        binding.textCompletedCredits.setText(String.format(Locale.ENGLISH, "%.1f", completed));
        binding.textRemainingCredits.setText(String.format(Locale.ENGLISH, "%.1f", remaining));
        binding.textDegreeTotalCredits.setText(String.format(Locale.ENGLISH, "%.1f", totalRequired));
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
