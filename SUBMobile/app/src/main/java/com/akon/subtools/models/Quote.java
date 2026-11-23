package com.akon.subtools.models;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;

@Entity(tableName = "quotes")
public class Quote implements Serializable {
    @PrimaryKey(autoGenerate = true)
    private int id;

    @ColumnInfo(name = "quote_text")
    private String text;

    @ColumnInfo(name = "author")
    private String author;

    @ColumnInfo(name = "topic")
    private String topic;

    @ColumnInfo(name = "shown", defaultValue = "0")
    private boolean shown;

    public Quote() {}

    @androidx.room.Ignore
    public Quote(String text, String author, String topic) {
        this.text = text;
        this.author = author;
        this.topic = topic;
        this.shown = false;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public boolean isShown() { return shown; }
    public void setShown(boolean shown) { this.shown = shown; }
}
