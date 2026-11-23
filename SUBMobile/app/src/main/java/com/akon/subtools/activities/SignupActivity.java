package com.akon.subtools.activities;

import android.app.DatePickerDialog;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.akon.subtools.R;
import com.akon.subtools.databinding.ActivitySignupBinding;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.DepartmentHelper;
import com.akon.subtools.viewmodels.AuthViewModel;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.regex.Pattern;

public class SignupActivity extends AppCompatActivity {
    private ActivitySignupBinding binding;
    private AuthViewModel authViewModel;

    private int currentStage = 1;

    private final String[] departmentNames = DepartmentHelper.ALL_NAMES;
    private final Pattern studentIdPattern = Pattern.compile("^UG\\d{2}-\\d{2}-\\d{2}-\\d{3}$");
    private final Pattern phonePattern = Pattern.compile("^01\\d{9}$");

    // General academic systems (excluding Architecture for non-ARCH departments)
    private final String[] generalAcademicSystems = {"Semester", "Trimester"};
    private final String[] sectionChoices = {"A", "B", "C", "D", "E", "F"};
    private final String[] bloodGroups = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"};
    private final String[] donationChoices = {"Yes", "No"};
    private final String[] genderChoices = {"Male", "Female"};
    private final String[] cities = com.akon.subtools.utils.CityHelper.getCities();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivitySignupBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        authViewModel = new ViewModelProvider(this).get(AuthViewModel.class);

