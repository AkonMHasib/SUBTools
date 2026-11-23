package com.akon.subtools.fragments;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.RectF;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.google.android.material.button.MaterialButton;

import java.io.IOException;
import java.io.InputStream;

/**
 * DialogFragment that presents a 1:1 canvas cropper for profile avatar selection.
 * Supports drag-to-pan and pinch-to-zoom. Returns a square Bitmap via listener.
 */
public class CropAvatarDialogFragment extends DialogFragment {

    public interface OnCropCompleteListener {
        void onCropComplete(Bitmap croppedBitmap);
    }

    private static final String ARG_URI = "image_uri";
    private OnCropCompleteListener listener;
    private Uri imageUri;

    public static CropAvatarDialogFragment newInstance(Uri uri) {
        CropAvatarDialogFragment f = new CropAvatarDialogFragment();
        Bundle args = new Bundle();
        args.putString(ARG_URI, uri.toString());
        f.setArguments(args);
        return f;
    }

    public void setOnCropCompleteListener(OnCropCompleteListener listener) {
        this.listener = listener;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(DialogFragment.STYLE_NORMAL, com.akon.subtools.R.style.Theme_SUBTools);
        if (getArguments() != null) {
            imageUri = Uri.parse(getArguments().getString(ARG_URI));
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        Window w = getDialog() != null ? getDialog().getWindow() : null;
        if (w != null) {
            w.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT);
            w.setBackgroundDrawableResource(android.R.color.transparent);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        // Build the UI programmatically to avoid needing a new layout file
        Context ctx = requireContext();

        // Root: dark semi-transparent background
        FrameLayout root = new FrameLayout(ctx);
        root.setBackgroundColor(0xCC000000);

        // Card container
        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundColor(0xFF1E293B); // slate-900
        int cardRadius = dp(ctx, 20);
        card.setElevation(dp(ctx, 8));

        FrameLayout.LayoutParams cardParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
        );
        int margin = dp(ctx, 20);
        cardParams.setMargins(margin, 0, margin, 0);
        cardParams.gravity = android.view.Gravity.CENTER_VERTICAL;

        // Title bar
        LinearLayout titleBar = new LinearLayout(ctx);
        titleBar.setOrientation(LinearLayout.HORIZONTAL);
        titleBar.setGravity(android.view.Gravity.CENTER_VERTICAL);
        titleBar.setPadding(dp(ctx, 16), dp(ctx, 16), dp(ctx, 16), dp(ctx, 16));

        TextView title = new TextView(ctx);
        title.setText("Crop Profile Photo");
        title.setTextColor(Color.WHITE);
        title.setTextSize(15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        title.setLayoutParams(titleParams);

        TextView hint = new TextView(ctx);
        hint.setText("Drag · Pinch to zoom");
        hint.setTextColor(0xFF94A3B8); // slate-400
        hint.setTextSize(11);

        titleBar.addView(title, titleParams);
        titleBar.addView(hint);

        // Crop view
        CropView cropView = new CropView(ctx);
        int cropSize = dp(ctx, 300);
        LinearLayout.LayoutParams cropParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, cropSize
        );
        cropView.setLayoutParams(cropParams);
        cropView.setBackgroundColor(Color.BLACK);

        // Load bitmap on a background thread
        new Thread(() -> {
            Bitmap bmp = decodeBitmap(ctx, imageUri);
            if (bmp != null && cropView.getHandler() != null) {
                cropView.getHandler().post(() -> cropView.setSourceBitmap(bmp));
            }
        }).start();

        // Button row
        LinearLayout btnRow = new LinearLayout(ctx);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setPadding(dp(ctx, 16), dp(ctx, 12), dp(ctx, 16), dp(ctx, 16));
        btnRow.setGravity(android.view.Gravity.CENTER);

        Button btnCancel = new Button(ctx);
        btnCancel.setText("Cancel");
        btnCancel.setTextColor(0xFF94A3B8);
        btnCancel.setBackgroundColor(0xFF334155); // slate-700
        LinearLayout.LayoutParams cancelParams = new LinearLayout.LayoutParams(0, dp(ctx, 44), 1f);
        cancelParams.setMarginEnd(dp(ctx, 8));
        btnCancel.setLayoutParams(cancelParams);
        btnCancel.setOnClickListener(v -> dismissAllowingStateLoss());

        Button btnCrop = new Button(ctx);
        btnCrop.setText("Crop & Use");
        btnCrop.setTextColor(Color.WHITE);
        btnCrop.setBackgroundColor(0xFF6366F1); // indigo-500
        LinearLayout.LayoutParams cropBtnParams = new LinearLayout.LayoutParams(0, dp(ctx, 44), 1f);
        btnCrop.setLayoutParams(cropBtnParams);
        btnCrop.setOnClickListener(v -> {
            Bitmap cropped = cropView.getCroppedBitmap();
            if (cropped != null && listener != null) {
                listener.onCropComplete(cropped);
            }
            dismissAllowingStateLoss();
        });

        btnRow.addView(btnCancel);
        btnRow.addView(btnCrop);

        card.addView(titleBar);
        card.addView(cropView, cropParams);
        card.addView(btnRow);

        root.addView(card, cardParams);

        // Dismiss on outside tap
        root.setOnClickListener(v -> dismissAllowingStateLoss());
        card.setOnClickListener(v -> {}); // consume so root doesn't dismiss

        return root;
    }

