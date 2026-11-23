package com.akon.subtools.utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CityHelper {

    public static final String[] CITIES = {"Dhaka", "Gazipur", "Mymensingh", "Narayanganj", "Narsingdi"};

    public static final String[] DHAKA_AREAS = {
        "Adabor", "Badda", "Bangshal", "Cantonment", "Chawkbazar", "Dakshinkhan",
        "Darus Salam", "Demra", "Dhanmondi", "Gendaria", "Gulshan", "Hazaribagh",
        "Jatrabari", "Kadamtali", "Kafrul", "Kalabagan", "Kamrangirchar", "Khilgaon",
        "Khilkhet", "Kotwali", "Lalbagh", "Mirpur", "Mohammadpur", "Motijheel",
        "New Market", "Pallabi", "Paltan", "Ramna", "Rampura", "Sabujbagh",
        "Shah Ali", "Shahbagh", "Sher-e-Bangla Nagar", "Shyampur", "Sutrapur",
        "Tejgaon", "Tejgaon Industrial Area", "Turag", "Uttara", "Uttara East",
        "Uttara West", "Uttarkhan", "Vatara", "Wari", "Ashulia", "Savar",
        "Dhamrai", "Keraniganj", "South Keraniganj", "Dohar", "Nawabganj", "Purbachal"
    };

    public static final String[] GAZIPUR_AREAS = {
        "Gazipur Sadar", "Tongi", "Joydebpur", "Gacha", "Basan", "Kashimpur",
        "Konabari", "Board Bazar", "Gazipur Chowrasta", "Pubail", "Kaliakair",
        "Kaliganj", "Kapasia", "Sreepur", "Mawna", "Rajendrapur"
    };

    public static final String[] MYMENSINGH_AREAS = {
        "Mymensingh Sadar", "Bhaluka", "Dhobaura", "Fulbaria", "Gafargaon",
        "Gouripur", "Haluaghat", "Ishwarganj", "Muktagacha", "Nandail",
        "Phulpur", "Tarakanda", "Trishal"
    };

    public static final String[] NARAYANGANJ_AREAS = {
        "Narayanganj Sadar", "Chashara", "Fatullah", "Siddhirganj", "Bandar",
        "Rupganj", "Sonargaon", "Araihazar", "Signboard", "Kanchpur", "Madanpur",
        "Bhulta", "Murapara", "Pagla", "Adamjee", "Shimrail", "Mograpara", "Bhoberchar"
    };

    public static final String[] NARSINGDI_AREAS = {
        "Narsingdi Sadar", "Madhabdi", "Belabo", "Monohardi", "Palash",
        "Raipura", "Shibpur", "Ghorashal", "Char Sindur", "Velanagar", "Panchdona"
    };

    private static final Map<String, String[]> CITY_AREAS_MAP = new HashMap<>();

    static {
        CITY_AREAS_MAP.put("Dhaka", DHAKA_AREAS);
        CITY_AREAS_MAP.put("Gazipur", GAZIPUR_AREAS);
        CITY_AREAS_MAP.put("Mymensingh", MYMENSINGH_AREAS);
        CITY_AREAS_MAP.put("Narayanganj", NARAYANGANJ_AREAS);
        CITY_AREAS_MAP.put("Narsingdi", NARSINGDI_AREAS);
    }

    public static String[] getCities() {
        return CITIES;
    }

    public static String[] getAreasForCity(String city) {
        if (city == null) return new String[0];
        String[] areas = CITY_AREAS_MAP.get(city.trim());
        return areas != null ? areas : new String[0];
    }

    public static List<String> getAllAreasCombined() {
        List<String> all = new ArrayList<>();
        for (String[] areas : CITY_AREAS_MAP.values()) {
            all.addAll(Arrays.asList(areas));
        }
        Collections.sort(all);
        return all;
    }
}
