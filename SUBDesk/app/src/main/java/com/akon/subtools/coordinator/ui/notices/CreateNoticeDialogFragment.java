package com.akon.subtools.coordinator.ui.notices;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.bumptech.glide.Glide;
import com.akon.subtools.coordinator.data.model.Notice;
import com.akon.subtools.coordinator.data.repository.NoticeRepository;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.databinding.DialogCreateNoticeBinding;
import com.akon.subtools.coordinator.utils.DateUtils;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

public class CreateNoticeDialogFragment extends DialogFragment {

    private DialogCreateNoticeBinding binding;
    private SessionManager sessionManager;
    private NoticeRepository repository;
    private String uploadedImageUrl = "";

    private final ActivityResultLauncher<Intent> imagePickerLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null && result.getData().getData() != null) {
                    Uri imageUri = result.getData().getData();
                    uploadImageToImgBB(imageUri);
                }
            }
    );

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
        binding = DialogCreateNoticeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        sessionManager = new SessionManager(requireContext());
        repository = new NoticeRepository();
        setupDepartmentSelector();

        if (sessionManager.getStudentId().isEmpty() && !sessionManager.getUid().isEmpty()) {
            Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    org.json.JSONArray arr = com.akon.subtools.coordinator.utils.SupabaseAuthBridge.queryTable(
                            "users", "id=eq." + sessionManager.getUid() + "&select=student_id,studentId,data");
                    if (arr != null && arr.length() > 0) {
                        JSONObject obj = arr.getJSONObject(0);
                        JSONObject data = obj.optJSONObject("data");
                        String sid = obj.optString("student_id", obj.optString("studentId",
                                data != null ? data.optString("student_id", data.optString("studentId", "")) : ""));
                        if (!sid.isEmpty()) {
                            sessionManager.setStudentId(sid);
                        }
                    }
                } catch (Exception ignored) {}
            });
        }

        binding.btnNoticeAttachImage.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            imagePickerLauncher.launch(Intent.createChooser(intent, "Select Notice Image"));
        });

        binding.btnRemoveNoticeImage.setOnClickListener(v -> {
            uploadedImageUrl = "";
            binding.layoutNoticeImagePreview.setVisibility(View.GONE);
            binding.btnNoticeAttachImage.setVisibility(View.VISIBLE);
        });

        binding.btnCancelNotice.setOnClickListener(v -> dismiss());
        binding.btnPostNotice.setOnClickListener(v -> postNotice());
    }

    private void setupDepartmentSelector() {
        List<String> options = new ArrayList<>();
        options.add("All Departments");
        String myDept = com.akon.subtools.coordinator.utils.DepartmentUtils
                .getDepartmentFullName(sessionManager.getDepartment());
        if (myDept != null && !myDept.trim().isEmpty() 
                && !"All Departments".equalsIgnoreCase(myDept.trim()) 
                && !"All".equalsIgnoreCase(myDept.trim())
                && !options.contains(myDept.trim())) {
            options.add(myDept.trim());
        }

        ArrayAdapter<String> adapter = new ArrayAdapter<>(
                requireContext(), android.R.layout.simple_spinner_item, options);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        binding.spinnerNoticeDepartment.setAdapter(adapter);
        if (options.size() > 1) {
            binding.spinnerNoticeDepartment.setSelection(1); // Select admin's department by default
        }
        binding.spinnerNoticeDepartment.setEnabled(options.size() > 1);
    }

    private void uploadImageToImgBB(Uri uri) {
        binding.pbNoticePosting.setVisibility(View.VISIBLE);
        binding.btnPostNotice.setEnabled(false);

        Context context = requireContext();
        android.content.SharedPreferences prefs = context.getSharedPreferences("stc_prefs", Context.MODE_PRIVATE);
        String cachedKey = prefs.getString("cached_imgbb_key", null);

        if (cachedKey != null && !cachedKey.trim().isEmpty()) {
            uploadImageWithKey(uri, cachedKey.trim());
            return;
        }

        Executors.newSingleThreadExecutor().execute(() -> {
            String apiKey = null;
            try {
                org.json.JSONArray arr = com.akon.subtools.coordinator.utils.SupabaseAuthBridge.queryTable("system_settings", "id=eq.api_config&select=data");
                if (arr != null && arr.length() > 0) {
                    JSONObject row = arr.getJSONObject(0);
                    JSONObject data = row.optJSONObject("data");
                    if (data != null) {
                        apiKey = data.optString("imgbb_key", null);
                        if (apiKey == null || apiKey.isEmpty()) {
                            org.json.JSONArray keysArr = data.optJSONArray("imgbb_keys");
                            if (keysArr != null && keysArr.length() > 0) {
                                JSONObject kObj = keysArr.optJSONObject(0);
                                if (kObj != null) apiKey = kObj.optString("key", null);
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}

            final String resolvedKey = (apiKey != null && !apiKey.trim().isEmpty()) ? apiKey.trim() : null;
            new Handler(Looper.getMainLooper()).post(() -> {
                if (!isAdded()) return;
                if (resolvedKey == null) {
                    binding.pbNoticePosting.setVisibility(View.GONE);
                    binding.btnPostNotice.setEnabled(true);
                    Toast.makeText(requireContext(), "ImgBB API key is missing. Configure system_settings/api_config.", Toast.LENGTH_LONG).show();
                    return;
                }

                prefs.edit().putString("cached_imgbb_key", resolvedKey).apply();
                uploadImageWithKey(uri, resolvedKey);
            });
        });
    }

    private void uploadImageWithKey(Uri uri, String apiKey) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                Context context = requireContext();
                InputStream is = context.getContentResolver().openInputStream(uri);
                Bitmap bitmap = BitmapFactory.decodeStream(is);
                if (is != null) is.close();

                if (bitmap == null) {
                    throw new Exception("Unable to decode selected image");
                }

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
                byte[] imageBytes = baos.toByteArray();
                String base64Image = Base64.encodeToString(imageBytes, Base64.DEFAULT);
                String encodedImage = URLEncoder.encode(base64Image, "UTF-8");

                URL url = new URL("https://api.imgbb.com/1/upload?key=" + apiKey);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

                OutputStream os = conn.getOutputStream();
                byte[] input = ("image=" + encodedImage).getBytes("utf-8");
                os.write(input, 0, input.length);
                os.close();

                String downloadUrl = null;
                String uploadError = "Upload failed";

                int code = conn.getResponseCode();
                if (code == HttpURLConnection.HTTP_OK) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) response.append(line.trim());
                    br.close();

                    JSONObject json = new JSONObject(response.toString());
                    if (json.optBoolean("success")) {
                        downloadUrl = json.getJSONObject("data").getString("url");
                    } else {
                        uploadError = json.optString("error", "Upload failed");
                    }
                } else {
                    uploadError = "Server returned code: " + code;
                }
                conn.disconnect();

                String finalUrl = downloadUrl;
                String finalErr = uploadError;
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (!isAdded()) return;
                    binding.pbNoticePosting.setVisibility(View.GONE);
                    binding.btnPostNotice.setEnabled(true);
                    if (finalUrl != null) {
                        uploadedImageUrl = finalUrl;
                        binding.layoutNoticeImagePreview.setVisibility(View.VISIBLE);
                        binding.btnNoticeAttachImage.setVisibility(View.GONE);
                        if (getContext() != null && binding != null) {
                            Glide.with(getContext().getApplicationContext()).load(finalUrl).into(binding.ivNoticeImagePreview);
                            Toast.makeText(getContext(), "Image uploaded successfully!", Toast.LENGTH_SHORT).show();
                        }
                    } else if (getContext() != null) {
                        Toast.makeText(getContext(), "Upload failed: " + finalErr, Toast.LENGTH_LONG).show();
                    }
                });

            } catch (Exception e) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (!isAdded()) return;
                    binding.pbNoticePosting.setVisibility(View.GONE);
                    binding.btnPostNotice.setEnabled(true);
                    Toast.makeText(requireContext(), "Error processing image: " + e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    public static boolean validatePdfUrl(String url) {
        if (url == null || url.trim().isEmpty()) return true;
        String lower = url.trim().toLowerCase();
        if (!lower.startsWith("http://") && !lower.startsWith("https://")) return false;
        try {
            Uri uri = Uri.parse(lower);
            String host = uri.getHost();
            if (host == null) return false;
            return host.equalsIgnoreCase("drive.google.com") ||
                   host.equalsIgnoreCase("docs.google.com") ||
                   host.equalsIgnoreCase("1drv.ms") ||
                   host.equalsIgnoreCase("onedrive.live.com") ||
                   host.endsWith(".drive.google.com") ||
                   host.endsWith(".docs.google.com") ||
                   host.endsWith(".1drv.ms") ||
                   host.endsWith(".onedrive.live.com");
        } catch (Exception e) {
            return false;
        }
    }

    private void postNotice() {
        String title = binding.etNoticeTitle.getText() != null ? binding.etNoticeTitle.getText().toString().trim() : "";
        String desc = binding.etNoticeDescription.getText() != null ? binding.etNoticeDescription.getText().toString().trim() : "";
        String pdfUrl = binding.etNoticePdfUrl.getText() != null ? binding.etNoticePdfUrl.getText().toString().trim() : "";

        if (title.isEmpty() || desc.isEmpty()) {
            Toast.makeText(requireContext(), "Please fill in title and description.", Toast.LENGTH_SHORT).show();
            return;
        }

        if (!pdfUrl.isEmpty() && !validatePdfUrl(pdfUrl)) {
            Toast.makeText(requireContext(), "Invalid PDF link! Only Google Drive or Microsoft OneDrive links are allowed.", Toast.LENGTH_LONG).show();
            binding.etNoticePdfUrl.setError("Only Google Drive or OneDrive links allowed");
            return;
        }

        binding.pbNoticePosting.setVisibility(View.VISIBLE);
        binding.btnPostNotice.setEnabled(false);

        Notice notice = new Notice();
        notice.setTitle(title);
        notice.setDescription(desc);
        String selectedDepartment = String.valueOf(binding.spinnerNoticeDepartment.getSelectedItem());
        notice.setDepartment("All Departments".equalsIgnoreCase(selectedDepartment)
            ? "ALL"
            : com.akon.subtools.coordinator.utils.DepartmentUtils.getDepartmentCode(selectedDepartment));
        notice.setAuthorName(sessionManager.getName());
        notice.setAuthorStudentId(sessionManager.getStudentId());
        notice.setPublishDate(DateUtils.getCurrentDateString());
        notice.setImageUrl(uploadedImageUrl);
        notice.setPdfUrl(pdfUrl);

        repository.createNotice(notice, new NoticeRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                if (isAdded() && getContext() != null) {
                    if (binding != null) binding.pbNoticePosting.setVisibility(View.GONE);
                    Toast.makeText(getContext(), "Notice published!", Toast.LENGTH_SHORT).show();
                        getParentFragmentManager().setFragmentResult(
                            "notice_published", new android.os.Bundle());
                    dismissAllowingStateLoss();
                }
            }

            @Override
            public void onError(String errorMessage) {
                if (isAdded() && getContext() != null) {
                    if (binding != null) {
                        binding.pbNoticePosting.setVisibility(View.GONE);
                        binding.btnPostNotice.setEnabled(true);
                    }
                    Toast.makeText(getContext(), errorMessage, Toast.LENGTH_LONG).show();
                }
            }
        });
    }
}
