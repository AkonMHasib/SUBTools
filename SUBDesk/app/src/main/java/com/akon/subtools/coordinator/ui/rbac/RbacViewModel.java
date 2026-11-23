package com.akon.subtools.coordinator.ui.rbac;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import android.os.Handler;
import android.os.Looper;

import com.akon.subtools.coordinator.data.model.User;
import com.akon.subtools.coordinator.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

public class RbacViewModel extends AndroidViewModel {

    private final MutableLiveData<List<User>> usersLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);

    private final MutableLiveData<Integer> coordCount = new MutableLiveData<>(0);
    private final MutableLiveData<Integer> modCount = new MutableLiveData<>(0);
    private final MutableLiveData<Integer> superAdminCount = new MutableLiveData<>(0);

    private final List<User> allUsers = new ArrayList<>();
    private String currentQuery = "";
    private String currentRoleFilter = "ALL";

    public RbacViewModel(@NonNull Application application) {
        super(application);
    }

    public LiveData<List<User>> getUsersLiveData() { return usersLiveData; }
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<Integer> getCoordCount() { return coordCount; }
    public LiveData<Integer> getModCount() { return modCount; }
    public LiveData<Integer> getSuperAdminCount() { return superAdminCount; }

    public void loadUsers() {
        isLoading.setValue(true);
        allUsers.clear();

        if (SupabaseAuthBridge.isConfigured()) {
            Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    JSONArray arr = SupabaseAuthBridge.queryTable("users", "select=*&order=created_at.desc&limit=500");
                    if (arr != null && arr.length() > 0) {
                        List<User> users = new ArrayList<>();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject obj = arr.getJSONObject(i);
                            User u = User.fromJson(obj);
                            if (u != null) {
                                String r = u.getRole();
                                if (r == null || r.isEmpty()) r = "student";
                                u.setActiveRole(r);
                                users.add(u);
                            }
                        }

                        new Handler(Looper.getMainLooper()).post(() -> {
                            allUsers.clear();
                            allUsers.addAll(users);
                            isLoading.setValue(false);
                            computeCounts();
                            applyFilter();
                        });
                        return;
                    }
                } catch (Exception ignored) {}

                new Handler(Looper.getMainLooper()).post(this::finishLoading);
            });
            return;
        }

        finishLoading();
    }

    private void finishLoading() {
        isLoading.setValue(false);
        computeCounts();
        applyFilter();
    }

    private void computeCounts() {
        int c = 0, m = 0, sa = 0;
        for (User u : allUsers) {
            String r = u.getActiveRole();
            if (r == null) r = u.getRole();
            if ("coordinator".equalsIgnoreCase(r)) c++;
            else if ("moderator".equalsIgnoreCase(r)) m++;
            else if ("super_admin".equalsIgnoreCase(r) || "admin".equalsIgnoreCase(r)) sa++;
        }
        coordCount.setValue(c);
        modCount.setValue(m);
        superAdminCount.setValue(sa);
    }

    public void setQuery(String query) {
        this.currentQuery = query != null ? query.trim().toLowerCase() : "";
        applyFilter();
    }

    public void setRoleFilter(String roleFilter) {
        this.currentRoleFilter = roleFilter != null ? roleFilter.toUpperCase() : "ALL";
        applyFilter();
    }

    private void applyFilter() {
        List<User> filtered = new ArrayList<>();
        for (User u : allUsers) {
            String role = u.getActiveRole();
            if (role == null) role = u.getRole();
            if (role == null) role = "student";

            // Role filtering
            if (!"ALL".equalsIgnoreCase(currentRoleFilter)) {
                if ("COORDINATOR".equalsIgnoreCase(currentRoleFilter) && !"coordinator".equalsIgnoreCase(role)) continue;
                if ("MODERATOR".equalsIgnoreCase(currentRoleFilter) && !"moderator".equalsIgnoreCase(role)) continue;
                if ("SUPER_ADMIN".equalsIgnoreCase(currentRoleFilter) && !"super_admin".equalsIgnoreCase(role) && !"admin".equalsIgnoreCase(role)) continue;
                if ("STUDENT".equalsIgnoreCase(currentRoleFilter) && !"student".equalsIgnoreCase(role)) continue;
            }

            // Search query filtering
            if (!currentQuery.isEmpty()) {
                String name = u.getName() != null ? u.getName().toLowerCase() : "";
                String email = u.getEmail() != null ? u.getEmail().toLowerCase() : "";
                String dept = u.getDepartment() != null ? u.getDepartment().toLowerCase() : "";
                if (!name.contains(currentQuery) && !email.contains(currentQuery) && !dept.contains(currentQuery)) {
                    continue;
                }
            }

            filtered.add(u);
        }
        usersLiveData.setValue(filtered);
    }

    public void updateUserRoleAndDept(String uid, String newRole, String newDept, Runnable onSuccess, java.util.function.Consumer<String> onError) {
        if (uid == null || uid.isEmpty()) return;

        if (SupabaseAuthBridge.isConfigured()) {
            JSONObject updates = new JSONObject();
            try {
                updates.put("role", newRole);
                updates.put("active_role", newRole);
                updates.put("activeRole", newRole);
                if (newDept != null && !newDept.trim().isEmpty()) {
                    updates.put("department", newDept.trim());
                }
                SupabaseAuthBridge.updateRecord("users", "id=eq." + uid, updates, new SupabaseAuthBridge.SupabaseCallback() {
                    @Override
                    public void onSuccess(String response) {
                        loadUsers();
                        if (onSuccess != null) onSuccess.run();
                    }

                    @Override
                    public void onError(String errorMessage) {
                        if (onError != null) onError.accept(errorMessage);
                    }
                });
            } catch (Exception e) {
                if (onError != null) onError.accept(e.getMessage());
            }
        } else if (onError != null) {
            onError.accept("Supabase is not configured");
        }
    }

    public void toggleUserBan(User user, Runnable onSuccess, java.util.function.Consumer<String> onError) {
        if (user == null || user.getUid() == null) return;
        String uid = user.getUid();
        String currentStatus = user.getStatus();
        boolean isBanned = "banned".equalsIgnoreCase(currentStatus) || "disabled".equalsIgnoreCase(currentStatus) || "restricted".equalsIgnoreCase(currentStatus);
        String newStatus = isBanned ? "Active" : "banned";

        if (SupabaseAuthBridge.isConfigured()) {
            JSONObject updates = new JSONObject();
            try {
                updates.put("status", newStatus);
                updates.put("disabled", !isBanned);
                SupabaseAuthBridge.updateRecord("users", "id=eq." + uid, updates, new SupabaseAuthBridge.SupabaseCallback() {
                    @Override
                    public void onSuccess(String response) {
                        loadUsers();
                        if (onSuccess != null) onSuccess.run();
                    }

                    @Override
                    public void onError(String errorMessage) {
                        if (onError != null) onError.accept(errorMessage);
                    }
                });
            } catch (Exception e) {
                if (onError != null) onError.accept(e.getMessage());
            }
        } else if (onError != null) {
            onError.accept("Supabase is not configured");
        }
    }

    public void addNewStaffAccount(String name, String email, String role, String dept, Runnable onSuccess, java.util.function.Consumer<String> onError) {
        if (email == null || email.trim().isEmpty()) {
            if (onError != null) onError.accept("Email is required");
            return;
        }

        String safeEmail = email.trim().toLowerCase();
        String docId = safeEmail.replaceAll("[^a-z0-9]", "_");

        if (SupabaseAuthBridge.isConfigured()) {
            JSONObject json = new JSONObject();
            try {
                json.put("id", docId);
                json.put("uid", docId);
                json.put("name", name != null ? name.trim() : "Staff User");
                json.put("full_name", name != null ? name.trim() : "Staff User");
                json.put("email", safeEmail);
                json.put("role", role);
                json.put("active_role", role);
                json.put("department", dept != null ? dept.trim() : "GENERAL");
                json.put("status", "Active");

                SupabaseAuthBridge.insertRecord("users", json, new SupabaseAuthBridge.SupabaseCallback() {
                    @Override
                    public void onSuccess(String response) {
                        loadUsers();
                        if (onSuccess != null) onSuccess.run();
                    }

                    @Override
                    public void onError(String errorMessage) {
                        if (onError != null) onError.accept(errorMessage);
                    }
                });
            } catch (Exception e) {
                if (onError != null) onError.accept(e.getMessage());
            }
        } else if (onError != null) {
            onError.accept("Supabase is not configured");
        }
    }

    public void deleteUserAccount(User user, Runnable onSuccess, java.util.function.Consumer<String> onError) {
        if (user == null || user.getUid() == null) return;
        String uid = user.getUid();

        if (SupabaseAuthBridge.isConfigured()) {
            SupabaseAuthBridge.deleteRecord("users", "id=eq." + uid, new SupabaseAuthBridge.SupabaseCallback() {
                @Override
                public void onSuccess(String response) {
                    loadUsers();
                    if (onSuccess != null) onSuccess.run();
                }

                @Override
                public void onError(String errorMessage) {
                    if (onError != null) onError.accept(errorMessage);
                }
            });
        } else if (onError != null) {
            onError.accept("Supabase is not configured");
        }
    }
}
