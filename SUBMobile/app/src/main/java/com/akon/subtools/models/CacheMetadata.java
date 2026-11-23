package com.akon.subtools.models;

import androidx.annotation.NonNull;
import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;

@Entity(tableName = "cache_metadata")
public class CacheMetadata implements Serializable {

    @PrimaryKey
    @NonNull
    @ColumnInfo(name = "cache_key")
    private String cacheKey;

    @ColumnInfo(name = "last_updated")
    private long lastUpdated;

    @ColumnInfo(name = "expires_at")
    private long expiresAt;

    @ColumnInfo(name = "version")
    private int version;

    @ColumnInfo(name = "data_hash")
    private String dataHash;

    public CacheMetadata() {
        this.cacheKey = "";
    }

    @androidx.room.Ignore
    public CacheMetadata(@NonNull String cacheKey, long lastUpdated, long expiresAt, int version, String dataHash) {
        this.cacheKey = cacheKey;
        this.lastUpdated = lastUpdated;
        this.expiresAt = expiresAt;
        this.version = version;
        this.dataHash = dataHash;
    }

    @NonNull
    public String getCacheKey() { return cacheKey; }
    public void setCacheKey(@NonNull String cacheKey) { this.cacheKey = cacheKey; }

    public long getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(long lastUpdated) { this.lastUpdated = lastUpdated; }

    public long getExpiresAt() { return expiresAt; }
    public void setExpiresAt(long expiresAt) { this.expiresAt = expiresAt; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getDataHash() { return dataHash; }
    public void setDataHash(String dataHash) { this.dataHash = dataHash; }
}
