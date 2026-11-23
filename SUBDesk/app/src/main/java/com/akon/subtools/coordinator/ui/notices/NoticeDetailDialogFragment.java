package com.akon.subtools.coordinator.ui.notices;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.akon.subtools.coordinator.data.model.Notice;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.databinding.DialogNoticeDetailBinding;

public class NoticeDetailDialogFragment extends DialogFragment {

    private DialogNoticeDetailBinding binding;
    private Notice notice;
    private NoticeAdapter.NoticeActionListener listener;
    private SessionManager sessionManager;

    public static NoticeDetailDialogFragment newInstance(Notice notice, NoticeAdapter.NoticeActionListener listener) {
        NoticeDetailDialogFragment fragment = new NoticeDetailDialogFragment();
        fragment.notice = notice;
        fragment.listener = listener;
        return fragment;
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getDialog() != null && getDialog().getWindow() != null) {
            int width = (int) (getResources().getDisplayMetrics().widthPixels * 0.92);
            getDialog().getWindow().setLayout(width, ViewGroup.LayoutParams.WRAP_CONTENT);
            getDialog().getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = DialogNoticeDetailBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        sessionManager = new SessionManager(requireContext());

        if (notice != null) {
            binding.tvDetailNoticeTitle.setText(notice.getTitle());
            binding.tvDetailFullDescription.setText(notice.getDescription() != null ? notice.getDescription() : "");

            binding.tvDetailAuthorDate.setText(notice.getFormattedCreatorInfo());

            boolean isArchived = "archived".equalsIgnoreCase(notice.getStatus());
            binding.tvDetailStatusBadge.setText(isArchived ? "ARCHIVED" : "LIVE");
            binding.tvDetailDeptBadge.setText(notice.getDepartment() != null ? com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentFullName(notice.getDepartment()) : "General");

            // Handle Image Attachment
            String imgUrl = notice.getImageUrl();
            if (imgUrl != null && !imgUrl.trim().isEmpty()) {
                binding.ivDetailNoticeImage.setVisibility(View.VISIBLE);
                if (getContext() != null) {
                    com.bumptech.glide.Glide.with(getContext().getApplicationContext())
                            .load(imgUrl)
                            .into(binding.ivDetailNoticeImage);
                }
            } else {
                binding.ivDetailNoticeImage.setVisibility(View.GONE);
            }

            // Handle PDF Attachment
            String pdfUrl = notice.getPdfUrl();
            if (pdfUrl != null && !pdfUrl.trim().isEmpty()) {
                binding.btnDetailViewPdf.setVisibility(View.VISIBLE);
                binding.btnDetailViewPdf.setOnClickListener(v -> {
                    try {
                        android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(pdfUrl));
                        startActivity(intent);
                    } catch (Exception e) {
                        android.widget.Toast.makeText(requireContext(), "Unable to open PDF link", android.widget.Toast.LENGTH_SHORT).show();
                    }
                });
            } else {
                binding.btnDetailViewPdf.setVisibility(View.GONE);
            }

            // Super Admin check: ONLY super_admin can edit or archive notices
            boolean isSuperAdmin = sessionManager.isSuperAdmin();
            if (isSuperAdmin) {
                binding.layoutSuperAdminActions.setVisibility(View.VISIBLE);

                binding.btnDetailEdit.setOnClickListener(v -> {
                    dismiss();
                    if (listener != null) listener.onEditNotice(notice);
                });

                binding.btnDetailArchive.setText(isArchived ? "Publish" : "Archive");
                binding.btnDetailArchive.setOnClickListener(v -> {
                    dismiss();
                    if (listener != null) {
                        if (isArchived) listener.onPublishNotice(notice);
                        else listener.onArchiveNotice(notice);
                    }
                });

                binding.btnDetailDelete.setOnClickListener(v -> {
                    dismiss();
                    if (listener != null) listener.onDeleteNotice(notice);
                });
            } else {
                binding.layoutSuperAdminActions.setVisibility(View.GONE);
            }
        }

        binding.btnDetailClose.setOnClickListener(v -> dismiss());
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
