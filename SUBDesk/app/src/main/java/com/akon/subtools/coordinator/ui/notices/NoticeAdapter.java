package com.akon.subtools.coordinator.ui.notices;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.coordinator.data.model.Notice;
import com.akon.subtools.coordinator.databinding.ItemNoticeBinding;

import java.util.ArrayList;
import java.util.List;

public class NoticeAdapter extends RecyclerView.Adapter<NoticeAdapter.NoticeViewHolder> {

    public interface NoticeActionListener {
        void onReadNotice(Notice notice);
        void onEditNotice(Notice notice);
        void onArchiveNotice(Notice notice);
        void onPublishNotice(Notice notice);
        void onDeleteNotice(Notice notice);
    }

    private List<Notice> items = new ArrayList<>();
    private final NoticeActionListener listener;
    private boolean isSuperAdmin = false;

    public NoticeAdapter(NoticeActionListener listener) {
        this.listener = listener;
    }

    public void setIsSuperAdmin(boolean isSuperAdmin) {
        this.isSuperAdmin = isSuperAdmin;
        notifyDataSetChanged();
    }

    public void setItems(List<Notice> newItems) {
        this.items = newItems != null ? newItems : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public NoticeViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemNoticeBinding binding = ItemNoticeBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new NoticeViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull NoticeViewHolder holder, int position) {
        Notice notice = items.get(position);
        holder.bind(notice, listener, isSuperAdmin);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class NoticeViewHolder extends RecyclerView.ViewHolder {
        private final ItemNoticeBinding binding;

        public NoticeViewHolder(ItemNoticeBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(Notice notice, NoticeActionListener listener, boolean isSuperAdmin) {
            binding.tvNoticeTitle.setText(notice.getTitle());

            String fullDesc = notice.getDescription() != null ? notice.getDescription() : "";
            binding.tvNoticeDescription.setText(get20WordExcerpt(fullDesc));

            binding.tvAuthorDate.setText(notice.getFormattedCreatorInfo());

            View.OnClickListener readListener = v -> {
                if (listener != null) listener.onReadNotice(notice);
            };

            binding.tvNoticeTitle.setOnClickListener(readListener);
            binding.tvNoticeDescription.setOnClickListener(readListener);
            binding.cardNoticeItem.setOnClickListener(readListener);

            if (isSuperAdmin) {
                binding.btnEditNotice.setVisibility(View.VISIBLE);
                binding.btnArchiveNotice.setVisibility(View.VISIBLE);
                binding.btnDeleteNotice.setVisibility(View.VISIBLE);

                binding.btnEditNotice.setOnClickListener(v -> listener.onEditNotice(notice));

                boolean isArchived = "archived".equalsIgnoreCase(notice.getStatus());
                binding.btnArchiveNotice.setText(isArchived ? "Publish" : "Archive");
                binding.btnArchiveNotice.setOnClickListener(v -> {
                    if (isArchived) {
                        listener.onPublishNotice(notice);
                    } else {
                        listener.onArchiveNotice(notice);
                    }
                });

                binding.btnDeleteNotice.setOnClickListener(v -> listener.onDeleteNotice(notice));
            } else {
                binding.btnEditNotice.setVisibility(View.GONE);
                binding.btnArchiveNotice.setVisibility(View.GONE);
                binding.btnDeleteNotice.setVisibility(View.GONE);
            }
        }

        private static String get20WordExcerpt(String text) {
            if (text == null || text.trim().isEmpty()) return "";
            String[] words = text.trim().split("\\s+");
            if (words.length <= 20) return text;
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 20; i++) {
                if (i > 0) sb.append(" ");
                sb.append(words[i]);
            }
            sb.append("...");
            return sb.toString();
        }
    }
}
