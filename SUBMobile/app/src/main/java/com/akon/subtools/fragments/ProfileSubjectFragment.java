package com.akon.subtools.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.viewpager2.adapter.FragmentStateAdapter;

import com.akon.subtools.databinding.FragmentProfileSubjectBinding;
import com.google.android.material.tabs.TabLayoutMediator;

public class ProfileSubjectFragment extends Fragment {
    private FragmentProfileSubjectBinding binding;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentProfileSubjectBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        ProfileSubjectPagerAdapter pagerAdapter = new ProfileSubjectPagerAdapter(this);
        binding.viewPagerProfileSubject.setAdapter(pagerAdapter);

        new TabLayoutMediator(binding.tabLayoutProfileSubject, binding.viewPagerProfileSubject, (tab, position) -> {
            if (position == 0) {
                tab.setText("Profile");
                tab.setIcon(com.akon.subtools.R.drawable.ic_nav_profile);
            } else {
                tab.setText("Subjects");
                tab.setIcon(com.akon.subtools.R.drawable.ic_nav_subjects);
            }
        }).attach();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }

    private static class ProfileSubjectPagerAdapter extends FragmentStateAdapter {
        public ProfileSubjectPagerAdapter(@NonNull Fragment fragment) {
            super(fragment);
        }

        @NonNull
        @Override
        public Fragment createFragment(int position) {
            if (position == 0) {
                return new ProfileFragment();
            }
            return new SubjectFragment();
        }

        @Override
        public int getItemCount() {
            return 2;
        }
    }
}
