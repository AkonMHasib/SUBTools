package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import com.akon.subtools.models.Notice;
import java.util.List;

@Dao
public interface NoticeDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertNotices(List<Notice> notices);

    @Query("SELECT * FROM notices")
    List<Notice> getAllNotices();

    @Query("SELECT * FROM notices")
    androidx.lifecycle.LiveData<List<Notice>> getAllNoticesLive();

    @Query("DELETE FROM notices")
    void clearNotices();
}
