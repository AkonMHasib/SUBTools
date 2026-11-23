package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import com.akon.subtools.models.Routine;
import java.util.List;

@Dao
public interface RoutineDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertRoutines(List<Routine> routines);

    @Query("SELECT * FROM routines")
    List<Routine> getAllRoutines();

    @Query("SELECT * FROM routines")
    androidx.lifecycle.LiveData<List<Routine>> getAllRoutinesLive();

    @Query("DELETE FROM routines")
    void clearRoutines();
}
