# SUBTools Ecosystem — Project Memory

> Canonical copy lives identically in `STC/`, `SUBMobile/`, `SUBAdmin/` roots (three separate repos/worktrees with no shared parent directory). Keep all three copies in sync when updating.
>
> Last updated: 2026-08-14

## 1. Architecture Overview

Three independent codebases share **one Firebase project**: `subtools-app` (project number `640344517721`).

| Project       | Stack                                                                 | Role                                                                                                                              |
| ------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **STC**       | Java Android (`com.akon.subtools.coordinator`)                        | "Back office on mobile" for Coordinators / Moderators / Admins — routine, faculty, subject, notice, student, transport management |
| **SUBMobile** | Java Android (`com.akon.subtools`)                                    | Primary student-facing app — offline-first (Room + WorkManager), cover pages, routines, notices, transport, lost & found          |
| **SUBAdmin**  | React 19 + Vite SPA + Firebase Cloud Functions (`functions/index.js`) | Web admin panel for Super Admins / Dept Admins / Coordinators / Moderators — full CRUD, RBAC, analytics, OTA update publishing    |

No shared code module exists between the three — each independently re-implements the same domain models (`User`, `Notice`, `Faculty`, `Subject`, `Route`/`BusRoute`, `ClassRoutine`/`Routine`) against the same Firestore schema. This is the primary cross-project maintainability risk (see Known Limitations).

Data flow pattern (all three):
`UI → ViewModel/Redux → Repository/API layer → local cache (Room/AppCache/localStorage+CacheManager) → Firestore SDK`

SUBAdmin also has a mostly-unused Cloud Functions REST API (`functions/index.js`, `exports.api`) — only `usersApi.inviteAdmin()` actually calls it; every other `src/api/*.js` module talks directly to Firestore.

## 2. Shared Firestore Schema (cross-referenced across all 3 apps)

| Collection / Doc                                                       | Written by                                                    | Read by                      | Notes                                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `users`                                                                | SUBMobile (signup), SUBAdmin                                  | All three                    | `role` field currently **self-writable by any authenticated user** per current rules — critical issue, see MASTER_TODO SEC-001 |
| `admins`                                                               | SUBAdmin                                                      | STC, SUBAdmin                | Coordinator/moderator/admin roster                                                                                             |
| `routines`                                                             | SUBAdmin, STC                                                 | All three                    | Supports `isTemporary`, `rescheduleMode`, `originalRoutineId`, `date`, `rescheduleNote`                                        |
| `subjects`                                                             | SUBAdmin, STC                                                 | All three                    | Keyed by course code                                                                                                           |
| `faculty`                                                              | SUBAdmin, STC                                                 | All three                    |                                                                                                                                |
| `notices`                                                              | SUBAdmin, STC                                                 | SUBMobile (realtime)         | Triggers FCM via Cloud Function `onNoticeCreated`                                                                              |
| `scheduled_notices`                                                    | SUBAdmin                                                      | SUBAdmin                     | Undocumented in SUBAdmin's own docs                                                                                            |
| `buses` / `routes`                                                     | SUBAdmin, STC                                                 | All three                    | `routes` docs store **plaintext Obhai GPS vendor credentials**, publicly readable — critical issue, see SEC-002                |
| `lostFound`                                                            | SUBMobile (pending items), STC (repo exists, no UI), SUBAdmin | SUBAdmin (approval workflow) | Approval workflow: `approvalStatus: pending                                                                                    | approved` |
| `activityLogs` (camelCase, real) vs `activity_logs` (snake_case, dead) | SUBAdmin                                                      | SUBAdmin                     | `roleApi.getActivityLogs()` incorrectly queries `activity_logs` — always empty                                                 |
| `admin/api_config` (`imgbb_key`)                                       | SUBAdmin (Settings)                                           | SUBMobile, STC, SUBAdmin     | Shared config — rotating this in SUBAdmin breaks mobile uploads instantly                                                      |
| `admin/email_config`                                                   | SUBAdmin                                                      | SUBAdmin                     | EmailJS creds (docs incorrectly claim `admin/api_config`)                                                                      |
| `admin/app_update`, `admin/stc_app_update`                             | SUBAdmin (Settings)                                           | SUBMobile, STC               | OTA update nudge mechanism                                                                                                     |
| `admin/notice_config` (`noticeVersion`)                                | SUBAdmin/STC (on notice write)                                | SUBMobile                    | Cheap "push" signal for realtime listener                                                                                      |
| `coverPages` / `analytics_cover_pages`                                 | SUBMobile, STC                                                | SUBAdmin                     | Inconsistently named even within SUBAdmin                                                                                      |
| `fcmTokens`                                                            | Mobile registration (not fully traced)                        | Cloud Functions              | Used by `onNoticeCreated` push trigger                                                                                         |
| `system/permission_matrix`                                             | SUBAdmin                                                      | SUBAdmin                     | Undocumented                                                                                                                   |

