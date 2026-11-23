package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.akon.subtools.models.Faculty;

import java.util.List;

@Dao
public interface FacultyDao {
    @Query("SELECT * FROM faculty WHERE department = :department")
    List<Faculty> getFacultyByDepartment(String department);

    @Query("SELECT * FROM faculty WHERE LOWER(department) = LOWER(:department) OR LOWER(department) = LOWER(:code) OR department LIKE '%' || :code || '%'")
    List<Faculty> getFacultyByDepartmentOrCode(String department, String code);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertFaculty(List<Faculty> facultyList);

    @Query("DELETE FROM faculty WHERE department = :department")
    void deleteFacultyByDepartment(String department);

    @Query("SELECT * FROM faculty")
    List<Faculty> getAllFaculty();

    @Query("DELETE FROM faculty")
    void clearAllFaculty();

    @Query("DELETE FROM faculty")
    void clearFaculty();
}
