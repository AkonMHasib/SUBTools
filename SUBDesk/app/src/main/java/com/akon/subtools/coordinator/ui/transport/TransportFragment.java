package com.akon.subtools.coordinator.ui.transport;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.coordinator.data.model.BusRoute;
import com.akon.subtools.coordinator.data.model.Permission;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.data.repository.TransportRepository;
import com.akon.subtools.coordinator.databinding.FragmentTransportBinding;

import java.util.ArrayList;
import java.util.List;

public class TransportFragment extends Fragment implements TransportAdapter.TransportActionListener {

    private FragmentTransportBinding binding;
    private TransportRepository repository;
    private SessionManager sessionManager;
    private TransportAdapter adapter;
    private final List<BusRoute> routeList = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentTransportBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        repository = new TransportRepository();
        sessionManager = new SessionManager(requireContext());

        boolean canManage = true;

        binding.recyclerViewTransport.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new TransportAdapter(requireContext(), routeList);
        adapter.setListener(this);
        adapter.setCanManage(canManage);
        binding.recyclerViewTransport.setAdapter(adapter);

        binding.btnResetOverrides.setVisibility(canManage ? View.VISIBLE : View.GONE);
        binding.btnResetOverrides.setOnClickListener(v -> {
            new AlertDialog.Builder(requireContext())
                    .setTitle("Reset Temporary Overrides")
                    .setMessage("Are you sure you want to reset all temporary bus schedule overrides back to default?")
                    .setPositiveButton("Reset", (dialog, which) -> {
                        repository.resetTemporaryOverrides(new TransportRepository.DataCallback<Void>() {
                            @Override
                            public void onSuccess(Void data) {
                                if (getContext() != null) {
                                    Toast.makeText(getContext(), "Temporary overrides reset!", Toast.LENGTH_SHORT).show();
                                    loadTransportRoutes();
                                }
                            }

                            @Override
                            public void onError(String errorMessage) {
                                if (getContext() != null) {
                                    Toast.makeText(getContext(), errorMessage, Toast.LENGTH_SHORT).show();
                                }
                            }
                        });
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
        });

        binding.fabAddTransport.setVisibility(canManage ? View.VISIBLE : View.GONE);
        binding.fabAddTransport.setOnClickListener(v -> openAddTransportDialog(null));

        binding.swipeRefreshLayout.setOnRefreshListener(() -> loadTransportRoutes(true));
    }

    @Override
    public void onResume() {
        super.onResume();
        loadTransportRoutes(false);
    }

    private void loadTransportRoutes() {
        loadTransportRoutes(false);
    }

    private void loadTransportRoutes(boolean forceRefresh) {
        if (binding == null) return;
        if (!binding.swipeRefreshLayout.isRefreshing() && routeList.isEmpty()) {
            binding.progressBarTransport.setVisibility(View.VISIBLE);
        }

        repository.getBusRoutes(forceRefresh, new TransportRepository.DataCallback<List<BusRoute>>() {
            @Override
            public void onSuccess(List<BusRoute> data) {
                if (binding == null) return;
                binding.progressBarTransport.setVisibility(View.GONE);
                binding.swipeRefreshLayout.setRefreshing(false);
                routeList.clear();
                if (data != null && !data.isEmpty()) {
                    routeList.addAll(data);
                    binding.tvEmptyTransport.setVisibility(View.GONE);
                    binding.recyclerViewTransport.setVisibility(View.VISIBLE);
                } else {
                    binding.tvEmptyTransport.setVisibility(View.VISIBLE);
                    binding.recyclerViewTransport.setVisibility(View.GONE);
                }
                adapter.notifyDataSetChanged();
            }

            @Override
            public void onError(String errorMessage) {
                if (binding == null) return;
                binding.progressBarTransport.setVisibility(View.GONE);
                binding.swipeRefreshLayout.setRefreshing(false);
                if (getContext() != null) {
                    Toast.makeText(getContext(), errorMessage, Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void openAddTransportDialog(@Nullable BusRoute route) {
        AddTransportDialogFragment dialog = AddTransportDialogFragment.newInstance(route, this::loadTransportRoutes);
        dialog.show(getChildFragmentManager(), "AddTransportDialog");
    }

    @Override
    public void onEditRoute(BusRoute route) {
        openAddTransportDialog(route);
    }

    @Override
    public void onUpdateGpsUrl(BusRoute route) {
        if (route == null || getContext() == null) return;

        Context context = requireContext();
        com.google.android.material.dialog.MaterialAlertDialogBuilder builder =
                new com.google.android.material.dialog.MaterialAlertDialogBuilder(context);
        builder.setTitle("Update GPS Tracking Link");

        android.widget.LinearLayout layout = new android.widget.LinearLayout(context);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        int paddingPx = (int) (16 * getResources().getDisplayMetrics().density);
        layout.setPadding(paddingPx, paddingPx, paddingPx, paddingPx);

        android.widget.TextView tvInfo = new android.widget.TextView(context);
        String busName = route.getName() != null ? route.getName() : "Bus Route";
        String busNum = route.getNumber() != null ? route.getNumber() : "";
        tvInfo.setText("🚌 " + busName + (busNum.isEmpty() ? "" : " (" + busNum + ")"));
        tvInfo.setTextSize(13);
        tvInfo.setTypeface(null, android.graphics.Typeface.BOLD);
        tvInfo.setTextColor(android.graphics.Color.parseColor("#0F172A"));
        layout.addView(tvInfo);

        android.widget.TextView tvSub = new android.widget.TextView(context);
        tvSub.setText("Paste the live Obhai GPS / Jimi / Tracksolid tracking URL below:");
        tvSub.setTextSize(11);
        tvSub.setTextColor(android.graphics.Color.parseColor("#64748B"));
        tvSub.setPadding(0, 4, 0, 12);
        layout.addView(tvSub);

        com.google.android.material.textfield.TextInputLayout inputLayout =
                new com.google.android.material.textfield.TextInputLayout(context);
        inputLayout.setHint("GPS Tracking URL (e.g. https://...)");
        inputLayout.setBoxBackgroundMode(com.google.android.material.textfield.TextInputLayout.BOX_BACKGROUND_OUTLINE);
        inputLayout.setEndIconMode(com.google.android.material.textfield.TextInputLayout.END_ICON_CLEAR_TEXT);

        com.google.android.material.textfield.TextInputEditText editText =
                new com.google.android.material.textfield.TextInputEditText(context);
        editText.setText(route.getGpsUrl() != null ? route.getGpsUrl() : "");
        editText.setSingleLine(true);
        editText.setTextSize(12);
        inputLayout.addView(editText);

        layout.addView(inputLayout);
        builder.setView(layout);

        builder.setPositiveButton("Save GPS Link", (dialog, which) -> {
            String newUrl = editText.getText() != null ? editText.getText().toString().trim() : "";
            String adminName = sessionManager != null && sessionManager.getName() != null && !sessionManager.getName().isEmpty()
                    ? sessionManager.getName()
                    : (sessionManager != null && sessionManager.getEmail() != null ? sessionManager.getEmail() : "STC Admin");

            repository.updateGpsUrl(route.getId(), newUrl, adminName, new TransportRepository.DataCallback<Void>() {
                @Override
                public void onSuccess(Void data) {
                    if (getContext() != null) {
                        Toast.makeText(getContext(), "GPS tracking URL updated!", Toast.LENGTH_SHORT).show();
                        loadTransportRoutes(true);
                    }
                }

                @Override
                public void onError(String errorMessage) {
                    if (getContext() != null) {
                        Toast.makeText(getContext(), "Error: " + errorMessage, Toast.LENGTH_SHORT).show();
                    }
                }
            });
        });

        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    @Override
    public void onDeleteRoute(BusRoute route) {
        new AlertDialog.Builder(requireContext())
                .setTitle("Delete Bus Route")
                .setMessage("Are you sure you want to delete " + (route.getName() != null ? route.getName() : "this route") + "?")
                .setPositiveButton("Delete", (dialog, which) -> {
                    repository.deleteRoute(route.getId(), new TransportRepository.DataCallback<Void>() {
                        @Override
                        public void onSuccess(Void data) {
                            if (getContext() != null) {
                                Toast.makeText(getContext(), "Route deleted!", Toast.LENGTH_SHORT).show();
                                loadTransportRoutes();
                            }
                        }

                        @Override
                        public void onError(String errorMessage) {
                            if (getContext() != null) {
                                Toast.makeText(getContext(), errorMessage, Toast.LENGTH_SHORT).show();
                            }
                        }
                    });
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
