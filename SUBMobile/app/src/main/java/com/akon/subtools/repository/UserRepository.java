package com.akon.subtools.repository;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;

import com.akon.subtools.database.AppDatabase;
import com.akon.subtools.models.User;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;

public class UserRepository {
    private final Context context;
    private final AppDatabase database;

    public UserRepository(Context context) {
        this.context = context.getApplicationContext();
        this.database = AppDatabase.getDatabase(context);
    }

    public interface UserCallback<T> {
        void onSuccess(T result);
        void onFailure(Exception e);
    }

    private interface KeyFetchCallback {
        void onKeysFetched(List<String> keys);
    }

    private void fetchImgbbKeys(KeyFetchCallback callback) {
        android.content.SharedPreferences prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE);
        AppDatabase.databaseWriteExecutor.execute(() -> {
            List<String> keyCandidates = new ArrayList<>();
            try {
                org.json.JSONArray arr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("system_settings", "id=eq.api_config&select=data");
                if (arr != null && arr.length() > 0) {
                    org.json.JSONObject row = arr.getJSONObject(0);
                    org.json.JSONObject data = row.optJSONObject("data");
                    if (data != null) {
                        org.json.JSONArray pool = data.optJSONArray("imgbb_keys");
                        if (pool != null) {
                            for (int i = 0; i < pool.length(); i++) {
                                org.json.JSONObject kObj = pool.optJSONObject(i);
                                if (kObj != null) {
                                    String status = kObj.optString("status", "active");
                                    String kStr = kObj.optString("key", "");
                                    if (!kStr.trim().isEmpty() && !"disabled".equalsIgnoreCase(status) && !"invalid".equalsIgnoreCase(status)) {
                                        keyCandidates.add(kStr.trim());
                                    }
                                }
                            }
                        }
                        String singleKey = data.optString("imgbb_key", "");
                        if (!singleKey.trim().isEmpty() && !keyCandidates.contains(singleKey.trim())) {
                            keyCandidates.add(singleKey.trim());
                        }
                    }
                }
            } catch (Exception ignored) {}

            String cachedKey = prefs.getString("cached_imgbb_key", null);
            if (cachedKey != null && !cachedKey.trim().isEmpty() && !keyCandidates.contains(cachedKey.trim())) {
                keyCandidates.add(0, cachedKey.trim());
            }

            callback.onKeysFetched(keyCandidates);
        });
    }

    public void updateUserPhone(String uid, String phone, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            patch.put("phone", phone);
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setPhone(phone);
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public void updateUserBloodGroup(String uid, String bloodGroup, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            patch.put("blood_group", bloodGroup);
            patch.put("bloodGroup", bloodGroup);
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setBloodGroup(bloodGroup);
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public void updateUserDonorStatus(String uid, boolean isDonor, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            patch.put("is_donor", isDonor);
            patch.put("isDonor", isDonor);
            patch.put("allowBloodDonation", isDonor);
            patch.put("allow_blood_donation", isDonor);
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setDonor(isDonor);
                        user.setAllowBloodDonation(isDonor);
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public void updateUserLastDonationDate(String uid, String date, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            patch.put("last_donation_date", date);
            patch.put("lastDonationDate", date);
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setLastDonationDate(date);
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public void updateUserBio(String uid, String bio, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            patch.put("bio", bio);
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setBio(bio);
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public void updateUserBirthday(String uid, String birthday, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            patch.put("birthday", birthday);
            patch.put("dob", birthday);
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setBirthday(birthday);
                        user.setDob(birthday);
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public void updateAcademicInfo(String uid, String section, String academicLevel, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            patch.put("section", section != null ? section.trim() : "");
            patch.put("academic_level", academicLevel != null ? academicLevel.trim() : "");
            patch.put("academicLevel", academicLevel != null ? academicLevel.trim() : "");
            patch.put("term", academicLevel != null ? academicLevel.trim() : "");
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setSection(section != null ? section.trim() : "");
                        user.setAcademicLevel(academicLevel != null ? academicLevel.trim() : "");
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public void updatePersonalDetails(String uid, String phone, String dob, String bloodGroup, boolean isDonor, String location, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            patch.put("phone", phone != null ? phone.trim() : "");
            patch.put("dob", dob != null ? dob.trim() : "");
            patch.put("birthday", dob != null ? dob.trim() : "");
            patch.put("blood_group", bloodGroup != null ? bloodGroup.trim() : "");
            patch.put("bloodGroup", bloodGroup != null ? bloodGroup.trim() : "");
            patch.put("allow_blood_donation", isDonor);
            patch.put("allowBloodDonation", isDonor);
            patch.put("is_donor", isDonor);
            patch.put("location", location != null ? location.trim() : "");
            patch.put("area", location != null ? location.trim() : "");
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setPhone(phone != null ? phone.trim() : "");
                        user.setDob(dob != null ? dob.trim() : "");
                        user.setBirthday(dob != null ? dob.trim() : "");
                        user.setBloodGroup(bloodGroup != null ? bloodGroup.trim() : "");
                        user.setAllowBloodDonation(isDonor);
                        user.setDonor(isDonor);
                        user.setLocation(location != null ? location.trim() : "");
                        user.setArea(location != null ? location.trim() : "");
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public static String getCompressedBase64Image(Context context, Uri imageUri) throws IOException {
        InputStream input = context.getContentResolver().openInputStream(imageUri);
        Bitmap bitmap = BitmapFactory.decodeStream(input);
        if (input != null) input.close();

        int maxDim = 800;
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        if (width > maxDim || height > maxDim) {
            float ratio = (float) width / height;
            if (ratio > 1) {
                width = maxDim;
                height = (int) (maxDim / ratio);
            } else {
                height = maxDim;
                width = (int) (maxDim * ratio);
            }
            bitmap = Bitmap.createScaledBitmap(bitmap, width, height, true);
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        int quality = 85;
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);

        while (baos.size() > 500 * 1024 && quality > 20) {
            baos.reset();
            quality -= 10;
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);
        }

        byte[] bytes = baos.toByteArray();
        return Base64.encodeToString(bytes, Base64.NO_WRAP);
    }

    public static byte[] compressBitmapUnderLimit(Bitmap bitmap, int maxDimension, int maxBytes) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        if (width > maxDimension || height > maxDimension) {
            float ratio = (float) width / height;
            if (ratio > 1) {
                width = maxDimension;
                height = (int) (maxDimension / ratio);
            } else {
                height = maxDimension;
                width = (int) (maxDimension * ratio);
            }
            bitmap = Bitmap.createScaledBitmap(bitmap, width, height, true);
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        int quality = 85;
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);

        while (baos.size() > maxBytes && quality > 25) {
            baos.reset();
            quality -= 10;
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);
        }

        return baos.toByteArray();
    }

    public void uploadImageToImgBB(Uri imageUri, UserCallback<String> callback) {
        fetchImgbbKeys(keyCandidates -> {
            if (keyCandidates.isEmpty()) {
                new Handler(Looper.getMainLooper()).post(() -> callback.onFailure(
                    new Exception("No ImgBB API keys configured.\n\nGo to Admin Panel → Settings → API Keys and add a key from api.imgbb.com")
                ));
                return;
            }

            executeImgbbPoolUpload(keyCandidates, imageUri, callback);
        });
    }

    private void executeImgbbPoolUpload(List<String> keyCandidates, Uri imageUri, UserCallback<String> callback) {
        AppDatabase.databaseWriteExecutor.execute(() -> {
            try {
                String base64Image = getCompressedBase64Image(context, imageUri);
                String encodedImage = URLEncoder.encode(base64Image, "UTF-8");
                String lastErrorMsg = "Upload failed";
                String successfulKey = null;
                String downloadUrl = null;

                for (String apiKey : keyCandidates) {
                    try {
                        URL url = new URL("https://api.imgbb.com/1/upload?key=" + apiKey);
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setDoOutput(true);
                        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

                        OutputStream os = conn.getOutputStream();
                        byte[] input = ("image=" + encodedImage).getBytes("utf-8");
                        os.write(input, 0, input.length);
                        os.close();

                        int responseCode = conn.getResponseCode();
                        if (responseCode == HttpURLConnection.HTTP_OK) {
                            BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
                            StringBuilder response = new StringBuilder();
                            String responseLine;
                            while ((responseLine = br.readLine()) != null) {
                                response.append(responseLine.trim());
                            }
                            br.close();

                            JsonObject jsonObject = JsonParser.parseString(response.toString()).getAsJsonObject();
                            if (jsonObject.has("success") && jsonObject.get("success").getAsBoolean()) {
                                downloadUrl = jsonObject.getAsJsonObject("data").get("url").getAsString();
                                successfulKey = apiKey;
                                conn.disconnect();
                                break;
                            }
                        }

                        InputStream es = conn.getErrorStream();
                        if (es != null) {
                            BufferedReader br = new BufferedReader(new InputStreamReader(es, "utf-8"));
                            StringBuilder response = new StringBuilder();
                            String responseLine;
                            while ((responseLine = br.readLine()) != null) {
                                response.append(responseLine.trim());
                            }
                            br.close();
                            try {
                                JsonObject errObj = JsonParser.parseString(response.toString()).getAsJsonObject();
                                if (errObj.has("error") && errObj.getAsJsonObject("error").has("message")) {
                                    lastErrorMsg = errObj.getAsJsonObject("error").get("message").getAsString();
                                }
                            } catch (Exception ignored) {}
                        }
                        conn.disconnect();
                    } catch (Exception e) {
                        lastErrorMsg = e.getMessage();
                    }
                }

                if (downloadUrl != null && successfulKey != null) {
                    android.content.SharedPreferences prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE);
                    prefs.edit().putString("cached_imgbb_key", successfulKey).apply();
                    final String finalUrl = downloadUrl;
                    new Handler(Looper.getMainLooper()).post(() -> callback.onSuccess(finalUrl));
                } else {
                    final String finalErr = lastErrorMsg;
                    new Handler(Looper.getMainLooper()).post(() -> callback.onFailure(new Exception("All ImgBB keys failed. Last error: " + finalErr)));
                }
            } catch (Exception e) {
                new Handler(Looper.getMainLooper()).post(() -> callback.onFailure(e));
            }
        });
    }

    public void uploadProfileImage(String uid, Uri imageUri, UserCallback<String> callback) {
        uploadImageToImgBB(imageUri, new UserCallback<String>() {
            @Override
            public void onSuccess(String downloadUrl) {
                // Update Supabase primary
                org.json.JSONObject patch = new org.json.JSONObject();
                try {
                    patch.put("photo_url", downloadUrl);
                    patch.put("photoURL", downloadUrl);
                    patch.put("photoUrl", downloadUrl);
                    patch.put("avatar_url", downloadUrl);
                } catch (Exception ignored) {}

                com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, null);

                // Update Room database and local cache
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setPhotoURL(downloadUrl);
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                });
                new Handler(Looper.getMainLooper()).post(() -> callback.onSuccess(downloadUrl));
            }

            @Override
            public void onFailure(Exception e) {
                callback.onFailure(e);
            }
        });
    }

    public void uploadProfileImageFromBitmap(String uid, Bitmap bitmap, UserCallback<String> callback) {
        fetchImgbbKeys(keyCandidates -> {
            if (keyCandidates.isEmpty()) {
                new Handler(Looper.getMainLooper()).post(() -> callback.onFailure(
                    new Exception("No ImgBB API keys configured.")));
                return;
            }

            AppDatabase.databaseWriteExecutor.execute(() -> {
                try {
                    byte[] compressedBytes = compressBitmapUnderLimit(bitmap, 360, 80 * 1024);
                    String base64Image = Base64.encodeToString(compressedBytes, Base64.NO_WRAP);
                    String encodedImage = URLEncoder.encode(base64Image, "UTF-8");

                    String lastErrorMsg = "Upload failed";
                    String successfulKey = null;
                    String downloadUrl = null;

                    for (String apiKey : keyCandidates) {
                        try {
                            URL url = new URL("https://api.imgbb.com/1/upload?key=" + apiKey);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            conn.setRequestMethod("POST");
                            conn.setDoOutput(true);
                            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
                            OutputStream os = conn.getOutputStream();
                            byte[] input = ("image=" + encodedImage).getBytes("utf-8");
                            os.write(input, 0, input.length);
                            os.close();
                            if (conn.getResponseCode() == HttpURLConnection.HTTP_OK) {
                                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
                                StringBuilder response = new StringBuilder();
                                String line;
                                while ((line = br.readLine()) != null) response.append(line.trim());
                                br.close();
                                JsonObject json = JsonParser.parseString(response.toString()).getAsJsonObject();
                                if (json.has("success") && json.get("success").getAsBoolean()) {
                                    downloadUrl = json.getAsJsonObject("data").get("url").getAsString();
                                    successfulKey = apiKey;
                                    conn.disconnect();
                                    break;
                                }
                            }
                            conn.disconnect();
                        } catch (Exception e) {
                            lastErrorMsg = e.getMessage();
                        }
                    }

                    if (downloadUrl != null && successfulKey != null) {
                        android.content.SharedPreferences prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE);
                        prefs.edit().putString("cached_imgbb_key", successfulKey).apply();
                        final String finalUrl = downloadUrl;

                        // Update Supabase Auth metadata
                        org.json.JSONObject patch = new org.json.JSONObject();
                        try {
                            patch.put("photoURL", finalUrl);
                            patch.put("photoUrl", finalUrl);
                            patch.put("avatar_url", finalUrl);
                            patch.put("photo_url", finalUrl);
                        } catch (Exception ignored) {}
                        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, null);

                        // Persist to Room & local cache
                        AppDatabase.databaseWriteExecutor.execute(() -> {
                            User user = database.userDao().getUserById(uid);
                            if (user != null) {
                                user.setPhotoURL(finalUrl);
                                database.userDao().insertUser(user);
                                AppDatabase.setCachedLocalUser(user);
                                try {
                                    new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                                } catch (Exception ignored) {}
                            }
                        });
                        new Handler(Looper.getMainLooper()).post(() -> callback.onSuccess(finalUrl));
                    } else {
                        final String finalErr = lastErrorMsg;
                        new Handler(Looper.getMainLooper()).post(() -> callback.onFailure(new Exception("Upload failed: " + finalErr)));
                    }
                } catch (Exception e) {
                    new Handler(Looper.getMainLooper()).post(() -> callback.onFailure(e));
                }
            });
        });
    }

    public void updateSelectedSubjects(String uid, List<String> subjects, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            org.json.JSONArray arr = new org.json.JSONArray();
            if (subjects != null) {
                for (String s : subjects) arr.put(s);
            }
            patch.put("subjects", arr);
            patch.put("enrolled_subjects", org.json.JSONObject.NULL);
            patch.put("enrolledSubjects", org.json.JSONObject.NULL);
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setSubjects(subjects);
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public void updateCompletedSubjects(String uid, List<String> completedSubjects, double completedCredits, UserCallback<Void> callback) {
        org.json.JSONObject patch = new org.json.JSONObject();
        try {
            org.json.JSONArray arr = new org.json.JSONArray();
            if (completedSubjects != null) {
                for (String s : completedSubjects) arr.put(s);
            }
            patch.put("completed_subjects", arr);
            patch.put("completed_credits", completedCredits);
            patch.put("completedSubjects", org.json.JSONObject.NULL);
            patch.put("completedCredits", org.json.JSONObject.NULL);
        } catch (Exception ignored) {}

        com.akon.subtools.utils.SupabaseAuthBridge.updateUserAuthMetadata(patch, new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                AppDatabase.databaseWriteExecutor.execute(() -> {
                    User user = database.userDao().getUserById(uid);
                    if (user != null) {
                        user.setCompletedSubjects(completedSubjects);
                        user.setCompletedCredits(completedCredits);
                        database.userDao().insertUser(user);
                        AppDatabase.setCachedLocalUser(user);
                        try {
                            new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
                        } catch (Exception ignored) {}
                    }
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (callback != null) callback.onSuccess(null);
                    });
                });
            }

            @Override
            public void onError(String error) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (callback != null) callback.onFailure(new Exception(error));
                });
            }
        });
    }

    public void getUserById(String uid, UserCallback<User> callback) {
        getCachedUser(uid, new UserCallback<User>() {
            @Override
            public void onSuccess(User cachedUser) {
                if (cachedUser != null) {
                    if (callback != null) callback.onSuccess(cachedUser);
                } else {
                    fetchUserFromSupabase(uid, callback);
                }
            }

            @Override
            public void onFailure(Exception e) {
                fetchUserFromSupabase(uid, callback);
            }
        });
    }

    public void fetchUserFromSupabase(String uid, UserCallback<User> callback) {
        if (com.akon.subtools.utils.SupabaseAuthBridge.isConfigured()) {
            com.akon.subtools.utils.SupabaseAuthBridge.fetchAuthUser(new com.akon.subtools.utils.SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String responseBody) {
                    try {
                        org.json.JSONObject userObj = new org.json.JSONObject(responseBody);
                        User user = User.fromJson(userObj);
                        if (user != null) {
                            if (uid != null && !uid.trim().isEmpty() && (user.getUid() == null || user.getUid().isEmpty())) {
                                user.setUid(uid);
                            }
                            if (user.getSubjects() == null || user.getSubjects().isEmpty()) {
                                try {
                                    org.json.JSONArray arr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("users", "id=eq." + uid + "&select=*");
                                    if (arr != null && arr.length() > 0) {
                                        User dbU = User.fromJson(arr.getJSONObject(0));
                                        if (dbU != null && dbU.getSubjects() != null && !dbU.getSubjects().isEmpty()) {
                                            user.setSubjects(dbU.getSubjects());
                                        }
                                        if (dbU != null && dbU.getCompletedSubjects() != null && !dbU.getCompletedSubjects().isEmpty()) {
                                            user.setCompletedSubjects(dbU.getCompletedSubjects());
                                        }
                                        if (dbU != null && user.getCompletedCredits() <= 0 && dbU.getCompletedCredits() > 0) {
                                            user.setCompletedCredits(dbU.getCompletedCredits());
                                        }
                                    }
                                } catch (Exception ignored) {}
                            }
                            saveUserToCache(user);
                            new Handler(Looper.getMainLooper()).post(() -> {
                                if (callback != null) callback.onSuccess(user);
                            });
                            return;
                        }
                    } catch (Exception ignored) {}
                    fallbackToDbOrCache(uid, callback);
                }

                @Override
                public void onError(String error) {
                    fallbackToDbOrCache(uid, callback);
                }
            });
            return;
        }

        getCachedUser(uid, callback);
    }

    private void fallbackToDbOrCache(String uid, UserCallback<User> callback) {
        AppDatabase.databaseWriteExecutor.execute(() -> {
            try {
                if (uid != null && !uid.trim().isEmpty()) {
                    org.json.JSONArray arr = com.akon.subtools.utils.SupabaseAuthBridge.queryTable("users", "id=eq." + uid.trim() + "&select=*");
                    if (arr != null && arr.length() > 0) {
                        User dbU = User.fromJson(arr.getJSONObject(0));
                        if (dbU != null) {
                            saveUserToCache(dbU);
                            new Handler(Looper.getMainLooper()).post(() -> {
                                if (callback != null) callback.onSuccess(dbU);
                            });
                            return;
                        }
                    }
                }
            } catch (Exception ignored) {}
            getCachedUser(uid, callback);
        });
    }

    // Local DB Helper
    public void getCachedUser(String uid, UserCallback<User> callback) {
        AppDatabase.databaseWriteExecutor.execute(() -> {
            User user = database.userDao().getUserById(uid);
            new Handler(Looper.getMainLooper()).post(() -> {
                if (callback != null) callback.onSuccess(user);
            });
        });
    }

    public void saveUserToCache(User user) {
        if (user != null) {
            AppDatabase.setCachedLocalUser(user);
            try {
                new com.akon.subtools.utils.CacheManager(context).save("user_profile", user);
            } catch (Exception ignored) {}
            AppDatabase.databaseWriteExecutor.execute(() -> {
                database.userDao().insertUser(user);
            });
        }
    }
}
