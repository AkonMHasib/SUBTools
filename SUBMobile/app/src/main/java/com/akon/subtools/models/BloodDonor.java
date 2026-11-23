package com.akon.subtools.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.Ignore;
import androidx.room.PrimaryKey;

import java.io.Serializable;

@Entity(tableName = "blood_donors")
public class BloodDonor implements Serializable {

    @PrimaryKey
    @NonNull
    private String uid = "";

    private String name;
    private String email;
    private String department;
    private String batch;
    private String phone;
    private String bloodGroup;
    private boolean allowBloodDonation;
    private String location;

    /**
     * Required by Room and Firebase
     */
    public BloodDonor() {
    }

    /**
     * Convenience constructor for creating objects manually.
     * Ignored by Room.
     */
    @Ignore
    public BloodDonor(
            @NonNull String uid,
            String name,
            String email,
            String department,
            String batch,
            String phone,
            String bloodGroup,
            boolean allowBloodDonation,
            String location
    ) {
        this.uid = uid;
        this.name = name;
        this.email = email;
        this.department = department;
        this.batch = batch;
        this.phone = phone;
        this.bloodGroup = bloodGroup;
        this.allowBloodDonation = allowBloodDonation;
        this.location = location;
    }

    @NonNull
    public String getUid() {
        return uid;
    }

    public void setUid(@NonNull String uid) {
        this.uid = uid;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getBatch() {
        return batch;
    }

    public void setBatch(String batch) {
        this.batch = batch;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getBloodGroup() {
        return bloodGroup;
    }

    public void setBloodGroup(String bloodGroup) {
        this.bloodGroup = bloodGroup;
    }

    public boolean isAllowBloodDonation() {
        return allowBloodDonation;
    }

    public void setAllowBloodDonation(boolean allowBloodDonation) {
        this.allowBloodDonation = allowBloodDonation;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }
}