package com.akon.subtools.coordinator.ui.transport;

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
import com.akon.subtools.coordinator.data.model.BusRoute;
import com.akon.subtools.coordinator.data.model.Route;
import com.akon.subtools.coordinator.data.repository.TransportRepository;
import com.akon.subtools.coordinator.databinding.DialogAddTransportBinding;

import java.util.ArrayList;
import java.util.List;

public class AddTransportDialogFragment extends DialogFragment {

    public interface TransportSaveListener {
        void onTransportSaved();
    }

    private DialogAddTransportBinding binding;
    private BusRoute editingRoute = null;
    private TransportSaveListener listener;

    private TransportRepository repository;
    private final List<Route> masterRoutes = new ArrayList<>();
    private final List<String> currentBoardingPoints = new ArrayList<>();
    private int currentStep = 1;

    public static AddTransportDialogFragment newInstance(@Nullable BusRoute route, @Nullable TransportSaveListener listener) {
        AddTransportDialogFragment fragment = new AddTransportDialogFragment();
        fragment.editingRoute = route;
        fragment.listener = listener;
        return fragment;
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
        binding = DialogAddTransportBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        repository = new TransportRepository();

        setupStepNavigation();
        loadMasterRoutesAndSetupUI();

        binding.btnCancel.setOnClickListener(v -> dismiss());
        binding.btnSave.setOnClickListener(v -> saveRoute());
    }

    private void setupStepNavigation() {
        binding.btnNextStep.setOnClickListener(v -> {
            if (currentStep == 1) {
                String name = binding.etBusName.getText() != null ? binding.etBusName.getText().toString().trim() : "";
                if (name.length() < 2) {
                    binding.etBusName.setError("Please enter a valid Bus Name");
                    return;
                }
                currentStep = 2;
                updateStepUI();
            }
        });

        binding.btnBackStep.setOnClickListener(v -> {
            if (currentStep == 2) {
                currentStep = 1;
                updateStepUI();
            }
        });

        updateStepUI();
    }

    private void updateStepUI() {
        if (currentStep == 1) {
            binding.tvStepSubtitle.setText("Step 1 of 2: Route & Vehicle Identity");
            binding.stepProgress.setProgress(1);
            binding.layoutStep1.setVisibility(View.VISIBLE);
            binding.layoutStep2.setVisibility(View.GONE);
            binding.btnBackStep.setVisibility(View.GONE);
            binding.btnNextStep.setVisibility(View.VISIBLE);
            binding.btnSave.setVisibility(View.GONE);
        } else {
            binding.tvStepSubtitle.setText("Step 2 of 2: Driver Info, Schedule & Tracking");
            binding.stepProgress.setProgress(2);
            binding.layoutStep1.setVisibility(View.GONE);
            binding.layoutStep2.setVisibility(View.VISIBLE);
            binding.btnBackStep.setVisibility(View.VISIBLE);
            binding.btnNextStep.setVisibility(View.GONE);
            binding.btnSave.setVisibility(View.VISIBLE);
        }
    }

