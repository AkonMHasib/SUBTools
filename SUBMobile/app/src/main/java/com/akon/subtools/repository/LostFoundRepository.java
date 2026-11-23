package com.akon.subtools.repository;

import android.content.Context;
import com.akon.subtools.models.LostFoundItem;
import com.akon.subtools.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class LostFoundRepository {

    public LostFoundRepository(Context context) {}

    public interface LostFoundCallback {
        void onSuccess(List<LostFoundItem> items);
        void onFailure(Exception e);
    }

    public interface AddItemCallback {
        void onSuccess();
        void onFailure(Exception e);
    }

    public void getAllItems(LostFoundCallback callback) {
        getAllItems(null, callback);
    }

    public void getAllItems(String currentUid, LostFoundCallback callback) {
        SupabaseAuthBridge.queryTable("lost_found", "select=*&order=created_at.desc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                List<LostFoundItem> list = new ArrayList<>();
                String uid = currentUid != null ? currentUid : "";

                try {
                    JSONArray array = new JSONArray(responseBody);
                    for (int i = 0; i < array.length(); i++) {
                        JSONObject obj = array.getJSONObject(i);
                        LostFoundItem item = LostFoundItem.fromJson(obj);
                        if (item != null) {
                            String appStatus = item.getApprovalStatus();
                            boolean isApproved = "approved".equalsIgnoreCase(appStatus) || appStatus == null || appStatus.isEmpty();
                            boolean isMyOwn = !uid.isEmpty() && (uid.equalsIgnoreCase(item.getPublisherUid()) || uid.equalsIgnoreCase(item.getReporterUid()));
                            if (isApproved || isMyOwn) {
                                list.add(item);
                            }
                        }
                    }
                } catch (Exception ignored) {}

                list.sort((a, b) -> Long.compare(b.getTimestamp(), a.getTimestamp()));
                if (callback != null) {
                    callback.onSuccess(list);
                }
            }

            @Override
            public void onError(String error) {
                if (callback != null) {
                    callback.onFailure(new Exception(error));
                }
            }
        });
    }

    public void addLostFoundItem(LostFoundItem item, AddItemCallback callback) {
        if (item.getId() == null || item.getId().isEmpty()) {
            item.setId("lf-" + System.currentTimeMillis());
        }
        if (item.getTimestamp() == 0) {
            item.setTimestamp(System.currentTimeMillis());
        }
        if (item.getApprovalStatus() == null || item.getApprovalStatus().isEmpty()) {
            item.setApprovalStatus("pending");
        }

        SupabaseAuthBridge.insertRecord("lost_found", item.toJson(), new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                if (callback != null) {
                    callback.onSuccess();
                }
            }

            @Override
            public void onError(String error) {
                if (callback != null) {
                    callback.onFailure(new Exception(error));
                }
            }
        });
    }
}
