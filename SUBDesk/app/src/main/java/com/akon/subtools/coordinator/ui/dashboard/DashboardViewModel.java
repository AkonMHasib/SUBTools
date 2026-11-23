package com.akon.subtools.coordinator.ui.dashboard;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.akon.subtools.coordinator.data.model.BusRoute;
import com.akon.subtools.coordinator.data.model.ClassRoutine;
import com.akon.subtools.coordinator.data.repository.NoticeRepository;
import com.akon.subtools.coordinator.data.repository.RoutineRepository;
import com.akon.subtools.coordinator.data.repository.SessionManager;
import com.akon.subtools.coordinator.data.repository.StudentRepository;
import com.akon.subtools.coordinator.utils.AppCache;
import com.akon.subtools.coordinator.utils.DepartmentUtils;
import com.akon.subtools.coordinator.utils.GpsReminderUtils;
import com.akon.subtools.coordinator.utils.SupabaseAuthBridge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class DashboardViewModel extends AndroidViewModel {

    private final StudentRepository studentRepository;
    private final RoutineRepository routineRepository;
    private final NoticeRepository noticeRepository;
    private final SessionManager sessionManager;

    private final MutableLiveData<Integer> activeStudentsCount = new MutableLiveData<>(0);
    private final MutableLiveData<Integer> todayLecturesCount = new MutableLiveData<>(0);
    private final MutableLiveData<Integer> weeklyLecturesCount = new MutableLiveData<>(0);
    private final MutableLiveData<Integer> activeNoticesCount = new MutableLiveData<>(0);
    private final MutableLiveData<List<ClassRoutine>> todayClassesLiveData = new MutableLiveData<>(new ArrayList<>());

    private final MutableLiveData<String> modUsersTotal = new MutableLiveData<>("0");
    private final MutableLiveData<String> modUsersDept = new MutableLiveData<>("—");

    private final MutableLiveData<String> modFacultyTotal = new MutableLiveData<>("0");
    private final MutableLiveData<String> modFacultyDept = new MutableLiveData<>("—");

    private final MutableLiveData<String> modSubjectsTotal = new MutableLiveData<>("0");
    private final MutableLiveData<String> modSubjectsDept = new MutableLiveData<>("—");

    private final MutableLiveData<String> modCoverPagesTotal = new MutableLiveData<>("0");
    private final MutableLiveData<String> modCoverPagesDept = new MutableLiveData<>("—");

    private final MutableLiveData<String> modTransportsTotal = new MutableLiveData<>("0");
    private final MutableLiveData<String> modTransportsExpired = new MutableLiveData<>("0 expired");
    private final MutableLiveData<String> modNoticesTotal = new MutableLiveData<>("0");
    private final MutableLiveData<String> modNoticesDept = new MutableLiveData<>("—");
    private final MutableLiveData<String> gpsExpiryAlert = new MutableLiveData<>("");

    public DashboardViewModel(@NonNull Application application) {
        super(application);
        studentRepository = new StudentRepository();
        routineRepository = new RoutineRepository();
        noticeRepository = new NoticeRepository();
        sessionManager = new SessionManager(application);
    }

    public LiveData<Integer> getActiveStudentsCount() { return activeStudentsCount; }
    public LiveData<Integer> getTodayLecturesCount() { return todayLecturesCount; }
    public LiveData<Integer> getWeeklyLecturesCount() { return weeklyLecturesCount; }
    public LiveData<Integer> getActiveNoticesCount() { return activeNoticesCount; }
    public LiveData<List<ClassRoutine>> getTodayClassesLiveData() { return todayClassesLiveData; }

    public LiveData<String> getModUsersTotal() { return modUsersTotal; }
    public LiveData<String> getModUsersDept() { return modUsersDept; }
    public LiveData<String> getModFacultyTotal() { return modFacultyTotal; }
    public LiveData<String> getModFacultyDept() { return modFacultyDept; }
    public LiveData<String> getModSubjectsTotal() { return modSubjectsTotal; }
    public LiveData<String> getModSubjectsDept() { return modSubjectsDept; }
    public LiveData<String> getModCoverPagesTotal() { return modCoverPagesTotal; }
    public LiveData<String> getModCoverPagesDept() { return modCoverPagesDept; }
    public LiveData<String> getModTransportsTotal() { return modTransportsTotal; }
    public LiveData<String> getModTransportsExpired() { return modTransportsExpired; }
    public LiveData<String> getModNoticesTotal() { return modNoticesTotal; }
    public LiveData<String> getModNoticesDept() { return modNoticesDept; }
    public LiveData<String> getGpsExpiryAlert() { return gpsExpiryAlert; }

    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);

    public LiveData<Boolean> getIsLoading() { return isLoading; }

    public String getCoordinatorName() { return sessionManager.getName(); }
    public String getDepartment() { return sessionManager.getDepartment(); }
    public String getDisplayRole() { return sessionManager.getDisplayRoleName(); }

    private java.util.concurrent.atomic.AtomicInteger pendingRequests = new java.util.concurrent.atomic.AtomicInteger(0);

    private void checkLoadingDone() {
        if (pendingRequests.decrementAndGet() <= 0) {
            isLoading.postValue(false);
        }
    }

    public void loadDashboardMetrics() {
        loadDashboardMetrics(false);
    }

    public void loadDashboardMetrics(boolean forceRefresh) {
        isLoading.setValue(true);
        String dept = sessionManager.getDepartment();
        loadModeratorMetrics(dept);
    }

    private void loadModeratorMetrics(String dept) {
        String cleanDept = dept != null && !dept.trim().isEmpty() ? dept.trim() : "CSE";
        if ("GENERAL".equalsIgnoreCase(cleanDept) || "ALL".equalsIgnoreCase(cleanDept) || "ALL DEPARTMENTS".equalsIgnoreCase(cleanDept)) {
            cleanDept = "CSE";
        }
        String fullDeptName = DepartmentUtils.getDepartmentFullName(cleanDept);
        String targetCode = DepartmentUtils.getDepartmentCode(cleanDept);

        pendingRequests.set(6);

        loadDepartmentMetric("users", targetCode, fullDeptName, modUsersTotal, modUsersDept);
        loadDepartmentMetric("faculty", targetCode, fullDeptName, modFacultyTotal, modFacultyDept);
        loadDepartmentMetric("subjects", targetCode, fullDeptName, modSubjectsTotal, modSubjectsDept);
        loadDepartmentMetric("notices", targetCode, fullDeptName, modNoticesTotal, modNoticesDept);

        SupabaseAuthBridge.getCoverPageCounts(targetCode, supabaseCounts -> {
            int total = supabaseCounts[0];
            modCoverPagesTotal.setValue(String.valueOf(total));
            modCoverPagesDept.setValue(String.valueOf(supabaseCounts[1]));
            checkLoadingDone();
        });

        SupabaseAuthBridge.queryTable("buses", "select=*&order=name.asc", new SupabaseAuthBridge.SupabaseCallback() {
            @Override
            public void onSuccess(String response) {
                int activeBusCount = 0;
                int gpsDueCount = 0;
                int gpsExpiredCount = 0;
                try {
                    JSONArray arr = new JSONArray(response);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject doc = arr.getJSONObject(i);
                        boolean isDeleted = doc.optBoolean("deleted", doc.optBoolean("isDeleted", false));
                        String status = doc.optString("status", "");
                        if (isDeleted || "deleted".equalsIgnoreCase(status) || "inactive".equalsIgnoreCase(status)) {
                            continue;
                        }
                        activeBusCount++;
                        BusRoute route = BusRoute.fromJson(doc);
                        GpsReminderUtils.ReminderStatus gpsStatus = GpsReminderUtils.getStatus(route);
                        if (gpsStatus.isDue) gpsDueCount++;
                        if (gpsStatus.isOverdue) gpsExpiredCount++;
                    }
                    modTransportsTotal.setValue(String.valueOf(activeBusCount));
                    modTransportsExpired.setValue(gpsExpiredCount + " expired");
                    gpsExpiryAlert.setValue(gpsDueCount > 0
                            ? gpsDueCount + (gpsDueCount == 1 ? " bus GPS link needs renewal." : " bus GPS links need renewal.")
                            : "");
                    AppCache.put("mod_buses_count", activeBusCount, AppCache.TTL_SHORT);
                } catch (Exception e) {
                    Integer cached = AppCache.get("mod_buses_count", Integer.class);
                    if (cached != null) {
                        modTransportsTotal.setValue(String.valueOf(cached));
                    }
                } finally {
                    checkLoadingDone();
                }
            }

            @Override
            public void onError(String errorMessage) {
                Integer cached = AppCache.get("mod_buses_count", Integer.class);
                if (cached != null) {
                    modTransportsTotal.setValue(String.valueOf(cached));
                }
                checkLoadingDone();
            }
        });
    }

    private void loadDepartmentMetric(
            String table,
            String targetDeptCode,
            String fullDepartmentName,
            MutableLiveData<String> totalTarget,
            MutableLiveData<String> departmentTarget
    ) {
        SupabaseAuthBridge.getTableDepartmentCounts(table, targetDeptCode, counts -> {
            int total = counts[0];
            int deptCount = counts[1];
            totalTarget.setValue(String.valueOf(total));
            departmentTarget.setValue(String.valueOf(deptCount));
            checkLoadingDone();
        });
    }
}
