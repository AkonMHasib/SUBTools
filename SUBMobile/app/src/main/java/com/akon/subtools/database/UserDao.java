package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import com.akon.subtools.models.User;

@Dao
public interface UserDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertUser(User user);

    @Query("SELECT * FROM users LIMIT 1")
    User getUser();

    @Query("SELECT * FROM users WHERE uid = :uid LIMIT 1")
    User getUserById(String uid);

    @Query("DELETE FROM users")
    void clearUser();
}
