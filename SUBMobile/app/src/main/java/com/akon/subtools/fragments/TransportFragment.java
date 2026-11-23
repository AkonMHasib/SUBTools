package com.akon.subtools.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.R;
import com.akon.subtools.adapters.BusAdapter;
import com.akon.subtools.databinding.FragmentTransportBinding;
import com.akon.subtools.databinding.LayoutBusDetailsBottomSheetBinding;
import com.akon.subtools.models.Bus;
import com.akon.subtools.models.Route;
import com.akon.subtools.viewmodels.TransportViewModel;
import com.google.android.material.bottomsheet.BottomSheetDialog;

import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

public class TransportFragment extends Fragment {
    private FragmentTransportBinding binding;
    private TransportViewModel transportViewModel;

    private BusAdapter adapter;
    private final List<Bus> busesList = new ArrayList<>();
    private final List<Bus> displayedBusesList = new ArrayList<>();
    private final List<Route> routesList = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentTransportBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        transportViewModel = new ViewModelProvider(this).get(TransportViewModel.class);

        setupRecyclerView();
        setupObservers();
        setupListeners();

        transportViewModel.loadTransportData();
    }

    private void setupRecyclerView() {
        binding.recyclerBuses.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new BusAdapter(displayedBusesList, routesList, new BusAdapter.OnBusClickListener() {
            @Override
            public void onBusClick(Bus bus, Route route) {
                showBusDetailsBottomSheet(bus, route);
            }

            @Override
            public void onStopsClick(Bus bus, Route route) {
                showBusDetailsBottomSheet(bus, route);
            }
        });
        binding.recyclerBuses.setAdapter(adapter);
    }

    private void setupObservers() {
        transportViewModel.getBusesList().observe(getViewLifecycleOwner(), buses -> {
            binding.swipeRefreshFleet.setRefreshing(false);
            if (buses != null) {
                busesList.clear();
                busesList.addAll(buses);
                filterBusesList();
            }
        });

        transportViewModel.getRoutesList().observe(getViewLifecycleOwner(), routes -> {
            if (routes != null) {
                routesList.clear();
                routesList.addAll(routes);

                // Dynamically populate searchable boarding points dropdown
                java.util.TreeSet<String> uniquePoints = new java.util.TreeSet<>();
                for (Route r : routes) {
                    if (r.getPickupPoints() != null) {
                        for (String pt : r.getPickupPoints()) {
                            if (pt != null && !pt.trim().isEmpty()) {
                                uniquePoints.add(pt.trim());
                            }
                        }
                    }
                }
                List<String> pointsList = new ArrayList<>(uniquePoints);
                pointsList.add(0, "All Boarding Points");

                if (getContext() != null) {
                    ArrayAdapter<String> autocompleteAdapter = new ArrayAdapter<>(requireContext(),
                            R.layout.item_dropdown_brutalist, pointsList);
                    binding.inputBoardingSearch.setAdapter(autocompleteAdapter);
                }

                filterBusesList();
            }
        });

        transportViewModel.getLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        });

        transportViewModel.getError().observe(getViewLifecycleOwner(), error -> {
            binding.swipeRefreshFleet.setRefreshing(false);
            if (error != null) {
                com.akon.subtools.utils.DialogHelper.showWarningDialog(getContext(), "Sync Error", error);
            }
        });
    }

    private void setupListeners() {
        binding.swipeRefreshFleet.setOnRefreshListener(() -> {
            transportViewModel.refreshTransportData();
        });

        binding.inputBoardingSearch.setOnClickListener(v -> binding.inputBoardingSearch.showDropDown());

        binding.inputBoardingSearch.setOnItemClickListener((parent, view1, position, id) -> {
            String selected = parent.getItemAtPosition(position).toString();
            if ("All Boarding Points".equalsIgnoreCase(selected)) {
                binding.inputBoardingSearch.setText("", false);
            }
            filterBusesList();
            hideKeyboard();
        });

        binding.inputBoardingSearch.setOnEditorActionListener((v, actionId, event) -> {
            hideKeyboard();
            return true;
        });

        binding.inputBoardingSearch.addTextChangedListener(new android.text.TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterBusesList();
            }

            @Override
            public void afterTextChanged(android.text.Editable s) {}
        });
    }

    private void hideKeyboard() {
        if (getActivity() != null && binding != null) {
            android.view.inputmethod.InputMethodManager imm =
                    (android.view.inputmethod.InputMethodManager) getActivity().getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            if (imm != null) {
                View currentFocus = getActivity().getCurrentFocus();
                if (currentFocus != null) {
                    imm.hideSoftInputFromWindow(currentFocus.getWindowToken(), 0);
                } else if (binding.inputBoardingSearch != null) {
                    imm.hideSoftInputFromWindow(binding.inputBoardingSearch.getWindowToken(), 0);
                }
            }
            binding.inputBoardingSearch.clearFocus();
        }
    }

    private void filterBusesList() {
        if (binding == null) return;

        String selectedStop = binding.inputBoardingSearch.getText() != null ?
                binding.inputBoardingSearch.getText().toString().trim() : "";

        displayedBusesList.clear();

        for (Bus b : busesList) {
            // Find matching route
            Route route = null;
            String bRoute = b.getRouteId() != null ? b.getRouteId().trim() : "";
            for (Route r : routesList) {
                if (r == null) continue;
                String rId = r.getId() != null ? r.getId().trim() : "";
                String rName = r.getName() != null ? r.getName().trim() : "";
                String rCode = r.getCode() != null ? r.getCode().trim() : "";

                if (!bRoute.isEmpty() && (rId.equalsIgnoreCase(bRoute) || rName.equalsIgnoreCase(bRoute) || rCode.equalsIgnoreCase(bRoute))) {
                    route = r;
                    break;
                }
            }

            boolean matchesStop;
            if (selectedStop.isEmpty()) {
                matchesStop = true;
            } else if (route == null || route.getPickupPoints() == null) {
                matchesStop = false;
            } else {
                List<String> stops = route.getPickupPoints();

                // Find the index of the selected boarding point in the full route
                int selectedStopIndex = -1;
                for (int i = 0; i < stops.size(); i++) {
                    if (stops.get(i) != null && stops.get(i).trim().equalsIgnoreCase(selectedStop)) {
                        selectedStopIndex = i;
                        break;
                    }
                }

                if (selectedStopIndex < 0) {
                    // Stop not in this route at all
                    matchesStop = false;
                } else {
                    // Find the index where this bus actually starts
                    int busStartIndex = 0;
                    if (b.getStartingPoint() != null && !b.getStartingPoint().trim().isEmpty()) {
                        String startPt = b.getStartingPoint().trim();
                        for (int i = 0; i < stops.size(); i++) {
                            if (stops.get(i) != null && stops.get(i).trim().equalsIgnoreCase(startPt)) {
                                busStartIndex = i;
                                break;
                            }
                        }
                    }
                    // Bus services this stop only if it starts at or before the stop in the route
                    matchesStop = selectedStopIndex >= busStartIndex;
                }
            }

            if (matchesStop) {
                displayedBusesList.add(b);
            }
        }

        if (adapter != null) {
            adapter.setSelectedBoardingPoint(selectedStop);
            adapter.notifyDataSetChanged();
        }

        if (binding.emptyTransportText != null) {
            binding.emptyTransportText.setVisibility(displayedBusesList.isEmpty() ? View.VISIBLE : View.GONE);
        }
    }

    private boolean containsIgnoreCase(List<String> list, String value) {
        if (list == null || value == null) return false;
        for (String item : list) {
            if (item != null && item.trim().equalsIgnoreCase(value.trim())) {
                return true;
            }
        }
        return false;
    }

    private void showBusDetailsBottomSheet(Bus bus, Route route) {
        if (bus == null) return;
        BottomSheetDialog dialog = new BottomSheetDialog(requireContext());
        LayoutBusDetailsBottomSheetBinding bsBinding = 
                LayoutBusDetailsBottomSheetBinding.inflate(getLayoutInflater());
        dialog.setContentView(bsBinding.getRoot());
 
        bsBinding.bsBusName.setText(bus.getName());
        bsBinding.bsBusNumber.setText(bus.getNumber());
        
        // Find route if passed route was null
        if (route == null && bus.getRouteId() != null && !bus.getRouteId().trim().isEmpty()) {
            String bRoute = bus.getRouteId().trim();
            for (Route r : routesList) {
                if (r == null) continue;
                String rId = r.getId() != null ? r.getId().trim() : "";
                String rName = r.getName() != null ? r.getName().trim() : "";
                String rCode = r.getCode() != null ? r.getCode().trim() : "";
                if (rId.equalsIgnoreCase(bRoute) || rName.equalsIgnoreCase(bRoute) || rCode.equalsIgnoreCase(bRoute) ||
                    (!rName.isEmpty() && bRoute.toLowerCase().contains(rName.toLowerCase())) ||
                    (!rName.isEmpty() && rName.toLowerCase().contains(bRoute.toLowerCase()))) {
                    route = r;
                    break;
                }
            }
        }

        String routeName = "Unknown Route";
        if (route != null) {
            String rName = route.getName() != null ? route.getName().trim() : "";
            if (rName.equalsIgnoreCase("null")) rName = "";
            String rCode = route.getCode() != null ? route.getCode().trim() : "";
            if (rCode.equalsIgnoreCase("null")) rCode = "";

            if (!rName.isEmpty() && !rCode.isEmpty()) {
                routeName = rName + " (" + rCode + ")";
            } else if (!rName.isEmpty()) {
                routeName = rName;
            } else if (!rCode.isEmpty()) {
                routeName = rCode;
            } else if (bus.getRouteId() != null && !bus.getRouteId().trim().isEmpty() && !bus.getRouteId().equalsIgnoreCase("null")) {
                routeName = bus.getRouteId().trim();
            }
        } else if (bus.getRouteId() != null && !bus.getRouteId().trim().isEmpty() && !bus.getRouteId().equalsIgnoreCase("null")) {
            routeName = bus.getRouteId().trim();
        }
        bsBinding.bsRouteName.setText(routeName);

        String selectedStop = binding.inputBoardingSearch.getText() != null ? 
                binding.inputBoardingSearch.getText().toString().trim() : "";

        if (route != null && route.getPickupPoints() != null && !route.getPickupPoints().isEmpty()) {
            java.util.Map<String, String> stopTimes = bus.getPickupTimes() != null && !bus.getPickupTimes().isEmpty()
                    ? bus.getPickupTimes()
                    : (route.getStoppageTimes() != null ? route.getStoppageTimes() : new java.util.HashMap<>());

            List<String> allStops = route.getPickupPoints();

            // Always start from the bus's own starting point
            int startIndex = 0;
            if (bus.getStartingPoint() != null && !bus.getStartingPoint().trim().isEmpty()) {
                String startPt = bus.getStartingPoint().trim();
                for (int i = 0; i < allStops.size(); i++) {
                    if (allStops.get(i) != null && allStops.get(i).trim().equalsIgnoreCase(startPt)) {
                        startIndex = i;
                        break;
                    }
                }
            }

            android.text.SpannableStringBuilder builder = new android.text.SpannableStringBuilder();
            boolean firstStop = true;
            for (int i = startIndex; i < allStops.size(); i++) {
                String stop = allStops.get(i);
                if (stop == null || stop.trim().isEmpty()) continue;
                String cleanStop = stop.trim();
                String time = stopTimes.get(cleanStop);
                String label = (time != null && !time.trim().isEmpty())
                        ? cleanStop + " (" + time.trim() + ")"
                        : cleanStop;

                if (!firstStop) builder.append(" • ");
                firstStop = false;

                int spanStart = builder.length();
                builder.append(label);
                int spanEnd = builder.length();

                // Bold + highlight the selected boarding point
                if (!selectedStop.isEmpty() && cleanStop.equalsIgnoreCase(selectedStop)) {
                    builder.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD),
                            spanStart, spanEnd, android.text.Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                    builder.setSpan(new android.text.style.ForegroundColorSpan(
                                    androidx.core.content.ContextCompat.getColor(requireContext(), com.akon.subtools.R.color.primary)),
                            spanStart, spanEnd, android.text.Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                }

                if (cleanStop.equalsIgnoreCase("Campus") || cleanStop.toLowerCase().contains("campus")) {
                    break;
                }
            }
            bsBinding.bsRouteStops.setText(builder);
        } else {
            bsBinding.bsRouteStops.setText("No intermediate stops configured.");
        }


        // Close Button
        bsBinding.btnCloseSheet.setOnClickListener(v -> dialog.dismiss());

        // Live Tracking Map via WebView (safe check)
        String gpsUrl = bus.getGpsUrl();
        boolean isValidUrl = false;
        if (gpsUrl != null) {
            String trimmed = gpsUrl.trim();
            if (!trimmed.isEmpty() && !trimmed.equalsIgnoreCase("null") &&
                !trimmed.equalsIgnoreCase("http://null") && !trimmed.equalsIgnoreCase("http://null/") &&
                !trimmed.equalsIgnoreCase("https://null") && !trimmed.equalsIgnoreCase("https://null/") &&
                (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
                try {
                    android.net.Uri uri = android.net.Uri.parse(trimmed);
                    String host = uri.getHost();
                    if (host != null && !host.trim().isEmpty() && !host.equalsIgnoreCase("null") && host.contains(".")) {
                        isValidUrl = true;
                    }
                } catch (Exception ignored) {}
            }
        }

        final boolean finalIsValidUrl = isValidUrl;

        if (finalIsValidUrl) {
            final String finalGpsUrl = gpsUrl.trim();
            bsBinding.bsTrackingSection.setVisibility(View.VISIBLE);
            
            // Open in external browser action
            bsBinding.btnOpenExternalGps.setOnClickListener(v -> {
                try {
                    android.content.Intent browserIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(finalGpsUrl));
                    startActivity(browserIntent);
                } catch (Exception e) {
                    Toast.makeText(getContext(), "Cannot open link: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });

            android.webkit.WebView webView = bsBinding.bsWebview;
            android.webkit.WebSettings ws = webView.getSettings();
            ws.setJavaScriptEnabled(true);
            ws.setDomStorageEnabled(true);
            ws.setDatabaseEnabled(true);
            ws.setGeolocationEnabled(true);
            ws.setSupportZoom(true);
            ws.setBuiltInZoomControls(true);
            ws.setDisplayZoomControls(false);
            ws.setUseWideViewPort(true);
            ws.setLoadWithOverviewMode(true);
            ws.setJavaScriptCanOpenWindowsAutomatically(true);
            ws.setAllowFileAccess(true);
            ws.setAllowContentAccess(true);
            ws.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
            webView.setInitialScale(100);
            ws.setUserAgentString("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36");
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                ws.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
            }
            android.webkit.CookieManager.getInstance().setAcceptCookie(true);
            
            webView.setWebChromeClient(new android.webkit.WebChromeClient() {
                @Override
                public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                    callback.invoke(origin, true, false);
                }

                @Override
                public boolean onJsAlert(android.webkit.WebView view, String url, String message, android.webkit.JsResult result) {
                    result.confirm();
                    return true;
                }
            });
            
            webView.setWebViewClient(new android.webkit.WebViewClient() {
                @Override
                public void onReceivedSslError(android.webkit.WebView view, android.webkit.SslErrorHandler handler, android.net.http.SslError error) {
                    handler.proceed();
                }

                @Override
                public boolean shouldOverrideUrlLoading(android.webkit.WebView view, String url) {
                    return false;
                }
            });
            webView.loadUrl(finalGpsUrl);
        } else {
            bsBinding.bsTrackingSection.setVisibility(View.GONE);
        }

        // Force Bottom Sheet to Fullscreen Height programmatically
        dialog.setOnShowListener(dialogInterface -> {
            View bottomSheet = dialog.findViewById(com.google.android.material.R.id.design_bottom_sheet);
            if (bottomSheet != null) {
                android.view.ViewGroup.LayoutParams layoutParams = bottomSheet.getLayoutParams();
                layoutParams.height = android.view.ViewGroup.LayoutParams.MATCH_PARENT;
                bottomSheet.setLayoutParams(layoutParams);
                
                com.google.android.material.bottomsheet.BottomSheetBehavior<View> behavior = 
                        com.google.android.material.bottomsheet.BottomSheetBehavior.from(bottomSheet);
                behavior.setDraggable(false);
                behavior.setState(com.google.android.material.bottomsheet.BottomSheetBehavior.STATE_EXPANDED);
                behavior.setSkipCollapsed(true);
            }
        });

        // WebView memory release on dismiss
        dialog.setOnDismissListener(dialogInterface -> {
            if (finalIsValidUrl) {
                bsBinding.bsWebview.stopLoading();
                bsBinding.bsWebview.clearHistory();
                bsBinding.bsWebview.destroy();
            }
        });

        dialog.show();
    }

  

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