## 3. Shared Models (independently implemented per project — no shared library)

- `User` — STC (POJO), SUBMobile (Room `@Entity`), SUBAdmin (plain JS object)
- `Notice`, `Faculty`, `Subject`, `Route`/`BusRoute`, `ClassRoutine`/`Routine`, `LostFoundItem` — same pattern

Known field drift: STC's `Faculty` lacks `photoUrl` that SUBMobile/SUBAdmin populate.

## 4. Role Definitions

| Role          | Department-bound | Key Permissions                                                                                                |
| ------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `super_admin` | No               | Global full CRUD, settings, log reversion. Determined by **hardcoded email allowlist**, not a Firestore field. |
| `admin`       | No (typically)   | Broad CRUD similar to super_admin minus irreversible actions                                                   |
| `coordinator` | Yes              | Dept-specific students, subjects, routines, faculty                                                            |
| `moderator`   | No               | Transport, Lost & Found, Notices (global)                                                                      |
| `student`     | Yes (implicit)   | Mobile app only; blocked from STC/SUBAdmin login                                                               |

Super-admin hardcoded email allowlists are now aligned between `SUBAdmin/src/api/authApi.js` and `SUBAdmin/functions/index.js`.

All role/permission enforcement today is **client-side only** in all three apps (STC's `PermissionManager`, SUBMobile's role gate in `AuthRepository`, SUBAdmin's `AppRoutes.jsx`/`Sidebar.jsx`). Firestore rules do not mirror this model — see SEC-001/SEC-003.

## 5. Department Codes

Canonical (per SUBAdmin `src/utils/academic.js`): `CSE, DSE, ARCH, BBA, ENG, ES, FENS, JCMS, LLB, B.PHARM, MIB`

**⚠️ Drift detected**: `SUBAdmin/API_ENDPOINTS.md` lists a different set (`CSE, DSE, ARCH, BUS, ENG, ENV, FENS, JCMS, LAW, PHAR`), and 4 separate Redux slices (`userSlice`, `subjectSlice`, `routineSlice`, `facultySlice`) each hand-roll their own copy of department normalization that doesn't match `academic.js` or each other. See MASTER_TODO DATA-002.

## 6. Important Cross-Project Dependencies

- `admin/api_config.imgbb_key` — SUBAdmin manages; SUBMobile/STC read directly for image uploads (ImgBB, not Firebase Storage — Storage is declared but unused everywhere).
- `admin/app_update` / `admin/stc_app_update` — SUBAdmin publishes OTA metadata consumed by SUBMobile/STC's `AppUpdateManager` classes.
- `admin/notice_config.noticeVersion` — cheap push-signal doc SUBMobile's realtime listener depends on.
- Two-collection auth lookup pattern (`admins` then `users`, or vice versa) is intentionally mirrored across STC's `AuthRepository` and SUBAdmin's `authApi.login`.

## 7. Current Decisions

- **2026-08-07**: Confirmed STC's compile-breaking bugs are isolated to `AddRoutineDialogFragment.java`/`ClassRoutine.java` and not present elsewhere. Fixed both (see Fixed Issues). No architectural changes made — minimal, surgical fixes only, consistent with existing codebase conventions (`Route`/`TuitionItem` already implement `Serializable` for the same Bundle-passing purpose).

## 8. Known Limitations (not yet fixed — tracked in MASTER_TODO.md)

- Firestore security rules provide almost no role-based write protection — see MASTER_TODO CRITICAL section (SEC-001, SEC-002, SEC-003).
- No shared schema/contract module between STC/SUBMobile/SUBAdmin — every Firestore field change must be manually kept in sync across 3 codebases.
- Zero automated tests in any of the three projects.
- SUBAdmin list screens still load complete collections because their current global search, duplicate-management, bulk-action, and exact-total behaviors require a pagination/query-contract redesign (tracked as ARCH-001/PERF-002).
- SUBAdmin's Cloud Functions REST API (`functions/index.js`) is ~90% unused by the frontend (only `/invite-admin` is called) — parallel, drifting implementation of logic that also exists in `src/api/*.js`.

## 9. Fixed Issues (chronological)

| Date       | ID          | Summary                                                                                                                                                                                                                                                                       |
| ---------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-07 | STC-001     | `AddRoutineDialogFragment` called non-existent `FacultyRepository.getFacultyForDepartment` → fixed to call existing `getDepartmentFaculty`. Build verified (`assembleDebug` SUCCESSFUL).                                                                                      |
| 2026-08-07 | STC-002     | `ClassRoutine` model wasn't `Serializable` but was passed via `Bundle.putSerializable` → added `implements Serializable`, matching `Route`/`TuitionItem` convention. Build verified (`assembleDebug` SUCCESSFUL).                                                             |
| 2026-08-07 | AUTH-001    | Aligned SUBAdmin client/server super-admin allowlists to canonical emails: `akonmhasib@gmail.com`, `akonszone@gmail.com`. Build deferred per user instruction.                                                                                                                |
| 2026-08-07 | FEAT-001    | Completed `LinksContactsFragment` dynamic data path in SUBMobile: Firestore load from `admin/links_contacts` with fallback to `admin/app_config`, cache-first rendering, and static fallback resilience.                                                                      |
| 2026-08-07 | FEAT-002    | Implemented live listing support in SUBMobile `TuitionFinderFragment` and `RoomSharingFragment` by consuming `tuitions` and `sublets` collections with actionable call links and empty states.                                                                                |
| 2026-08-07 | BUG-002     | Fixed SUBAdmin `roleApi.getActivityLogs()` collection mismatch by reading `activityLogs` first with fallback to legacy `activity_logs`.                                                                                                                                       |
| 2026-08-07 | DATA-002    | Unified SUBAdmin department normalization across Redux slices by reusing shared `normalizeDepartment` utility; removed duplicate alias entry in `academic.js`.                                                                                                                |
| 2026-08-07 | DATA-003    | Fixed STC bulk routine delete callback race by waiting for all batch commits (`Tasks.whenAllComplete`) before reporting success.                                                                                                                                              |
| 2026-08-07 | DATA-004    | Hardened SUBMobile signup rollback path to verify auth-user cleanup and report cleanup failure details if orphan risk remains.                                                                                                                                                |
| 2026-08-07 | SEC-001/2/3 | Hardened Firestore security rules: prevented self-role escalation, restricted admin writes, added role-based write controls, removed anonymous activity-log writes, and protected route reads to authenticated users.                                                         |
| 2026-08-07 | BUG-001     | Reworked SUBMobile crash handling to avoid re-entrant main-looper loop; now logs and delegates to the previous uncaught-exception handler to prevent undefined runtime state.                                                                                                 |
| 2026-08-07 | SEC-004     | Hardened SUBMobile transport WebView security: HTTPS-only tracking URLs, SSL errors now cancel instead of proceed, mixed content blocked, and automatic geolocation permission grant removed.                                                                                 |
| 2026-08-07 | SEC-005     | Removed hardcoded ImgBB API keys from STC notice image upload; now resolves key from shared Firestore config `admin/api_config.imgbb_key` and caches locally.                                                                                                                 |
| 2026-08-07 | BUG-005     | Removed SUBMobile `ProfileFragment` dead save-button null listener and legacy unused profile hash helper to eliminate misleading non-functional code path.                                                                                                                    |
| 2026-08-07 | BUG-003     | Fixed STC bulk-import duplicate detection to use real time-interval overlap logic instead of strict start/end string equality (with safe fallback on parse failure).                                                                                                          |
| 2026-08-07 | BUG-004     | Replaced SUBMobile notice-version stub with real Firestore version read (`admin/notice_config.noticeVersion`) to keep realtime/poll sync decisions aligned with server state.                                                                                                 |
| 2026-08-07 | DEAD-001    | Implemented STC Listings feature UI (`ListingsFragment`) with pending Lost & Found moderation (approve/reject) and Tuition feed visibility/call actions, wired into moderator navigation.                                                                                     |
| 2026-08-07 | DATA-001    | Changed SUBMobile Room migration fallback from always-destructive to downgrade-only destructive (`fallbackToDestructiveMigrationOnDowngrade`) to protect local data on forward upgrades.                                                                                      |
| 2026-08-07 | DEAD-004    | Removed unused `isMockMode` export from SUBAdmin `apiClient.js` to reduce dead code and confusion around active API mode behavior.                                                                                                                                            |
| 2026-08-07 | PERF-001    | Replaced STC moderator Users/Faculty/Subjects full-document metric reads with Firestore count aggregations and deduplicated legacy-compatible department queries. Unscoped routines and active-bus counting remain intentionally legacy-compatible pending data migration.    |
| 2026-08-07 | PERF-003    | Consolidated SUBAdmin collection caching on `CacheManager`/`FirestoreService`: removed duplicate Redux persisted payload caches for users, faculty, subjects, routines, lost & found, activity logs, transport, and dashboard state; force-refresh flags now reach API reads. |
| 2026-08-14 | BUG-006     | Fixed SUBMobile quote notifications: randomized notification titles dynamically based on time of day (Morning/Afternoon/Evening/Night) instead of hardcoded "Morning Inspiration", and updated `DailyQuoteReceiver` to fetch purely random quotes (`dao.getRandomQuote()`) without tracking unshown state. |
| 2026-08-14 | BUG-007     | Resolved SUBAdmin syntax error (`FiCheckCircle` icon export), Super Admin department locks across all management pages, added interactive `Ctrl+K` command palette global search, Notification Center with GPS overdue & system alerts, Cover Page recent generation logs table, and Activity Logs action filters & summary stats. |

## 10. Pending Work

See `MASTER_TODO.md` for the full prioritized backlog.
