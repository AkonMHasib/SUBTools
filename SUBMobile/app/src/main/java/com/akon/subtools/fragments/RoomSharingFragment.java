package com.akon.subtools.fragments;

import android.app.DatePickerDialog;
import android.graphics.Bitmap;
import android.graphics.ImageDecoder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Base64;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.R;

import com.akon.subtools.adapters.SubletAdapter;
import com.akon.subtools.databinding.DialogPostSubletBinding;
import com.akon.subtools.databinding.FragmentRoomSharingBinding;
import com.akon.subtools.models.SubletItem;
import com.akon.subtools.repository.SubletRepository;
import com.bumptech.glide.Glide;
import com.akon.subtools.models.User;
import com.akon.subtools.database.AppDatabase;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.List;
import java.util.concurrent.Executors;

public class RoomSharingFragment extends Fragment {

    private FragmentRoomSharingBinding binding;
    private SubletRepository repository;
    private SubletAdapter adapter;

    private final List<SubletItem> masterList = new ArrayList<>();
    private final List<SubletItem> filteredList = new ArrayList<>();

    private String currentGenderFilter = "All";
    private boolean seatsOnlyFilter = false;
    private String searchQuery = "";

    private DialogPostSubletBinding activeDialogBinding;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentRoomSharingBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        repository = new SubletRepository();

        setupRecyclerView();
        setupSearchAndFilters();
        setupSwipeRefresh();

        binding.fabPostSublet.setOnClickListener(v -> showPostSubletDialog());

