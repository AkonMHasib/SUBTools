package com.akon.subtools.coordinator.utils;

import android.util.Patterns;

public class ValidationUtils {

    public static boolean isValidEmail(String email) {
        return email != null && !email.trim().isEmpty() && Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches();
    }

    public static boolean isValidCourseCode(String code) {
        if (code == null || code.trim().isEmpty()) return false;
        // e.g. CSE-301, ARCH-101, ENG-202, CSE 301
        return code.trim().matches("^[A-Za-z]{2,5}[\\-\\s]?\\d{3,4}[A-Za-z]?$");
    }

    public static boolean isNotEmpty(String text) {
        return text != null && !text.trim().isEmpty();
    }
}
