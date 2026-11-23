package com.akon.subtools.coordinator.ui.notices;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.akon.subtools.coordinator.data.model.Notice;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.databinding.FragmentNoticesBinding;

public class NoticesFragment extends Fragment implements NoticeAdapter.NoticeActionListener {

    private FragmentNoticesBinding binding;
    private NoticesViewModel viewModel;
    private NoticeAdapter adapter;
    private SessionManager sessionManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentNoticesBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        viewModel = new ViewModelProvider(this).get(NoticesViewModel.class);
        sessionManager = new SessionManager(requireContext());

        adapter = new NoticeAdapter(this);
        boolean isSuperAdmin = sessionManager.isSuperAdmin();
        adapter.setIsSuperAdmin(isSuperAdmin);

        binding.rvNotices.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvNotices.setAdapter(adapter);

        getChildFragmentManager().setFragmentResultListener(
            "notice_published", getViewLifecycleOwner(),
            (requestKey, result) -> viewModel.forceRefresh());

        setupObservers();

        binding.swipeRefreshLayout.setOnRefreshListener(() -> viewModel.forceRefresh());

        binding.fabCreateNotice.setOnClickListener(v -> {
            CreateNoticeDialogFragment dialog = new CreateNoticeDialogFragment();
            dialog.show(getChildFragmentManager(), "CreateNoticeDialog");
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        viewModel.loadNotices();
    }

    private void setupObservers() {
        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.swipeRefreshLayout.setRefreshing(Boolean.TRUE.equals(isLoading));
        });

        viewModel.getNoticesLiveData().observe(getViewLifecycleOwner(), notices -> {
            adapter.setItems(notices);
        });

        viewModel.getToastMessage().observe(getViewLifecycleOwner(), message -> {
            if (message != null && !message.isEmpty()) {
                Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public void onReadNotice(Notice notice) {
        NoticeDetailDialogFragment dialog = NoticeDetailDialogFragment.newInstance(notice, this);
        dialog.show(getChildFragmentManager(), "NoticeDetailDialog");
    }

    @Override
    public void onEditNotice(Notice notice) {
        if (!sessionManager.isSuperAdmin()) {
            Toast.makeText(requireContext(), "Only Super Admin can edit notices.", Toast.LENGTH_SHORT).show();
            return;
        }
        EditNoticeDialogFragment dialog = EditNoticeDialogFragment.newInstance(notice, () -> viewModel.loadNotices());
        dialog.show(getChildFragmentManager(), "EditNoticeDialog");
    }

    @Override
    public void onArchiveNotice(Notice notice) {
        if (!sessionManager.isSuperAdmin()) {
            Toast.makeText(requireContext(), "Only Super Admin can archive notices.", Toast.LENGTH_SHORT).show();
            return;
        }
        viewModel.setNoticeStatus(notice.getId(), "archived");
    }

    @Override
    public void onPublishNotice(Notice notice) {
        if (!sessionManager.isSuperAdmin()) {
            Toast.makeText(requireContext(), "Only Super Admin can publish notices.", Toast.LENGTH_SHORT).show();
            return;
        }
        viewModel.setNoticeStatus(notice.getId(), "live");
    }

    @Override
    public void onDeleteNotice(Notice notice) {
        if (!sessionManager.isSuperAdmin()) {
            Toast.makeText(requireContext(), "Only Super Admin can delete notices.", Toast.LENGTH_SHORT).show();
            return;
        }
        new AlertDialog.Builder(requireContext())
                .setTitle("Delete Notice")
                .setMessage("Delete notice '" + notice.getTitle() + "'?")
                .setPositiveButton("Delete", (dialog, which) -> viewModel.deleteNotice(notice.getId()))
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
