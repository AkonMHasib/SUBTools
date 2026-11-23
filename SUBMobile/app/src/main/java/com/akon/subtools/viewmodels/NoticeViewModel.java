package com.akon.subtools.viewmodels;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.models.Notice;
import com.akon.subtools.repository.NoticeRepository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class NoticeViewModel extends AndroidViewModel {
    private final NoticeRepository noticeRepository;
    private final MutableLiveData<List<Notice>> noticesList = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();

    private static final String PREF_CACHED_NOTICE_VERSION = "cached_notice_version";
    private static final String PREF_LAST_NOTICE_SYNC = "last_notice_sync_timestamp";
    private static final long THREE_HOURS_MS = 3 * 60 * 60 * 1000;

    public NoticeViewModel(@NonNull Application application) {
        super(application);
        this.noticeRepository = new NoticeRepository(application);
    }

    public LiveData<List<Notice>> getNoticesList() { return noticesList; }
    public LiveData<Boolean> getLoading() { return loading; }
    public LiveData<String> getError() { return error; }

    public void loadNotices() {
        // 1. Instant rendering from Room cache
        noticeRepository.getCachedNotices(new NoticeRepository.NoticeCallback() {
            @Override
            public void onSuccess(List<Notice> notices) {
                boolean hasCache = notices != null && !notices.isEmpty();
                if (hasCache) {
                    sortAndPostNotices(notices);
                }
                
                // 2. Perform version check from Firestore (or force sync if cache is empty)
                checkNoticeVersionAndSync(!hasCache);
            }

            @Override
            public void onFailure(Exception e) {
                checkNoticeVersionAndSync(true);
            }
        });
    }

    private void checkNoticeVersionAndSync(boolean forceSync) {
        SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", Context.MODE_PRIVATE);
        int localVersion = prefs.getInt(PREF_CACHED_NOTICE_VERSION, -1);
        long lastSync = prefs.getLong(PREF_LAST_NOTICE_SYNC, 0);

        noticeRepository.getNoticeVersion(new NoticeRepository.NoticeVersionCallback() {
            @Override
            public void onSuccess(int remoteVersion) {
                if (forceSync || remoteVersion != localVersion) {
                    refreshNoticesSilently(remoteVersion);
                }
            }

            @Override
            public void onFailure(Exception e) {
                // Fallback: refresh if version check fails and cache is older than 3 hours
                if (forceSync || System.currentTimeMillis() - lastSync > THREE_HOURS_MS) {
                    refreshNoticesSilently(-1);
                }
            }
        });
    }

    private void refreshNoticesSilently(int newVersion) {
        noticeRepository.getAllNotices(new NoticeRepository.NoticeCallback() {
            @Override
            public void onSuccess(List<Notice> notices) {
                SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                if (newVersion != -1) {
                    editor.putInt(PREF_CACHED_NOTICE_VERSION, newVersion);
                }
                editor.putLong(PREF_LAST_NOTICE_SYNC, System.currentTimeMillis());
                editor.apply();

                sortAndPostNotices(notices);
            }

            @Override
            public void onFailure(Exception e) {
                // Ignore silent fetch failures
            }
        });
    }

    public void refreshNotices() {
        loading.setValue(true);
        noticeRepository.getAllNotices(new NoticeRepository.NoticeCallback() {
            @Override
            public void onSuccess(List<Notice> notices) {
                loading.setValue(false);
                
                // Force sync update local version check
                noticeRepository.getNoticeVersion(new NoticeRepository.NoticeVersionCallback() {
                    @Override
                    public void onSuccess(int remoteVersion) {
                        SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", Context.MODE_PRIVATE);
                        prefs.edit()
                             .putInt(PREF_CACHED_NOTICE_VERSION, remoteVersion)
                             .putLong(PREF_LAST_NOTICE_SYNC, System.currentTimeMillis())
                             .apply();
                    }

                    @Override
                    public void onFailure(Exception e) {
                        SharedPreferences prefs = getApplication().getSharedPreferences("sync_prefs", Context.MODE_PRIVATE);
                        prefs.edit()
                             .putLong(PREF_LAST_NOTICE_SYNC, System.currentTimeMillis())
                             .apply();
                    }
                });
                
                sortAndPostNotices(notices);
            }

            @Override
            public void onFailure(Exception e) {
                loading.setValue(false);
                error.setValue(e.getMessage());
            }
        });
    }

    private void sortAndPostNotices(List<Notice> notices) {
        if (notices == null) return;
        Collections.sort(notices, (n1, n2) -> {
            long t1 = parseNoticeTimestamp(n1);
            long t2 = parseNoticeTimestamp(n2);
            return Long.compare(t2, t1); // Descending (latest order first)
        });
        noticesList.postValue(notices);
    }

    private long parseNoticeTimestamp(Notice notice) {
        if (notice == null) return 0L;
        return notice.getTimestamp();
    }

    public List<Notice> filterNotices(List<Notice> allNotices, String studentDept) {
        List<Notice> filtered = new ArrayList<>();
        if (allNotices == null) return filtered;

        String studentDeptCode = com.akon.subtools.utils.DepartmentHelper.getDeptCode(studentDept);

        for (Notice n : allNotices) {
            if (n == null) continue;
            String noticeDept = n.getDepartment() != null ? n.getDepartment().trim() : "";
            String noticeDeptCode = com.akon.subtools.utils.DepartmentHelper.getDeptCode(noticeDept);

            boolean matchesDept = noticeDept.isEmpty() ||
                    "All Departments".equalsIgnoreCase(noticeDept) ||
                    "All".equalsIgnoreCase(noticeDept) ||
                    "GENERAL".equalsIgnoreCase(noticeDept) ||
                    "GED".equalsIgnoreCase(noticeDept) ||
                    studentDeptCode.isEmpty() ||
                    "ALL".equalsIgnoreCase(studentDeptCode) ||
                    "N/A".equalsIgnoreCase(studentDeptCode) ||
                    (!studentDeptCode.isEmpty() && studentDeptCode.equalsIgnoreCase(noticeDeptCode)) ||
                    (!studentDept.isEmpty() && noticeDept.equalsIgnoreCase(studentDept));

            if (matchesDept) {
                filtered.add(n);
            }
        }
        return filtered;
    }

    private int getPriorityWeight(String priority) {
        if (priority == null) return 2;
        switch (priority.trim()) {
            case "Critical": return 0;
            case "High": return 1;
            default: return 2;
        }
    }
}
