package com.akon.subtools.fragments;

import android.app.AlertDialog;
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
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.R;
import com.akon.subtools.adapters.LostFoundAdapter;
import com.akon.subtools.databinding.DialogAddLostFoundBinding;
import com.akon.subtools.databinding.FragmentLostFoundBinding;
import com.akon.subtools.models.LostFoundItem;
import com.akon.subtools.repository.LostFoundRepository;
import com.akon.subtools.repository.UserRepository;
import com.google.android.material.tabs.TabLayout;
import com.akon.subtools.models.User;
import com.akon.subtools.database.AppDatabase;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class LostFoundFragment extends Fragment {
    private FragmentLostFoundBinding binding;
    private LostFoundRepository repository;
    private UserRepository userRepository;
    private LostFoundAdapter adapter;

    private final List<LostFoundItem> allItemsList = new ArrayList<>();
    private final List<LostFoundItem> displayedItemsList = new ArrayList<>();

    private Uri selectedImageUri = null;
    private DialogAddLostFoundBinding currentDialogBinding = null;

    private final ActivityResultLauncher<String> imagePickerLauncher = registerForActivityResult(
            new ActivityResultContracts.GetContent(),
            uri -> {
                if (uri != null) {
                    selectedImageUri = uri;
                    if (currentDialogBinding != null) {
                        currentDialogBinding.imgItemPreview.setImageURI(uri);
                    }
                }
            }
    );

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentLostFoundBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        repository = new LostFoundRepository(requireContext());
        userRepository = new UserRepository(requireContext());

        setupTabLayout();
        setupRecyclerView();
        setupListeners();

        loadItems();
    }

    private void setupTabLayout() {
        binding.tabLayoutLostFound.addTab(binding.tabLayoutLostFound.newTab().setText("All Items"));
        binding.tabLayoutLostFound.addTab(binding.tabLayoutLostFound.newTab().setText("Lost Items"));
        binding.tabLayoutLostFound.addTab(binding.tabLayoutLostFound.newTab().setText("Found Items"));

        binding.tabLayoutLostFound.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                filterItems();
            }

            @Override public void onTabUnselected(TabLayout.Tab tab) {}
            @Override public void onTabReselected(TabLayout.Tab tab) {}
        });
    }

    private void setupRecyclerView() {
        binding.recyclerLostFound.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new LostFoundAdapter(displayedItemsList);
        binding.recyclerLostFound.setAdapter(adapter);
    }

    private void setupListeners() {
        binding.swipeRefreshLostFound.setOnRefreshListener(this::loadItems);
        binding.fabAddLostFound.setOnClickListener(v -> showReportItemDialog());
    }

    private void loadItems() {
        binding.progressBar.setVisibility(View.VISIBLE);
        repository.getAllItems(new LostFoundRepository.LostFoundCallback() {
            @Override
            public void onSuccess(List<LostFoundItem> items) {
                if (binding == null) return;
                binding.progressBar.setVisibility(View.GONE);
                binding.swipeRefreshLostFound.setRefreshing(false);
                allItemsList.clear();
                if (items != null) {
                    allItemsList.addAll(items);
                }
                filterItems();
            }

            @Override
            public void onFailure(Exception e) {
                if (binding == null) return;
                binding.progressBar.setVisibility(View.GONE);
                binding.swipeRefreshLostFound.setRefreshing(false);
                if (getContext() != null) {
                    Toast.makeText(getContext(), "Failed to load Lost & Found items", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void filterItems() {
        if (binding == null) return;
        int selectedTab = binding.tabLayoutLostFound.getSelectedTabPosition();
        displayedItemsList.clear();
        User localUser = AppDatabase.getLocalUser(requireContext());
        String currentUid = localUser != null && localUser.getUid() != null ? localUser.getUid().trim() : "";

        for (LostFoundItem item : allItemsList) {
            boolean isApproved = "approved".equalsIgnoreCase(item.getApprovalStatus()) || item.getApprovalStatus() == null;
            boolean isOwner = !currentUid.isEmpty() && currentUid.equals(item.getPublisherUid());

            if (!isApproved && !isOwner) {
                continue; // Only show approved posts to general users
            }

            if (selectedTab == 1) { // Lost
                if ("Lost".equalsIgnoreCase(item.getType())) {
                    displayedItemsList.add(item);
                }
            } else if (selectedTab == 2) { // Found
                if ("Found".equalsIgnoreCase(item.getType())) {
                    displayedItemsList.add(item);
                }
            } else {
                displayedItemsList.add(item);
            }
        }
        adapter.notifyDataSetChanged();

        if (displayedItemsList.isEmpty()) {
            binding.emptyLostFoundText.setVisibility(View.VISIBLE);
        } else {
            binding.emptyLostFoundText.setVisibility(View.GONE);
        }
    }

    private void showReportItemDialog() {
        if (getContext() == null) return;

        selectedImageUri = null;
        AlertDialog.Builder builder = new AlertDialog.Builder(getContext());
        DialogAddLostFoundBinding dialogBinding = DialogAddLostFoundBinding.inflate(getLayoutInflater());
        currentDialogBinding = dialogBinding;
        builder.setView(dialogBinding.getRoot());
        AlertDialog dialog = builder.create();

        String[] types = {"Lost", "Found"};
        ArrayAdapter<String> typeAdapter = new ArrayAdapter<>(requireContext(), R.layout.item_spinner_selected, types);
        typeAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        dialogBinding.spinnerItemType.setAdapter(typeAdapter);

        User localUser = AppDatabase.getLocalUser(requireContext());
        String uUid = localUser != null && localUser.getUid() != null ? localUser.getUid().trim() : "anonymous";
        final String[] userRefName = {localUser != null && localUser.getName() != null ? localUser.getName() : "Student"};
        final String[] userRefPhone = {localUser != null && localUser.getPhone() != null ? localUser.getPhone() : ""};
        final String[] userRefEmail = {localUser != null && localUser.getEmail() != null ? localUser.getEmail() : ""};

        if (!userRefPhone[0].isEmpty()) {
            dialogBinding.inputItemPhone.setText(userRefPhone[0]);
        }

        dialogBinding.btnSelectPhoto.setOnClickListener(v -> imagePickerLauncher.launch("image/*"));
        dialogBinding.imgItemPreview.setOnClickListener(v -> imagePickerLauncher.launch("image/*"));

        dialogBinding.btnCancelPost.setOnClickListener(v -> {
            currentDialogBinding = null;
            dialog.dismiss();
        });

        dialogBinding.btnSubmitPost.setOnClickListener(v -> {
            String title = dialogBinding.inputItemTitle.getText() != null ? dialogBinding.inputItemTitle.getText().toString().trim() : "";
            String desc = dialogBinding.inputItemDesc.getText() != null ? dialogBinding.inputItemDesc.getText().toString().trim() : "";
            String location = dialogBinding.inputItemLocation.getText() != null ? dialogBinding.inputItemLocation.getText().toString().trim() : "";
            String phone = dialogBinding.inputItemPhone.getText() != null ? dialogBinding.inputItemPhone.getText().toString().trim() : userRefPhone[0];
            String type = dialogBinding.spinnerItemType.getSelectedItem().toString();

            if (TextUtils.isEmpty(title)) {
                dialogBinding.inputItemTitle.setError("Title is required");
                return;
            }
            if (TextUtils.isEmpty(phone)) {
                dialogBinding.inputItemPhone.setError("Phone number is required");
                return;
            }

            String currentDate = new SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()).format(new Date());

            binding.progressBar.setVisibility(View.VISIBLE);
            dialog.dismiss();
            currentDialogBinding = null;

            if (selectedImageUri != null) {
                userRepository.uploadImageToImgBB(selectedImageUri, new UserRepository.UserCallback<String>() {
                    @Override
                    public void onSuccess(String photoUrl) {
                        submitLostFoundItem(title, desc, type, location, phone, userRefName[0], userRefEmail[0], currentDate, photoUrl, uUid);
                    }

                    @Override
                    public void onFailure(Exception e) {
                        Toast.makeText(getContext(), "Image upload failed: " + e.getMessage() + ". Submitting report without photo.", Toast.LENGTH_LONG).show();
                        submitLostFoundItem(title, desc, type, location, phone, userRefName[0], userRefEmail[0], currentDate, "", uUid);
                    }
                });
            } else {
                submitLostFoundItem(title, desc, type, location, phone, userRefName[0], userRefEmail[0], currentDate, "", uUid);
            }
        });

        dialog.setOnDismissListener(d -> currentDialogBinding = null);
        dialog.show();
    }

    private void submitLostFoundItem(String title, String desc, String type, String location, String phone, String uName, String uEmail, String currentDate, String photoUrl, String uUid) {
        LostFoundItem newItem = new LostFoundItem(
                null, title, desc, type, location, phone, uName, currentDate, photoUrl, "Active", System.currentTimeMillis()
        );
        newItem.setReporterName(uName);
        newItem.setReporterPhone(phone);
        newItem.setReporterEmail(uEmail);
        newItem.setImageUrl(photoUrl);
        newItem.setPhotoUrl(photoUrl);
        newItem.setPublisherUid(uUid);
        newItem.setReporterUid(uUid);
        newItem.setApprovalStatus("pending");

        repository.addLostFoundItem(newItem, new LostFoundRepository.AddItemCallback() {
            @Override
            public void onSuccess() {
                if (binding == null) return;
                binding.progressBar.setVisibility(View.GONE);
                Toast.makeText(getContext(), "Report submitted! Awaiting Super Admin approval.", Toast.LENGTH_LONG).show();
                loadItems();
            }

            @Override
            public void onFailure(Exception e) {
                if (binding == null) return;
                binding.progressBar.setVisibility(View.GONE);
                Toast.makeText(getContext(), "Failed to submit report: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