    // -------------------------------------------------------------------------
    // Inner CropView: pan + pinch zoom with 1:1 circle overlay
    // -------------------------------------------------------------------------
    private static class CropView extends View {
        private Bitmap source;
        private final Matrix matrix = new Matrix();
        private final Paint bitmapPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        private final Paint overlayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);

        // Touch
        private float lastX, lastY;
        private float lastDist;
        private int touchMode = 0; // 0=none, 1=drag, 2=zoom

        CropView(Context ctx) {
            super(ctx);
            setLayerType(View.LAYER_TYPE_SOFTWARE, null); // needed for PorterDuff

            overlayPaint.setColor(0xAA000000);
            overlayPaint.setStyle(Paint.Style.FILL);

            borderPaint.setColor(0xCC6366F1);
            borderPaint.setStyle(Paint.Style.STROKE);
            borderPaint.setStrokeWidth(2.5f);
        }

        void setSourceBitmap(Bitmap bmp) {
            this.source = bmp;
            fitCenter();
            invalidate();
        }

        private void fitCenter() {
            if (source == null || getWidth() == 0 || getHeight() == 0) return;
            float vw = getWidth(), vh = getHeight();
            float bw = source.getWidth(), bh = source.getHeight();
            // Scale to fill the crop circle (crop circle = square = min of view dims)
            float crop = Math.min(vw, vh);
            float scale = Math.max(crop / bw, crop / bh);
            matrix.reset();
            matrix.postScale(scale, scale);
            // center
            float[] pts = {0, 0, bw, bh};
            matrix.mapPoints(pts);
            matrix.postTranslate((vw - pts[2]) / 2f, (vh - pts[3]) / 2f);
        }

