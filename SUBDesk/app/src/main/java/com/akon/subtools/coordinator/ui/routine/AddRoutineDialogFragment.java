package com.akon.subtools.coordinator.ui.routine;

import android.app.TimePickerDialog;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.google.android.material.chip.Chip;
import com.akon.subtools.coordinator.R;
import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.data.model.Faculty;
import com.akon.subtools.coordinator.data.model.Subject;
import com.akon.subtools.coordinator.data.repository.FacultyRepository;
import com.akon.subtools.coordinator.data.repository.RoutineRepository;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.data.repository.SubjectRepository;
import com.akon.subtools.coordinator.databinding.DialogAddRoutineBinding;
import com.akon.subtools.coordinator.utils.DepartmentUtils;
import com.akon.subtools.coordinator.utils.RoutineConflictDetector;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class AddRoutineDialogFragment extends DialogFragment {

    public interface RoutineSaveListener {
        void onRoutineSaved();
    }

    private static final String ARG_ROUTINE = "arg_routine";
    private static final String ARG_IS_DUPLICATE = "arg_is_duplicate";

    private DialogAddRoutineBinding binding;
    private RoutineRepository repository;
    private FacultyRepository facultyRepository;
    private SubjectRepository subjectRepository;
    private SessionManager sessionManager;

    private ClassRoutine routineToEdit;
    private boolean isDuplicateMode = false;
    private RoutineSaveListener saveListener;

    private int currentStep = 1;
    private String startTime = "09:00 AM";
    private String endTime = "10:30 AM";

    private String selectedCourseCode = "";
    private String selectedCourseSubject = "";
    private Subject selectedSubjectObj = null;

    private final Set<String> selectedTerms = new HashSet<>();
    private final Set<String> selectedSections = new HashSet<>();
    private final List<String> teacherList = new ArrayList<>();

    private final List<Subject> dbSubjectList = new ArrayList<>();
    private final List<Faculty> dbFacultyList = new ArrayList<>();
    private List<ClassRoutine> existingRoutinesList = new ArrayList<>();

    public static AddRoutineDialogFragment newInstance(@Nullable ClassRoutine routine) {
        return newInstance(routine, false);
    }

    public static AddRoutineDialogFragment newInstance(@Nullable ClassRoutine routine, boolean isDuplicate) {
        AddRoutineDialogFragment fragment = new AddRoutineDialogFragment();
        Bundle args = new Bundle();
        if (routine != null) {
            args.putSerializable(ARG_ROUTINE, routine);
        }
        args.putBoolean(ARG_IS_DUPLICATE, isDuplicate);
        fragment.setArguments(args);
        return fragment;
    }

    public void setRoutineSaveListener(RoutineSaveListener listener) {
        this.saveListener = listener;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(DialogFragment.STYLE_NORMAL, com.google.android.material.R.style.Theme_Material3_DayNight_Dialog_MinWidth);

        if (getArguments() != null) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                routineToEdit = getArguments().getSerializable(ARG_ROUTINE, ClassRoutine.class);
            } else {
                @SuppressWarnings("deprecation")
                ClassRoutine temp = (ClassRoutine) getArguments().getSerializable(ARG_ROUTINE);
                routineToEdit = temp;
            }
            isDuplicateMode = getArguments().getBoolean(ARG_IS_DUPLICATE, false);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getDialog() != null && getDialog().getWindow() != null) {
            int width = (int) (getResources().getDisplayMetrics().widthPixels * 0.90);
            getDialog().getWindow().setLayout(width, ViewGroup.LayoutParams.WRAP_CONTENT);
            getDialog().getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = DialogAddRoutineBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        repository = new RoutineRepository();
        facultyRepository = new FacultyRepository();
        subjectRepository = new SubjectRepository();
        sessionManager = new SessionManager(requireContext());

        String deptCode = DepartmentUtils.getDepartmentCode(sessionManager.getDepartment());
        String deptFullName = DepartmentUtils.getDepartmentFullName(deptCode);
        binding.tvDeptLabel.setText(deptFullName);

        setupSubjectDropdown();
        setupSpinners();
        setupTermChips(deptCode);
        setupSectionChips(deptCode);
        setupTimePickers();
        setupTeacherActions();
        setupNavigationButtons();

        loadSubjectsAndFaculty();
        loadExistingRoutinesForConflictCheck();

        if (routineToEdit != null) {
            populateIfEditing();
        } else {
            selectedTerms.clear();
            selectedTerms.add("All");
            selectedSections.clear();
            if ("ARCH".equalsIgnoreCase(deptCode)) {
                selectedSections.add("N/A");
            } else {
                selectedSections.add("All");
            }
            updateTermChipsSelection();
            updateSectionChipsSelection();
            updateApplicabilitySummary();
        }

        updateStepView();
    }

    private void setupSubjectDropdown() {
        binding.actvSubject.setThreshold(1);
        binding.actvSubject.setDropDownBackgroundResource(R.drawable.bg_dropdown_popup);
        binding.actvSubject.setOnClickListener(v -> binding.actvSubject.showDropDown());
        binding.actvSubject.setOnFocusChangeListener((v, hasFocus) -> {
            if (hasFocus) {
                binding.actvSubject.showDropDown();
            }
        });

        binding.actvSubject.setOnItemClickListener((parent, view, position, id) -> {
            String selectedItem = (String) parent.getItemAtPosition(position);
            if (selectedItem != null) {
                for (Subject s : dbSubjectList) {
                    String fullEntry = s.getCode() + " \u2014 " + s.getName();
                    if (selectedItem.equalsIgnoreCase(fullEntry) || (s.getCode() != null && selectedItem.startsWith(s.getCode()))) {
                        onSubjectSelected(s);
                        break;
                    }
                }
            }
        });
    }

    private void setupSpinners() {
        ArrayAdapter<CharSequence> dayAdapter = ArrayAdapter.createFromResource(
                requireContext(), R.array.dialog_days_array, android.R.layout.simple_spinner_item);
        dayAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerDayDialog.setAdapter(dayAdapter);

        ArrayAdapter<CharSequence> towerAdapter = ArrayAdapter.createFromResource(
                requireContext(), R.array.towers_array, android.R.layout.simple_spinner_item);
        towerAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerTowerDialog.setAdapter(towerAdapter);
    }

    private void setupTermChips(String deptCode) {
        boolean isArch = "ARCH".equalsIgnoreCase(deptCode);
        if (binding.tvTermsHeader != null) {
            binding.tvTermsHeader.setText(isArch ? "APPLICABLE STUDIOS" : "APPLICABLE TERMS");
        }
        String[] termOptions = isArch
                ? getResources().getStringArray(R.array.arch_studio_pills_array)
                : getResources().getStringArray(R.array.term_pills_array);
        binding.chipGroupTerms.removeAllViews();
        for (String option : termOptions) {
            Chip chip = new Chip(requireContext());
            chip.setText(option);
            chip.setCheckable(true);
            chip.setClickable(true);
            attachTermChipListener(chip, option);
            binding.chipGroupTerms.addView(chip);
        }
    }

    private void attachTermChipListener(Chip chip, String option) {
        boolean isAllOption = "All".equalsIgnoreCase(option) || "All Terms".equalsIgnoreCase(option) || "All Studios".equalsIgnoreCase(option);
        boolean isNaOption = "N/A".equalsIgnoreCase(option);
        chip.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                if (isAllOption) {
                    selectedTerms.clear();
                    selectedTerms.add("All");
                } else if (isNaOption) {
                    selectedTerms.clear();
                    selectedTerms.add("N/A");
                } else {
                    selectedTerms.remove("All");
                    selectedTerms.remove("All Terms");
                    selectedTerms.remove("All Studios");
                    selectedTerms.remove("N/A");
                    selectedTerms.add(option);
                }
            } else {
                selectedTerms.remove(option);
                if (isAllOption) {
                    selectedTerms.remove("All");
                }
                if (isNaOption) {
                    selectedTerms.remove("N/A");
                }
                if (selectedTerms.isEmpty()) {
                    selectedTerms.add("All");
                }
            }
            updateTermChipsSelection();
            updateApplicabilitySummary();
        });
    }

    private void setupSectionChips(String deptCode) {
        binding.tvSectionHeader.setVisibility(View.VISIBLE);
        binding.chipGroupSections.setVisibility(View.VISIBLE);
        String[] secOptions = getResources().getStringArray(R.array.section_pills_array);
        binding.chipGroupSections.removeAllViews();
        for (String option : secOptions) {
            Chip chip = new Chip(requireContext());
            chip.setText(option);
            chip.setCheckable(true);
            chip.setClickable(true);
            attachSectionChipListener(chip, option);
            binding.chipGroupSections.addView(chip);
        }
    }

    private void attachSectionChipListener(Chip chip, String option) {
        boolean isAllOption = "All".equalsIgnoreCase(option) || "All Sections".equalsIgnoreCase(option);
        boolean isNaOption = "N/A".equalsIgnoreCase(option);
        chip.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                if (isAllOption) {
                    selectedSections.clear();
                    selectedSections.add("All");
                } else if (isNaOption) {
                    selectedSections.clear();
                    selectedSections.add("N/A");
                } else {
                    selectedSections.remove("All");
                    selectedSections.remove("All Sections");
                    selectedSections.remove("N/A");
                    selectedSections.add(option);
                }
            } else {
                selectedSections.remove(option);
                if (isAllOption) {
                    selectedSections.remove("All");
                }
                if (isNaOption) {
                    selectedSections.remove("N/A");
                }
                if (selectedSections.isEmpty()) {
                    selectedSections.add("All");
                }
            }
            updateSectionChipsSelection();
            updateApplicabilitySummary();
        });
    }

    private void updateApplicabilitySummary() {
        if (binding == null) return;
        String termsStr;
        if (selectedTerms.contains("All") || selectedTerms.contains("All Terms") || selectedTerms.contains("All Studios")) {
            termsStr = "All Terms";
        } else if (selectedTerms.contains("N/A")) {
            termsStr = "N/A";
        } else {
            termsStr = selectedTerms.isEmpty() ? "All Terms" : android.text.TextUtils.join(", ", selectedTerms);
        }
        String secStr;
        if (selectedSections.contains("All") || selectedSections.contains("All Sections")) {
            secStr = "All Sections";
        } else if (selectedSections.contains("N/A")) {
            secStr = "N/A";
        } else {
            secStr = selectedSections.isEmpty() ? "All Sections" : android.text.TextUtils.join(", ", selectedSections);
        }
        binding.tvApplicabilitySummary.setText("Applies to: " + termsStr + " | Sections: " + secStr);
    }

    private void updateTermChipsSelection() {
        boolean isArch = "ARCH".equalsIgnoreCase(DepartmentUtils.getDepartmentCode(sessionManager.getDepartment()));
        boolean hasAll = selectedTerms.contains("All") || selectedTerms.contains("All Terms") || selectedTerms.contains("All Studios");
        boolean hasNa = selectedTerms.contains("N/A");
        for (int i = 0; i < binding.chipGroupTerms.getChildCount(); i++) {
            Chip chip = (Chip) binding.chipGroupTerms.getChildAt(i);
            String text = chip.getText().toString();
            chip.setOnCheckedChangeListener(null);
            if ("All Terms".equalsIgnoreCase(text) || "All".equalsIgnoreCase(text) || "All Studios".equalsIgnoreCase(text)) {
                chip.setChecked(hasAll);
            } else if ("N/A".equalsIgnoreCase(text)) {
                chip.setChecked(hasNa);
            } else {
                boolean matched = selectedTerms.contains(text);
                if (!matched && isArch) {
                    String digits = text.replaceAll("[^0-9]", "");
                    for (String st : selectedTerms) {
                        if (st.replaceAll("[^0-9]", "").equals(digits)) {
                            matched = true;
                            break;
                        }
                    }
                }
                chip.setChecked(matched);
            }
            attachTermChipListener(chip, text);
        }
    }

    private void updateSectionChipsSelection() {
        boolean hasAll = selectedSections.contains("All") || selectedSections.contains("All Sections");
        boolean hasNa = selectedSections.contains("N/A");
        for (int i = 0; i < binding.chipGroupSections.getChildCount(); i++) {
            Chip chip = (Chip) binding.chipGroupSections.getChildAt(i);
            String text = chip.getText().toString();
            chip.setOnCheckedChangeListener(null);
            if ("All Sections".equalsIgnoreCase(text) || "All".equalsIgnoreCase(text)) {
                chip.setChecked(hasAll);
            } else if ("N/A".equalsIgnoreCase(text)) {
                chip.setChecked(hasNa);
            } else {
                boolean matched = false;
                for (String sel : selectedSections) {
                    if (DepartmentUtils.isSectionMatch(sel, text)) {
                        matched = true;
                        break;
                    }
                }
                chip.setChecked(matched);
            }
            attachSectionChipListener(chip, text);
        }
    }

    private void setupTimePickers() {
        binding.btnStartTimePicker.setOnClickListener(v -> showTimePicker(true));
        binding.btnEndTimePicker.setOnClickListener(v -> showTimePicker(false));
    }

    private void showTimePicker(boolean isStart) {
        Calendar cal = Calendar.getInstance();
        TimePickerDialog dialog = new TimePickerDialog(requireContext(), (view, hourOfDay, minute) -> {
            String ampm = hourOfDay >= 12 ? "PM" : "AM";
            int hour12 = hourOfDay % 12;
            if (hour12 == 0) hour12 = 12;
            String formatted = String.format("%02d:%02d %s", hour12, minute, ampm);
            if (isStart) {
                startTime = formatted;
                binding.btnStartTimePicker.setText("Start: " + startTime);
            } else {
                endTime = formatted;
                binding.btnEndTimePicker.setText("End: " + endTime);
            }
        }, cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE), false);
        dialog.show();
    }

    private void setupTeacherActions() {
        binding.btnAddTeacherChip.setOnClickListener(v -> {
            String text = binding.etTeacherInput.getText() != null ? binding.etTeacherInput.getText().toString().trim() : "";
            if (!text.isEmpty()) {
                addTeacherName(text);
                binding.etTeacherInput.setText("");
            }
        });

        binding.cbTbaTeacher.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                teacherList.clear();
                teacherList.add("TBA");
                refreshTeacherChips();
            }
        });

        binding.spinnerTeacherSelect.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                if (position > 0 && position - 1 < dbFacultyList.size()) {
                    Faculty f = dbFacultyList.get(position - 1);
                    if (f != null && f.getName() != null) {
                        addTeacherName(f.getName());
                    }
                }
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void addTeacherName(String name) {
        if (name == null || name.trim().isEmpty()) return;
        String clean = name.trim();
        if ("TBA".equalsIgnoreCase(clean)) {
            teacherList.clear();
            teacherList.add("TBA");
            binding.cbTbaTeacher.setChecked(true);
        } else {
            teacherList.remove("TBA");
            binding.cbTbaTeacher.setChecked(false);
            if (!teacherList.contains(clean)) {
                teacherList.add(clean);
            }
        }
        refreshTeacherChips();
    }

    private void refreshTeacherChips() {
        binding.chipGroupTeachers.removeAllViews();
        for (String t : teacherList) {
            Chip chip = new Chip(requireContext());
            chip.setText(t);
            chip.setCloseIconVisible(true);
            chip.setOnCloseIconClickListener(v -> {
                teacherList.remove(t);
                refreshTeacherChips();
            });
            binding.chipGroupTeachers.addView(chip);
        }
    }

    private void loadSubjectsAndFaculty() {
        String deptCode = DepartmentUtils.getDepartmentCode(sessionManager.getDepartment());
        String deptFullName = DepartmentUtils.getDepartmentFullName(deptCode);

        subjectRepository.getSubjectsForDepartment(deptCode, new SubjectRepository.DataCallback<List<Subject>>() {
            @Override
            public void onSuccess(List<Subject> subjects) {
                dbSubjectList.clear();
                if (subjects != null) dbSubjectList.addAll(subjects);

                // Fallback: if Firestore stores full dept name, try that too
                if (dbSubjectList.isEmpty() && !deptFullName.equals(deptCode)) {
                    subjectRepository.getSubjectsForDepartment(deptFullName, new SubjectRepository.DataCallback<List<Subject>>() {
                        @Override
                        public void onSuccess(List<Subject> subjects2) {
                            if (subjects2 != null) dbSubjectList.addAll(subjects2);
                            populateSubjectDropdown();
                        }
                        @Override
                        public void onError(String err) {
                            populateSubjectDropdown();
                        }
                    });
                } else {
                    populateSubjectDropdown();
                }
            }

            @Override
            public void onError(String errorMessage) {
                populateSubjectDropdown();
            }
        });

        facultyRepository.getDepartmentFaculty(deptCode, new FacultyRepository.DataCallback<List<Faculty>>() {
            @Override
            public void onSuccess(List<Faculty> faculty) {
                dbFacultyList.clear();
                if (faculty != null) {
                    for (Faculty f : faculty) {
                        String status = f.getStatus() != null ? f.getStatus().trim() : "Active";
                        // Exclude faculty that are Left, On Leave, Inactive, or Resigned
                        if ("Left".equalsIgnoreCase(status) || "On Leave".equalsIgnoreCase(status)
                                || "Inactive".equalsIgnoreCase(status) || "Resigned".equalsIgnoreCase(status)) {
                            continue;
                        }
                        dbFacultyList.add(f);
                    }
                }

                List<String> displayList = new ArrayList<>();
                displayList.add("-- Select Faculty Member --");
                for (Faculty f : dbFacultyList) {
                    displayList.add(f.getName() + " (" + (f.getDesignation() != null ? f.getDesignation() : "Faculty") + ")");
                }

                if (getContext() != null) {
                    ArrayAdapter<String> facAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, displayList);
                    facAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
                    binding.spinnerTeacherSelect.setAdapter(facAdapter);
                }
            }

            @Override
            public void onError(String errorMessage) {}
        });
    }

    private void populateSubjectDropdown() {
        if (getContext() == null) return;
        List<String> displayList = new ArrayList<>();
        for (Subject s : dbSubjectList) {
            displayList.add(s.getCode() + " \u2014 " + s.getName());
        }

        ArrayAdapter<String> subjAdapter = new ArrayAdapter<>(requireContext(), R.layout.item_dropdown_brutalist, displayList);
        binding.actvSubject.setAdapter(subjAdapter);
    }

    private void onSubjectSelected(Subject selected) {
        if (selected == null) return;
        selectedCourseCode = selected.getCode() != null ? selected.getCode().trim() : "";
        selectedCourseSubject = selected.getName() != null ? selected.getName().trim() : "";
        selectedSubjectObj = selected;
    }

    private void loadExistingRoutinesForConflictCheck() {
        repository.getRoutines(sessionManager.getDepartment(), new RoutineRepository.DataCallback<List<ClassRoutine>>() {
            @Override
            public void onSuccess(List<ClassRoutine> data) {
                existingRoutinesList = data != null ? data : new ArrayList<>();
            }
            @Override
            public void onError(String errorMessage) {}
        });
    }

    private void populateIfEditing() {
        if (routineToEdit == null) return;

        if (isDuplicateMode) {
            binding.tvDialogTitle.setText("Duplicate Routine Slot");
        } else {
            binding.tvDialogTitle.setText("Edit Class Routine Slot");
        }

        selectedCourseCode = routineToEdit.getCode() != null ? routineToEdit.getCode().trim() : "";
        selectedCourseSubject = routineToEdit.getSubject() != null ? routineToEdit.getSubject().trim() : "";

        if (!selectedCourseCode.isEmpty()) {
            binding.actvSubject.setText(selectedCourseCode + " \u2014 " + selectedCourseSubject, false);
        }

        binding.etClassroom.setText(routineToEdit.getClassroom() != null ? routineToEdit.getClassroom() : "");

        if (routineToEdit.getDay() != null) {
            setSpinnerSelection(binding.spinnerDayDialog, routineToEdit.getDay());
        }

        if (routineToEdit.getTower() != null) {
            setSpinnerSelection(binding.spinnerTowerDialog, routineToEdit.getTower());
        }

        if (routineToEdit.getStartTime() != null) {
            startTime = routineToEdit.getStartTime();
            binding.btnStartTimePicker.setText("Start: " + startTime);
        }

        if (routineToEdit.getEndTime() != null) {
            endTime = routineToEdit.getEndTime();
            binding.btnEndTimePicker.setText("End: " + endTime);
        }

        // Restore Term Pills
        selectedTerms.clear();
        String currentDept = DepartmentUtils.getDepartmentCode(sessionManager.getDepartment());
        boolean isArchDept = "ARCH".equalsIgnoreCase(currentDept);
        String rawTerm = routineToEdit.getAcademicLevel() != null ? routineToEdit.getAcademicLevel() : routineToEdit.getTerm();
        if (rawTerm != null && !rawTerm.trim().isEmpty()) {
            String[] parts = rawTerm.split(",");
            for (String p : parts) {
                String cleanP = p.trim();
                if (!cleanP.isEmpty()) {
                    if (isArchDept && (cleanP.startsWith("Term-") || cleanP.startsWith("Term "))) {
                        String num = cleanP.replaceAll("[^0-9]", "");
                        cleanP = "Studio " + num;
                    }
                    selectedTerms.add(cleanP);
                }
            }
        }
        if (selectedTerms.isEmpty()) {
            selectedTerms.add("All");
        }
        updateTermChipsSelection();

        // Restore Section Pills
        selectedSections.clear();
        String rawSec = routineToEdit.getSection();
        if (rawSec != null && !rawSec.trim().isEmpty()) {
            String[] parts = rawSec.split(",");
            for (String p : parts) {
                String cleanP = p.trim();
                if (!cleanP.isEmpty()) selectedSections.add(cleanP);
            }
        }
        if (selectedSections.isEmpty()) {
            selectedSections.add(isArchDept ? "N/A" : "All");
        }
        updateSectionChipsSelection();
        updateApplicabilitySummary();

        // Restore Teachers
        teacherList.clear();
        if (routineToEdit.getTeachers() != null && !routineToEdit.getTeachers().isEmpty()) {
            for (String t : routineToEdit.getTeachers()) {
                addTeacherName(t);
            }
        }
    }

    private void setSpinnerSelection(android.widget.Spinner spinner, String value) {
        if (spinner == null || spinner.getAdapter() == null || value == null) return;
        String valTrim = value.trim();
        for (int i = 0; i < spinner.getAdapter().getCount(); i++) {
            Object item = spinner.getAdapter().getItem(i);
            if (item != null && item.toString().trim().equalsIgnoreCase(valTrim)) {
                spinner.setSelection(i);
                return;
            }
        }
    }

    private void setupNavigationButtons() {
        binding.btnCancel.setOnClickListener(v -> dismiss());

        binding.btnNextStep.setOnClickListener(v -> {
            if (validateStep(currentStep)) {
                currentStep++;
                if (currentStep > 5) currentStep = 5;
                updateStepView();
            }
        });

        binding.btnBackStep.setOnClickListener(v -> {
            currentStep--;
            if (currentStep < 1) currentStep = 1;
            updateStepView();
        });

        binding.btnSave.setOnClickListener(v -> saveRoutine());
    }

    private boolean validateStep(int step) {
        if (step == 1) {
            if (selectedCourseCode.isEmpty() || selectedCourseSubject.isEmpty()) {
                // Try to infer from text in autocomplete if typed directly
                String text = binding.actvSubject.getText() != null ? binding.actvSubject.getText().toString().trim() : "";
                if (!text.isEmpty()) {
                    for (Subject s : dbSubjectList) {
                        String fullEntry = s.getCode() + " \u2014 " + s.getName();
                        if (text.equalsIgnoreCase(fullEntry) || (s.getCode() != null && text.startsWith(s.getCode()))) {
                            onSubjectSelected(s);
                            break;
                        }
                    }
                }
            }

            if (selectedCourseCode.isEmpty() || selectedCourseSubject.isEmpty()) {
                Toast.makeText(requireContext(), "Please select a registered subject from the dropdown.", Toast.LENGTH_SHORT).show();
                return false;
            }
        } else if (step == 2) {
            String classroom = binding.etClassroom.getText() != null ? binding.etClassroom.getText().toString().trim() : "";
            if (classroom.isEmpty()) {
                binding.etClassroom.setError("Room number is required");
                return false;
            }
        } else if (step == 3) {
            if (teacherList.isEmpty()) {
                Toast.makeText(requireContext(), "Please select/add at least one teacher or mark as TBA", Toast.LENGTH_SHORT).show();
                return false;
            }
        } else if (step == 4) {
            if (selectedTerms.isEmpty()) {
                Toast.makeText(requireContext(), "Please select at least one academic term or All Terms.", Toast.LENGTH_SHORT).show();
                return false;
            }
            if (selectedSections.isEmpty()) {
                Toast.makeText(requireContext(), "Please select at least one section or N/A.", Toast.LENGTH_SHORT).show();
                return false;
            }
        }
        return true;
    }

    private void updateStepView() {
        binding.layoutStep1.setVisibility(currentStep == 1 ? View.VISIBLE : View.GONE);
        binding.layoutStep2.setVisibility(currentStep == 2 ? View.VISIBLE : View.GONE);
        binding.layoutStep3.setVisibility(currentStep == 3 ? View.VISIBLE : View.GONE);
        binding.layoutStep4.setVisibility(currentStep == 4 ? View.VISIBLE : View.GONE);
        binding.layoutStep5.setVisibility(currentStep == 5 ? View.VISIBLE : View.GONE);

        binding.stepProgress.setProgress(currentStep);
        binding.tvStepBadge.setText(currentStep + " of 5");

        binding.btnBackStep.setVisibility(currentStep > 1 ? View.VISIBLE : View.GONE);
        binding.btnNextStep.setVisibility(currentStep < 5 ? View.VISIBLE : View.GONE);
        binding.btnSave.setVisibility(currentStep == 5 ? View.VISIBLE : View.GONE);

        switch (currentStep) {
            case 1:
                binding.tvStepSubtitle.setText("Select registered course / subject");
                break;
            case 2:
                binding.tvStepSubtitle.setText("Configure weekly class schedule and room");
                break;
            case 3:
                binding.tvStepSubtitle.setText("Assign faculty member or mark as TBA");
                break;
            case 4:
                binding.tvStepSubtitle.setText("Specify target academic terms and sections");
                updateApplicabilitySummary();
                break;
            case 5:
                binding.tvStepSubtitle.setText("Review slot details and verify conflict checks");
                populateReviewAndCheckConflicts();
                break;
        }
    }

    private void populateReviewAndCheckConflicts() {
        String classroom = binding.etClassroom.getText() != null ? binding.etClassroom.getText().toString().trim() : "502";
        String day = (String) binding.spinnerDayDialog.getSelectedItem();
        String tower = (String) binding.spinnerTowerDialog.getSelectedItem();

        String deptCode = DepartmentUtils.getDepartmentCode(sessionManager.getDepartment());
        String termsStr;
        if (selectedTerms.contains("All") || selectedTerms.contains("All Terms") || selectedTerms.contains("All Studios")) {
            termsStr = "All Terms";
        } else if (selectedTerms.contains("N/A")) {
            termsStr = "N/A";
        } else {
            termsStr = selectedTerms.isEmpty() ? "All Terms" : android.text.TextUtils.join(", ", selectedTerms);
        }

        String secStr;
        if (selectedSections.contains("All") || selectedSections.contains("All Sections")) {
            secStr = "All Sections";
        } else if (selectedSections.contains("N/A")) {
            secStr = "N/A";
        } else {
            secStr = selectedSections.isEmpty() ? "All Sections" : android.text.TextUtils.join(", ", selectedSections);
        }

        binding.tvReviewCourse.setText("Course: " + selectedCourseCode + " — " + selectedCourseSubject);
        binding.tvReviewDept.setText("Department: " + DepartmentUtils.getDepartmentFullName(deptCode));
        binding.tvReviewSchedule.setText("Schedule: " + day + " (" + startTime + " - " + endTime + ")");
        binding.tvReviewLocation.setText("Location: " + tower + " Tower — Room " + classroom);
        binding.tvReviewTeachers.setText("Faculty: " + android.text.TextUtils.join(", ", teacherList));
        binding.tvReviewTermsSections.setText("Terms: " + termsStr + " | Sections: " + secStr);

        // Conflict check
        ClassRoutine tempTarget = new ClassRoutine();
        if (routineToEdit != null && !isDuplicateMode) {
            tempTarget.setId(routineToEdit.getId());
        }
        tempTarget.setCode(selectedCourseCode);
        tempTarget.setSubject(selectedCourseSubject);
        tempTarget.setDepartment(deptCode);
        tempTarget.setDay(day);
        tempTarget.setStartTime(startTime);
        tempTarget.setEndTime(endTime);
        tempTarget.setTower(tower);
        tempTarget.setClassroom(classroom);
        tempTarget.setTeachers(teacherList);

        String excludeId = (routineToEdit != null && !isDuplicateMode) ? routineToEdit.getId() : null;
        List<RoutineConflictDetector.ConflictResult> conflicts = RoutineConflictDetector.detectConflicts(tempTarget, existingRoutinesList);

        // Filter out conflict against self
        List<RoutineConflictDetector.ConflictResult> validConflicts = new ArrayList<>();
        if (conflicts != null) {
            for (RoutineConflictDetector.ConflictResult c : conflicts) {
                if (c.getConflictingRoutine() != null && excludeId != null && excludeId.equals(c.getConflictingRoutine().getId())) {
                    continue;
                }
                validConflicts.add(c);
            }
        }

        if (!validConflicts.isEmpty()) {
            binding.cardConflictWarning.setVisibility(View.VISIBLE);
            binding.tvConflictDetails.setText(validConflicts.get(0).getMessage() + "\n\n⚠️ Action Blocked: An exact conflicting routine slot already exists. Please adjust the schedule/room or edit the existing routine instead of creating a conflicting duplicate.");
            binding.btnSave.setEnabled(false);
            binding.btnSave.setAlpha(0.45f);
            binding.btnSave.setText("Conflict Detected — Blocked");
        } else {
            binding.cardConflictWarning.setVisibility(View.GONE);
            binding.btnSave.setEnabled(true);
            binding.btnSave.setAlpha(1.0f);
            binding.btnSave.setText((routineToEdit != null && !isDuplicateMode) ? "Update Routine" : "Save Routine");
        }
    }

    private void saveRoutine() {
        if (!binding.btnSave.isEnabled()) {
            Toast.makeText(requireContext(), "Cannot publish: Please resolve the schedule conflict first.", Toast.LENGTH_LONG).show();
            return;
        }

        String classroom = binding.etClassroom.getText() != null ? binding.etClassroom.getText().toString().trim() : "502";
        String day = (String) binding.spinnerDayDialog.getSelectedItem();
        String tower = (String) binding.spinnerTowerDialog.getSelectedItem();

        ClassRoutine routine = (routineToEdit != null && !isDuplicateMode) ? routineToEdit : new ClassRoutine();
        routine.setCode(selectedCourseCode);
        routine.setSubject(selectedCourseSubject);
        routine.setDay(day != null ? day : "Sunday");

        String deptCode = DepartmentUtils.getDepartmentCode(sessionManager.getDepartment());
        String termsVal;
        if (selectedTerms.contains("All") || selectedTerms.contains("All Terms") || selectedTerms.contains("All Studios")) {
            termsVal = "All";
        } else if (selectedTerms.contains("N/A")) {
            termsVal = "N/A";
        } else {
            termsVal = android.text.TextUtils.join(", ", selectedTerms);
        }
        routine.setAcademicLevel(termsVal);
        routine.setTerm(termsVal);

        String secVal;
        if (selectedSections.contains("All") || selectedSections.contains("All Sections")) {
            secVal = "All";
        } else if (selectedSections.contains("N/A")) {
            secVal = "N/A";
        } else {
            secVal = android.text.TextUtils.join(", ", selectedSections);
        }
        routine.setSection(secVal);
        routine.setDepartment(deptCode);
        routine.setStartTime(startTime);
        routine.setEndTime(endTime);
        routine.setTower(tower != null ? tower : "Shadhinota");
        routine.setClassroom(classroom.isEmpty() ? "502" : classroom);
        routine.setTeachers(new ArrayList<>(teacherList));
        routine.setCreatedBy(sessionManager.getUid());

        repository.addOrUpdateRoutine(routine, new RoutineRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                if (saveListener != null) {
                    saveListener.onRoutineSaved();
                }
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), (routineToEdit != null && !isDuplicateMode) ? "Routine slot updated!" : "Routine slot saved!", Toast.LENGTH_SHORT).show();
                    dismissAllowingStateLoss();
                }
            }

            @Override
            public void onError(String errorMessage) {
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), "Failed to save: " + errorMessage, Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
