package com.akon.subtools.fragments;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.akon.subtools.R;
import com.akon.subtools.activities.LoginActivity;
import com.akon.subtools.databinding.FragmentProfileBinding;
import com.akon.subtools.models.User;
import com.akon.subtools.viewmodels.AuthViewModel;
import com.akon.subtools.viewmodels.UserViewModel;
import com.bumptech.glide.Glide;

import java.util.List;
import java.util.regex.Pattern;

public class ProfileFragment extends Fragment {
    private FragmentProfileBinding binding;
    private AuthViewModel authViewModel;
    private UserViewModel userViewModel;
    private User currentUser;

    // Section options: N/A, A/1, B/2, C/3, D/4, E/5
    private static final String[] SECTION_LABELS = {"N/A (Not Applicable)", "A/1", "B/2", "C/3", "D/4", "E/5"};
    private static final String[] SECTION_VALUES = {"N/A", "A", "B", "C", "D", "E"};
    private static final String[] BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"};
    private ArrayAdapter<String> termAdapter;
    private ArrayAdapter<String> sectionAdapter;
    private ArrayAdapter<String> bloodAdapter;

    private final ActivityResultLauncher<String> imagePickerLauncher = registerForActivityResult(
            new ActivityResultContracts.GetContent(),
            uri -> {
                if (uri != null && currentUser != null) {
                    // Show the 1:1 crop dialog before uploading
                    CropAvatarDialogFragment cropDialog = CropAvatarDialogFragment.newInstance(uri);
                    cropDialog.setOnCropCompleteListener(croppedBitmap -> {
                        if (croppedBitmap != null) {
                            userViewModel.uploadProfilePhotoBitmap(currentUser.getUid(), croppedBitmap);
                        }
                    });
                    cropDialog.show(getChildFragmentManager(), "crop_avatar");
                }
            }
    );

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentProfileBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        authViewModel = new ViewModelProvider(requireActivity()).get(AuthViewModel.class);
        userViewModel = new ViewModelProvider(this).get(UserViewModel.class);

        // Pre-populate immediately from LiveData or local cache so academic identity & info are never blank
        currentUser = authViewModel.getUserLiveData().getValue();
        if (currentUser == null && getContext() != null) {
            currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(getContext());
        }
        if (currentUser != null) {
            populateProfileUI(currentUser);
        }

        binding.scrollProfile.post(() -> {
            if (binding != null && binding.scrollProfile != null) {
                binding.scrollProfile.scrollTo(0, 0);
            }
        });

        setupObservers();
        setupListeners();

