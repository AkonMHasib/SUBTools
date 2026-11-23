package com.akon.subtools.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.akon.subtools.models.Quote;

import java.util.List;

@Dao
public interface QuoteDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertQuote(Quote quote);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<Quote> quotes);

    /** Returns a random quote that has NOT been shown yet. */
    @Query("SELECT * FROM quotes WHERE shown = 0 ORDER BY RANDOM() LIMIT 1")
    Quote getNextUnshownQuote();

    /** Marks a specific quote as shown so it won't appear again. */
    @Query("UPDATE quotes SET shown = 1 WHERE id = :quoteId")
    void markAsShown(int quoteId);

    /** Resets all quotes so the cycle can begin again. */
    @Query("UPDATE quotes SET shown = 0")
    void resetAllShown();

    @Query("DELETE FROM quotes")
    void deleteAll();

    /** How many unshown quotes remain. */
    @Query("SELECT COUNT(*) FROM quotes WHERE shown = 0")
    int getUnshownCount();

    @Query("SELECT * FROM quotes ORDER BY RANDOM() LIMIT 1")
    Quote getRandomQuote();

    @Query("SELECT * FROM quotes WHERE LOWER(topic) = LOWER(:topic) ORDER BY RANDOM()")
    List<Quote> getQuotesByTopic(String topic);

    @Query("SELECT * FROM quotes")
    List<Quote> getAllQuotes();

    @Query("SELECT COUNT(*) FROM quotes")
    int getQuoteCount();
}