        loadSublets();
    }

    private void setupRecyclerView() {
        adapter = new SubletAdapter(requireContext(), filteredList);
        binding.recyclerSublets.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.recyclerSublets.setAdapter(adapter);
    }

    private void setupSwipeRefresh() {
        binding.swipeRefresh.setOnRefreshListener(this::loadSublets);
    }

    private void setupSearchAndFilters() {
        binding.inputSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                searchQuery = s != null ? s.toString().trim().toLowerCase() : "";
                applyFilters();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        binding.chipAll.setOnClickListener(v -> {
            currentGenderFilter = "All";
            applyFilters();
        });
        binding.chipMale.setOnClickListener(v -> {
            currentGenderFilter = "Male";
            applyFilters();
        });
        binding.chipFemale.setOnClickListener(v -> {
            currentGenderFilter = "Female";
            applyFilters();
        });
        binding.chipSeats.setOnClickListener(v -> {
            seatsOnlyFilter = binding.chipSeats.isChecked();
            applyFilters();
        });
    }

    private void loadSublets() {
        if (binding != null) binding.swipeRefresh.setRefreshing(true);

        repository.fetchSublets(new SubletRepository.SubletCallback<List<SubletItem>>() {
            @Override
            public void onSuccess(List<SubletItem> result) {
                if (binding == null) return;
                binding.swipeRefresh.setRefreshing(false);
                masterList.clear();
                if (result != null) masterList.addAll(result);
                applyFilters();
            }

            @Override
            public void onFailure(Exception e) {
                if (binding == null) return;
                binding.swipeRefresh.setRefreshing(false);
                Toast.makeText(getContext(), "Failed to load sublets: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void applyFilters() {
        if (binding == null) return;

        User localUser = AppDatabase.getLocalUser(requireContext());
        String currentUid = localUser != null && localUser.getUid() != null ? localUser.getUid().trim() : "";

        for (SubletItem item : masterList) {
            if (item == null) continue;

            boolean isApproved = "approved".equalsIgnoreCase(item.getApprovalStatus()) || item.getApprovalStatus() == null;
            boolean isOwner = !currentUid.isEmpty() && currentUid.equalsIgnoreCase(item.getPublisherUid());

            if (!isApproved && !isOwner) {
                continue;
            }

            if (seatsOnlyFilter) {
                String type = item.getType() != null ? item.getType().toLowerCase() : "";
                if (!type.contains("seat")) continue;
            }

            if (!"All".equalsIgnoreCase(currentGenderFilter)) {
                String gender = item.getGenderPreference() != null ? item.getGenderPreference().toLowerCase() : "";
                if ("male".equalsIgnoreCase(currentGenderFilter) && !gender.contains("male")) continue;
                if ("female".equalsIgnoreCase(currentGenderFilter) && !gender.contains("female")) continue;
            }

            if (!searchQuery.isEmpty()) {
                boolean matchesTitle = item.getTitle() != null && item.getTitle().toLowerCase().contains(searchQuery);
                boolean matchesLoc = item.getLocation() != null && item.getLocation().toLowerCase().contains(searchQuery);
                boolean matchesAddress = item.getAddress() != null && item.getAddress().toLowerCase().contains(searchQuery);
                boolean matchesDesc = item.getDescription() != null && item.getDescription().toLowerCase().contains(searchQuery);

                if (!matchesTitle && !matchesLoc && !matchesAddress && !matchesDesc) continue;
            }

            filteredList.add(item);
        }

        if (adapter != null) adapter.notifyDataSetChanged();
        if (binding != null) binding.layoutEmptyState.setVisibility(filteredList.isEmpty() ? View.VISIBLE : View.GONE);
    }

    private void showPostSubletDialog() {
        if (getContext() == null) return;
        AlertDialog.Builder builder = new AlertDialog.Builder(requireContext());
        DialogPostSubletBinding dialogBinding = DialogPostSubletBinding.inflate(getLayoutInflater());
        builder.setView(dialogBinding.getRoot());
        AlertDialog dialog = builder.create();
        if (dialog.getWindow() != null) dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);

        activeDialogBinding = dialogBinding;

        // Setup Spinners with White / Light Theme items
        String[] typeOptions = new String[]{"Seat", "Sublet", "Full Flat", "Room"};
        String[] genderOptions = new String[]{"Male Only", "Female Only", "Any Gender"};

        ArrayAdapter<String> typeAdapter = new ArrayAdapter<>(requireContext(), R.layout.item_spinner_selected, typeOptions);
        typeAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        ArrayAdapter<String> genderAdapter = new ArrayAdapter<>(requireContext(), R.layout.item_spinner_selected, genderOptions);
        genderAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);

        dialogBinding.spinnerType.setAdapter(typeAdapter);
        dialogBinding.spinnerGender.setAdapter(genderAdapter);

        // DatePicker for Available From
        dialogBinding.inputAvailableDate.setOnClickListener(v -> {
            Calendar calendar = Calendar.getInstance();
            new DatePickerDialog(requireContext(), (view, year, month, dayOfMonth) -> {
                calendar.set(year, month, dayOfMonth);
                String selectedDate = new SimpleDateFormat("dd MMM, yyyy", Locale.US).format(calendar.getTime());
                dialogBinding.inputAvailableDate.setText(selectedDate);
            }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).show();
        });

        // Auto-populate logged-in User profile contact info
        final String[] resolvedUid = {""};
        User localUser = AppDatabase.getLocalUser(requireContext());
        if (localUser != null && localUser.getUid() != null) {
            resolvedUid[0] = localUser.getUid().trim();
            if (localUser.getName() != null && !localUser.getName().trim().isEmpty()) {
                dialogBinding.inputContactName.setText(localUser.getName().trim());
            }
            if (localUser.getPhone() != null && !localUser.getPhone().trim().isEmpty()) {
                dialogBinding.inputContactPhone.setText(localUser.getPhone().trim());
            }
        }

        dialogBinding.btnCancel.setOnClickListener(v -> dialog.dismiss());
        dialogBinding.btnSubmitPost.setOnClickListener(v -> {
            String title = dialogBinding.inputTitle.getText() != null ? dialogBinding.inputTitle.getText().toString().trim() : "";
            String rentStr = dialogBinding.inputRent.getText() != null ? dialogBinding.inputRent.getText().toString().trim() : "";
            String location = dialogBinding.inputLocation.getText() != null ? dialogBinding.inputLocation.getText().toString().trim() : "";
            String phone = dialogBinding.inputContactPhone.getText() != null ? dialogBinding.inputContactPhone.getText().toString().trim() : "";
            String contactName = dialogBinding.inputContactName.getText() != null ? dialogBinding.inputContactName.getText().toString().trim() : "";
            String availableFrom = dialogBinding.inputAvailableDate.getText() != null ? dialogBinding.inputAvailableDate.getText().toString().trim() : "";
            String description = dialogBinding.inputDescription.getText() != null ? dialogBinding.inputDescription.getText().toString().trim() : "";
            String type = dialogBinding.spinnerType.getSelectedItem() != null ? dialogBinding.spinnerType.getSelectedItem().toString() : "Seat";
            String gender = dialogBinding.spinnerGender.getSelectedItem() != null ? dialogBinding.spinnerGender.getSelectedItem().toString() : "Any Gender";
            boolean billsIncluded = dialogBinding.switchBills.isChecked();

            if (title.isEmpty() || rentStr.isEmpty() || location.isEmpty()) {
                Toast.makeText(getContext(), "Please fill in all required fields", Toast.LENGTH_SHORT).show();
                return;
            }

            double rent = 0;
            try { rent = Double.parseDouble(rentStr); } catch (NumberFormatException ignored) {}

            SubletItem newItem = new SubletItem();
            newItem.setTitle(title);
            newItem.setRent(rent);
            newItem.setLocation(location);
            newItem.setContactName(contactName.isEmpty() ? "SUB Student" : contactName);
            newItem.setContactPhone(phone);
            newItem.setAvailableFrom(availableFrom.isEmpty() ? "Immediate" : availableFrom);
            newItem.setDescription(description);
            newItem.setType(type);
            newItem.setGenderPreference(gender);
            newItem.setBillsIncluded(billsIncluded);
            newItem.setPhotoUrl("");
            newItem.setStatus("Active");
            newItem.setTimestamp(System.currentTimeMillis());
            newItem.setApprovalStatus("pending");
            newItem.setPublisherUid(resolvedUid[0]);
            newItem.setPublisherName(contactName.isEmpty() ? "SUB Student" : contactName);

            dialogBinding.btnSubmitPost.setEnabled(false);
            repository.createSublet(newItem, new SubletRepository.SubletCallback<SubletItem>() {
                @Override
                public void onSuccess(SubletItem result) {
                    Toast.makeText(getContext(), "Sublet listing submitted! Pending Super Admin approval.", Toast.LENGTH_LONG).show();
                    dialog.dismiss();
                    loadSublets();
                }
                @Override
                public void onFailure(Exception e) {
                    dialogBinding.btnSubmitPost.setEnabled(true);
                    Toast.makeText(getContext(), "Failed to publish post: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        dialog.show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        activeDialogBinding = null;
        binding = null;
    }
}