package com.akon.subtools.fragments;

import android.app.DatePickerDialog;
import android.app.AlertDialog;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import com.akon.subtools.R;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.adapters.TuitionAdapter;
import com.akon.subtools.databinding.DialogPostTuitionBinding;
import com.akon.subtools.databinding.FragmentTuitionFinderBinding;
import com.akon.subtools.models.TuitionItem;
import com.akon.subtools.repository.TuitionRepository;
import com.akon.subtools.models.User;
import com.akon.subtools.database.AppDatabase;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class TuitionFinderFragment extends Fragment {

    private FragmentTuitionFinderBinding binding;
    private TuitionRepository repository;
    private TuitionAdapter adapter;
    private final List<TuitionItem> masterList = new ArrayList<>();
    private final List<TuitionItem> filteredList = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentTuitionFinderBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        repository = new TuitionRepository();

        setupRecyclerView();
        setupSearchAndFilters();
        setupSwipeRefresh();

        binding.fabPostTuition.setOnClickListener(v -> showPostTuitionDialog());

        loadTuitions();
    }

    private void setupRecyclerView() {
        adapter = new TuitionAdapter(requireContext(), filteredList);
        binding.recyclerTuitions.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.recyclerTuitions.setAdapter(adapter);
    }

    private void setupSwipeRefresh() {
        binding.swipeRefresh.setOnRefreshListener(this::loadTuitions);
    }

    private void setupSearchAndFilters() {
        binding.inputSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                applyFilters();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void loadTuitions() {
        if (binding != null) binding.swipeRefresh.setRefreshing(true);

        repository.fetchTuitions(new TuitionRepository.TuitionCallback<List<TuitionItem>>() {
            @Override
            public void onSuccess(List<TuitionItem> result) {
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
                Toast.makeText(getContext(), "Failed to load tuitions: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void applyFilters() {
        if (binding == null) return;

        String query = binding.inputSearch.getText() != null
                ? binding.inputSearch.getText().toString().trim().toLowerCase()
                : "";

        filteredList.clear();
        User localUser = AppDatabase.getLocalUser(requireContext());
        String currentUid = localUser != null && localUser.getUid() != null ? localUser.getUid().trim() : "";

        for (TuitionItem item : masterList) {
            if (item == null) continue;

            boolean isApproved = "approved".equalsIgnoreCase(item.getApprovalStatus()) || item.getApprovalStatus() == null;
            boolean isOwner = !currentUid.isEmpty() && currentUid.equalsIgnoreCase(item.getPublisherUid());

            if (!isApproved && !isOwner) {
                continue;
            }

            boolean matchesSearch = query.isEmpty()
                    || (item.getTitle() != null && item.getTitle().toLowerCase().contains(query))
                    || (item.getLocation() != null && item.getLocation().toLowerCase().contains(query))
                    || (item.getSubjects() != null && item.getSubjects().toLowerCase().contains(query))
                    || (item.getClassGrade() != null && item.getClassGrade().toLowerCase().contains(query))
                    || (item.getMedium() != null && item.getMedium().toLowerCase().contains(query));

            if (matchesSearch) {
                filteredList.add(item);
            }
        }

        binding.textCountBadge.setText(filteredList.size() + " Active Posts");
        if (adapter != null) adapter.notifyDataSetChanged();
        binding.layoutEmptyState.setVisibility(filteredList.isEmpty() ? View.VISIBLE : View.GONE);
    }

    private void showPostTuitionDialog() {
        if (getContext() == null) return;
        AlertDialog.Builder builder = new AlertDialog.Builder(requireContext());
        DialogPostTuitionBinding dialogBinding = DialogPostTuitionBinding.inflate(getLayoutInflater());
        builder.setView(dialogBinding.getRoot());
        AlertDialog dialog = builder.create();
        // Setup Brutalist Dropdown Adapters
        ArrayAdapter<CharSequence> mediumAdapter = ArrayAdapter.createFromResource(requireContext(), R.array.tuition_medium_options, R.layout.item_spinner_selected);
        mediumAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        dialogBinding.spinnerMedium.setAdapter(mediumAdapter);

        ArrayAdapter<CharSequence> gradeAdapter = ArrayAdapter.createFromResource(requireContext(), R.array.tuition_grade_options, R.layout.item_spinner_selected);
        gradeAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        dialogBinding.spinnerGrade.setAdapter(gradeAdapter);

        ArrayAdapter<CharSequence> daysAdapter = ArrayAdapter.createFromResource(requireContext(), R.array.tuition_days_options, R.layout.item_spinner_selected);
        daysAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        dialogBinding.spinnerDays.setAdapter(daysAdapter);

        // DatePicker for Available From
        dialogBinding.inputAvailableDate.setOnClickListener(v -> {
            Calendar calendar = Calendar.getInstance();
            new DatePickerDialog(requireContext(), (view, year, month, dayOfMonth) -> {
                calendar.set(year, month, dayOfMonth);
                String selectedDate = new SimpleDateFormat("dd MMM, yyyy", Locale.US).format(calendar.getTime());
                dialogBinding.inputAvailableDate.setText(selectedDate);
            }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).show();
        });

        // Auto-populate active user contact phone
        User user = AppDatabase.getLocalUser(requireContext());
        if (user != null) {
            String initialPhone = user.getPhone() != null ? user.getPhone() : "";
            dialogBinding.inputContactPhone.setText(initialPhone);
        }

        dialogBinding.btnCancel.setOnClickListener(v -> dialog.dismiss());
        dialogBinding.btnSubmitPost.setOnClickListener(v -> {
            String title = dialogBinding.inputTitle.getText() != null ? dialogBinding.inputTitle.getText().toString().trim() : "";
            String subjects = dialogBinding.inputSubjects.getText() != null ? dialogBinding.inputSubjects.getText().toString().trim() : "";
            String location = dialogBinding.inputLocation.getText() != null ? dialogBinding.inputLocation.getText().toString().trim() : "";
            String salaryStr = dialogBinding.inputSalary.getText() != null ? dialogBinding.inputSalary.getText().toString().trim() : "";
            String phone = dialogBinding.inputContactPhone.getText() != null ? dialogBinding.inputContactPhone.getText().toString().trim() : "";
            String availableFrom = dialogBinding.inputAvailableDate.getText() != null ? dialogBinding.inputAvailableDate.getText().toString().trim() : "";

            String medium = dialogBinding.spinnerMedium.getSelectedItem() != null ? dialogBinding.spinnerMedium.getSelectedItem().toString() : "Bangla Medium";
            String grade = dialogBinding.spinnerGrade.getSelectedItem() != null ? dialogBinding.spinnerGrade.getSelectedItem().toString() : "Class 6-8";
            String days = dialogBinding.spinnerDays.getSelectedItem() != null ? dialogBinding.spinnerDays.getSelectedItem().toString() : "3 Days / Week";

            if (title.isEmpty() || subjects.isEmpty() || location.isEmpty() || salaryStr.isEmpty()) {
                Toast.makeText(getContext(), "Please fill in all required fields", Toast.LENGTH_SHORT).show();
                return;
            }

            double salary = 0;
            try { salary = Double.parseDouble(salaryStr); } catch (NumberFormatException ignored) {}

            TuitionItem newItem = new TuitionItem();
            newItem.setTitle(title);
            newItem.setMedium(medium);
            newItem.setClassGrade(grade);
            newItem.setSubjects(subjects);
            newItem.setLocation(location);
            newItem.setSalary(salary);
            newItem.setDaysPerWeek(days);
            newItem.setContactPhone(phone);
            newItem.setAvailableFrom(availableFrom.isEmpty() ? "Immediate" : availableFrom);
            newItem.setStatus("Available");
            newItem.setTimestamp(System.currentTimeMillis());
            newItem.setApprovalStatus("pending");

            if (user != null) {
                newItem.setPublisherUid(user.getUid());
                newItem.setPublisherName(user.getName() != null ? user.getName() : "SUB Student");
                newItem.setContactName(user.getName() != null ? user.getName() : "SUB Student");
            } else {
                newItem.setPublisherName("SUB Student");
                newItem.setContactName("SUB Student");
            }

            dialogBinding.btnSubmitPost.setEnabled(false);
            repository.createTuition(newItem, new TuitionRepository.TuitionCallback<TuitionItem>() {
                @Override
                public void onSuccess(TuitionItem result) {
                    Toast.makeText(getContext(), "Tuition post submitted! Pending Super Admin approval.", Toast.LENGTH_LONG).show();
                    dialog.dismiss();
                    loadTuitions();
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
        binding = null;
    }
}