        setupSpinners();
        setupObservers();
        setupListeners();
        moveToStage(1);
    }

    private void setupSpinners() {
        // Setup Gender Dropdown
        ArrayAdapter<String> genderAdapter = new ArrayAdapter<>(this, R.layout.item_dropdown_brutalist, genderChoices);
        binding.autocompleteGender.setAdapter(genderAdapter);
        binding.autocompleteGender.setText(genderChoices[0], false);

        // Setup Department Dropdown
        ArrayAdapter<String> deptAdapter = new ArrayAdapter<>(this, R.layout.item_dropdown_brutalist, departmentNames);
        binding.autocompleteDepartment.setAdapter(deptAdapter);
        binding.autocompleteDepartment.setText(departmentNames[0], false);

        binding.autocompleteDepartment.setOnItemClickListener((parent, view, position, id) -> {
            String selectedDept = (String) parent.getItemAtPosition(position);
            onDepartmentSelected(selectedDept);
        });

        // Initialize Academic System & Terms for initial department selection
        onDepartmentSelected(departmentNames[0]);

        binding.autocompleteAcademicSystem.setOnItemClickListener((parent, view, position, id) -> {
            String selectedSystem = (String) parent.getItemAtPosition(position);
            setupTermSpinnerForSystem(selectedSystem);
        });

        // Setup Section Dropdown (Optional)
        ArrayAdapter<String> sectionAdapter = new ArrayAdapter<>(this, R.layout.item_dropdown_brutalist, sectionChoices);
        binding.autocompleteSection.setAdapter(sectionAdapter);
        binding.autocompleteSection.setText(sectionChoices[0], false);

        // Setup Blood Group Dropdown
        ArrayAdapter<String> bloodAdapter = new ArrayAdapter<>(this, R.layout.item_dropdown_brutalist, bloodGroups);
        binding.autocompleteBloodGroup.setAdapter(bloodAdapter);
        binding.autocompleteBloodGroup.setText(bloodGroups[0], false);

        // Setup Blood Donation Dropdown
        ArrayAdapter<String> donationAdapter = new ArrayAdapter<>(this, R.layout.item_dropdown_brutalist, donationChoices);
        binding.autocompleteBloodDonation.setAdapter(donationAdapter);
        binding.autocompleteBloodDonation.setText(donationChoices[0], false);

        // Setup City Dropdown
        ArrayAdapter<String> cityAdapter = new ArrayAdapter<>(this, R.layout.item_dropdown_brutalist, cities);
        binding.autocompleteCity.setAdapter(cityAdapter);
        binding.autocompleteCity.setText(cities[0], false);
        setupAreaAutocomplete(cities[0]);

        binding.autocompleteCity.setOnItemClickListener((parent, view, position, id) -> {
            String selectedCity = (String) parent.getItemAtPosition(position);
            setupAreaAutocomplete(selectedCity);
        });

        binding.autocompleteCity.addTextChangedListener(new android.text.TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String city = s != null ? s.toString().trim() : "";
                setupAreaAutocomplete(city);
            }

            @Override
            public void afterTextChanged(android.text.Editable s) {}
        });

        // Click listeners to show dropdown lists on touch
        binding.autocompleteGender.setOnClickListener(v -> binding.autocompleteGender.showDropDown());
        binding.autocompleteDepartment.setOnClickListener(v -> binding.autocompleteDepartment.showDropDown());
        binding.autocompleteAcademicSystem.setOnClickListener(v -> binding.autocompleteAcademicSystem.showDropDown());
        binding.autocompleteTerm.setOnClickListener(v -> binding.autocompleteTerm.showDropDown());
        binding.autocompleteSection.setOnClickListener(v -> binding.autocompleteSection.showDropDown());
        binding.autocompleteBloodGroup.setOnClickListener(v -> binding.autocompleteBloodGroup.showDropDown());
        binding.autocompleteBloodDonation.setOnClickListener(v -> binding.autocompleteBloodDonation.showDropDown());
        binding.autocompleteCity.setOnClickListener(v -> binding.autocompleteCity.showDropDown());
        binding.autocompleteArea.setOnClickListener(v -> binding.autocompleteArea.showDropDown());
    }

    private void onDepartmentSelected(String deptName) {
        String code = DepartmentHelper.getDeptCode(deptName);
        boolean isArch = "ARCH".equalsIgnoreCase(code) || "Architecture".equalsIgnoreCase(deptName);

        if (isArch) {
            // Hide Academic System dropdown and force "Architecture" system
            binding.inputLayoutAcademicSystem.setVisibility(View.GONE);
            binding.autocompleteAcademicSystem.setText("Architecture", false);
            setupTermSpinnerForSystem("Architecture");
        } else {
            // Show Academic System dropdown with only Semester and Trimester
            binding.inputLayoutAcademicSystem.setVisibility(View.VISIBLE);
            ArrayAdapter<String> academicAdapter = new ArrayAdapter<>(this, R.layout.item_dropdown_brutalist, generalAcademicSystems);
            binding.autocompleteAcademicSystem.setAdapter(academicAdapter);

            String currentSystem = binding.autocompleteAcademicSystem.getText().toString().trim();
            if ("Architecture".equalsIgnoreCase(currentSystem) || TextUtils.isEmpty(currentSystem)) {
                currentSystem = "Semester";
            }
            binding.autocompleteAcademicSystem.setText(currentSystem, false);
            setupTermSpinnerForSystem(currentSystem);
        }
    }

    private void setupAreaAutocomplete(String city) {
        String[] areas = com.akon.subtools.utils.CityHelper.getAreasForCity(city);
        if (areas.length == 0) {
            List<String> allAreas = com.akon.subtools.utils.CityHelper.getAllAreasCombined();
            areas = allAreas.toArray(new String[0]);
        }
        ArrayAdapter<String> areaAdapter = new ArrayAdapter<>(this, R.layout.item_dropdown_brutalist, areas);
        binding.autocompleteArea.setAdapter(areaAdapter);
        if (areas.length > 0) {
            binding.autocompleteArea.setText(areas[0], false);
        }
    }

    private void setupTermSpinnerForSystem(String system) {
        List<String> terms = new ArrayList<>();
        if ("Architecture".equals(system)) {
            for (int i = 1; i <= 10; i++) {
                terms.add("Studio " + i);
            }
        } else if ("Semester".equals(system)) {
            for (int i = 1; i <= 8; i++) {
                terms.add("Semester " + i);
            }
        } else if ("Trimester".equals(system)) {
            for (int i = 1; i <= 12; i++) {
                terms.add("Trimester " + i);
            }
        }

        ArrayAdapter<String> termAdapter = new ArrayAdapter<>(this, R.layout.item_dropdown_brutalist, terms);
        binding.autocompleteTerm.setAdapter(termAdapter);
        if (!terms.isEmpty()) {
            binding.autocompleteTerm.setText(terms.get(0), false);
        }
    }

    private void moveToStage(int stage) {
        currentStage = stage;
        if (currentStage == 1) {
            binding.layoutStage1.setVisibility(View.VISIBLE);
            binding.layoutStage2.setVisibility(View.GONE);
            binding.layoutStage3.setVisibility(View.GONE);
            binding.btnBack.setVisibility(View.GONE);
            binding.btnNextStep.setText("Continue");

            binding.textStepTitle.setText("Step 1 of 3: Account Information");
            binding.textStepBadge.setText("33%");
            binding.progressSignupSteps.setProgress(33);
        } else if (currentStage == 2) {
            binding.layoutStage1.setVisibility(View.GONE);
            binding.layoutStage2.setVisibility(View.VISIBLE);
            binding.layoutStage3.setVisibility(View.GONE);
            binding.btnBack.setVisibility(View.VISIBLE);
            binding.btnNextStep.setText("Continue");

            binding.textStepTitle.setText("Step 2 of 3: Academic Details");
            binding.textStepBadge.setText("66%");
            binding.progressSignupSteps.setProgress(66);
        } else if (currentStage == 3) {
            binding.layoutStage1.setVisibility(View.GONE);
            binding.layoutStage2.setVisibility(View.GONE);
            binding.layoutStage3.setVisibility(View.VISIBLE);
            binding.btnBack.setVisibility(View.VISIBLE);
            binding.btnNextStep.setText("Create Account");

            binding.textStepTitle.setText("Step 3 of 3: Personal & Location");
            binding.textStepBadge.setText("100%");
            binding.progressSignupSteps.setProgress(100);
        }
    }

    private boolean validateStage1() {
        String name = binding.inputName.getText().toString().trim();
        String studentId = binding.inputStudentid.getText().toString().trim().toUpperCase();
        String email = binding.inputEmail.getText().toString().trim().toLowerCase();
        String password = binding.inputPassword.getText().toString().trim();
        String phone = binding.inputPhone.getText().toString().trim();

        if (TextUtils.isEmpty(name)) {
            binding.inputName.setError("Full name is required");
            return false;
        }
        if (TextUtils.isEmpty(studentId) || !studentIdPattern.matcher(studentId).matches()) {
            binding.inputStudentid.setError("Student ID must match UGxx-xx-xx-xxx format");
            return false;
        }
        if (TextUtils.isEmpty(email) || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.inputEmail.setError("Please enter a valid email address");
            return false;
        }
        if (!isAllowedEmailDomain(email)) {
            binding.inputEmail.setError("Only Gmail, Yahoo, Outlook, and Hotmail addresses are allowed for signup");
            return false;
        }
        if (password.length() < 6) {
            binding.inputPassword.setError("Password must be at least 6 characters");
            return false;
        }

        String cleanPhone = phone.replaceAll("[\\s-]", "");
        if (cleanPhone.startsWith("+88")) {
            cleanPhone = cleanPhone.substring(3);
        } else if (cleanPhone.startsWith("88") && cleanPhone.length() == 13) {
            cleanPhone = cleanPhone.substring(2);
        }

        if (TextUtils.isEmpty(cleanPhone) || !phonePattern.matcher(cleanPhone).matches()) {
            binding.inputPhone.setError("Phone number must be 11 digits without country code (e.g. 01712345678)");
            return false;
        }

        return true;
    }

    private boolean isAllowedEmailDomain(String email) {
        if (email == null) return false;
        String lower = email.toLowerCase().trim();
        int atIndex = lower.lastIndexOf('@');
        if (atIndex == -1) return false;
        String domain = lower.substring(atIndex + 1);

        // Gmail
        if (domain.equals("gmail.com")) return true;

        // Yahoo
        if (domain.equals("yahoo.com") || domain.startsWith("yahoo.")) return true;

        // Outlook
        if (domain.equals("outlook.com") || domain.startsWith("outlook.")) return true;

        // Hotmail
        if (domain.equals("hotmail.com") || domain.startsWith("hotmail.")) return true;

        return false;
    }

    private boolean validateStage2() {
        String dept = binding.autocompleteDepartment.getText().toString().trim();
        String academicSystem = binding.autocompleteAcademicSystem.getText().toString().trim();
        String term = binding.autocompleteTerm.getText().toString().trim();
        String section = binding.autocompleteSection.getText().toString().trim();
        String dob = binding.inputDob.getText().toString().trim();
        String gender = binding.autocompleteGender.getText().toString().trim();

        if (TextUtils.isEmpty(dept)) {
            binding.autocompleteDepartment.setError("Department is required");
            Toast.makeText(this, "Please select your department", Toast.LENGTH_SHORT).show();
            return false;
        }
        if (TextUtils.isEmpty(academicSystem)) {
            binding.autocompleteAcademicSystem.setError("Academic system is required");
            Toast.makeText(this, "Please select your academic system", Toast.LENGTH_SHORT).show();
            return false;
        }
        if (TextUtils.isEmpty(term)) {
            binding.autocompleteTerm.setError("Current term/studio is required");
            Toast.makeText(this, "Please select your current term", Toast.LENGTH_SHORT).show();
            return false;
        }
        if (TextUtils.isEmpty(section) || "No Section Selected".equalsIgnoreCase(section)) {
            binding.autocompleteSection.setError("Section is required");
            Toast.makeText(this, "Please select your section", Toast.LENGTH_SHORT).show();
            return false;
        }
        if (TextUtils.isEmpty(dob)) {
            binding.inputDob.setError("Date of birth is required");
            Toast.makeText(this, "Please enter your date of birth", Toast.LENGTH_SHORT).show();
            return false;
        }
        if (TextUtils.isEmpty(gender)) {
            binding.autocompleteGender.setError("Gender is required");
            Toast.makeText(this, "Please select your gender", Toast.LENGTH_SHORT).show();
            return false;
        }
        return true;
    }

    private void performRegistration() {
        if (!validateStage1()) {
            moveToStage(1);
            return;
        }
        if (!validateStage2()) {
            moveToStage(2);
            return;
        }

        String name = binding.inputName.getText().toString().trim();
        String studentId = binding.inputStudentid.getText().toString().trim().toUpperCase();
        String email = binding.inputEmail.getText().toString().trim().toLowerCase();
        String password = binding.inputPassword.getText().toString().trim();
        String phone = binding.inputPhone.getText().toString().trim();
        String dob = binding.inputDob.getText().toString().trim();

        String selectedDeptName = binding.autocompleteDepartment.getText().toString().trim();
        String dept = DepartmentHelper.getDeptCode(selectedDeptName);

        String academicSystem = binding.autocompleteAcademicSystem.getText().toString().trim();
        String term = binding.autocompleteTerm.getText().toString().trim();
        String section = binding.autocompleteSection.getText().toString().trim();
        String gender = binding.autocompleteGender.getText().toString().trim();

        String bloodGroup = binding.autocompleteBloodGroup.getText().toString().trim();
        String donationWillingness = binding.autocompleteBloodDonation.getText().toString().trim();
        String city = binding.autocompleteCity.getText().toString().trim();
        String area = binding.autocompleteArea.getText().toString().trim();

        if (TextUtils.isEmpty(bloodGroup)) {
            binding.autocompleteBloodGroup.setError("Blood group is required");
            Toast.makeText(this, "Please select your blood group", Toast.LENGTH_SHORT).show();
            return;
        }
        if (TextUtils.isEmpty(donationWillingness)) {
            binding.autocompleteBloodDonation.setError("Blood donation preference is required");
            Toast.makeText(this, "Please select blood donation preference", Toast.LENGTH_SHORT).show();
            return;
        }
        if (TextUtils.isEmpty(city)) {
            binding.autocompleteCity.setError("City is required");
            Toast.makeText(this, "Please select your city", Toast.LENGTH_SHORT).show();
            return;
        }
        if (TextUtils.isEmpty(area)) {
            binding.autocompleteArea.setError("Area/Thana is required");
            Toast.makeText(this, "Please select your area/thana", Toast.LENGTH_SHORT).show();
            return;
        }

        boolean allowBloodDonation = "Yes".equalsIgnoreCase(donationWillingness);

        // Auto-extract batch from Student ID e.g. UG09-59-25-004 -> "59"
        String batch = "";
        if (!TextUtils.isEmpty(studentId) && studentId.contains("-")) {
            String[] parts = studentId.split("-");
            if (parts.length >= 2) {
                batch = parts[1].trim();
            }
        }
        if (TextUtils.isEmpty(batch)) {
            batch = "N/A";
        }

        // Normalize phone number
        String cleanPhone = phone.replaceAll("[\\s-]", "");
        if (cleanPhone.startsWith("+88")) {
            cleanPhone = cleanPhone.substring(3);
        } else if (cleanPhone.startsWith("88") && cleanPhone.length() == 13) {
            cleanPhone = cleanPhone.substring(2);
        }

        long admissionDate = com.akon.subtools.utils.AcademicHelper.calculateAdmissionDate(academicSystem, term, System.currentTimeMillis());

        User user = new User(null, studentId, name, email, dept, batch, cleanPhone, dob, term);
        user.setAcademicSystem(academicSystem);
        user.setAdmissionDate(admissionDate);
        user.setSection(section);
        user.setBloodGroup(bloodGroup);
        user.setAllowBloodDonation(allowBloodDonation);
        user.setLocation(city + " - " + area);
        user.setCity(city);
        user.setArea(area);
        user.setGender(gender);

        authViewModel.signup(user, password);
    }

    private void setupObservers() {
        com.akon.subtools.utils.LoadingDialog loadingDialog = new com.akon.subtools.utils.LoadingDialog(this, "Creating your account...");
        authViewModel.getLoadingLiveData().observe(this, isLoading -> {
            if (isLoading) {
                loadingDialog.show();
            } else {
                loadingDialog.dismiss();
            }
            binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            binding.btnNextStep.setEnabled(!isLoading);
            binding.btnBack.setEnabled(!isLoading);
        });

        authViewModel.getSignupSuccessLiveData().observe(this, isSuccess -> {
            if (isSuccess != null && isSuccess) {
                getSharedPreferences("app_prefs", MODE_PRIVATE)
                        .edit()
                        .putBoolean("first_login_after_signup", true)
                        .apply();

                new androidx.appcompat.app.AlertDialog.Builder(this)
                        .setTitle("Registration Successful")
                        .setMessage("Registration Successful! 🎉 Your account has been created. You can log in immediately.")
                        .setPositiveButton("Login Now", (dialog, which) -> finish())
                        .setCancelable(false)
                        .show();
            }
        });

        authViewModel.getErrorLiveData().observe(this, error -> {
            if (error != null) {
                com.akon.subtools.utils.DialogHelper.showWarningDialog(this, "Registration Failed", error);
            }
        });
    }

    private void checkStudentIdAndProceed() {
        String studentId = binding.inputStudentid.getText().toString().trim().toUpperCase();
        binding.btnNextStep.setEnabled(false);
        binding.progressBar.setVisibility(View.VISIBLE);

        if (com.akon.subtools.utils.SupabaseAuthBridge.isConfigured()) {
            java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                boolean exists = false;
                try {
                    org.json.JSONArray arr = com.akon.subtools.utils.SupabaseAuthBridge.getInstance(SignupActivity.this)
                            .queryTable("users", "student_id=eq." + java.net.URLEncoder.encode(studentId, "UTF-8") + "&select=id&limit=1");
                    if (arr != null && arr.length() > 0) {
                        exists = true;
                    }
                } catch (Exception ignored) {}

                final boolean finalExists = exists;
                runOnUiThread(() -> {
                    binding.btnNextStep.setEnabled(true);
                    binding.progressBar.setVisibility(View.GONE);

                    if (finalExists) {
                        binding.inputStudentid.setError("This Student ID (" + studentId + ") is already registered. One ID cannot open multiple accounts.");
                        com.akon.subtools.utils.DialogHelper.showWarningDialog(SignupActivity.this, "ID Already Registered", 
                            "An account with Student ID '" + studentId + "' already exists.\n\nOne Student ID cannot be used for multiple accounts.");
                    } else {
                        moveToStage(2);
                    }
                });
            });
            return;
        }

        moveToStage(2);
    }

    private void setupListeners() {
        binding.inputDob.setOnClickListener(v -> {
            final Calendar c = Calendar.getInstance();
            int year = c.get(Calendar.YEAR) - 18; // Default to 18 years ago
            int month = c.get(Calendar.MONTH);
            int day = c.get(Calendar.DAY_OF_MONTH);

            DatePickerDialog datePickerDialog = new DatePickerDialog(SignupActivity.this,
                    (view, selectedYear, selectedMonth, selectedDay) -> {
                        String dob = selectedDay + "/" + (selectedMonth + 1) + "/" + selectedYear;
                        binding.inputDob.setText(dob);
                    }, year, month, day);
            datePickerDialog.show();
        });

        binding.btnNextStep.setOnClickListener(v -> {
            if (currentStage == 1) {
                if (validateStage1()) {
                    checkStudentIdAndProceed();
                }
            } else if (currentStage == 2) {
                if (validateStage2()) {
                    moveToStage(3);
                }
            } else if (currentStage == 3) {
                performRegistration();
            }
        });

        binding.btnBack.setOnClickListener(v -> {
            if (currentStage == 2) {
                moveToStage(1);
            } else if (currentStage == 3) {
                moveToStage(2);
            }
        });

        binding.btnLoginLink.setOnClickListener(v -> finish());
    }

    @Override
    public void onBackPressed() {
        if (currentStage > 1) {
            moveToStage(currentStage - 1);
        } else {
            super.onBackPressed();
        }
    }
}
