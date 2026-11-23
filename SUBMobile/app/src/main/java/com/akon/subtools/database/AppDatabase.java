package com.akon.subtools.database;

import android.content.Context;
import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import androidx.room.TypeConverters;

import com.akon.subtools.models.Bus;
import com.akon.subtools.models.Notice;
import com.akon.subtools.models.Route;
import com.akon.subtools.models.Routine;
import com.akon.subtools.models.Subject;
import com.akon.subtools.models.User;
import com.akon.subtools.models.Faculty;
import com.akon.subtools.models.Quote;
import com.akon.subtools.models.CacheMetadata;
import com.akon.subtools.models.BloodDonor;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Database(entities = {User.class, Routine.class, Notice.class, Bus.class, Route.class, Subject.class, Faculty.class, BloodDonor.class, Quote.class, CacheMetadata.class}, version = 22, exportSchema = false)
@TypeConverters({Converters.class})
public abstract class AppDatabase extends RoomDatabase {
    private static volatile AppDatabase INSTANCE;
    private static final int NUMBER_OF_THREADS = 4;
    public static final ExecutorService databaseWriteExecutor = Executors.newFixedThreadPool(NUMBER_OF_THREADS);

    public static final androidx.room.migration.Migration MIGRATION_17_18 = new androidx.room.migration.Migration(17, 18) {
        @Override
        public void migrate(@androidx.annotation.NonNull androidx.sqlite.db.SupportSQLiteDatabase database) {
            try {
                database.execSQL("ALTER TABLE users ADD COLUMN city TEXT");
            } catch (Exception ignored) {}
            try {
                database.execSQL("ALTER TABLE users ADD COLUMN area TEXT");
            } catch (Exception ignored) {}
        }
    };

    public static final androidx.room.migration.Migration MIGRATION_18_19 = new androidx.room.migration.Migration(18, 19) {
        @Override
        public void migrate(@androidx.annotation.NonNull androidx.sqlite.db.SupportSQLiteDatabase database) {
            // Version 19 briefly declared an ignored Notice field as a Room column.
            // Keep this migration empty so version 18 databases can pass through safely.
        }
    };

    public static final androidx.room.migration.Migration MIGRATION_19_20 = new androidx.room.migration.Migration(19, 20) {
        @Override
        public void migrate(@androidx.annotation.NonNull androidx.sqlite.db.SupportSQLiteDatabase database) {
            database.execSQL("DROP TABLE IF EXISTS notices_new");
            database.execSQL("CREATE TABLE notices_new (id TEXT NOT NULL, title TEXT, content TEXT, department TEXT, priority TEXT, type TEXT, date TEXT, sender TEXT, imageUrl TEXT, attachmentUrl TEXT, description TEXT, authorName TEXT, pdfUrl TEXT, pdfLink TEXT, pdfAttachment TEXT, PRIMARY KEY(id))");
            database.execSQL("INSERT INTO notices_new (id, title, content, department, priority, type, date, sender, imageUrl, attachmentUrl, description, authorName, pdfUrl, pdfLink, pdfAttachment) SELECT id, title, content, department, priority, type, date, sender, imageUrl, attachmentUrl, description, authorName, pdfUrl, pdfLink, pdfAttachment FROM notices");
            database.execSQL("DROP TABLE notices");
            database.execSQL("ALTER TABLE notices_new RENAME TO notices");
        }
    };

    public abstract UserDao userDao();
    public abstract RoutineDao routineDao();
    public abstract NoticeDao noticeDao();
    public abstract BusDao busDao();
    public abstract RouteDao routeDao();
    public abstract SubjectDao subjectDao();
    public abstract FacultyDao facultyDao();
    public abstract BloodDonorDao bloodDonorDao();
    public abstract QuoteDao quoteDao();
    public abstract CacheMetadataDao cacheMetadataDao();

    /** Alias for {@link #getDatabase(Context)}. */
    public static AppDatabase getInstance(final Context context) {
        return getDatabase(context);
    }

    private static volatile User cachedLocalUser;

    /** Clears the in-memory local user (call on logout). */
    public static void clearCachedLocalUser() {
        cachedLocalUser = null;
    }

    /** Explicitly sets or updates the in-memory cached user. */
    public static void setCachedLocalUser(User user) {
        if (isValidUser(user)) {
            cachedLocalUser = user;
        }
    }