    private void loadMasterRoutesAndSetupUI() {
        repository.getRoutes(new TransportRepository.DataCallback<List<Route>>() {
            @Override
            public void onSuccess(List<Route> routes) {
                if (!isAdded()) return;
                masterRoutes.clear();
                if (routes != null && !routes.isEmpty()) {
                    masterRoutes.addAll(routes);
                } else {
                    masterRoutes.add(new Route("route-dhanmondi", "Dhanmondi Route", "DM-01", "Permanent Campus", "", "", java.util.Arrays.asList("Dhanmondi 27", "Science Lab", "Farmgate", "Permanent Campus")));
                    masterRoutes.add(new Route("route-mirpur", "Mirpur Route", "MP-02", "Permanent Campus", "", "", java.util.Arrays.asList("Mirpur 10", "Mirpur 1", "Technical", "Permanent Campus")));
                    masterRoutes.add(new Route("route-uttara", "Uttara Route", "UT-03", "Permanent Campus", "", "", java.util.Arrays.asList("Uttara House Building", "Azampur", "Airport", "Permanent Campus")));
                    masterRoutes.add(new Route("route-ashulia", "Campus Shuttle", "CS-04", "Permanent Campus", "", "", java.util.Arrays.asList("Ashulia", "Permanent Campus")));
                }

                List<String> displayNames = new ArrayList<>();
                for (Route r : masterRoutes) {
                    displayNames.add((r.getCode() != null ? r.getCode() : "Route") + " - " + (r.getName() != null ? r.getName() : ""));
                }

                ArrayAdapter<String> routeAdapter = new ArrayAdapter<>(requireContext(),
                        android.R.layout.simple_spinner_item, displayNames);
                routeAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
                binding.spinnerAssignedRoute.setAdapter(routeAdapter);

                binding.spinnerAssignedRoute.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
                    @Override
                    public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                        if (position >= 0 && position < masterRoutes.size()) {
                            Route selected = masterRoutes.get(position);
                            updateStartingPointSpinner(selected);
                        }
                    }

                    @Override
                    public void onNothingSelected(AdapterView<?> parent) {}
                });

                if (editingRoute != null) {
                    binding.tvDialogTitle.setText("Edit Transport Bus");
                    binding.etBusName.setText(editingRoute.getName());
                    binding.etBusNumber.setText(editingRoute.getNumber() != null ? editingRoute.getNumber() : editingRoute.getCode());
                    binding.etDriverName.setText(editingRoute.getDriverName());
                    binding.etDriverPhone.setText(editingRoute.getDriverPhone());
                    binding.etBusCapacity.setText(String.valueOf(editingRoute.getCapacity() > 0 ? editingRoute.getCapacity() : 40));
                    binding.etDepartureTime.setText(editingRoute.getDepartureTime());
                    binding.etLeavingTime.setText(editingRoute.getLeavingCampusTime());
                    binding.etGpsUrl.setText(editingRoute.getGpsUrl());
                    binding.chkTemporaryOverride.setChecked(editingRoute.isTemporaryOverride());

                    if (editingRoute.getRouteId() != null) {
                        for (int i = 0; i < masterRoutes.size(); i++) {
                            if (editingRoute.getRouteId().equalsIgnoreCase(masterRoutes.get(i).getId())) {
                                binding.spinnerAssignedRoute.setSelection(i);
                                updateStartingPointSpinner(masterRoutes.get(i));
                                break;
                            }
                        }
                    }
                } else {
                    binding.tvDialogTitle.setText("Add Transport Bus");
                    binding.etDepartureTime.setText("07:30 AM");
                    binding.etLeavingTime.setText("05:15 PM");
                    binding.etBusCapacity.setText("40");
                    if (!masterRoutes.isEmpty()) {
                        updateStartingPointSpinner(masterRoutes.get(0));
                    }
                }
            }

