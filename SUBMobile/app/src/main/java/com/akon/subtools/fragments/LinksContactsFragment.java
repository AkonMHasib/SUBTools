package com.akon.subtools.fragments;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.akon.subtools.R;
import com.akon.subtools.databinding.FragmentLinksContactsBinding;
import com.google.android.material.button.MaterialButton;
import com.akon.subtools.utils.CacheManager;
import com.google.gson.reflect.TypeToken;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LinksContactsFragment extends Fragment {
    private FragmentLinksContactsBinding binding;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentLinksContactsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        loadLinksAndContacts();
    }

    private void loadLinksAndContacts() {
        // Load fallback links first immediately so UI is never blank
        loadFallbackLinks();

        // Fetch remote configuration from Supabase system_settings
        java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
            try {
                String response = com.akon.subtools.utils.SupabaseAuthBridge.executeGet(
                        "system_settings", 
                        "or=(id.eq.university_links,id.eq.links_contacts,id.eq.app_config)&limit=10"
                );
                if (response == null || response.trim().isEmpty() || response.equals("[]")) return;

                org.json.JSONArray arr = new org.json.JSONArray(response);
                org.json.JSONArray dynamicLinks = null;
                org.json.JSONArray dynamicContacts = null;

                for (int i = 0; i < arr.length(); i++) {
                    org.json.JSONObject obj = arr.getJSONObject(i);
                    org.json.JSONObject settings = obj.optJSONObject("settings");
                    if (settings == null) settings = obj;

                    if (settings.has("links") && dynamicLinks == null) {
                        dynamicLinks = settings.optJSONArray("links");
                    }
                    if (settings.has("contacts") && dynamicContacts == null) {
                        dynamicContacts = settings.optJSONArray("contacts");
                    }
                }

                if (dynamicLinks != null || dynamicContacts != null) {
                    final org.json.JSONArray fLinks = dynamicLinks;
                    final org.json.JSONArray fContacts = dynamicContacts;

                    new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                        if (binding == null) return;
                        if (fLinks != null && fLinks.length() > 0) {
                            List<Map<String, Object>> parsedLinks = new ArrayList<>();
                            for (int j = 0; j < fLinks.length(); j++) {
                                org.json.JSONObject l = fLinks.optJSONObject(j);
                                if (l != null) {
                                    parsedLinks.add(createMap(
                                            l.optString("label", l.optString("title", "")),
                                            l.optString("url", ""),
                                            l.optString("description", "")
                                    ));
                                }
                            }
                            if (!parsedLinks.isEmpty()) {
                                binding.containerLinks.removeAllViews();
                                populateLinks(parsedLinks);
                            }
                        }

                        if (fContacts != null && fContacts.length() > 0) {
                            List<Map<String, Object>> parsedContacts = new ArrayList<>();
                            for (int j = 0; j < fContacts.length(); j++) {
                                org.json.JSONObject c = fContacts.optJSONObject(j);
                                if (c != null) {
                                    parsedContacts.add(createContactMap(
                                            c.optString("label", c.optString("title", "")),
                                            c.optString("number", c.optString("phone", "")),
                                            c.optString("note", c.optString("description", ""))
                                    ));
                                }
                            }
                            if (!parsedContacts.isEmpty()) {
                                binding.containerContacts.removeAllViews();
                                populateContacts(parsedContacts);
                            }
                        }
                    });
                }
            } catch (Exception ignored) {}
        });
    }

    private void populateLinks(List<Map<String, Object>> linksList) {
        for (int i = 0; i < linksList.size(); i++) {
            Map<String, Object> link = linksList.get(i);
            String label = (String) link.get("label");
            String url = (String) link.get("url");
            String desc = (String) link.get("description");

            if (label == null || url == null) continue;

            View itemView = getLayoutInflater().inflate(R.layout.item_link, binding.containerLinks, false);
            TextView txtLabel = itemView.findViewById(R.id.txt_label);
            TextView txtDesc = itemView.findViewById(R.id.txt_desc);
            ImageView imgIcon = itemView.findViewById(R.id.img_icon);

            txtLabel.setText(label);
            if (desc != null && !desc.trim().isEmpty()) {
                txtDesc.setText(desc.trim());
                txtDesc.setVisibility(View.VISIBLE);
            } else {
                txtDesc.setVisibility(View.GONE);
            }

            // Assign icons dynamically based on label matching
            String labelLower = label.toLowerCase();
            if (labelLower.contains("facebook")) {
                imgIcon.setImageResource(R.drawable.ic_facebook);
            } else if (labelLower.contains("linkedin")) {
                imgIcon.setImageResource(R.drawable.ic_linkedin);
            } else if (labelLower.contains("instagram")) {
                imgIcon.setImageResource(R.drawable.ic_instagram);
            } else if (labelLower.contains("whatsapp")) {
                imgIcon.setImageResource(R.drawable.ic_whatsapp);
            } else if (labelLower.contains("portal") || labelLower.contains("student")) {
                imgIcon.setImageResource(R.drawable.ic_nav_profile);
            } else {
                imgIcon.setImageResource(R.drawable.ic_launch);
            }

            itemView.setOnClickListener(v -> openUrl(url));
            binding.containerLinks.addView(itemView);
        }
    }

    private void populateContacts(List<Map<String, Object>> contactsList) {
        for (int i = 0; i < contactsList.size(); i++) {
            Map<String, Object> contact = contactsList.get(i);
            String label = (String) contact.get("label");
            String number = (String) contact.get("number");
            String note = (String) contact.get("note");

            if (label == null || number == null) continue;

            View itemView = getLayoutInflater().inflate(R.layout.item_contact, binding.containerContacts, false);
            TextView txtLabel = itemView.findViewById(R.id.txt_contact_label);
            TextView txtValue = itemView.findViewById(R.id.txt_contact_value);
            TextView txtNote = itemView.findViewById(R.id.txt_contact_note);
            ImageView imgIcon = itemView.findViewById(R.id.img_contact_icon);
            com.google.android.material.button.MaterialButton btnAction = itemView.findViewById(R.id.btn_action);

            txtLabel.setText(label);
            txtValue.setText(number);

            if (note != null && !note.trim().isEmpty()) {
                txtNote.setText(note.trim());
                txtNote.setVisibility(View.VISIBLE);
            } else {
                txtNote.setVisibility(View.GONE);
            }

            if (number.contains("@")) {
                imgIcon.setImageResource(R.drawable.ic_email);
                btnAction.setIconResource(R.drawable.ic_email);
                btnAction.setOnClickListener(v -> sendEmail(number.trim()));
            } else if (number.matches("[0-9\\+\\-\\(\\)\\s]+")) {
                imgIcon.setImageResource(R.drawable.ic_phone);
                btnAction.setIconResource(R.drawable.ic_phone);
                btnAction.setOnClickListener(v -> dialPhone(number.replaceAll("[^0-9\\+]", "")));
            } else {
                imgIcon.setImageResource(R.drawable.ic_location);
                btnAction.setIconResource(R.drawable.ic_launch);
                btnAction.setOnClickListener(v -> openUrl("https://maps.google.com/?q=" + Uri.encode(number.trim())));
            }

            binding.containerContacts.addView(itemView);

            if (i < contactsList.size() - 1) {
                View divider = new View(requireContext());
                LinearLayout.LayoutParams divParams = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, 1);
                divider.setLayoutParams(divParams);
                divider.setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.border_dark));
                binding.containerContacts.addView(divider);
            }
        }
    }

    private void loadFallbackLinks() {
        if (binding == null) return;
        binding.containerLinks.removeAllViews();
        binding.containerContacts.removeAllViews();

        List<Map<String, Object>> fallbackLinks = new ArrayList<>();
        fallbackLinks.add(createMap("Official University Website", "https://www.sub.edu.bd", "Main site"));
        fallbackLinks.add(createMap("Student Portal", "http://119.148.8.225:8071/apps/", "Official Portal"));
        fallbackLinks.add(createMap("SUB Central Library Portal", "https://library.sub.edu.bd", "Central Library"));
        fallbackLinks.add(createMap("Official Facebook Page", "https://www.facebook.com/subedubd", "Facebook"));
        fallbackLinks.add(createMap("Official LinkedIn Page", "https://www.linkedin.com/school/state-university-of-bangladesh/", "LinkedIn"));
        fallbackLinks.add(createMap("Official YouTube Channel", "https://youtube.com/@sub_edu_bd", "YouTube"));
        fallbackLinks.add(createMap("Official Instagram Profile", "https://www.instagram.com/sub.ac.bd/", "Instagram"));

        List<Map<String, Object>> fallbackContacts = new ArrayList<>();
        fallbackContacts.add(createContactMap("Landphone Support 1", "+880258151782", "Line Range: +880258151782-4"));
        fallbackContacts.add(createContactMap("Landphone Support 2", "09606782338", "Hotline Line"));
        fallbackContacts.add(createContactMap("Hotline (Short Code)", "16665", "Short Hotline"));
        fallbackContacts.add(createContactMap("Hotline 1", "01766663558", "Hotline"));
        fallbackContacts.add(createContactMap("Hotline 2", "01766662982", "Hotline"));
        fallbackContacts.add(createContactMap("Hotline 3", "01766662120", "Hotline"));
        fallbackContacts.add(createContactMap("Hotline 4", "01766663163", "Hotline"));
        fallbackContacts.add(createContactMap("Hotline 5", "01766661555", "Hotline"));
        fallbackContacts.add(createContactMap("Hotline 6", "01766663557", "Hotline"));
        fallbackContacts.add(createContactMap("Official Email", "info@sub.edu.bd", "Email support"));
        fallbackContacts.add(createContactMap("Campus Address", "696 Kendua, Kanchan, Rupganj, Narayanganj, Dhaka-1461, Bangladesh", "Main Campus"));

        populateLinks(fallbackLinks);
        populateContacts(fallbackContacts);
    }

    private Map<String, Object> createMap(String label, String url, String desc) {
        Map<String, Object> m = new HashMap<>();
        m.put("label", label);
        m.put("url", url);
        m.put("description", desc);
        return m;
    }

    private Map<String, Object> createContactMap(String label, String number, String note) {
        Map<String, Object> m = new HashMap<>();
        m.put("label", label);
        m.put("number", number);
        m.put("note", note);
        return m;
    }

    private void openUrl(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            // ignore
        }
    }

    private void sendEmail(String email) {
        try {
            Intent intent = new Intent(Intent.ACTION_SENDTO);
            intent.setData(Uri.parse("mailto:"));
            intent.putExtra(Intent.EXTRA_EMAIL, new String[]{email});
            intent.putExtra(Intent.EXTRA_SUBJECT, "SUBTools Help Support");
            startActivity(Intent.createChooser(intent, "Send email via..."));
        } catch (Exception e) {
            // ignore
        }
    }

    private void dialPhone(String phoneNumber) {
        try {
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + phoneNumber));
            startActivity(intent);
        } catch (Exception e) {
            // ignore
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
