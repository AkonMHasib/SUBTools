package com.akon.subtools.coordinator.utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LocationData {
    private static final Map<String, List<String>> cityAreaMap = new HashMap<>();

    static {
        cityAreaMap.put("Dhaka", Arrays.asList(
                "Dhanmondi", "Gulshan", "Banani", "Mirpur", "Uttara", "Mohakhali",
                "Badda", "Bashundhara", "Mohammadpur", "Tejgaon", "Khilgaon", "Jatrabari",
                "Farmgate", "Rampura", "Savar", "Dhamrai", "Keraniganj", "Motijheel"
        ));

        cityAreaMap.put("Gazipur", Arrays.asList(
                "Tongi", "Board Bazar", "Chowrasta", "Gazipur Sadar", "Kaliakair",
                "Kapasia", "Sreepur", "Kaliganj"
        ));

        cityAreaMap.put("Narayanganj", Arrays.asList(
                "Chashara", "Narayanganj Sadar", "Siddhirganj", "Fatullah", "Bandar",
                "Araihazar", "Sonargaon"
        ));

        cityAreaMap.put("Narsingdi", Arrays.asList(
                "Narsingdi Sadar", "Palash", "Shibpur", "Belabo", "Monohardi", "Raipura"
        ));

        cityAreaMap.put("Chattogram", Arrays.asList(
                "Agrabad", "GEC Circle", "Halishahar", "Nasirabad", "Patenga",
                "Panchlaish", "Kotwali", "Hathazari", "Sitakunda"
        ));

        cityAreaMap.put("Sylhet", Arrays.asList(
                "Zindabazar", "Ambarkhana", "Chowhatta", "Subidbazar", "Sylhet Sadar",
                "Beanibazar", "Golapganj"
        ));

        cityAreaMap.put("Rajshahi", Arrays.asList(
                "Saheb Bazar", "Motihar", "Boalia", "Rajpara", "Chandrima", "Paba"
        ));

        cityAreaMap.put("Khulna", Arrays.asList(
                "Sonadanga", "Boyra", "Khalishpur", "Daulatpur", "Khulna Sadar"
        ));

        cityAreaMap.put("Barishal", Arrays.asList(
                "Sadarchar", "Nathullabad", "Rupatali", "Barishal Sadar"
        ));

        cityAreaMap.put("Rangpur", Arrays.asList(
                "Jahaj Company Mode", "Dhap", "Modern Mode", "Rangpur Sadar"
        ));

        cityAreaMap.put("Mymensingh", Arrays.asList(
                "Town Hall", "Ganginarpar", "Charpara", "Mymensingh Sadar"
        ));
    }

    public static List<String> getCities() {
        return new ArrayList<>(cityAreaMap.keySet());
    }

    public static List<String> getAreasForCity(String city) {
        if (city != null && cityAreaMap.containsKey(city)) {
            return cityAreaMap.get(city);
        }
        return new ArrayList<>(Arrays.asList("Sadar", "Other Area"));
    }
}
