package com.akon.subtools.adapters;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.R;
import com.akon.subtools.models.Faculty;
import com.google.android.material.button.MaterialButton;

import java.util.List;

public class FacultyAdapter extends RecyclerView.Adapter<FacultyAdapter.NormalViewHolder> {
    private final List<Faculty> list;

    public FacultyAdapter(List<Faculty> list) {
        this.list = list;
    }

    public void setIsLoading(boolean isLoading) {
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public NormalViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_faculty, parent, false);
        return new NormalViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull NormalViewHolder holder, int position) {
        Faculty faculty = list.get(position);
        holder.txtName.setText(faculty.getName());
        holder.txtDesignation.setText(faculty.getDesignation());

        if (faculty.getDepartment() != null && !faculty.getDepartment().trim().isEmpty()) {
            String deptFriendly = com.akon.subtools.utils.DepartmentHelper.getUserFriendlyDeptName(faculty.getDepartment());
            holder.txtDept.setText("Dept. of " + deptFriendly);
            holder.txtDept.setVisibility(View.VISIBLE);
        } else {
            holder.txtDept.setVisibility(View.GONE);
        }

        // Set initial letter in bubble
        String initial = "F";
        if (faculty.getName() != null && !faculty.getName().trim().isEmpty()) {
            initial = String.valueOf(faculty.getName().trim().charAt(0)).toUpperCase();
        }
        holder.txtInitial.setText(initial);

        // Dynamic premium avatar colors
        String[] bgColors = {"#1E3A8A", "#064E3B", "#78350F", "#581C87", "#881337", "#312E81"};
        String[] textColors = {"#60A5FA", "#34D399", "#FBBF24", "#C084FC", "#F43F5E", "#818CF8"};
        int colorIdx = Math.abs(initial.hashCode()) % bgColors.length;
        holder.cardInitial.setCardBackgroundColor(android.graphics.Color.parseColor(bgColors[colorIdx]));
        holder.txtInitial.setTextColor(android.graphics.Color.parseColor(textColors[colorIdx]));

        // Show profile photo if available, otherwise show initial bubble
        String photoUrl = faculty.getPhotoUrl();
        if (photoUrl != null && !photoUrl.trim().isEmpty()) {
            holder.imgPhoto.setVisibility(View.VISIBLE);
            holder.cardInitial.setVisibility(View.GONE);
            com.bumptech.glide.Glide.with(holder.itemView.getContext())
                    .load(photoUrl)
                    .centerCrop()
                    .placeholder(android.R.drawable.ic_menu_camera)
                    .error(android.R.drawable.ic_menu_camera)
                    .into(holder.imgPhoto);
        } else {
            holder.imgPhoto.setVisibility(View.GONE);
            holder.cardInitial.setVisibility(View.VISIBLE);
        }

        Context context = holder.itemView.getContext();

        // Bind Phone Action
        if (faculty.getPhone() != null && !faculty.getPhone().trim().isEmpty()) {
            holder.layoutPhoneButtons.setVisibility(View.VISIBLE);
            if (holder.txtNoPhone != null) holder.txtNoPhone.setVisibility(View.GONE);

            holder.btnCall.setOnClickListener(v -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_DIAL);
                    intent.setData(Uri.parse("tel:" + faculty.getPhone().trim()));
                    context.startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(context, "Cannot open dialer", Toast.LENGTH_SHORT).show();
                }
            });

            holder.btnWhatsapp.setOnClickListener(v -> {
                try {
                    String phone = faculty.getPhone().trim();
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
            if (holder.txtNoPhone != null) {
                holder.txtNoPhone.setText("No phone found");
                holder.txtNoPhone.setVisibility(View.VISIBLE);
            }
        }

        // Bind Email Action
        if (faculty.getEmail() != null && !faculty.getEmail().trim().isEmpty()) {
            holder.btnEmail.setVisibility(View.VISIBLE);
            holder.txtEmailAddress.setText(faculty.getEmail().trim());
            String finalEmail = faculty.getEmail().trim();
            holder.btnEmail.setOnClickListener(v -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_SENDTO);
                    intent.setData(Uri.parse("mailto:"));
                    intent.putExtra(Intent.EXTRA_EMAIL, new String[]{finalEmail});
                    intent.putExtra(Intent.EXTRA_SUBJECT, "Query to Advisor");
                    context.startActivity(Intent.createChooser(intent, "Send Email via..."));
                } catch (Exception e) {
                    Toast.makeText(context, "Cannot open email client", Toast.LENGTH_SHORT).show();
                }
            });
        } else {
            holder.btnEmail.setVisibility(View.GONE);
        }
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class NormalViewHolder extends RecyclerView.ViewHolder {
        TextView txtName, txtDesignation, txtDept, txtInitial, txtEmailAddress, txtNoPhone;
        androidx.cardview.widget.CardView cardInitial;
        android.widget.ImageView imgPhoto;
        MaterialButton btnCall, btnWhatsapp;
        LinearLayout btnEmail, layoutPhoneButtons;

        public NormalViewHolder(@NonNull View itemView) {
            super(itemView);
            txtName = itemView.findViewById(R.id.txt_name);
            txtDesignation = itemView.findViewById(R.id.txt_designation);
            txtDept = itemView.findViewById(R.id.txt_dept);
            txtInitial = itemView.findViewById(R.id.txt_initial);
            cardInitial = itemView.findViewById(R.id.card_initial);
            imgPhoto = itemView.findViewById(R.id.img_photo);
            btnCall = itemView.findViewById(R.id.btn_call);
            btnWhatsapp = itemView.findViewById(R.id.btn_whatsapp);
            btnEmail = itemView.findViewById(R.id.btn_email);
            txtEmailAddress = itemView.findViewById(R.id.txt_email_address);
            layoutPhoneButtons = itemView.findViewById(R.id.layout_phone_buttons);
            txtNoPhone = itemView.findViewById(R.id.txt_no_phone);
        }
    }
}
