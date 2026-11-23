package com.akon.subtools.repository;

import android.os.Handler;
import android.os.Looper;

import com.akon.subtools.models.Holiday;
import com.akon.subtools.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

public class HolidayRepository {

    public interface HolidayCallback {
        void onSuccess(List<Holiday> holidays);
        void onFailure(Exception e);
    }

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public HolidayRepository() {}

    public void fetchHolidays(HolidayCallback callback) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                // Query Supabase holidays ordered by date ascending
                String response = SupabaseAuthBridge.executeGet("holidays", "select=*&order=date.asc");
                if (response != null && !response.trim().isEmpty()) {
                    JSONArray arr = new JSONArray(response);
                    List<Holiday> list = new ArrayList<>();
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.optJSONObject(i);
                        if (obj != null) {
                            Holiday h = Holiday.fromJson(obj);
                            if (h != null && h.isEnabled()) {
                                list.add(h);
                            }
                        }
                    }
                    mainHandler.post(() -> {
                        if (callback != null) callback.onSuccess(list);
                    });
                    return;
                }

                // If empty or null response
                mainHandler.post(() -> {
                    if (callback != null) callback.onSuccess(new ArrayList<>());
                });
            } catch (Exception e) {
                mainHandler.post(() -> {
                    if (callback != null) callback.onFailure(e);
                });
            }
        });
    }
}
