package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import com.akon.subtools.models.Bus;
import java.util.List;

@Dao
public interface BusDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertBuses(List<Bus> buses);

    @Query("SELECT * FROM buses")
    List<Bus> getAllBuses();

    @Query("DELETE FROM buses")
    void clearBuses();
}
