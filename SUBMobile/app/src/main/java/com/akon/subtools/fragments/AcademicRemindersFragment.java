package com.akon.subtools.fragments;

import android.app.AlarmManager;
import android.app.DatePickerDialog;
import android.app.Dialog;
import android.app.PendingIntent;
import android.app.TimePickerDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.akon.subtools.R;
import com.akon.subtools.adapters.AcademicRemindersAdapter;
import com.akon.subtools.alarms.AcademicReminderReceiver;
import com.akon.subtools.models.AcademicReminder;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class AcademicRemindersFragment extends Fragment implements AcademicRemindersAdapter.ReminderActionListener {

    private static final String PREF_NAME = "subtools_academic_reminders_pref";
    private static final String KEY_REMINDERS = "reminders_json";

    private RecyclerView recyclerView;
    private AcademicRemindersAdapter adapter;
    private LinearLayout layoutEmpty;
    private FloatingActionButton fabAdd;

    private TextView filterAll, filterCt, filterQuiz, filterAssignment;
    private String activeFilter = "All";

    private final List<AcademicReminder> allReminders = new ArrayList<>();
    private final List<AcademicReminder> filteredReminders = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_academic_reminders, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        recyclerView = view.findViewById(R.id.recycler_academic_reminders);
        layoutEmpty = view.findViewById(R.id.layout_reminders_empty);
        fabAdd = view.findViewById(R.id.fab_add_reminder);

        filterAll = view.findViewById(R.id.filter_all);
        filterCt = view.findViewById(R.id.filter_ct);
        filterQuiz = view.findViewById(R.id.filter_quiz);
        filterAssignment = view.findViewById(R.id.filter_assignment);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new AcademicRemindersAdapter(this);
        recyclerView.setAdapter(adapter);

        setupFilters();
        loadReminders();

        fabAdd.setOnClickListener(v -> showAddReminderDialog());
    }

    private void setupFilters() {
        View.OnClickListener listener = v -> {
            int id = v.getId();
            if (id == R.id.filter_all) activeFilter = "All";
            else if (id == R.id.filter_ct) activeFilter = "Class Test";
            else if (id == R.id.filter_quiz) activeFilter = "Quiz Test";
            else if (id == R.id.filter_assignment) activeFilter = "Assignment";

            updateFilterPillsUI();
            applyFilter();
        };

        filterAll.setOnClickListener(listener);
        filterCt.setOnClickListener(listener);
        filterQuiz.setOnClickListener(listener);
        filterAssignment.setOnClickListener(listener);
    }

    private void updateFilterPillsUI() {
        resetPill(filterAll);
        resetPill(filterCt);
        resetPill(filterQuiz);
        resetPill(filterAssignment);

        if ("All".equals(activeFilter)) highlightPill(filterAll);
        else if ("Class Test".equals(activeFilter)) highlightPill(filterCt);
        else if ("Quiz Test".equals(activeFilter)) highlightPill(filterQuiz);
        else if ("Assignment".equals(activeFilter)) highlightPill(filterAssignment);
    }

    private void highlightPill(TextView tv) {
        tv.setBackgroundTintList(ContextCompat.getColorStateList(requireContext(), R.color.primary));
        tv.setTextColor(0xFFFFFFFF);
    }

    private void resetPill(TextView tv) {
        tv.setBackgroundTintList(ContextCompat.getColorStateList(requireContext(), R.color.card_light));
        tv.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_primary_light));
    }

    private void loadReminders() {
        allReminders.clear();
        SharedPreferences prefs = requireContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String json = prefs.getString(KEY_REMINDERS, "[]");

        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                AcademicReminder r = new AcademicReminder();
                r.setId(obj.optString("id", "r-" + i));
                r.setType(obj.optString("type", "Class Test"));
                r.setCourseCode(obj.optString("courseCode", ""));
                r.setTitle(obj.optString("title", ""));
                r.setDueDate(obj.optString("dueDate", ""));
                r.setDueTime(obj.optString("dueTime", ""));
                r.setDueTimestampMs(obj.optLong("dueTimestampMs", 0));
                r.setCompleted(obj.optBoolean("completed", false));
                allReminders.add(r);
            }
        } catch (Exception ignored) {}

        applyFilter();
    }

    private void saveReminders() {
        SharedPreferences prefs = requireContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        JSONArray arr = new JSONArray();
        for (AcademicReminder r : allReminders) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", r.getId());
                obj.put("type", r.getType());
                obj.put("courseCode", r.getCourseCode());
                obj.put("title", r.getTitle());
                obj.put("dueDate", r.getDueDate());
                obj.put("dueTime", r.getDueTime());
                obj.put("dueTimestampMs", r.getDueTimestampMs());
                obj.put("completed", r.isCompleted());
                arr.put(obj);
            } catch (Exception ignored) {}
        }
        prefs.edit().putString(KEY_REMINDERS, arr.toString()).apply();
    }

    private void applyFilter() {
        filteredReminders.clear();
        for (AcademicReminder r : allReminders) {
            if ("All".equals(activeFilter) || r.getType().equalsIgnoreCase(activeFilter)) {
                filteredReminders.add(r);
            }
        }
        adapter.setReminders(filteredReminders);
        layoutEmpty.setVisibility(filteredReminders.isEmpty() ? View.VISIBLE : View.GONE);
    }

    private void showAddReminderDialog() {
        Dialog dialog = new Dialog(requireContext());
        dialog.setContentView(R.layout.dialog_add_academic_reminder);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
            dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }

        Spinner spinnerType = dialog.findViewById(R.id.spinner_reminder_type);
        EditText etCourse = dialog.findViewById(R.id.et_reminder_course);
        EditText etTitle = dialog.findViewById(R.id.et_reminder_title);
        TextView btnPickDate = dialog.findViewById(R.id.btn_pick_date);
        TextView btnPickTime = dialog.findViewById(R.id.btn_pick_time);
        Button btnCancel = dialog.findViewById(R.id.btn_cancel_reminder);
        Button btnSave = dialog.findViewById(R.id.btn_save_reminder);

        String[] types = {"Class Test", "Quiz Test", "Assignment"};
        ArrayAdapter<String> typeAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, types);
        typeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerType.setAdapter(typeAdapter);

        final Calendar calendar = Calendar.getInstance();
        final String[] pickedDate = {""};
        final String[] pickedTime = {""};

        btnPickDate.setOnClickListener(v -> {
            DatePickerDialog dp = new DatePickerDialog(requireContext(), (view, year, month, dayOfMonth) -> {
                calendar.set(Calendar.YEAR, year);
                calendar.set(Calendar.MONTH, month);
                calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
                pickedDate[0] = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(calendar.getTime());
                btnPickDate.setText("📅 " + pickedDate[0]);
            }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH));
            dp.show();
        });

        btnPickTime.setOnClickListener(v -> {
            TimePickerDialog tp = new TimePickerDialog(requireContext(), (view, hourOfDay, minute) -> {
                calendar.set(Calendar.HOUR_OF_DAY, hourOfDay);
                calendar.set(Calendar.MINUTE, minute);
                pickedTime[0] = String.format(Locale.US, "%02d:%02d", hourOfDay, minute);
                btnPickTime.setText("⏰ " + pickedTime[0]);
            }, calendar.get(Calendar.HOUR_OF_DAY), calendar.get(Calendar.MINUTE), true);
            tp.show();
        });

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String course = etCourse.getText().toString().trim();
            String title = etTitle.getText().toString().trim();
            String type = spinnerType.getSelectedItem().toString();

            if (course.isEmpty() || title.isEmpty() || pickedDate[0].isEmpty()) {
                Toast.makeText(requireContext(), "Please fill in Course, Title, and Date", Toast.LENGTH_SHORT).show();
                return;
            }

            String timeStr = pickedTime[0].isEmpty() ? "10:00 AM" : pickedTime[0];
            String id = "reminder-" + System.currentTimeMillis();
            long dueMs = calendar.getTimeInMillis();

            AcademicReminder reminder = new AcademicReminder(id, type, course, title, pickedDate[0], timeStr, dueMs, "");
            allReminders.add(0, reminder);
            saveReminders();
            applyFilter();

            scheduleLocalReminderAlarm(reminder);
            dialog.dismiss();
            Toast.makeText(requireContext(), "Reminder scheduled!", Toast.LENGTH_SHORT).show();
        });

        dialog.show();
    }

    private void scheduleLocalReminderAlarm(AcademicReminder reminder) {
        if (getContext() == null || reminder.getDueTimestampMs() <= System.currentTimeMillis()) return;

        AlarmManager am = (AlarmManager) requireContext().getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(requireContext(), AcademicReminderReceiver.class);
        intent.putExtra("type", reminder.getType());
        intent.putExtra("title", reminder.getTitle());
        intent.putExtra("courseCode", reminder.getCourseCode());
        intent.putExtra("dueTime", reminder.getDueDate() + " " + reminder.getDueTime());

        int reqCode = reminder.getId().hashCode();
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pi = PendingIntent.getBroadcast(requireContext(), reqCode, intent, flags);

        // Alert 1 hour before due time or at due time
        long triggerMs = Math.max(System.currentTimeMillis() + 5000, reminder.getDueTimestampMs() - (60 * 60 * 1000L));

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerMs, pi);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onToggleCompleted(AcademicReminder reminder, boolean isDone) {
        reminder.setCompleted(isDone);
        saveReminders();
        adapter.notifyDataSetChanged();
    }

    @Override
    public void onDelete(AcademicReminder reminder) {
        allReminders.remove(reminder);
        saveReminders();
        applyFilter();
        Toast.makeText(requireContext(), "Reminder deleted", Toast.LENGTH_SHORT).show();
    }
}
