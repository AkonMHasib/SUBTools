package com.akon.subtools.cache;

import android.content.Context;
import android.widget.ImageView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.bumptech.glide.request.RequestOptions;

public class ImageCacheManager {

    private static final RequestOptions DEFAULT_OPTIONS = new RequestOptions()
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .skipMemoryCache(false);

    public static void loadImage(Context context, String url, ImageView imageView, int placeholderResId, int errorResId) {
        if (context == null || imageView == null) return;
        if (url == null || url.trim().isEmpty()) {
            if (errorResId != 0) {
                imageView.setImageResource(errorResId);
            } else if (placeholderResId != 0) {
                imageView.setImageResource(placeholderResId);
            }
            return;
        }

        Glide.with(context)
                .load(url.trim())
                .apply(DEFAULT_OPTIONS)
                .placeholder(placeholderResId != 0 ? placeholderResId : android.R.drawable.ic_menu_camera)
                .error(errorResId != 0 ? errorResId : android.R.drawable.ic_menu_camera)
                .into(imageView);
    }

    public static void loadFacultyPhoto(Context context, String url, ImageView imageView) {
        loadImage(context, url, imageView, android.R.drawable.ic_menu_myplaces, android.R.drawable.ic_menu_myplaces);
    }

    public static void loadNoticeImage(Context context, String url, ImageView imageView) {
        loadImage(context, url, imageView, android.R.drawable.ic_menu_gallery, android.R.drawable.ic_menu_gallery);
    }

    public static void loadProfileAvatar(Context context, String url, ImageView imageView) {
        loadImage(context, url, imageView, android.R.drawable.ic_menu_myplaces, android.R.drawable.ic_menu_myplaces);
    }
}
