package com.akon.subtools.coordinator.ui.transport;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.coordinator.data.model.BusRoute;
import com.akon.subtools.coordinator.databinding.ItemBusRouteBinding;

import java.util.ArrayList;
import java.util.List;

public class TransportAdapter extends RecyclerView.Adapter<TransportAdapter.ViewHolder> {

    public interface TransportActionListener {
        void onEditRoute(BusRoute route);
        void onUpdateGpsUrl(BusRoute route);
        void onDeleteRoute(BusRoute route);
    }

    private final Context context;
    private List<BusRoute> list = new ArrayList<>();
    private TransportActionListener listener;
    private boolean canManage = true;

    public TransportAdapter(Context context, List<BusRoute> list) {
        this.context = context;
        this.list = list != null ? list : new ArrayList<>();
    }

    public void setListener(TransportActionListener listener) {
        this.listener = listener;
    }

    public void setCanManage(boolean canManage) {
        this.canManage = canManage;
        notifyDataSetChanged();
    }

    public void setItems(List<BusRoute> newItems) {
        this.list = newItems != null ? newItems : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemBusRouteBinding binding = ItemBusRouteBinding.inflate(
                LayoutInflater.from(parent.getContext()),
                parent,
                false
        );
        return new ViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        BusRoute item = list.get(position);

        String busLabel = item.getName() != null ? item.getName() : "Bus Route";
        String busCode = item.getNumber() != null ? item.getNumber() : (item.getCode() != null ? item.getCode() : "");
        holder.binding.textRouteTitle.setText("🚌 " + busLabel + (busCode.isEmpty() ? "" : " (" + busCode + ")"));

        if (item.isTemporaryOverride()) {
            holder.binding.textStatusBadge.setVisibility(View.VISIBLE);
            holder.binding.textStatusBadge.setText("⚡ RESCHEDULED");
        } else {
            holder.binding.textStatusBadge.setVisibility(View.GONE);
        }

        String startPt = item.getStartingPoint() != null && !item.getStartingPoint().isEmpty() ? item.getStartingPoint() : "Dhanmondi";
        holder.binding.textRoutePath.setText("📍 Boarding: " + startPt + " ➔ Permanent Campus");

        String depTime = item.getDepartureTime() != null && !item.getDepartureTime().isEmpty() ? item.getDepartureTime() : "07:30 AM";
        String leaveTime = item.getLeavingCampusTime() != null && !item.getLeavingCampusTime().isEmpty() ? item.getLeavingCampusTime() : "05:15 PM";
        holder.binding.textDeparture.setText("🕒 Departs: " + depTime + " | Leaving Campus: " + leaveTime);

        java.util.Map<String, String> pickupTimes = item.getPickupTimes();
        java.util.List<String> pickupPoints = item.getPickupPoints();

        if (pickupPoints != null && !pickupPoints.isEmpty()) {
            StringBuilder sb = new StringBuilder("🚏 Complete Route: ");
            boolean first = true;
            int startIdx = 0;
            if (startPt != null && !startPt.trim().isEmpty()) {
                for (int i = 0; i < pickupPoints.size(); i++) {
                    if (pickupPoints.get(i) != null && pickupPoints.get(i).trim().equalsIgnoreCase(startPt.trim())) {
                        startIdx = i;
                        break;
                    }
                }
            }
            for (int i = startIdx; i < pickupPoints.size(); i++) {
                String stopName = pickupPoints.get(i);
                if (stopName != null && !stopName.trim().isEmpty()) {
                    if (!first) sb.append(" ➔ ");
                    sb.append(stopName.trim());
                    if (pickupTimes != null && pickupTimes.containsKey(stopName.trim())) {
                        String t = pickupTimes.get(stopName.trim());
                        if (t != null && !t.trim().isEmpty()) {
                            sb.append(" (").append(t.trim()).append(")");
                        }
                    }
                    first = false;
                }
            }
            holder.binding.textStoppageSequence.setVisibility(View.VISIBLE);
            holder.binding.textStoppageSequence.setText(sb.toString());
        } else if (pickupTimes != null && !pickupTimes.isEmpty()) {
            StringBuilder sb = new StringBuilder("🚏 Complete Route: ");
            boolean first = true;
            for (java.util.Map.Entry<String, String> entry : pickupTimes.entrySet()) {
                if (entry.getKey() != null && !entry.getKey().isEmpty()) {
                    if (!first) sb.append(" ➔ ");
                    sb.append(entry.getKey().trim());
                    if (entry.getValue() != null && !entry.getValue().isEmpty()) {
                        sb.append(" (").append(entry.getValue().trim()).append(")");
                    }
                    first = false;
                }
            }
            holder.binding.textStoppageSequence.setVisibility(View.VISIBLE);
            holder.binding.textStoppageSequence.setText(sb.toString());
        } else {
            holder.binding.textStoppageSequence.setVisibility(View.GONE);
        }

        String driverName = item.getDriverName() != null && !item.getDriverName().isEmpty() ? item.getDriverName() : "Assigned Driver";
        String driverPhone = item.getDriverPhone() != null && !item.getDriverPhone().isEmpty() ? item.getDriverPhone() : "";
        int capacity = item.getCapacity() > 0 ? item.getCapacity() : 40;
        holder.binding.textDriverInfo.setText("👤 Driver: " + driverName + (driverPhone.isEmpty() ? "" : " (" + driverPhone + ")") + " • Cap: " + capacity);

        // GPS Reminder metadata binding
        com.akon.subtools.coordinator.utils.GpsReminderUtils.ReminderStatus gpsStatus =
                com.akon.subtools.coordinator.utils.GpsReminderUtils.getStatus(item);

        holder.binding.textGpsBadge.setText(gpsStatus.statusText);
        if (gpsStatus.isOverdue) {
            holder.binding.textGpsBadge.setTextColor(androidx.core.content.ContextCompat.getColor(holder.itemView.getContext(), com.akon.subtools.coordinator.R.color.rose_500));
        } else if (gpsStatus.isDue) {
            holder.binding.textGpsBadge.setTextColor(androidx.core.content.ContextCompat.getColor(holder.itemView.getContext(), com.akon.subtools.coordinator.R.color.amber_600));
        } else {
            holder.binding.textGpsBadge.setTextColor(androidx.core.content.ContextCompat.getColor(holder.itemView.getContext(), com.akon.subtools.coordinator.R.color.emerald_500));
        }

        holder.binding.textGpsLastUpdated.setText("Last Updated: " + gpsStatus.lastUpdatedStr + " by " + gpsStatus.updatedBy);
        holder.binding.textGpsNextReminder.setText("Next Reminder: " + gpsStatus.nextReminderStr + " | Status: " + gpsStatus.shortStatus);

        if (canManage && listener != null) {
            holder.binding.btnUpdateGpsUrl.setVisibility(View.VISIBLE);
            holder.binding.btnUpdateGpsUrl.setOnClickListener(v -> listener.onUpdateGpsUrl(item));

            holder.binding.btnEditRoute.setVisibility(View.VISIBLE);
            holder.binding.btnEditRoute.setOnClickListener(v -> listener.onEditRoute(item));

            holder.binding.btnDeleteRoute.setVisibility(View.VISIBLE);
            holder.binding.btnDeleteRoute.setOnClickListener(v -> listener.onDeleteRoute(item));
        } else {
            holder.binding.btnUpdateGpsUrl.setVisibility(View.GONE);
            holder.binding.btnEditRoute.setVisibility(View.GONE);
            holder.binding.btnDeleteRoute.setVisibility(View.GONE);
        }
    }

    @Override
    public int getItemCount() {
        return list != null ? list.size() : 0;
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        final ItemBusRouteBinding binding;
        public ViewHolder(ItemBusRouteBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
