package com.akon.subtools.cache;

import android.content.Context;

import com.akon.subtools.database.AppDatabase;
import com.akon.subtools.models.Bus;
import com.akon.subtools.models.Faculty;
import com.akon.subtools.models.Notice;
import com.akon.subtools.models.Route;
import com.akon.subtools.models.Routine;
import com.akon.subtools.models.Subject;
import com.akon.subtools.models.User;

import java.security.MessageDigest;
import java.util.List;
import java.util.concurrent.ExecutorService;

public class RoomRepository {
    private static volatile RoomRepository INSTANCE;
    private final AppDatabase database;
    private final ExecutorService executor;

    private RoomRepository(Context context) {
        this.database = AppDatabase.getDatabase(context.getApplicationContext());
        this.executor = AppDatabase.databaseWriteExecutor;
    }

    public static RoomRepository getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (RoomRepository.class) {
                if (INSTANCE == null) {
                    INSTANCE = new RoomRepository(context);
                }
            }
        }
        return INSTANCE;
    }

    public AppDatabase getDatabase() {
        return database;
    }

    public interface DataCallback<T> {
        void onLoaded(T data);
    }

    // --- USER PROFILE ---
    public void getUserProfile(String uid, DataCallback<User> callback) {
        executor.execute(() -> {
            User user = database.userDao().getUserById(uid);
            if (callback != null) callback.onLoaded(user);
        });
    }

    public void saveUserProfile(User user, Runnable onComplete) {
        executor.execute(() -> {
            if (user != null) {
                database.userDao().insertUser(user);
            }
            if (onComplete != null) onComplete.run();
        });
    }

    // --- NOTICES ---
    public void getNotices(DataCallback<List<Notice>> callback) {
        executor.execute(() -> {
            List<Notice> notices = database.noticeDao().getAllNotices();
            if (callback != null) callback.onLoaded(notices);
        });
    }

    public void saveNotices(List<Notice> notices, Runnable onComplete) {
        executor.execute(() -> {
            database.noticeDao().clearNotices();
            if (notices != null && !notices.isEmpty()) {
                database.noticeDao().insertNotices(notices);
            }
            if (onComplete != null) onComplete.run();
        });
    }

    // --- ROUTINE ---
    public void getRoutines(DataCallback<List<Routine>> callback) {
        executor.execute(() -> {
            List<Routine> routines = database.routineDao().getAllRoutines();
            if (callback != null) callback.onLoaded(routines);
        });
    }

    public void saveRoutines(List<Routine> routines, Runnable onComplete) {
        executor.execute(() -> {
            database.routineDao().clearRoutines();
            if (routines != null && !routines.isEmpty()) {
                database.routineDao().insertRoutines(routines);
            }
            if (onComplete != null) onComplete.run();
        });
    }

    // --- FACULTY ---
    public void getFaculty(String department, DataCallback<List<Faculty>> callback) {
        executor.execute(() -> {
            List<Faculty> facultyList;
            if (department != null && !department.trim().isEmpty() && !"All".equalsIgnoreCase(department.trim())) {
                String code = com.akon.subtools.utils.DepartmentHelper.getDeptCode(department);
                String fullName = com.akon.subtools.utils.DepartmentHelper.getFullDepartmentName(department);
                facultyList = database.facultyDao().getFacultyByDepartmentOrCode(fullName, code);
            } else {
                facultyList = database.facultyDao().getAllFaculty();
            }
            if (callback != null) callback.onLoaded(facultyList);
        });
    }

    public void saveFaculty(String department, List<Faculty> facultyList, Runnable onComplete) {
        executor.execute(() -> {
            if (department != null && !department.trim().isEmpty()) {
                database.facultyDao().deleteFacultyByDepartment(department);
            } else {
                database.facultyDao().clearFaculty();
            }
            if (facultyList != null && !facultyList.isEmpty()) {
                database.facultyDao().insertFaculty(facultyList);
            }
            if (onComplete != null) onComplete.run();
        });
    }

    // --- SUBJECTS ---
    public void getSubjects(DataCallback<List<Subject>> callback) {
        executor.execute(() -> {
            List<Subject> subjects = database.subjectDao().getAllSubjects();
            if (callback != null) callback.onLoaded(subjects);
        });
    }

    public void saveSubjects(List<Subject> subjects, Runnable onComplete) {
        executor.execute(() -> {
            database.subjectDao().clearSubjects();
            if (subjects != null && !subjects.isEmpty()) {
                database.subjectDao().insertSubjects(subjects);
            }
            if (onComplete != null) onComplete.run();
        });
    }

    // --- BUSES & ROUTES ---
    public void getBuses(DataCallback<List<Bus>> callback) {
        executor.execute(() -> {
            List<Bus> buses = database.busDao().getAllBuses();
            if (callback != null) callback.onLoaded(buses);
        });
    }

    public void saveBuses(List<Bus> buses, Runnable onComplete) {
        executor.execute(() -> {
            database.busDao().clearBuses();
            if (buses != null && !buses.isEmpty()) {
                database.busDao().insertBuses(buses);
            }
            if (onComplete != null) onComplete.run();
        });
    }

    public void getRoutes(DataCallback<List<Route>> callback) {
        executor.execute(() -> {
            List<Route> routes = database.routeDao().getAllRoutes();
            if (callback != null) callback.onLoaded(routes);
        });
    }

    public void saveRoutes(List<Route> routes, Runnable onComplete) {
        executor.execute(() -> {
            database.routeDao().clearRoutes();
            if (routes != null && !routes.isEmpty()) {
                database.routeDao().insertRoutes(routes);
            }
            if (onComplete != null) onComplete.run();
        });
    }

    // --- CHECKSUM HASH UTILITY ---
    public static String computeHash(String input) {
        if (input == null) return "";
        try {
            MessageDigest digest = MessageDigest.getInstance("MD5");
            byte[] bytes = digest.digest(input.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(input.hashCode());
        }
    }
}
