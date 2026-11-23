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
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.adapters.NoticeAdapter;
import com.akon.subtools.databinding.FragmentNoticesBinding;
import com.akon.subtools.models.Notice;
import com.akon.subtools.models.User;
import com.akon.subtools.viewmodels.AuthViewModel;
import com.akon.subtools.viewmodels.NoticeViewModel;
import com.google.android.material.tabs.TabLayout;

import java.util.ArrayList;
import java.util.List;

public class NoticesFragment extends Fragment {
    private FragmentNoticesBinding binding;
    private NoticeViewModel noticeViewModel;
    private AuthViewModel authViewModel;

    private NoticeAdapter adapter;
    private final List<Notice> displayedNotices = new ArrayList<>();
    private final List<Notice> allNotices = new ArrayList<>();
    private User currentUser;
    
    private final String[] scopes = {"All Announcements", "My Department"};

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentNoticesBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        authViewModel = new ViewModelProvider(requireActivity()).get(AuthViewModel.class);
        noticeViewModel = new ViewModelProvider(this).get(NoticeViewModel.class);

        setupTabLayout();
        setupRecyclerView();
        setupObservers();
        setupListeners();

        currentUser = authViewModel.getUserLiveData().getValue();
        if (currentUser == null && getContext() != null) {
            currentUser = com.akon.subtools.database.AppDatabase.getLocalUser(getContext());
        }
        if (currentUser != null && currentUser.getDepartment() != null) {
            TabLayout.Tab deptTab = binding.tabLayoutScope.getTabAt(1);
            if (deptTab != null) {
                deptTab.setText(com.akon.subtools.utils.DepartmentHelper.getFullDepartmentName(currentUser.getDepartment()));
            }
        }

        noticeViewModel.loadNotices();
        authViewModel.checkCurrentUserSession();
    }

    private void setupTabLayout() {
        for (String scope : scopes) {
            binding.tabLayoutScope.addTab(binding.tabLayoutScope.newTab().setText(scope));
        }

        binding.tabLayoutScope.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                filterNoticesList();
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {}

            @Override
            public void onTabReselected(TabLayout.Tab tab) {}
        });
    }

    private void setupRecyclerView() {
        binding.recyclerNotices.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new NoticeAdapter(displayedNotices, false, notice -> {
            com.akon.subtools.utils.DialogHelper.showModernNoticeDialog(getContext(), notice);
        });
        binding.recyclerNotices.setAdapter(adapter);
    }

    private void setupObservers() {
        authViewModel.getUserLiveData().observe(getViewLifecycleOwner(), user -> {
            binding.swipeRefresh.setRefreshing(false);
            if (user != null) {
                currentUser = user;
                // Update Tab name dynamically
                TabLayout.Tab deptTab = binding.tabLayoutScope.getTabAt(1);
                if (deptTab != null) {
                    deptTab.setText(com.akon.subtools.utils.DepartmentHelper.getFullDepartmentName(user.getDepartment()));
                }
                filterNoticesList();
            }
        });

        noticeViewModel.getNoticesList().observe(getViewLifecycleOwner(), notices -> {
            binding.swipeRefresh.setRefreshing(false);
            if (notices != null) {
                allNotices.clear();
                allNotices.addAll(notices);
                filterNoticesList();
            }
        });

        noticeViewModel.getLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.progressBar.setVisibility(View.GONE);
            if (adapter != null) {
                adapter.setIsLoading(isLoading);
            }
        });

        noticeViewModel.getError().observe(getViewLifecycleOwner(), error -> {
            binding.swipeRefresh.setRefreshing(false);
            if (error != null) {
                com.akon.subtools.utils.DialogHelper.showWarningDialog(getContext(), "Sync Error", error);
            }
        });
    }

    private void setupListeners() {
        binding.swipeRefresh.setOnRefreshListener(() -> {
            noticeViewModel.refreshNotices();
        });

        binding.searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterNoticesList();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void filterNoticesList() {
        if (allNotices == null) return;
        
        String studentDept = currentUser != null ? currentUser.getDepartment() : "";
        String studentDeptCode = com.akon.subtools.utils.DepartmentHelper.getDeptCode(studentDept);
        int selectedTabPos = binding.tabLayoutScope.getSelectedTabPosition();
        String query = binding.searchInput.getText() != null ? binding.searchInput.getText().toString().trim().toLowerCase() : "";

        displayedNotices.clear();
        for (Notice n : allNotices) {
            if (n == null) continue;

            // 1. Tab / Department Scope Filter
            boolean matchesTab;
            if (selectedTabPos == 0) {
                // Tab 0 ("All Announcements"): Show ALL notices globally
                matchesTab = true;
            } else {
                // Tab 1 ("My Department"): Show ONLY notices specifically sent for student's department
                String noticeDept = n.getDepartment() != null ? n.getDepartment().trim() : "";
                String noticeDeptCode = com.akon.subtools.utils.DepartmentHelper.getDeptCode(noticeDept);
                matchesTab = (!studentDeptCode.isEmpty() && studentDeptCode.equalsIgnoreCase(noticeDeptCode)) ||
                             (!studentDept.isEmpty() && noticeDept.equalsIgnoreCase(studentDept));
            }
            if (!matchesTab) continue;

            // 2. Search Filter
            String title = n.getTitle() != null ? n.getTitle().toLowerCase() : "";
            String content = n.getContent() != null ? n.getContent().toLowerCase() : "";
            String sender = n.getSender() != null ? n.getSender().toLowerCase() : "";
            String dept = n.getDepartment() != null ? n.getDepartment().toLowerCase() : "";

            boolean matchesQuery = query.isEmpty() ||
                    title.contains(query) ||
                    content.contains(query) ||
                    sender.contains(query) ||
                    dept.contains(query);

            if (matchesQuery) {
                displayedNotices.add(n);
            }
        }

        java.util.Collections.sort(displayedNotices, (n1, n2) -> {
            long t1 = n1 != null ? n1.getTimestamp() : 0L;
            long t2 = n2 != null ? n2.getTimestamp() : 0L;
            return Long.compare(t2, t1);
        });

        if (adapter != null) {
            adapter.notifyDataSetChanged();
        }
        if (binding != null) {
            binding.emptyNoticesText.setVisibility(displayedNotices.isEmpty() ? View.VISIBLE : View.GONE);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
