package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.akon.subtools.models.CacheMetadata;

import java.util.List;

@Dao
public interface CacheMetadataDao {

    @Query("SELECT * FROM cache_metadata WHERE cache_key = :cacheKey LIMIT 1")
    CacheMetadata getMetadata(String cacheKey);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertMetadata(CacheMetadata metadata);

    @Query("DELETE FROM cache_metadata WHERE cache_key = :cacheKey")
    void deleteMetadata(String cacheKey);

    @Query("DELETE FROM cache_metadata")
    void clearAllMetadata();

    @Query("SELECT * FROM cache_metadata")
    List<CacheMetadata> getAllMetadata();
}