        authViewModel.checkCurrentUserSession();
    }

    private void setupObservers() {
        authViewModel.getUserLiveData().observe(getViewLifecycleOwner(), user -> {
            if (user != null) {
                currentUser = user;
                populateProfileUI(user);
            }
        });

        userViewModel.getProfileUpdated().observe(getViewLifecycleOwner(), updated -> {
            if (updated) {
                Toast.makeText(getContext(), "Profile updated successfully", Toast.LENGTH_SHORT).show();
                userViewModel.clearStatus();
                authViewModel.checkCurrentUserSession();
            }
        });

        userViewModel.getPhotoUploadedUrl().observe(getViewLifecycleOwner(), url -> {
            if (url != null) {
                Toast.makeText(getContext(), "Profile photo updated successfully", Toast.LENGTH_SHORT).show();
                authViewModel.checkCurrentUserSession();
            }
        });

        userViewModel.getLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        });

        userViewModel.getError().observe(getViewLifecycleOwner(), error -> {
            if (error != null) {
                Toast.makeText(getContext(), error, Toast.LENGTH_LONG).show();
            }
        });
    }

    private String getMd5Hash(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
            byte[] messageDigest = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : messageDigest) {
                String hex = Integer.toHexString(0xFF & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            return "";
        }
    }

    private void populateProfileUI(User user) {
        if (binding == null || user == null) return;

        binding.txtProfileName.setText(user.getName() != null && !user.getName().trim().isEmpty() ? user.getName() : "Student");

        // 1. All Badges matching Web Portal (StudentProfile.jsx)
        // Role Badge (Student + Admin, Administrator, Student)
        boolean isAdmin = user.hasAdminRole();
        List<String> roles = user.getRoles();
        boolean hasDualRole = user.hasStudentRole() && user.hasAdminRole();
        if (hasDualRole) {
            binding.badgeRole.setText("STUDENT + ADMIN");
        } else if (isAdmin) {
            binding.badgeRole.setText("ADMINISTRATOR");
        } else {
            binding.badgeRole.setText("STUDENT");
        }
        binding.badgeRole.setVisibility(View.VISIBLE);

        // Department Badge & Block (show readable department name, not raw shortcode)
        String deptRaw = user.getDepartment() != null ? user.getDepartment().trim().toUpperCase() : "";
        String deptFriendly = com.akon.subtools.utils.DepartmentHelper.getUserFriendlyDeptName(deptRaw);
        String deptFull = com.akon.subtools.utils.DepartmentHelper.getFullDepartmentName(deptRaw);
        binding.badgeDepartment.setText(deptFriendly);
        binding.badgeDepartment.setVisibility(View.VISIBLE);
        binding.txtProfileDepartment.setText(deptFull.isEmpty() ? "General" : deptFull);

        // Batch Badge & Block
        String batchVal = user.getBatch() != null ? user.getBatch().trim() : "";
        if (!batchVal.isEmpty()) {
            binding.badgeBatch.setText("Batch " + batchVal);
            binding.badgeBatch.setVisibility(View.VISIBLE);
            binding.txtProfileBatch.setText("Batch " + batchVal);
        } else {
            binding.badgeBatch.setVisibility(View.GONE);
            binding.txtProfileBatch.setText("N/A");
        }

        // Academic Term Badge & Block (using academicLevel, ignoring routine filtering wildcard "All")
        List<String> dynamicTerms = getTermOptionsForUser(user);
        String currentLevel = user.getAcademicLevel();
        if (currentLevel != null && ("All".equalsIgnoreCase(currentLevel.trim()) || "N/A".equalsIgnoreCase(currentLevel.trim()))) {
            currentLevel = null;
        }
        if (currentLevel == null || currentLevel.trim().isEmpty()) {
            currentLevel = user.getSemester();
            if (currentLevel != null && ("All".equalsIgnoreCase(currentLevel.trim()) || "N/A".equalsIgnoreCase(currentLevel.trim()))) {
                currentLevel = null;
            }
        }
        if (currentLevel == null || currentLevel.trim().isEmpty()) {
            currentLevel = user.getTrimester();
            if (currentLevel != null && ("All".equalsIgnoreCase(currentLevel.trim()) || "N/A".equalsIgnoreCase(currentLevel.trim()))) {
                currentLevel = null;
            }
        }
        if (currentLevel == null || currentLevel.trim().isEmpty()) {
            currentLevel = (!dynamicTerms.isEmpty()) ? dynamicTerms.get(0) : "Semester 1";
        }
        
        // Match standard format (e.g. Studio 4 or Semester 1)
        for (String opt : dynamicTerms) {
            if (opt.equalsIgnoreCase(currentLevel.trim()) || opt.replace(" ", "").equalsIgnoreCase(currentLevel.replace(" ", ""))) {
                currentLevel = opt;
                break;
            }
        }

        binding.badgeTerm.setText(currentLevel);
        binding.badgeTerm.setVisibility(View.VISIBLE);
        binding.txtProfileCurrentTermDisplay.setText(currentLevel);

        // Section Badge
        String secVal = user.getSection() != null ? user.getSection().trim() : "";
        if (!secVal.isEmpty()) {
            binding.badgeSection.setText("Section: " + getSectionLabel(secVal));
            binding.badgeSection.setVisibility(View.VISIBLE);
        } else {
            binding.badgeSection.setVisibility(View.GONE);
        }

        binding.txtEmail.setText(user.getEmail() != null ? user.getEmail() : "");

        // Academic System
        boolean isArch = deptRaw.contains("ARCH") || (user.getEmail() != null && user.getEmail().toLowerCase().contains(".arch."));
        String systemDisplay = isArch ? "Architecture" : (user.getAcademicSystem() != null && !user.getAcademicSystem().trim().isEmpty() ? user.getAcademicSystem() : "Semester");
        binding.txtProfileTermType.setText(systemDisplay);

        // Set up Section Spinner
        if (sectionAdapter == null) {
            sectionAdapter = new ArrayAdapter<>(requireContext(), R.layout.item_spinner_selected,
                    java.util.Arrays.asList(SECTION_LABELS));
            sectionAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
            binding.spinnerSection.setAdapter(sectionAdapter);
        }
        String storedSection = user.getSection() != null ? user.getSection().trim().toUpperCase() : "";
        int sectionPos = getSectionIndex(storedSection);
        if (sectionPos >= 0) binding.spinnerSection.setSelection(sectionPos);

        // Set up Academic Term Spinner based on user's Academic System / Department
        termAdapter = new ArrayAdapter<>(requireContext(), R.layout.item_spinner_selected, dynamicTerms);
        termAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerTerm.setAdapter(termAdapter);

        // Select current term in spinner
        if (currentLevel != null && !currentLevel.trim().isEmpty()) {
            String trimmedLevel = currentLevel.trim();
            int pos = -1;
            for (int i = 0; i < dynamicTerms.size(); i++) {
                if (dynamicTerms.get(i).equalsIgnoreCase(trimmedLevel)) {
                    pos = i;
                    break;
                }
            }
            if (pos < 0) {
                String targetNorm = trimmedLevel.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
                for (int i = 0; i < dynamicTerms.size(); i++) {
                    String candidate = dynamicTerms.get(i).replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
                    if (candidate.equals(targetNorm)) {
                        pos = i;
                        break;
                    }
                }
            }
            if (pos < 0) {
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:Studio|Semester|Trimester|Term)[\\s-]*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(trimmedLevel);
                if (m.find()) {
                    try {
                        int num = Integer.parseInt(m.group(1));
                        if (num >= 1 && num <= dynamicTerms.size()) {
                            pos = num - 1;
                        }
                    } catch (Exception ignored) {}
                }
            }
            if (pos >= 0 && pos < dynamicTerms.size()) {
                binding.spinnerTerm.setSelection(pos);
            }
        }

        // Bind Personal Form Fields
        binding.editProfilePhone.setText(user.getPhone() != null ? user.getPhone() : "");

        // Date of Birth (LOCKED / READ-ONLY)
        String birthDate = user.getDob();
        if (birthDate == null || birthDate.trim().isEmpty()) {
            birthDate = user.getBirthday();
        }
        if ((birthDate == null || birthDate.trim().isEmpty()) && getContext() != null) {
            com.akon.subtools.models.User cached = new com.akon.subtools.utils.CacheManager(getContext()).getObject("user_profile", com.akon.subtools.models.User.class);
            if (cached != null) {
                birthDate = cached.getDob() != null && !cached.getDob().trim().isEmpty() ? cached.getDob() : cached.getBirthday();
            }
        }
        if (birthDate != null && !birthDate.trim().isEmpty()) {
            birthDate = birthDate.trim();
            if (birthDate.contains("-")) {
                String[] p = birthDate.split("-");
                if (p.length == 3 && p[0].length() == 4) {
                    try {
                        birthDate = String.format(java.util.Locale.ENGLISH, "%02d/%02d/%s", Integer.parseInt(p[2]), Integer.parseInt(p[1]), p[0]);
                    } catch (Exception ignored) {}
                }
            }
            binding.editProfileDob.setText(birthDate);
        } else {
            binding.editProfileDob.setText("Not Set");
        }

        // Blood Group (LOCKED / READ-ONLY)
        String bg = user.getBloodGroup() != null ? user.getBloodGroup().trim().toUpperCase() : "O+";
        binding.txtLockedBloodGroup.setText(bg);

        // Donor Switch
        binding.switchBloodDonor.setChecked(user.isAllowBloodDonation());

        binding.editProfileLocation.setText(user.getLocation() != null ? user.getLocation() : "");

        // First letter placeholder fallback
        String name = user.getName();
        String initial = (name != null && !name.trim().isEmpty()) ? name.trim().substring(0, 1).toUpperCase() : "S";
        binding.txtProfileAvatarInitial.setText(initial);

        String photoUrl = user.getPhotoURL();
        com.akon.subtools.utils.ImageHelper.loadProfileImage(
                requireContext(),
                photoUrl,
                binding.imgProfileAvatar,
                binding.cardProfileAvatarPlaceholder,
                binding.cardProfileAvatar
        );
    }

    private void setupListeners() {
        // Trigger gallery image picker when clicking the avatar image, placeholder, or camera edit badge
        binding.cardProfileAvatar.setOnClickListener(v -> imagePickerLauncher.launch("image/*"));
        binding.cardProfileAvatarPlaceholder.setOnClickListener(v -> imagePickerLauncher.launch("image/*"));
        binding.cardEditBadge.setOnClickListener(v -> imagePickerLauncher.launch("image/*"));

        // Save Academic Info (Section & Term)
        binding.btnSaveAcademic.setOnClickListener(v -> {
            if (currentUser == null) return;
            int sectionPos = binding.spinnerSection.getSelectedItemPosition();
            String section = (sectionPos >= 0 && sectionPos < SECTION_VALUES.length)
                    ? SECTION_VALUES[sectionPos] : "";
            String term = binding.spinnerTerm.getSelectedItem() != null
                    ? binding.spinnerTerm.getSelectedItem().toString() : "";
            userViewModel.updateAcademicInfo(currentUser.getUid(), section, term);
        });

        // Save Personal Details: DOB & Blood Group are permanently locked and cannot be edited
        binding.btnSavePersonal.setOnClickListener(v -> {
            if (currentUser == null) return;
            String phone = binding.editProfilePhone.getText() != null ? binding.editProfilePhone.getText().toString().trim() : "";
            if (!phone.isEmpty() && !phone.matches("01\\d{9}")) {
                Toast.makeText(getContext(), "Please enter a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX)", Toast.LENGTH_LONG).show();
                return;
            }
            // Preserve original locked DOB and Blood Group
            String dob = currentUser.getDob() != null ? currentUser.getDob() : "";
            String bloodGroup = currentUser.getBloodGroup() != null ? currentUser.getBloodGroup() : "O+";
            boolean isDonor = binding.switchBloodDonor.isChecked();
            String location = binding.editProfileLocation.getText() != null ? binding.editProfileLocation.getText().toString().trim() : "";

            userViewModel.savePersonalDetails(currentUser.getUid(), phone, dob, bloodGroup, isDonor, location);
        });

        binding.btnLogout.setOnClickListener(v -> {
            new com.google.android.material.dialog.MaterialAlertDialogBuilder(requireContext(), com.google.android.material.R.style.ThemeOverlay_MaterialComponents_Dialog_Alert)
                    .setTitle("Sign Out")
                    .setMessage("Are you sure you want to sign out of SUB Mobile?")
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Sign Out", (dialog, which) -> {
                        authViewModel.logout();
                        Intent intent = new Intent(getActivity(), LoginActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                        startActivity(intent);
                        if (getActivity() != null) {
                            getActivity().finish();
                        }
                    })
                    .show();
        });
    }

    private String getSectionLabel(String rawSection) {
        if (rawSection == null || rawSection.trim().isEmpty() || "N/A".equalsIgnoreCase(rawSection.trim()) || "NONE".equalsIgnoreCase(rawSection.trim())) {
            return "N/A";
        }
        String clean = rawSection.trim().toUpperCase();
        for (int i = 0; i < SECTION_VALUES.length; i++) {
            if (SECTION_VALUES[i].equalsIgnoreCase(clean)) {
                return SECTION_LABELS[i];
            }
        }
        return rawSection;
    }

    private int getSectionIndex(String rawSection) {
        if (rawSection == null || rawSection.trim().isEmpty()) return 0;
        String clean = rawSection.trim().toUpperCase();
        for (int i = 0; i < SECTION_VALUES.length; i++) {
            if (SECTION_VALUES[i].equalsIgnoreCase(clean)) {
                return i;
            }
        }
        return 0;
    }

    private java.util.List<String> getTermOptionsForUser(User user) {
        String dept = user != null && user.getDepartment() != null ? user.getDepartment().trim().toUpperCase() : "";
        String email = user != null && user.getEmail() != null ? user.getEmail().trim().toLowerCase() : "";
        boolean isArch = dept.contains("ARCH") || email.contains(".arch.");

        String system = user != null ? user.getAcademicSystem() : "";
        if (isArch) {
            system = "Architecture";
        } else if (system == null || system.trim().isEmpty() || "N/A".equalsIgnoreCase(system.trim())) {
            system = "Semester";
        }

        java.util.List<String> options = new java.util.ArrayList<>();
        if ("Architecture".equalsIgnoreCase(system)) {
            for (int i = 1; i <= 10; i++) {
                options.add("Studio " + i);
            }
        } else if ("Semester".equalsIgnoreCase(system)) {
            for (int i = 1; i <= 8; i++) {
                options.add("Semester " + i);
            }
        } else {
            for (int i = 1; i <= 12; i++) {
                options.add("Trimester " + i);
            }
        }
        return options;
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}

