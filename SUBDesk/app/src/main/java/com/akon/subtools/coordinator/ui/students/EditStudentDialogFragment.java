package com.akon.subtools.coordinator.ui.students;

import android.app.DatePickerDialog;
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

import com.akon.subtools.coordinator.R;
import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.data.repository.StudentRepository;
import com.akon.subtools.coordinator.databinding.DialogEditStudentBinding;
import com.akon.subtools.coordinator.utils.DateUtils;
import com.akon.subtools.coordinator.utils.LocationData;

import java.util.Calendar;
import java.util.List;

public class EditStudentDialogFragment extends DialogFragment {

    private DialogEditStudentBinding binding;
    private User student;
    private StudentRepository repository;
    private String selectedDob = "08/08/2005";

    public static EditStudentDialogFragment newInstance(User student) {
        EditStudentDialogFragment fragment = new EditStudentDialogFragment();
        fragment.student = student;
        return fragment;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = DialogEditStudentBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        repository = new StudentRepository();

        if (student != null) {
            binding.tvEditStudentInfo.setText(student.getName() + " (ID: " + (student.getStudentId() != null ? student.getStudentId() : "N/A") + ")");
            selectedDob = student.getFormattedDOB();
            binding.btnPickDob.setText(selectedDob);
            binding.etStudentPhone.setText(student.getPhone() != null ? student.getPhone() : "");
            binding.etBloodGroup.setText(student.getBloodGroup() != null ? student.getBloodGroup() : "");
            binding.cbAllowBloodDonation.setChecked(student.isAllowBloodDonation());
        }

        binding.btnPickDob.setOnClickListener(v -> showDatePicker());

        setupLocationSpinners();

        binding.btnCancelEditStudent.setOnClickListener(v -> dismiss());
        binding.btnSaveStudentProfile.setOnClickListener(v -> saveStudentProfile());
    }

    private void showDatePicker() {
        Calendar c = Calendar.getInstance();
        new DatePickerDialog(requireContext(), (view, year, month, dayOfMonth) -> {
            Calendar chosen = Calendar.getInstance();
            chosen.set(year, month, dayOfMonth);
            selectedDob = DateUtils.formatDateToDDMMYYYY(chosen.getTime());
            binding.btnPickDob.setText(selectedDob);
        }, c.get(Calendar.YEAR) - 20, c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show();
    }

    private void setupLocationSpinners() {
        List<String> cities = LocationData.getCities();
        ArrayAdapter<String> cityAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, cities);
        cityAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerCity.setAdapter(cityAdapter);

        if (student != null && student.getCity() != null) {
            int pos = cities.indexOf(student.getCity());
            if (pos >= 0) binding.spinnerCity.setSelection(pos);
        }

        binding.spinnerCity.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                String selectedCity = parent.getItemAtPosition(position).toString();
                updateAreaSpinner(selectedCity);
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void updateAreaSpinner(String city) {
        List<String> areas = LocationData.getAreasForCity(city);
        ArrayAdapter<String> areaAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, areas);
        areaAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerArea.setAdapter(areaAdapter);

        if (student != null && student.getArea() != null) {
            int pos = areas.indexOf(student.getArea());
            if (pos >= 0) binding.spinnerArea.setSelection(pos);
        }
    }

    private void saveStudentProfile() {
        if (student == null) return;

        String phone = binding.etStudentPhone.getText() != null ? binding.etStudentPhone.getText().toString().trim() : "";
        String bloodGroup = binding.etBloodGroup.getText() != null ? binding.etBloodGroup.getText().toString().trim() : "";
        String city = binding.spinnerCity.getSelectedItem() != null ? binding.spinnerCity.getSelectedItem().toString() : "Dhaka";
        String area = binding.spinnerArea.getSelectedItem() != null ? binding.spinnerArea.getSelectedItem().toString() : "Uttara";
        boolean allowDonation = binding.cbAllowBloodDonation.isChecked();

        repository.updateStudentProfile(student.getUid(), selectedDob, city, area, phone, bloodGroup, allowDonation, new StudentRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), "Student profile updated!", Toast.LENGTH_SHORT).show();
                    dismissAllowingStateLoss();
                }
            }

            @Override
            public void onError(String errorMessage) {
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), errorMessage, Toast.LENGTH_LONG).show();
                }
            }
        });
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getDialog() != null && getDialog().getWindow() != null) {
            int width = (int) (getResources().getDisplayMetrics().widthPixels * 0.92);
            getDialog().getWindow().setLayout(width, ViewGroup.LayoutParams.WRAP_CONTENT);
            getDialog().getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }
    }
}
