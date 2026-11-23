package com.akon.subtools.cache;

import android.content.Context;

/**
 * Deprecated Firestore repository stub.
 * All operations migrated to Supabase REST and Room database.
 */
@Deprecated
public class FirestoreRepository {
    private static volatile FirestoreRepository INSTANCE;

    private FirestoreRepository(Context context) {}

    public static FirestoreRepository getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (FirestoreRepository.class) {
                if (INSTANCE == null) {
                    INSTANCE = new FirestoreRepository(context);
                }
            }
        }
        return INSTANCE;
    }
}
