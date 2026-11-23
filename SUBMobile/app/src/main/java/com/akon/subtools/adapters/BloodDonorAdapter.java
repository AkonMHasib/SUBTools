package com.akon.subtools.adapters;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.akon.subtools.R;
import com.akon.subtools.models.User;
import com.akon.subtools.utils.DepartmentHelper;
import com.google.android.material.button.MaterialButton;
import java.util.List;

public class BloodDonorAdapter extends RecyclerView.Adapter<BloodDonorAdapter.NormalViewHolder> {
    private final List<User> list;

    public BloodDonorAdapter(List<User> list) {
        this.list = list;
    }

    public void setIsLoading(boolean isLoading) {
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public NormalViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_blood_donor, parent, false);
        return new NormalViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull NormalViewHolder holder, int position) {
        User donor = list.get(position);
        holder.txtName.setText(donor.getName());
        holder.txtDept.setText(DepartmentHelper.getFullDepartmentName(donor.getDepartment()));
        
        String location = donor.getLocation() != null ? donor.getLocation() : "";
        holder.txtLocation.setText(location.isEmpty() ? "Location: N/A" : location);
        
        holder.txtBloodGroup.setText(donor.getBloodGroup() != null ? donor.getBloodGroup() : "?");

        Context context = holder.itemView.getContext();

        if (donor.getEmail() != null && !donor.getEmail().trim().isEmpty()) {
            holder.btnEmail.setVisibility(View.VISIBLE);
            holder.txtEmailAddress.setText(donor.getEmail().trim());
            holder.btnEmail.setOnClickListener(v -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_SENDTO);
                    intent.setData(Uri.parse("mailto:" + donor.getEmail().trim()));
                    context.startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(context, "Cannot open email client", Toast.LENGTH_SHORT).show();
                }
            });
        } else {
            holder.btnEmail.setVisibility(View.GONE);
        }

        if (donor.getPhone() != null && !donor.getPhone().trim().isEmpty()) {
            holder.layoutPhoneButtons.setVisibility(View.VISIBLE);
            holder.btnCall.setOnClickListener(v -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_DIAL);
                    intent.setData(Uri.parse("tel:" + donor.getPhone().trim()));
                    context.startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(context, "Cannot open dialer", Toast.LENGTH_SHORT).show();
                }
            });

            holder.btnWhatsapp.setOnClickListener(v -> {
                try {
                    String phone = donor.getPhone().trim();
                    if (phone.startsWith("01")) {
                        phone = "+88" + phone;
                    }
                    String url = "https://api.whatsapp.com/send?phone=" + phone;
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    context.startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(context, "Cannot open WhatsApp", Toast.LENGTH_SHORT).show();
                }
            });
        } else {
            holder.layoutPhoneButtons.setVisibility(View.GONE);
        }
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class NormalViewHolder extends RecyclerView.ViewHolder {
        TextView txtName, txtDept, txtLocation, txtBloodGroup, txtEmailAddress;
        MaterialButton btnCall, btnWhatsapp;
        View layoutPhoneButtons, btnEmail;

        public NormalViewHolder(@NonNull View itemView) {
            super(itemView);
            txtName = itemView.findViewById(R.id.txt_name);
            txtDept = itemView.findViewById(R.id.txt_dept);
            txtLocation = itemView.findViewById(R.id.txt_location);
            txtBloodGroup = itemView.findViewById(R.id.txt_blood_group);
            txtEmailAddress = itemView.findViewById(R.id.txt_email_address);
            btnCall = itemView.findViewById(R.id.btn_call);
            btnWhatsapp = itemView.findViewById(R.id.btn_whatsapp);
            layoutPhoneButtons = itemView.findViewById(R.id.layout_phone_buttons);
            btnEmail = itemView.findViewById(R.id.btn_email);
        }
    }
}
