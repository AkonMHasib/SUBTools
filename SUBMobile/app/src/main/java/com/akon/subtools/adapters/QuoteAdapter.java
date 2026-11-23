package com.akon.subtools.adapters;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.databinding.ItemQuoteBinding;
import com.akon.subtools.models.Quote;

import java.util.ArrayList;
import java.util.List;

public class QuoteAdapter extends RecyclerView.Adapter<QuoteAdapter.ViewHolder> {
    private List<Quote> quotes = new ArrayList<>();

    public void setQuotes(List<Quote> quotes) {
        this.quotes = quotes != null ? quotes : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemQuoteBinding binding = ItemQuoteBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new ViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Quote quote = quotes.get(position);
        holder.binding.txtQuoteText.setText("“" + (quote.getText() != null ? quote.getText() : "") + "”");
        holder.binding.txtQuoteAuthor.setText("— " + (quote.getAuthor() != null ? quote.getAuthor() : "Unknown"));
        holder.binding.badgeTopic.setText(quote.getTopic() != null ? quote.getTopic().toUpperCase() : "INSPIRATION");
    }

    @Override
    public int getItemCount() {
        return quotes.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        final ItemQuoteBinding binding;

        public ViewHolder(ItemQuoteBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
