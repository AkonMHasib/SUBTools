package com.akon.subtools.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.viewpager2.adapter.FragmentStateAdapter;

import com.akon.subtools.databinding.FragmentDirectoryBinding;
import com.google.android.material.tabs.TabLayoutMediator;

public class DirectoryFragment extends Fragment {
    private FragmentDirectoryBinding binding;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentDirectoryBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        DirectoryPagerAdapter pagerAdapter = new DirectoryPagerAdapter(this);
        binding.viewPagerDirectory.setAdapter(pagerAdapter);

        new TabLayoutMediator(binding.tabLayoutDirectory, binding.viewPagerDirectory, (tab, position) -> {
            if (position == 0) {
                tab.setText("Faculty Directory");
            } else {
                tab.setText("Blood Donors");
            }
        }).attach();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }

    private static class DirectoryPagerAdapter extends FragmentStateAdapter {
        public DirectoryPagerAdapter(@NonNull Fragment fragment) {
            super(fragment);
        }

        @NonNull
        @Override
        public Fragment createFragment(int position) {
            if (position == 0) {
                return new FacultyFragment();
            }
            return new BloodDonorFragment();
        }

        @Override
        public int getItemCount() {
            return 2;
        }
    }
}
