package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import com.akon.subtools.models.BloodDonor;
import java.util.List;

@Dao
public interface BloodDonorDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<BloodDonor> donors);

    @Query("SELECT * FROM blood_donors")
    List<BloodDonor> getAllDonors();

    @Query("DELETE FROM blood_donors")
    void clearAll();
}
