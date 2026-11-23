package com.akon.subtools.fragments;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.akon.subtools.databinding.FragmentNeedToTalkBinding;

public class NeedToTalkFragment extends Fragment {
    private FragmentNeedToTalkBinding binding;
    private static final String FB_PROFILE_URL = "https://www.facebook.com/Hasib.Arch";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentNeedToTalkBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        binding.btnFacebookConnect.setOnClickListener(v -> openFacebookProfile());

        // Hotline 1: SUB Hotline
        binding.btnCallSub.setOnClickListener(v -> dialPhoneNumber("16665"));
        binding.cardSubHotline.setOnClickListener(v -> dialPhoneNumber("16665"));

        // Hotline 2: Kaan Pete Roi / Emotional Support
        binding.btnCallKaan.setOnClickListener(v -> dialPhoneNumber("109"));
        binding.cardKaanPeteRoi.setOnClickListener(v -> dialPhoneNumber("109"));

        // Hotline 3: National Help 999
        binding.btnCallNational.setOnClickListener(v -> dialPhoneNumber("999"));
        binding.cardNationalEmergency.setOnClickListener(v -> dialPhoneNumber("999"));
    }

    private void openFacebookProfile() {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(FB_PROFILE_URL));
            startActivity(intent);
        } catch (Exception e) {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://facebook.com"));
            startActivity(intent);
        }
    }

    private void dialPhoneNumber(String phoneNumber) {
        try {
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + phoneNumber));
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(requireContext(), "Unable to open phone dialer for " + phoneNumber, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
