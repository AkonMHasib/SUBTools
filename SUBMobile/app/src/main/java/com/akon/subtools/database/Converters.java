package com.akon.subtools.database;

import androidx.room.TypeConverter;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class Converters {
    private static final Gson gson = new Gson();

    @TypeConverter
    public static List<String> fromString(String value) {
        if (value == null) {
            return new ArrayList<>();
        }
        Type listType = new TypeToken<List<String>>() {}.getType();
        return gson.fromJson(value, listType);
    }

    @TypeConverter
    public static String fromList(List<String> list) {
        if (list == null) {
            return gson.toJson(new ArrayList<String>());
        }
        return gson.toJson(list);
    }

    @TypeConverter
    public static java.util.Map<String, String> mapFromString(String value) {
        if (value == null) {
            return new java.util.HashMap<>();
        }
        Type mapType = new TypeToken<java.util.Map<String, String>>() {}.getType();
        return gson.fromJson(value, mapType);
    }

    @TypeConverter
    public static String fromMap(java.util.Map<String, String> map) {
        if (map == null) {
            return gson.toJson(new java.util.HashMap<String, String>());
        }
        return gson.toJson(map);
    }
}