    /**
     * Returns the logged-in local user without violating Room's main-thread rule.
     * Order: in-memory cache, CacheManager prefs, then Room (off the UI thread).
     */
    public static User getLocalUser(final Context context) {
        User mem = cachedLocalUser;
        if (isValidUser(mem)) return mem;

        if (context != null) {
            try {
                User prefUser = new com.akon.subtools.utils.CacheManager(context).getObject("user_profile", User.class);
                if (isValidUser(prefUser)) {
                    cachedLocalUser = prefUser;
                    databaseWriteExecutor.execute(() -> {
                        try {
                            getDatabase(context).userDao().insertUser(prefUser);
                        } catch (Exception ignored) {}
                    });
                    return prefUser;
                }
            } catch (Exception ignored) {}
        }

        if (context == null) return null;
        final AppDatabase db = getDatabase(context);
        User dbUser = null;
        try {
            if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) {
                dbUser = databaseWriteExecutor.submit(() -> db.userDao().getUser())
                        .get(500, java.util.concurrent.TimeUnit.MILLISECONDS);
            } else {
                dbUser = db.userDao().getUser();
            }
        } catch (Exception ignored) {}

        if (isValidUser(dbUser)) {
            cachedLocalUser = dbUser;
            try {
                new com.akon.subtools.utils.CacheManager(context).save("user_profile", dbUser);
            } catch (Exception ignored) {}
        }
        return dbUser;
    }

    private static boolean isValidUser(User u) {
        return u != null && u.getUid() != null && !u.getUid().trim().isEmpty();
    }

    public static AppDatabase getDatabase(final Context context) {
        if (INSTANCE == null) {
            synchronized (AppDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = Room.databaseBuilder(context.getApplicationContext(),
                                    AppDatabase.class, "subtools_database")
                            .addMigrations(MIGRATION_17_18, MIGRATION_18_19, MIGRATION_19_20)
                            .fallbackToDestructiveMigrationOnDowngrade()
                            .fallbackToDestructiveMigration()
                            .build();

                    Executors.newSingleThreadExecutor().execute(() -> {
                        try {
                            seedDefaultQuotes(context.getApplicationContext());
                        } catch (Exception ignored) {}
                    });
                }
            }
        }
        return INSTANCE;
    }

    public static void seedDefaultQuotes(Context context) {
        databaseWriteExecutor.execute(() -> performSeed(context));
    }

    public static void performSeed(Context context) {
        try {
            AppDatabase db = getDatabase(context);
            // Threshold: update whenever new quotes are added (bump this number)
            if (db.quoteDao().getQuoteCount() < 225) {
                    List<Quote> defaultQuotes = new ArrayList<>();

                    // --- LOVE (20 Quotes) ---
                    defaultQuotes.add(new Quote("The best thing to hold onto in life is each other.", "Audrey Hepburn", "Wisdom"));
                    defaultQuotes.add(new Quote("Love isn't something you find. Love is something that finds you.", "Loretta Young", "Wisdom"));
                    defaultQuotes.add(new Quote("We are shaped and fashioned by what we love.", "Goethe", "Wisdom"));
                    defaultQuotes.add(new Quote("Where there is love there is life.", "Mahatma Gandhi", "Wisdom"));
                    defaultQuotes.add(new Quote("To love and be loved is to feel the sun from both sides.", "David Viscott", "Wisdom"));
                    defaultQuotes.add(new Quote("You don't love someone for their looks, but because they sing a song only you can hear.", "Oscar Wilde", "Wisdom"));
                    defaultQuotes.add(new Quote("Loved people love people, and healed people heal people.", "Unknown", "Wisdom"));
                    defaultQuotes.add(new Quote("Love is composed of a single soul inhabiting two bodies.", "Aristotle", "Wisdom"));
                    defaultQuotes.add(new Quote("Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.", "Lao Tzu", "Wisdom"));
                    defaultQuotes.add(new Quote("There is only one happiness in this life, to love and be loved.", "George Sand", "Wisdom"));
                    defaultQuotes.add(new Quote("Love recognizes no barriers. It jumps hurdles, leaps fences, penetrates walls to arrive at its destination full of hope.", "Maya Angelou", "Wisdom"));
                    defaultQuotes.add(new Quote("The greatest happiness of life is the conviction that we are loved; loved for ourselves, or rather, loved in spite of ourselves.", "Victor Hugo", "Wisdom"));
                    defaultQuotes.add(new Quote("Love is a game that two can play and both win.", "Eva Gabor", "Wisdom"));
                    defaultQuotes.add(new Quote("In all the world, there is no heart for me like yours. In all the world, there is no love for you like mine.", "Maya Angelou", "Wisdom"));
                    defaultQuotes.add(new Quote("Love is not about how many days, months, or years you have been together. Love is about how much you love each other every single day.", "Unknown", "Wisdom"));
                    defaultQuotes.add(new Quote("To love is to recognize yourself in another.", "Eckhart Tolle", "Wisdom"));
                    defaultQuotes.add(new Quote("Love is the bridge between you and everything.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("Love cures people — both the ones who give it and the ones who receive it.", "Karl A. Menninger", "Wisdom"));
                    defaultQuotes.add(new Quote("The heart has its reasons of which reason knows nothing.", "Blaise Pascal", "Wisdom"));
                    defaultQuotes.add(new Quote("Keep love in your heart. A life without it is like a sunless garden when the flowers are dead.", "Oscar Wilde", "Wisdom"));

                    // --- EDUCATION (20 Quotes) ---
                    defaultQuotes.add(new Quote("Education is the most powerful weapon which you can use to change the world.", "Nelson Mandela", "Wisdom"));
                    defaultQuotes.add(new Quote("The mind is not a vessel to be filled, but a fire to be kindled.", "Plutarch", "Wisdom"));
                    defaultQuotes.add(new Quote("Develop a passion for learning. If you do, you will never cease to grow.", "Anthony J. D'Angelo", "Wisdom"));
                    defaultQuotes.add(new Quote("Live as if you were to die tomorrow. Learn as if you were to live forever.", "Mahatma Gandhi", "Wisdom"));
                    defaultQuotes.add(new Quote("An investment in knowledge pays the best interest.", "Benjamin Franklin", "Wisdom"));
                    defaultQuotes.add(new Quote("Education is not the learning of facts, but the training of the mind to think.", "Albert Einstein", "Wisdom"));
                    defaultQuotes.add(new Quote("The roots of education are bitter, but the fruit is sweet.", "Aristotle", "Wisdom"));
                    defaultQuotes.add(new Quote("Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", "Albert Einstein", "Wisdom"));
                    defaultQuotes.add(new Quote("The beautiful thing about learning is that no one can take it away from you.", "B.B. King", "Wisdom"));
                    defaultQuotes.add(new Quote("Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", "Malcolm X", "Wisdom"));
                    defaultQuotes.add(new Quote("The function of education is to teach one to think intensively and to think critically.", "Martin Luther King Jr.", "Wisdom"));
                    defaultQuotes.add(new Quote("Learning never exhausts the mind.", "Leonardo da Vinci", "Wisdom"));
                    defaultQuotes.add(new Quote("Change is the end result of all true learning.", "Leo Buscaglia", "Wisdom"));
                    defaultQuotes.add(new Quote("Upon the subject of education, I can only say that I view it as the most important subject which we as a people can be engaged in.", "Abraham Lincoln", "Wisdom"));
                    defaultQuotes.add(new Quote("Educating the mind without educating the heart is no education at all.", "Aristotle", "Wisdom"));
                    defaultQuotes.add(new Quote("The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", "Brian Herbert", "Wisdom"));
                    defaultQuotes.add(new Quote("Real education should consist of drawing the goodness and the best out of our own students.", "Cesar Chavez", "Wisdom"));
                    defaultQuotes.add(new Quote("Knowledge is power. Information is liberating. Education is the premise of progress.", "Kofi Annan", "Wisdom"));
                    defaultQuotes.add(new Quote("Study without desire spoils the memory, and it retains nothing that it takes in.", "Leonardo da Vinci", "Wisdom"));
                    defaultQuotes.add(new Quote("The purpose of education is to replace an empty mind with an open one.", "Malcolm Forbes", "Wisdom"));

                    // --- MOTIVATION (20 Quotes) ---
                    defaultQuotes.add(new Quote("It does not matter how slowly you go as long as you do not stop.", "Confucius", "Wisdom"));
                    defaultQuotes.add(new Quote("Your time is limited, don't waste it living someone else's life.", "Steve Jobs", "Wisdom"));
                    defaultQuotes.add(new Quote("The secret of getting ahead is getting started.", "Mark Twain", "Wisdom"));
                    defaultQuotes.add(new Quote("Believe you can and you're halfway there.", "Theodore Roosevelt", "Wisdom"));
                    defaultQuotes.add(new Quote("You are never too old to set another goal or to dream a new dream.", "C.S. Lewis", "Wisdom"));
                    defaultQuotes.add(new Quote("Start where you are. Use what you have. Do what you can.", "Arthur Ashe", "Wisdom"));
                    defaultQuotes.add(new Quote("The future belongs to those who believe in the beauty of their dreams.", "Eleanor Roosevelt", "Wisdom"));
                    defaultQuotes.add(new Quote("Don't watch the clock; do what it does. Keep going.", "Sam Levenson", "Wisdom"));
                    defaultQuotes.add(new Quote("Hardships often prepare ordinary people for an extraordinary destiny.", "C.S. Lewis", "Wisdom"));
                    defaultQuotes.add(new Quote("Light tomorrow with today.", "Elizabeth Barrett Browning", "Wisdom"));
                    defaultQuotes.add(new Quote("Keep your face always toward the sunshine — and shadows will fall behind you.", "Walt Whitman", "Wisdom"));
                    defaultQuotes.add(new Quote("You carry the passport to your own happiness.", "Diane von Furstenberg", "Wisdom"));
                    defaultQuotes.add(new Quote("Never limit yourself because of others' limited imagination.", "Mae Jemison", "Wisdom"));
                    defaultQuotes.add(new Quote("If you want to lift yourself up, lift up someone else.", "Booker T. Washington", "Wisdom"));
                    defaultQuotes.add(new Quote("Doubt kills more dreams than failure ever will.", "Suzy Kassem", "Wisdom"));
                    defaultQuotes.add(new Quote("Act as if what you do makes a difference. It does.", "William James", "Wisdom"));
                    defaultQuotes.add(new Quote("What lies behind us and what lies before us are tiny matters compared to what lies within us.", "Ralph Waldo Emerson", "Wisdom"));
                    defaultQuotes.add(new Quote("You get in life what you have the courage to ask for.", "Oprah Winfrey", "Wisdom"));
                    defaultQuotes.add(new Quote("No matter what you're going through, there's a light at the end of the tunnel.", "Demi Lovato", "Wisdom"));
                    defaultQuotes.add(new Quote("Dream big and dare to fail.", "Norman Vaughan", "Wisdom"));

                    // --- SUCCESS & FAILURE (20 Quotes) ---
                    defaultQuotes.add(new Quote("Success is not final, failure is not fatal: it is the courage to continue that counts.", "Winston Churchill", "Wisdom"));
                    defaultQuotes.add(new Quote("Success usually comes to those who are too busy to be looking for it.", "Henry David Thoreau", "Wisdom"));
                    defaultQuotes.add(new Quote("Don't be afraid to give up the good to go for the great.", "John D. Rockefeller", "Wisdom"));
                    defaultQuotes.add(new Quote("Opportunities don't happen. You create them.", "Chris Grosser", "Wisdom"));
                    defaultQuotes.add(new Quote("Small daily improvements over time lead to stunning results.", "Robin Sharma", "Wisdom"));
                    defaultQuotes.add(new Quote("There are no secrets to success. It is the result of preparation, hard work, and learning from failure.", "Colin Powell", "Wisdom"));
                    defaultQuotes.add(new Quote("Strive not to be a success, but rather to be of value.", "Albert Einstein", "Wisdom"));
                    defaultQuotes.add(new Quote("Failure is simply the opportunity to begin again, this time more intelligently.", "Henry Ford", "Wisdom"));
                    defaultQuotes.add(new Quote("Our greatest glory is not in never failing, but in rising every time we fail.", "Confucius", "Wisdom"));
                    defaultQuotes.add(new Quote("I have not failed. I've just found 10,000 ways that won't work.", "Thomas A. Edison", "Wisdom"));
                    defaultQuotes.add(new Quote("Only those who dare to fail greatly can ever achieve greatly.", "Robert F. Kennedy", "Wisdom"));
                    defaultQuotes.add(new Quote("Failure is not the opposite of success; it's part of success.", "Arianna Huffington", "Wisdom"));
                    defaultQuotes.add(new Quote("The only real mistake is the one from which we learn nothing.", "Henry Ford", "Wisdom"));
                    defaultQuotes.add(new Quote("Success is the sum of small efforts, repeated day in and day out.", "Robert Collier", "Wisdom"));
                    defaultQuotes.add(new Quote("The key to success is to focus on goals, not obstacles.", "Unknown", "Wisdom"));
                    defaultQuotes.add(new Quote("Giving up is the only sure way to fail.", "Gena Showalter", "Wisdom"));
                    defaultQuotes.add(new Quote("Patience, persistence and perspiration make an unbeatable combination for success.", "Napoleon Hill", "Wisdom"));
                    defaultQuotes.add(new Quote("Failure is delay, not defeat. It is a temporary detour, not a dead end.", "William Arthur Ward", "Wisdom"));
                    defaultQuotes.add(new Quote("Mistakes are the portals of discovery.", "James Joyce", "Wisdom"));
                    defaultQuotes.add(new Quote("It's fine to celebrate success but it is more important to heed the lessons of failure.", "Bill Gates", "Wisdom"));

                    // --- RUMI (10 Quotes) ---
                    defaultQuotes.add(new Quote("What you seek is seeking you.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("The wound is the place where the Light enters you.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("Don't grieve. Anything you lose comes round in another form.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("Raise your words, not your voice. It is rain that grows flowers, not thunder.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("Try not to resist life's changes. Let life flow through you.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("Your heart knows the way. Run in that direction.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("Be like a tree and let the dead leaves drop.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("Silence is the language of God; all else is poor translation.", "Rumi", "Wisdom"));
                    defaultQuotes.add(new Quote("Wherever you are, and whatever you do, be in love.", "Rumi", "Wisdom"));

                    // --- IMAM ALI (10 Quotes) ---
                    defaultQuotes.add(new Quote("Your remedy is within you, but you do not sense it. Your sickness is from you, but you do not perceive it.", "Imam Ali", "Wisdom"));
                    defaultQuotes.add(new Quote("The tongue is like a lion. If you let it loose, it will wound someone.", "Imam Ali", "Wisdom"));
                    defaultQuotes.add(new Quote("Patience is of two kinds: patience over what pains you, and patience against what you desire.", "Imam Ali", "Wisdom"));
                    defaultQuotes.add(new Quote("Do not be a slave to others when God has created you free.", "Imam Ali", "Wisdom"));
                    defaultQuotes.add(new Quote("The strongest person is the one who controls himself when angry.", "Imam Ali", "Wisdom"));
                    defaultQuotes.add(new Quote("Knowledge enlivens the soul.", "Imam Ali", "Wisdom"));
                    defaultQuotes.add(new Quote("People are of two kinds: either your brothers in faith or your equals in humanity.", "Imam Ali", "Wisdom"));
                    defaultQuotes.add(new Quote("A person's worth is measured by what they do well.", "Imam Ali", "Wisdom"));
                    defaultQuotes.add(new Quote("He who has thousands of friends has not a friend to spare, and he who has one enemy will meet him everywhere.", "Imam Ali", "Wisdom"));
                    defaultQuotes.add(new Quote("Contentment is a wealth that never diminishes.", "Imam Ali", "Wisdom"));

                    // --- CLASSICAL WISDOM (20 Quotes: Ibn Ata Allah, Al-Ghazali, Khalil Gibran, Laozi, Marcus Aurelius, Epictetus) ---
                    defaultQuotes.add(new Quote("Whoever knows himself, knows his Lord.", "Ibn Ata Allah al-Iskandari", "Wisdom"));
                    defaultQuotes.add(new Quote("How can the heart travel to God when it is chained by its desires?", "Ibn Ata Allah al-Iskandari", "Wisdom"));
                    defaultQuotes.add(new Quote("Your existence in this world is a proof of His concern for you.", "Ibn Ata Allah al-Iskandari", "Wisdom"));
                    defaultQuotes.add(new Quote("Do not give up what you find in your heart for what others find in theirs.", "Ibn Ata Allah al-Iskandari", "Wisdom"));
                    defaultQuotes.add(new Quote("Trust in God is not laziness; it is certainty in the sufficiency of God.", "Al-Ghazali", "Wisdom"));
                    defaultQuotes.add(new Quote("Knowledge without action is vanity, and action without knowledge is insanity.", "Al-Ghazali", "Wisdom"));
                    defaultQuotes.add(new Quote("The real fault is to have faults and not amend them.", "Al-Ghazali", "Wisdom"));
                    defaultQuotes.add(new Quote("Your children are not your children. They are the sons and daughters of Life's longing for itself.", "Khalil Gibran", "Wisdom"));
                    defaultQuotes.add(new Quote("The deeper that sorrow carves into your being, the more joy you can contain.", "Khalil Gibran", "Wisdom"));
                    defaultQuotes.add(new Quote("You are good when you are one with yourself. Yet when you are not one with yourself you are not evil.", "Khalil Gibran", "Wisdom"));
                    defaultQuotes.add(new Quote("Knowing others is wisdom; knowing yourself is enlightenment.", "Laozi", "Wisdom"));
                    defaultQuotes.add(new Quote("A journey of a thousand miles begins with a single step.", "Laozi", "Wisdom"));
                    defaultQuotes.add(new Quote("Nature does not hurry, yet everything is accomplished.", "Laozi", "Wisdom"));
                    defaultQuotes.add(new Quote("You have power over your mind, not outside events. Realize this, and you will find strength.", "Marcus Aurelius", "Wisdom"));
                    defaultQuotes.add(new Quote("The impediment to action advances action. What stands in the way becomes the way.", "Marcus Aurelius", "Wisdom"));
                    defaultQuotes.add(new Quote("Waste no more time arguing about what a good man should be. Be one.", "Marcus Aurelius", "Wisdom"));
                    defaultQuotes.add(new Quote("Make the best use of what is in your power, and take the rest as it happens.", "Epictetus", "Wisdom"));
                    defaultQuotes.add(new Quote("It's not what happens to you, but how you react to it that matters.", "Epictetus", "Wisdom"));
                    defaultQuotes.add(new Quote("First say to yourself what you would be; and then do what you have to do.", "Epictetus", "Wisdom"));
                    defaultQuotes.add(new Quote("No man is free who is not master of himself.", "Epictetus", "Wisdom"));

                    // --- MOVIE & TV SERIES QUOTES (30 Iconic Cinema Quotes) ---
                    defaultQuotes.add(new Quote("Why do we fall, sir? So that we can learn to pick ourselves up.", "Alfred Pennyworth (Batman Begins)", "Wisdom"));
                    defaultQuotes.add(new Quote("It is not our abilities that show what we truly are… it is our choices.", "Albus Dumbledore (Harry Potter)", "Wisdom"));
                    defaultQuotes.add(new Quote("Do or do not. There is no try.", "Yoda (Star Wars)", "Wisdom"));
                    defaultQuotes.add(new Quote("The fundamental lesson of life is: Never give up.", "Christopher Gardner (The Pursuit of Happyness)", "Wisdom"));
                    defaultQuotes.add(new Quote("Great men are not born great, they grow great.", "Vito Corleone (The Godfather)", "Wisdom"));
                    defaultQuotes.add(new Quote("All we have to decide is what to do with the time that is given us.", "Gandalf (The Lord of the Rings)", "Wisdom"));
                    defaultQuotes.add(new Quote("Yesterday is history, tomorrow is a mystery, but today is a gift. That is why it is called the present.", "Master Oogway (Kung Fu Panda)", "Wisdom"));
                    defaultQuotes.add(new Quote("With great power comes great responsibility.", "Uncle Ben (Spider-Man)", "Wisdom"));
                    defaultQuotes.add(new Quote("Life moves pretty fast. If you don't stop and look around once in a while, you could miss it.", "Ferris Bueller (Ferris Bueller's Day Off)", "Wisdom"));
                    defaultQuotes.add(new Quote("It's supposed to be hard. If it wasn't hard, everyone would do it. The hard is what makes it great.", "Jimmy Dugan (A League of Their Own)", "Wisdom"));
                    defaultQuotes.add(new Quote("The only thing standing between you and your goal is the story you keep telling yourself as to why you can't achieve it.", "Jordan Belfort (The Wolf of Wall Street)", "Wisdom"));
                    defaultQuotes.add(new Quote("Our lives are defined by opportunities, even the ones we miss.", "Benjamin Button (The Curious Case of Benjamin Button)", "Wisdom"));
                    defaultQuotes.add(new Quote("Never forget what you are. The rest of the world will not. Wear it like armor, and it can never be used to hurt you.", "Tyrion Lannister (Game of Thrones)", "Wisdom"));
                    defaultQuotes.add(new Quote("Chaos isn't a pit. Chaos is a ladder.", "Petyr Baelish (Game of Thrones)", "Wisdom"));
                    defaultQuotes.add(new Quote("I find that painful choices are quick choices, and easy choices take a long time.", "Sherlock Holmes (Sherlock)", "Wisdom"));
                    defaultQuotes.add(new Quote("You don't get to choose if you get hurt in this world, but you do have some say in who hurts you.", "Augustus Waters (The Fault in Our Stars)", "Wisdom"));
                    defaultQuotes.add(new Quote("Whatever you do in this life, it's not legendary unless your friends are there to see it.", "Barney Stinson (How I Met Your Mother)", "Wisdom"));
                    defaultQuotes.add(new Quote("Some people can't believe in themselves until someone else believes in them first.", "Sean Maguire (Good Will Hunting)", "Wisdom"));
                    defaultQuotes.add(new Quote("You'll have bad times, but it will always wake you up to the good stuff you weren't paying attention to.", "Sean Maguire (Good Will Hunting)", "Wisdom"));
                    defaultQuotes.add(new Quote("No matter what anybody tells you, words and ideas can change the world.", "John Keating (Dead Poets Society)", "Wisdom"));
                    defaultQuotes.add(new Quote("Seize the day. Make your lives extraordinary.", "John Keating (Dead Poets Society)", "Wisdom"));
                    defaultQuotes.add(new Quote("Oh yes, the past can hurt. But the way I see it, you can either run from it or learn from it.", "Rafiki (The Lion King)", "Wisdom"));
                    defaultQuotes.add(new Quote("Remember, Red, hope is a good thing, maybe the best of things, and no good thing ever dies.", "Andy Dufresne (The Shawshank Redemption)", "Wisdom"));
                    defaultQuotes.add(new Quote("Get busy living, or get busy dying.", "Andy Dufresne (The Shawshank Redemption)", "Wisdom"));
                    defaultQuotes.add(new Quote("The flower that blooms in adversity is the most rare and beautiful of all.", "The Emperor (Mulan)", "Wisdom"));
                    defaultQuotes.add(new Quote("Venture outside your comfort zone. The rewards are worth it.", "Rapunzel (Tangled)", "Wisdom"));
                    defaultQuotes.add(new Quote("Every man dies, not every man really lives.", "William Wallace (Braveheart)", "Wisdom"));
                    defaultQuotes.add(new Quote("Just keep swimming.", "Dory (Finding Nemo)", "Wisdom"));
                    defaultQuotes.add(new Quote("After all, tomorrow is another day!", "Scarlett O'Hara (Gone with the Wind)", "Wisdom"));
                    defaultQuotes.add(new Quote("It's only after we've lost everything that we're free to do anything.", "Tyler Durden (Fight Club)", "Wisdom"));
                    defaultQuotes.add(new Quote("You either die a hero, or you live long enough to see yourself become the villain.", "Harvey Dent (The Dark Knight)", "Wisdom"));
                    defaultQuotes.add(new Quote("It's not who I am underneath, but what I do that defines me.", "Bruce Wayne (The Dark Knight)", "Wisdom"));
                    defaultQuotes.add(new Quote("Love is the one thing we're capable of perceiving that transcends dimensions of time and space.", "Dr. Brand (Interstellar)", "Wisdom"));
                    defaultQuotes.add(new Quote("We used to look up at the sky and wonder at our place in the stars. Now we just look down and worry about our place in the dirt.", "Cooper (Interstellar)", "Wisdom"));
                    defaultQuotes.add(new Quote("Ideas are bulletproof.", "V (V for Vendetta)", "Wisdom"));
                    defaultQuotes.add(new Quote("I am the one who knocks!", "Walter White (Breaking Bad)", "Wisdom"));
                    defaultQuotes.add(new Quote("If you're good at something, never do it for free.", "The Joker (The Dark Knight)", "Wisdom"));
                    defaultQuotes.add(new Quote("I don't have dreams, I have goals.", "Harvey Specter (Suits)", "Wisdom"));
                    defaultQuotes.add(new Quote("Work until you no longer have to introduce yourself.", "Harvey Specter (Suits)", "Wisdom"));
                    defaultQuotes.add(new Quote("Lies are comfort. Truth is painful.", "Tommy Shelby (Peaky Blinders)", "Wisdom"));
                    defaultQuotes.add(new Quote("Pride is not the opposite of shame, but its source. True humility is the only antidote to shame.", "Uncle Iroh (Avatar: The Last Airbender)", "Wisdom"));
                    defaultQuotes.add(new Quote("In the darkest times, hope is something you give yourself. That is the meaning of inner strength.", "Uncle Iroh (Avatar: The Last Airbender)", "Wisdom"));
                    defaultQuotes.add(new Quote("It is important to draw wisdom from many different places. If you take it from only one place, it becomes rigid and stale.", "Uncle Iroh (Avatar: The Last Airbender)", "Wisdom"));
                    defaultQuotes.add(new Quote("An idea is like a virus. Resilient. Highly contagious.", "Cobb (Inception)", "Wisdom"));
                    defaultQuotes.add(new Quote("What you do right now, makes a difference.", "Captain America (Avengers: Endgame)", "Wisdom"));
                    defaultQuotes.add(new Quote("Part of the journey is the end.", "Tony Stark (Avengers: Endgame)", "Wisdom"));
                    defaultQuotes.add(new Quote("What we do in life echoes in eternity.", "Maximus (Gladiator)", "Wisdom"));
                    defaultQuotes.add(new Quote("There is a difference between knowing the path and walking the path.", "Morpheus (The Matrix)", "Wisdom"));
                    defaultQuotes.add(new Quote("Free your mind.", "Morpheus (The Matrix)", "Wisdom"));
                    defaultQuotes.add(new Quote("It ain't about how hard you hit. It's about how hard you can get hit and keep moving forward.", "Rocky Balboa (Rocky Balboa)", "Wisdom"));
                    defaultQuotes.add(new Quote("One step at a time. One punch at a time. One round at a time.", "Rocky Balboa (Creed)", "Wisdom"));
                    defaultQuotes.add(new Quote("Not everyone can become a great artist, but a great artist can come from anywhere.", "Anton Ego (Ratatouille)", "Wisdom"));
                    defaultQuotes.add(new Quote("Taking a leap of faith is all it is. A leap of faith.", "Miles Morales (Spider-Man: Into the Spider-Verse)", "Wisdom"));
                    defaultQuotes.add(new Quote("Be curious, not judgmental.", "Ted Lasso (Ted Lasso)", "Wisdom"));
                    defaultQuotes.add(new Quote("That's what I do: I drink and I know things.", "Tyrion Lannister (Game of Thrones)", "Wisdom"));
                    defaultQuotes.add(new Quote("I am not in danger, Skyler. I am the danger.", "Walter White (Breaking Bad)", "Wisdom"));
                    defaultQuotes.add(new Quote("Life is like a box of chocolates. You never know what you're gonna get.", "Forrest Gump (Forrest Gump)", "Wisdom"));
                    defaultQuotes.add(new Quote("May the Force be with you.", "Han Solo (Star Wars)", "Wisdom"));
                    defaultQuotes.add(new Quote("Real courage is when you know you're licked before you begin, but you begin anyway and see it through no matter what.", "Atticus Finch (To Kill a Mockingbird)", "Wisdom"));
                    defaultQuotes.add(new Quote("We are only as strong as we are united, as weak as we are divided.", "Albus Dumbledore (Harry Potter)", "Wisdom"));
                    defaultQuotes.add(new Quote("Keep your friends close, but your enemies closer.", "Michael Corleone (The Godfather Part II)", "Wisdom"));
                    defaultQuotes.add(new Quote("To infinity and beyond!", "Buzz Lightyear (Toy Story)", "Wisdom"));
                    defaultQuotes.add(new Quote("The strength of the pack is the wolf, and the strength of the wolf is the pack.", "Mowgli (The Jungle Book)", "Wisdom"));
                    defaultQuotes.add(new Quote("I'm going to make him an offer he can't refuse.", "Vito Corleone (The Godfather)", "Wisdom"));

                    db.quoteDao().deleteAll();
                    db.quoteDao().insertAll(defaultQuotes);
                }
            } catch (Exception ignored) {}
    }
}

