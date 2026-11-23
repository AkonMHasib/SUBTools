package com.akon.subtools.repository;

import com.akon.subtools.models.TuitionItem;
import com.akon.subtools.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class TuitionRepository {

    public interface TuitionCallback<T> {
        void onSuccess(T result);
        void onFailure(Exception e);
    }

    public TuitionRepository() {}

    public void fetchTuitions(TuitionCallback<List<TuitionItem>> callback) {
        fetchTuitions(null, callback);
    }

    public void fetchTuitions(String currentUid, TuitionCallback<List<TuitionItem>> callback) {
        SupabaseAuthBridge.queryTable("tuitions", "select=*&order=created_at.desc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                List<TuitionItem> list = new ArrayList<>();
                String uid = currentUid != null ? currentUid : "";

                try {
                    JSONArray array = new JSONArray(responseBody);
                    for (int i = 0; i < array.length(); i++) {
                        JSONObject obj = array.getJSONObject(i);
                        TuitionItem item = TuitionItem.fromJson(obj);
                        if (item != null) {
                            String approval = item.getApprovalStatus();
                            boolean isApproved = "approved".equalsIgnoreCase(approval) || approval == null || approval.isEmpty();
                            boolean isMyOwnPost = !uid.isEmpty() && uid.equalsIgnoreCase(item.getPublisherUid());

                            if (isApproved || isMyOwnPost) {
                                list.add(item);
                            }
                        }
                    }
                } catch (Exception ignored) {}

                // Sort by timestamp desc
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

    public void createTuition(TuitionItem item, TuitionCallback<TuitionItem> callback) {
        String docId = item.getId();
        if (docId == null || docId.trim().isEmpty()) {
            docId = "tuition-" + System.currentTimeMillis();
            item.setId(docId);
        }

        SupabaseAuthBridge.insertRecord("tuitions", item.toJson(), new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                if (callback != null) {
                    callback.onSuccess(item);
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
