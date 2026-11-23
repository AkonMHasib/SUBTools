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

import com.akon.subtools.databinding.FragmentAboutDeveloperBinding;

public class AboutDeveloperFragment extends Fragment {
    private FragmentAboutDeveloperBinding binding;

    private static final String FB_DEV_PROFILE = "https://www.facebook.com/profile.php?id=61592042795382";
    private static final String FB_HASIB_ARCH = "https://www.facebook.com/Hasib.Arch";
    private static final String FB_COMMUNITY_GROUP = "https://www.facebook.com/groups/app.subtools";
    private static final String LINKEDIN_PROFILE = "https://linkedin.com/in/akonmhasib";
    private static final String WHATSAPP_URL = "https://wa.me/8801754752096";
    private static final String DEV_EMAIL = "akonmhasib@gmail.com";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentAboutDeveloperBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // 1. Developer action buttons
        binding.btnDevFacebook.setOnClickListener(v -> openUrl(FB_DEV_PROFILE));
        binding.btnDevLinkedin.setOnClickListener(v -> openUrl(LINKEDIN_PROFILE));
        binding.btnDevWhatsapp.setOnClickListener(v -> openUrl(WHATSAPP_URL));
        binding.btnDevEmail.setOnClickListener(v -> sendEmail(DEV_EMAIL));

        // 2. Official Facebook Community Group
        binding.btnJoinFbGroup.setOnClickListener(v -> openUrl(FB_COMMUNITY_GROUP));
        binding.cardCommunityGroup.setOnClickListener(v -> openUrl(FB_COMMUNITY_GROUP));

        // 3. Student Wellbeing & Support
        binding.btnDevMessenger.setOnClickListener(v -> openUrl(FB_HASIB_ARCH));
        binding.btnDevCallHelpline.setOnClickListener(v -> dialPhoneNumber("16665"));

        // 4. Version spec
        try {
            String verName = requireContext().getPackageManager()
                    .getPackageInfo(requireContext().getPackageName(), 0).versionName;
            binding.textSpecVersion.setText("v" + verName);
        } catch (Exception e) {
            binding.textSpecVersion.setText("v3.0.0");
        }
    }

    private void openUrl(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(getContext(), "Unable to open link", Toast.LENGTH_SHORT).show();
        }
    }

    private void dialPhoneNumber(String phoneNumber) {
        try {
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + phoneNumber));
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(getContext(), "Unable to open phone dialer for " + phoneNumber, Toast.LENGTH_SHORT).show();
        }
    }

    private void sendEmail(String email) {
        try {
            Intent intent = new Intent(Intent.ACTION_SENDTO);
            intent.setData(Uri.parse("mailto:" + email));
            intent.putExtra(Intent.EXTRA_SUBJECT, "SUBTools Feedback");
            startActivity(Intent.createChooser(intent, "Send email via..."));
        } catch (Exception e) {
            openUrl("mailto:" + email);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