        @Override
        protected void onSizeChanged(int w, int h, int oldw, int oldh) {
            super.onSizeChanged(w, h, oldw, oldh);
            fitCenter();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            if (source == null) return;

            float vw = getWidth(), vh = getHeight();
            float cx = vw / 2f, cy = vh / 2f;
            float r = Math.min(vw, vh) / 2f - 4;

            // Draw the bitmap
            canvas.drawBitmap(source, matrix, bitmapPaint);

            // Draw darkened overlay with circle cutout using PorterDuff
            // 1. Draw full overlay
            int sc = canvas.saveLayer(0, 0, vw, vh, null);
            canvas.drawRect(0, 0, vw, vh, overlayPaint);
            // 2. Erase circle (reveal bitmap)
            Paint erasePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            erasePaint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.CLEAR));
            canvas.drawCircle(cx, cy, r, erasePaint);
            canvas.restoreToCount(sc);

            // Draw circle border
            canvas.drawCircle(cx, cy, r, borderPaint);
        }

        @Override
        public boolean onTouchEvent(MotionEvent e) {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    lastX = e.getX();
                    lastY = e.getY();
                    touchMode = 1;
                    break;
                case MotionEvent.ACTION_POINTER_DOWN:
                    lastDist = spacing(e);
                    touchMode = 2;
                    break;
                case MotionEvent.ACTION_MOVE:
                    if (touchMode == 1 && e.getPointerCount() == 1) {
                        float dx = e.getX() - lastX;
                        float dy = e.getY() - lastY;
                        matrix.postTranslate(dx, dy);
                        clampMatrix();
                        lastX = e.getX();
                        lastY = e.getY();
                        invalidate();
                    } else if (touchMode == 2 && e.getPointerCount() >= 2) {
                        float newDist = spacing(e);
                        if (lastDist > 0) {
                            float scaleFactor = newDist / lastDist;
                            float px = (e.getX(0) + e.getX(1)) / 2f;
                            float py = (e.getY(0) + e.getY(1)) / 2f;
                            matrix.postScale(scaleFactor, scaleFactor, px, py);
                            clampMatrix();
                            invalidate();
                        }
                        lastDist = newDist;
                    }
                    break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_POINTER_UP:
                    touchMode = e.getPointerCount() > 1 ? 1 : 0;
                    break;
            }
            return true;
        }

        /** Prevent bitmap from leaving the circle crop area entirely. */
        private void clampMatrix() {
            if (source == null) return;
            float vw = getWidth(), vh = getHeight();
            float cr = Math.min(vw, vh) / 2f; // circle radius
            float cx = vw / 2f, cy = vh / 2f;

            float[] corners = {0, 0, source.getWidth(), 0,
                    0, source.getHeight(), source.getWidth(), source.getHeight()};
            matrix.mapPoints(corners);

            // Ensure minimum scale so bitmap covers the circle
            float[] scale = new float[9];
            matrix.getValues(scale);
            float currentScale = scale[Matrix.MSCALE_X];
            float minScale = Math.max(
                    (cr * 2) / source.getWidth(),
                    (cr * 2) / source.getHeight()
            );
            if (currentScale < minScale) {
                float fix = minScale / currentScale;
                matrix.postScale(fix, fix, cx, cy);
            }
        }

        private float spacing(MotionEvent e) {
            if (e.getPointerCount() < 2) return 0;
            float dx = e.getX(0) - e.getX(1);
            float dy = e.getY(0) - e.getY(1);
            return (float) Math.sqrt(dx * dx + dy * dy);
        }

        /** Returns the 1:1 bitmap cropped from the circle. */
        Bitmap getCroppedBitmap() {
            if (source == null) return null;
            float vw = getWidth(), vh = getHeight();
            float cr = Math.min(vw, vh) / 2f;
            float cx = vw / 2f, cy = vh / 2f;

            // Map circle in view coords back to bitmap coords via inverse matrix
            Matrix inverse = new Matrix();
            matrix.invert(inverse);
            float[] pts = {cx - cr, cy - cr, cx + cr, cy + cr};
            inverse.mapPoints(pts);

            float srcX = pts[0], srcY = pts[1];
            float srcW = pts[2] - pts[0], srcH = pts[3] - pts[1];

            // Clamp to bitmap bounds
            srcX = Math.max(0, srcX);
            srcY = Math.max(0, srcY);
            if (srcX + srcW > source.getWidth()) srcW = source.getWidth() - srcX;
            if (srcY + srcH > source.getHeight()) srcH = source.getHeight() - srcY;
            if (srcW <= 0 || srcH <= 0) return null;

            // Crop & make square
            int size = (int) Math.min(srcW, srcH);
            return Bitmap.createBitmap(source, (int) srcX, (int) srcY, size, size);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    private static Bitmap decodeBitmap(Context ctx, Uri uri) {
        try {
            InputStream is = ctx.getContentResolver().openInputStream(uri);
            if (is == null) return null;
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inSampleSize = 2; // reduce to ~half, saves memory
            Bitmap bmp = BitmapFactory.decodeStream(is, null, opts);
            is.close();
            return bmp;
        } catch (IOException e) {
            return null;
        }
    }

    private static int dp(Context ctx, int dp) {
        return Math.round(dp * ctx.getResources().getDisplayMetrics().density);
    }
}
