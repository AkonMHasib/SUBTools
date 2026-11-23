package com.akon.subtools.adapters;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.databinding.ItemBusBinding;
import com.akon.subtools.models.Bus;
import com.akon.subtools.models.Route;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class BusAdapter extends RecyclerView.Adapter<BusAdapter.ViewHolder> {
    private final List<Bus> list;
    private final List<Route> routes;
    private final OnBusClickListener clickListener;

    public interface OnBusClickListener {
        void onBusClick(Bus bus, Route route);
        void onStopsClick(Bus bus, Route route);
    }

    private String selectedBoardingPoint = "";

    public void setSelectedBoardingPoint(String selectedBoardingPoint) {
        this.selectedBoardingPoint = selectedBoardingPoint != null ? selectedBoardingPoint.trim() : "";
    }

    public BusAdapter(List<Bus> list, List<Route> routes, OnBusClickListener clickListener) {
        this.list = list;
        this.routes = routes;
        this.clickListener = clickListener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemBusBinding binding = ItemBusBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new ViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Bus b = list.get(position);
        Context context = holder.itemView.getContext();

        holder.binding.textBusName.setText(b.getName());
        holder.binding.textBusNumber.setText(b.getNumber());
        holder.binding.textBusTiming.setText("To Campus: " + b.getStartTime() + "  •  From Campus: " + b.getLeavingCampusTime());
        
        String startPt = b.getStartingPoint() != null && !b.getStartingPoint().trim().isEmpty() ? b.getStartingPoint().trim() : "Campus";
        holder.binding.textStartingPoint.setText("Starts: " + startPt);
        
        String driverName = b.getDriver() != null && !b.getDriver().trim().isEmpty() ? b.getDriver().trim() : "Assigned Driver";
        holder.binding.textDriver.setText("Driver: " + driverName);
        
        holder.binding.textCapacity.setText("Capacity: " + b.getCapacity() + " Seats");

        holder.binding.badgeOverride.setVisibility(b.isTemporaryOverride() ? View.VISIBLE : View.GONE);

        Route matchingRoute = null;
        String routeName = "Unknown Route";
        String bRoute = b.getRouteId() != null ? b.getRouteId().trim() : "";
        for (Route r : routes) {
            if (r == null) continue;
            String rId = r.getId() != null ? r.getId().trim() : "";
            String rName = r.getName() != null ? r.getName().trim() : "";
            String rCode = r.getCode() != null ? r.getCode().trim() : "";

            if (!bRoute.isEmpty() && (rId.equalsIgnoreCase(bRoute) || rName.equalsIgnoreCase(bRoute) || rCode.equalsIgnoreCase(bRoute))) {
                matchingRoute = r;
                routeName = rName + (!rCode.isEmpty() ? " (" + rCode + ")" : "");
                break;
            }
        }
        if (matchingRoute == null && !bRoute.isEmpty()) {
            routeName = bRoute;
        }
        holder.binding.textBusRoute.setText(routeName);

        // Format ordered stoppages from bus's own starting point to Campus, bold the selected boarding point
        if (matchingRoute != null && matchingRoute.getPickupPoints() != null && !matchingRoute.getPickupPoints().isEmpty()) {
            Map<String, String> timesMap = b.getPickupTimes() != null && !b.getPickupTimes().isEmpty()
                    ? b.getPickupTimes()
                    : (matchingRoute.getStoppageTimes() != null ? matchingRoute.getStoppageTimes() : new java.util.HashMap<>());

            List<String> allStops = matchingRoute.getPickupPoints();

            // Always start from the bus's own starting point (never from selectedBoardingPoint)
            int startIndex = 0;
            if (b.getStartingPoint() != null && !b.getStartingPoint().trim().isEmpty()) {
                String busStart = b.getStartingPoint().trim();
                for (int i = 0; i < allStops.size(); i++) {
                    if (allStops.get(i) != null && allStops.get(i).trim().equalsIgnoreCase(busStart)) {
                        startIndex = i;
                        break;
                    }
                }
            }

            android.text.SpannableStringBuilder builder = new android.text.SpannableStringBuilder("Route: ");
            boolean firstStop = true;
            for (int i = startIndex; i < allStops.size(); i++) {
                String stop = allStops.get(i);
                if (stop == null || stop.trim().isEmpty()) continue;
                String cleanStop = stop.trim();
                String time = timesMap.get(cleanStop);
                String label = (time != null && !time.trim().isEmpty())
                        ? cleanStop + " (" + time.trim() + ")"
                        : cleanStop;

                if (!firstStop) builder.append(" • ");
                firstStop = false;

                int spanStart = builder.length();
                builder.append(label);
                int spanEnd = builder.length();

                // Bold + highlight the selected boarding point
                if (!selectedBoardingPoint.isEmpty() && cleanStop.equalsIgnoreCase(selectedBoardingPoint)) {
                    builder.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD),
                            spanStart, spanEnd, android.text.Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                    builder.setSpan(new android.text.style.ForegroundColorSpan(
                                    androidx.core.content.ContextCompat.getColor(context, com.akon.subtools.R.color.primary)),
                            spanStart, spanEnd, android.text.Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                }

                if (cleanStop.equalsIgnoreCase("Campus") || cleanStop.toLowerCase().contains("campus")) {
                    break;
                }
            }
            holder.binding.textStoppagesPreview.setText(builder);
            holder.binding.textStoppagesPreview.setVisibility(View.VISIBLE);
        } else {
            holder.binding.textStoppagesPreview.setVisibility(View.GONE);
        }

        final Route finalRoute = matchingRoute;
        holder.itemView.setOnClickListener(v -> {
            if (clickListener != null) {
                clickListener.onBusClick(b, finalRoute);
            }
        });

        holder.binding.btnRouteStops.setOnClickListener(v -> {
            if (clickListener != null) {
                clickListener.onStopsClick(b, finalRoute);
            }
        });

        holder.binding.btnTopStops.setOnClickListener(v -> {
            if (clickListener != null) {
                clickListener.onStopsClick(b, finalRoute);
            }
        });

        String gpsUrl = b.getGpsUrl();
        if (gpsUrl != null && !gpsUrl.trim().isEmpty() && !gpsUrl.equalsIgnoreCase("null")) {
            holder.binding.btnOpenExternal.setVisibility(View.VISIBLE);
            holder.binding.btnOpenExternal.setOnClickListener(v -> {
                try {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(gpsUrl.trim()));
                    context.startActivity(browserIntent);
                } catch (Exception ignored) {}
            });
        } else {
            holder.binding.btnOpenExternal.setVisibility(View.GONE);
        }

        holder.binding.btnCallDriver.setOnClickListener(v -> {
            new androidx.appcompat.app.AlertDialog.Builder(context)
                .setTitle("Confirm Call")
                .setMessage("Please avoid calling the driver while the bus is in motion. Call only if it is necessary or in an emergency.")
                .setPositiveButton("Call", (dialog, which) -> {
                    try {
                        Intent callIntent = new Intent(Intent.ACTION_DIAL);
                        callIntent.setData(Uri.parse("tel:" + b.getDriverPhone()));
                        context.startActivity(callIntent);
                    } catch (Exception ignored) {}
                })
                .setNegativeButton("Cancel", null)
                .show();
        });
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        final ItemBusBinding binding;
        public ViewHolder(ItemBusBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