            @Override
            public void onError(String errorMessage) {
                if (isAdded()) {
                    if (masterRoutes.isEmpty()) {
                        masterRoutes.add(new Route("route-dhanmondi", "Dhanmondi Route", "DM-01", "Permanent Campus", "", "", java.util.Arrays.asList("Dhanmondi 27", "Science Lab", "Farmgate", "Permanent Campus")));
                        masterRoutes.add(new Route("route-mirpur", "Mirpur Route", "MP-02", "Permanent Campus", "", "", java.util.Arrays.asList("Mirpur 10", "Mirpur 1", "Technical", "Permanent Campus")));
                        masterRoutes.add(new Route("route-uttara", "Uttara Route", "UT-03", "Permanent Campus", "", "", java.util.Arrays.asList("Uttara House Building", "Azampur", "Airport", "Permanent Campus")));
                        List<String> displayNames = new ArrayList<>();
                        for (Route r : masterRoutes) {
                            displayNames.add((r.getCode() != null ? r.getCode() : "Route") + " - " + (r.getName() != null ? r.getName() : ""));
                        }
                        ArrayAdapter<String> routeAdapter = new ArrayAdapter<>(requireContext(),
                                android.R.layout.simple_spinner_item, displayNames);
                        routeAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
                        binding.spinnerAssignedRoute.setAdapter(routeAdapter);
                        if (!masterRoutes.isEmpty()) {
                            updateStartingPointSpinner(masterRoutes.get(0));
                        }
                    }
                }
            }
        });
    }

    private void updateStartingPointSpinner(Route route) {
        currentBoardingPoints.clear();
        if (route != null && route.getPickupPoints() != null && !route.getPickupPoints().isEmpty()) {
            currentBoardingPoints.addAll(route.getPickupPoints());
        } else {
            currentBoardingPoints.add("Dhanmondi");
            currentBoardingPoints.add("Uttara");
            currentBoardingPoints.add("Mirpur 10");
            currentBoardingPoints.add("Permanent Campus");
        }

        ArrayAdapter<String> startAdapter = new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_item, currentBoardingPoints);
        startAdapter.setDropDownViewResource(R.layout.item_dropdown_brutalist);
        binding.spinnerStartingPoint.setAdapter(startAdapter);

        if (editingRoute != null && editingRoute.getStartingPoint() != null) {
            int pos = currentBoardingPoints.indexOf(editingRoute.getStartingPoint());
            if (pos >= 0) binding.spinnerStartingPoint.setSelection(pos);
        }
    }

    private void saveRoute() {
        if (masterRoutes.isEmpty()) {
            Toast.makeText(requireContext(), "First bus must have a route in the database.", Toast.LENGTH_LONG).show();
            return;
        }

        int routePos = binding.spinnerAssignedRoute.getSelectedItemPosition();
        if (routePos < 0 || routePos >= masterRoutes.size()) {
            Toast.makeText(requireContext(), "Please select an assigned route.", Toast.LENGTH_SHORT).show();
            return;
        }

        Route selectedMasterRoute = masterRoutes.get(routePos);

        String name = binding.etBusName.getText() != null ? binding.etBusName.getText().toString().trim() : "";
        String number = binding.etBusNumber.getText() != null ? binding.etBusNumber.getText().toString().trim() : "";
        String driver = binding.etDriverName.getText() != null ? binding.etDriverName.getText().toString().trim() : "";
        String phone = binding.etDriverPhone.getText() != null ? binding.etDriverPhone.getText().toString().trim() : "";
        String departureTime = binding.etDepartureTime.getText() != null ? binding.etDepartureTime.getText().toString().trim() : "";
        String leavingTime = binding.etLeavingTime.getText() != null ? binding.etLeavingTime.getText().toString().trim() : "";
        String gpsUrl = binding.etGpsUrl.getText() != null ? binding.etGpsUrl.getText().toString().trim() : "";
        String capStr = binding.etBusCapacity.getText() != null ? binding.etBusCapacity.getText().toString().trim() : "40";
        String startingPoint = binding.spinnerStartingPoint.getSelectedItem() != null ? binding.spinnerStartingPoint.getSelectedItem().toString() : "Dhanmondi";
        boolean isTempOverride = binding.chkTemporaryOverride.isChecked();

        if (name.length() < 2) {
            currentStep = 1;
            updateStepUI();
            binding.etBusName.setError("Bus Name is required");
            return;
        }
        if (driver.isEmpty()) {
            binding.etDriverName.setError("Driver Name is required");
            return;
        }

        int capacity = 40;
        try {
            capacity = Integer.parseInt(capStr);
        } catch (NumberFormatException ignored) {}

        BusRoute bus = editingRoute != null ? editingRoute : new BusRoute();
        bus.setName(name);
        bus.setNumber(number.isEmpty() ? "DM-SA-11-" + (int)(Math.random() * 9000 + 1000) : number);
        bus.setCode(selectedMasterRoute.getCode());
        bus.setRouteId(selectedMasterRoute.getId());
        bus.setDriverName(driver);
        bus.setDriverPhone(phone);
        bus.setCapacity(capacity);
        bus.setStartingPoint(startingPoint);
        bus.setDepartureTime(departureTime);
        bus.setLeavingCampusTime(leavingTime);
        String existingGpsUrl = editingRoute != null && editingRoute.getGpsUrl() != null ? editingRoute.getGpsUrl().trim() : "";
        String newGpsUrl = gpsUrl != null ? gpsUrl.trim() : "";
        boolean gpsUrlChanged = !newGpsUrl.equals(existingGpsUrl);

        if (!newGpsUrl.isEmpty() && (gpsUrlChanged || editingRoute == null)) {
            bus.setLastGpsUrlUpdatedAt(com.akon.subtools.coordinator.utils.GpsReminderUtils.formatIsoNow());
            bus.setNextGpsReminderAt(com.akon.subtools.coordinator.utils.GpsReminderUtils.formatIsoDaysFromNow(20));
            bus.setGpsReminderSent(false);
            bus.setLastGpsReminderSentAt(null);

            com.akon.subtools.coordinator.data.repository.SessionManager sessionManager = new com.akon.subtools.coordinator.data.repository.SessionManager(requireContext());
            String updater = sessionManager.getName();
            if (updater == null || updater.isEmpty()) updater = sessionManager.getEmail();
            if (updater == null || updater.isEmpty()) updater = "Coordinator";
            bus.setLastGpsUrlUpdatedBy(updater);
        }
        bus.setDestination("Permanent Campus");
        bus.setTemporaryOverride(isTempOverride);

        TransportRepository.DataCallback<Void> callback = new TransportRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), editingRoute != null ? "Bus details updated!" : "Bus added to transport system!", Toast.LENGTH_SHORT).show();
                    if (listener != null) listener.onTransportSaved();
                    dismissAllowingStateLoss();
                }
            }

            @Override
            public void onError(String errorMessage) {
                if (isAdded() && getContext() != null) {
                    Toast.makeText(getContext(), "Error: " + errorMessage, Toast.LENGTH_SHORT).show();
                }
            }
        };

        if (editingRoute != null) {
            repository.updateRoute(bus, callback);
        } else {
            repository.createRoute(bus, callback);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
