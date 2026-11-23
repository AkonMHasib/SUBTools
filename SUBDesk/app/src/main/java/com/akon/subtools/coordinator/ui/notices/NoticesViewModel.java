package com.akon.subtools.coordinator.ui.notices;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.coordinator.data.model.Notice;
import com.akon.subtools.coordinator.data.repository.NoticeRepository;
import com.akon.subtools.coordinator.data.repository.SessionManager;

import java.util.ArrayList;
import java.util.List;

public class NoticesViewModel extends AndroidViewModel {

    private final NoticeRepository noticeRepository;
    private final SessionManager sessionManager;

    private final MutableLiveData<List<Notice>> noticesLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<List<Notice>> scheduledNoticesLiveData = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> toastMessage = new MutableLiveData<>();

    public NoticesViewModel(@NonNull Application application) {
        super(application);
        this.noticeRepository = new NoticeRepository();
        this.sessionManager = new SessionManager(application);
    }

    public LiveData<List<Notice>> getNoticesLiveData() { return noticesLiveData; }
    public LiveData<List<Notice>> getScheduledNoticesLiveData() { return scheduledNoticesLiveData; }
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getToastMessage() { return toastMessage; }

    public void loadNotices() {
        loadNotices(false);
    }

    public void forceRefresh() {
        loadNotices(true);
    }

    public void loadNotices(boolean forceRefresh) {
        isLoading.setValue(true);
        if (sessionManager.isSuperAdmin()) {
            noticeRepository.getAllNotices(forceRefresh, new NoticeRepository.DataCallback<List<Notice>>() {
                @Override
                public void onSuccess(List<Notice> data) {
                    isLoading.setValue(false);
                    if (data != null) {
                        java.util.Collections.sort(data, (n1, n2) -> Long.compare(n2.getTimestamp(), n1.getTimestamp()));
                    }
                    noticesLiveData.setValue(data);
                }

                @Override
                public void onError(String errorMessage) {
                    isLoading.setValue(false);
                    toastMessage.setValue(errorMessage);
                }
            });
        } else {
            noticeRepository.getNotices(sessionManager.getDepartment(), forceRefresh, new NoticeRepository.DataCallback<List<Notice>>() {
                @Override
                public void onSuccess(List<Notice> data) {
                    isLoading.setValue(false);
                    if (data != null) {
                        java.util.Collections.sort(data, (n1, n2) -> Long.compare(n2.getTimestamp(), n1.getTimestamp()));
                    }
                    noticesLiveData.setValue(data);
                }

                @Override
                public void onError(String errorMessage) {
                    isLoading.setValue(false);
                    toastMessage.setValue(errorMessage);
                }
            });
        }
    }

    public void loadScheduledNotices() {
        isLoading.setValue(true);
        noticeRepository.getScheduledNotices(new NoticeRepository.DataCallback<List<Notice>>() {
            @Override
            public void onSuccess(List<Notice> data) {
                isLoading.setValue(false);
                if (data != null) {
                    java.util.Collections.sort(data, (n1, n2) -> Long.compare(n2.getTimestamp(), n1.getTimestamp()));
                }
                scheduledNoticesLiveData.setValue(data);
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void publishScheduledNotice(Notice notice) {
        isLoading.setValue(true);
        noticeRepository.publishScheduledNotice(notice, new NoticeRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                isLoading.setValue(false);
                toastMessage.setValue("Notice published live.");
                loadScheduledNotices();
                loadNotices();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void deleteScheduledNotice(String noticeId) {
        noticeRepository.deleteScheduledNotice(noticeId, new NoticeRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                toastMessage.setValue("Scheduled notice deleted.");
                loadScheduledNotices();
            }

            @Override
            public void onError(String errorMessage) {
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void updateNotice(Notice notice) {
        isLoading.setValue(true);
        noticeRepository.updateNotice(notice, new NoticeRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                isLoading.setValue(false);
                toastMessage.setValue("Notice updated.");
                loadNotices();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void setNoticeStatus(String noticeId, String newStatus) {
        isLoading.setValue(true);
        noticeRepository.setNoticeStatus(noticeId, newStatus, new NoticeRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                isLoading.setValue(false);
                toastMessage.setValue("Notice status set to " + newStatus);
                loadNotices();
            }

            @Override
            public void onError(String errorMessage) {
                isLoading.setValue(false);
                toastMessage.setValue(errorMessage);
            }
        });
    }

    public void deleteNotice(String noticeId) {
        noticeRepository.deleteNotice(noticeId, new NoticeRepository.DataCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                toastMessage.setValue("Notice deleted.");
                loadNotices();
            }

            @Override
            public void onError(String errorMessage) {
                toastMessage.setValue(errorMessage);
            }
        });
    }
}
