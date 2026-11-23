package com.akon.subtools.fragments;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import com.akon.subtools.adapters.BloodDonorAdapter;
import com.akon.subtools.databinding.FragmentBloodDonorBinding;
import com.akon.subtools.models.User;
import java.util.ArrayList;
import java.util.List;

public class BloodDonorFragment extends Fragment {
    private FragmentBloodDonorBinding binding;
    private BloodDonorAdapter adapter;
    private final List<User> allDonors = new ArrayList<>();
    private final List<User> displayedDonors = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentBloodDonorBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        setupRecyclerView();
        setupSearch();
        loadDonors();
    }

    private void setupRecyclerView() {
        binding.recyclerBloodDonors.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new BloodDonorAdapter(displayedDonors);
        binding.recyclerBloodDonors.setAdapter(adapter);
    }

    private void setupSearch() {
        binding.searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterDonors();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void loadDonors() {
        binding.progressBar.setVisibility(View.GONE);
        if (adapter != null) {
            adapter.setIsLoading(true);
        }
        
        com.akon.subtools.database.AppDatabase db = com.akon.subtools.database.AppDatabase.getDatabase(requireContext());
        com.akon.subtools.database.AppDatabase.databaseWriteExecutor.execute(() -> {
            List<com.akon.subtools.models.BloodDonor> cached = db.bloodDonorDao().getAllDonors();
            if (getActivity() != null) {
                getActivity().runOnUiThread(() -> {
                    if (cached != null && !cached.isEmpty()) {
                        allDonors.clear();
                        for (com.akon.subtools.models.BloodDonor bd : cached) {
                            allDonors.add(mapDonorToUser(bd));
                        }
                        if (adapter != null) {
                            adapter.setIsLoading(false);
                        }
                        filterDonors();
                    }
                    // Always refresh from Supabase
                    fetchDonorsFromFirestore();
                });
            }
        });
    }

    private void fetchDonorsFromFirestore() {
        if (com.akon.subtools.utils.SupabaseAuthBridge.isConfigured()) {
            java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    org.json.JSONArray arr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("users", "select=*&limit=200");
                    if (arr != null && arr.length() > 0) {
                        List<User> freshList = new ArrayList<>();
                        List<com.akon.subtools.models.BloodDonor> toCache = new ArrayList<>();
                        for (int i = 0; i < arr.length(); i++) {
                            User u = User.fromJson(arr.getJSONObject(i));
                            if (u != null) {
                                String bg = u.getBloodGroup() != null ? u.getBloodGroup().trim() : "";
                                boolean isEligible = u.isAllowBloodDonation() || (!bg.isEmpty() && !bg.equals("?") && !bg.equalsIgnoreCase("N/A"));
                                if (isEligible) {
                                    freshList.add(u);
                                    toCache.add(mapUserToDonor(u));
                                }
                            }
                        }

                        if (getActivity() != null) {
                            getActivity().runOnUiThread(() -> {
                                if (binding == null) return;
                                if (adapter != null) adapter.setIsLoading(false);
                                allDonors.clear();
                                allDonors.addAll(freshList);
                                filterDonors();

                                com.akon.subtools.database.AppDatabase appDb = com.akon.subtools.database.AppDatabase.getDatabase(requireContext());
                                com.akon.subtools.database.AppDatabase.databaseWriteExecutor.execute(() -> {
                                    appDb.bloodDonorDao().clearAll();
                                    appDb.bloodDonorDao().insertAll(toCache);
                                });
                            });
                        }
                        return;
                    }
                } catch (Exception ignored) {}

                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        if (adapter != null) adapter.setIsLoading(false);
                    });
                }
            });
        }
    }

    private User mapDonorToUser(com.akon.subtools.models.BloodDonor donor) {
        User u = new User();
        u.setUid(donor.getUid());
        u.setName(donor.getName());
        u.setEmail(donor.getEmail());
        u.setDepartment(donor.getDepartment());
        u.setBatch(donor.getBatch());
        u.setPhone(donor.getPhone());
        u.setBloodGroup(donor.getBloodGroup());
        u.setAllowBloodDonation(donor.isAllowBloodDonation());
        u.setLocation(donor.getLocation());
        return u;
    }

    private com.akon.subtools.models.BloodDonor mapUserToDonor(User u) {
        return new com.akon.subtools.models.BloodDonor(
            u.getUid(),
            u.getName() != null ? u.getName() : "",
            u.getEmail() != null ? u.getEmail() : "",
            u.getDepartment() != null ? u.getDepartment() : "",
            u.getBatch() != null ? u.getBatch() : "",
            u.getPhone() != null ? u.getPhone() : "",
            u.getBloodGroup() != null ? u.getBloodGroup() : "",
            u.isAllowBloodDonation(),
            u.getLocation() != null ? u.getLocation() : ""
        );
    }

    private void filterDonors() {
        if (binding == null) return;
        String query = binding.searchInput.getText() != null ? binding.searchInput.getText().toString().trim().toLowerCase() : "";
        
        displayedDonors.clear();
        for (User u : allDonors) {
            if (u == null) continue;
            String bg = u.getBloodGroup() != null ? u.getBloodGroup().toLowerCase() : "";
            String loc = u.getLocation() != null ? u.getLocation().toLowerCase() : "";
            String name = u.getName() != null ? u.getName().toLowerCase() : "";

            if (query.isEmpty() || bg.contains(query) || loc.contains(query) || name.contains(query)) {
                displayedDonors.add(u);
            }
        }
        adapter.notifyDataSetChanged();
        binding.emptyDonorsText.setVisibility(displayedDonors.isEmpty() ? View.VISIBLE : View.GONE);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
