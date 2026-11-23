package com.akon.subtools.repository;

import com.akon.subtools.models.SubletItem;
import com.akon.subtools.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class SubletRepository {

    public interface SubletCallback<T> {
        void onSuccess(T result);
        void onFailure(Exception e);
    }

    public SubletRepository() {}

    public void fetchSublets(SubletCallback<List<SubletItem>> callback) {
        fetchSublets(null, callback);
    }

    public void fetchSublets(String currentUid, SubletCallback<List<SubletItem>> callback) {
        SupabaseAuthBridge.queryTable("sublets", "select=*&order=created_at.desc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                List<SubletItem> list = new ArrayList<>();
                String uid = currentUid != null ? currentUid : "";

                try {
                    JSONArray array = new JSONArray(responseBody);
                    for (int i = 0; i < array.length(); i++) {
                        JSONObject obj = array.getJSONObject(i);
                        SubletItem item = SubletItem.fromJson(obj);
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

    public void createSublet(SubletItem item, SubletCallback<SubletItem> callback) {
        String docId = item.getId();
        if (docId == null || docId.trim().isEmpty()) {
            docId = "sublet-" + System.currentTimeMillis();
            item.setId(docId);
        }

        SupabaseAuthBridge.insertRecord("sublets", item.toJson(), new SupabaseAuthBridge.SupabaseCallback() {
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
