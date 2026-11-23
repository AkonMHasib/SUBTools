package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import com.akon.subtools.models.Route;
import java.util.List;

@Dao
public interface RouteDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertRoutes(List<Route> routes);

    @Query("SELECT * FROM routes")
    List<Route> getAllRoutes();

    @Query("DELETE FROM routes")
    void clearRoutes();
}
