package com.akon.subtools.utils;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.view.View;
import android.widget.ImageView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.engine.DiskCacheStrategy;

public class ImageHelper {

    /**
     * Loads a profile image safely supporting:
     * 1. Base64 Data URLs (e.g., "data:image/jpeg;base64,...")
     * 2. Raw base64 strings
     * 3. HTTP/HTTPS URLs (via Glide)
     * 
     * Handles visibility of the image view, placeholder, and parent card container.
     */
    public static void loadProfileImage(Context context, String photoUrl, ImageView targetView, View placeholderView, View containerCard) {
        if (targetView == null || context == null) return;

        if (photoUrl == null || photoUrl.trim().isEmpty() || "null".equalsIgnoreCase(photoUrl.trim())) {
            targetView.setVisibility(View.GONE);
            if (placeholderView != null) placeholderView.setVisibility(View.VISIBLE);
            return;
        }

        String trimmed = photoUrl.trim();

        // 1. Check if it is a Base64 Data URL or direct Base64 string
        if (trimmed.startsWith("data:image/") || trimmed.contains(";base64,") || (trimmed.length() > 200 && !trimmed.startsWith("http"))) {
            try {
                int commaIdx = trimmed.indexOf(",");
                String base64Data = (commaIdx != -1) ? trimmed.substring(commaIdx + 1) : trimmed;
                byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);

                if (bitmap != null) {
                    targetView.setImageBitmap(bitmap);
                    targetView.setVisibility(View.VISIBLE);
                    if (placeholderView != null) placeholderView.setVisibility(View.GONE);
                    if (containerCard != null) containerCard.setVisibility(View.VISIBLE);
                    return;
                }
            } catch (Exception ignored) {
                // Fall through to Glide in case decoding failed
            }
        }

        // 2. Standard URL loading via Glide
        if (containerCard != null) containerCard.setVisibility(View.VISIBLE);
        Glide.with(context)
                .load(trimmed)
                .centerCrop()
                .diskCacheStrategy(DiskCacheStrategy.ALL)
                .listener(new com.bumptech.glide.request.RequestListener<android.graphics.drawable.Drawable>() {
                    @Override
                    public boolean onLoadFailed(com.bumptech.glide.load.engine.GlideException e, Object model, com.bumptech.glide.request.target.Target<android.graphics.drawable.Drawable> target, boolean isFirstResource) {
                        targetView.setVisibility(View.GONE);
                        if (placeholderView != null) placeholderView.setVisibility(View.VISIBLE);
                        return false;
                    }

                    @Override
                    public boolean onResourceReady(android.graphics.drawable.Drawable resource, Object model, com.bumptech.glide.request.target.Target<android.graphics.drawable.Drawable> target, com.bumptech.glide.load.DataSource dataSource, boolean isFirstResource) {
                        targetView.setVisibility(View.VISIBLE);
                        if (placeholderView != null) placeholderView.setVisibility(View.GONE);
                        if (containerCard != null) containerCard.setVisibility(View.VISIBLE);
                        return false;
                    }
                })
                .into(targetView);
    }
}
