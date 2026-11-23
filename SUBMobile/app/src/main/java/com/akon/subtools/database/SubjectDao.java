package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import com.akon.subtools.models.Subject;
import java.util.List;

@Dao
public interface SubjectDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertSubjects(List<Subject> subjects);

    @Query("SELECT * FROM subjects")
    List<Subject> getAllSubjects();

    @Query("DELETE FROM subjects")
    void clearSubjects();
}
