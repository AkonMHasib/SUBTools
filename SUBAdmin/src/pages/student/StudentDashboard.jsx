import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logoutUser, setUser } from "../../redux/slices/authSlice";
import { isAdmin, isSuperAdmin, hasBothStudentAndAdmin, setActivePortalMode } from "../../utils/permissionUtils";
import useTheme from "../../hooks/useTheme";
import DatabaseService from "../../services/DatabaseService";
import { getSystemSettings, checkMaintenanceMode, getUserStats, updateUserPresence, isSupabaseConfigured, supabaseHeaders, SUPABASE_URL, updateSupabaseUser } from "../../supabase/config";
import { parseRoutineItem, parseBusItem, filterPersonalizedRoutine, normalizeSubjectCode, isSameSubjectCode } from "./utils/studentHelpers";
import { normalizeDept } from "../../utils/academic";

// Layout & Modal Components
import StudentNavbar from "./components/StudentNavbar";
import StudentSidebar from "./components/StudentSidebar";
import StudentStartupAdModal from "./components/StudentStartupAdModal";
import BannedAccountModal from "./components/BannedAccountModal";
import MaintenanceModal from "./components/MaintenanceModal";
import NoticeDetailModal from "./components/NoticeDetailModal";

// Modular Views Matching SUBMobile
import StudentHome from "./views/StudentHome";
import StudentRoutine from "./views/StudentRoutine";
import StudentSubjects from "./views/StudentSubjects";
import StudentExamRoutine from "./views/StudentExamRoutine";
import StudentCoverPage from "./views/StudentCoverPage";
import StudentTransport from "./views/StudentTransport";
import StudentNotices from "./views/StudentNotices";
import StudentSlides from "./views/StudentSlides";
import StudentFaculty from "./views/StudentFaculty";
import StudentBloodDonors from "./views/StudentBloodDonors";
import StudentCommunity from "./views/StudentCommunity";
import StudentLinksContacts from "./views/StudentLinksContacts";
import StudentAbout from "./views/StudentAbout";
import StudentProfile from "./views/StudentProfile";
import StudentAcademicReminders from "./views/StudentAcademicReminders";
import StudentContributors from "./views/StudentContributors";
import StudentNeedToTalk from "./views/StudentNeedToTalk";

export const StudentDashboard = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { theme, toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // Show lock reason if redirected from protected admin routes
  useEffect(() => {
    if (location.state?.lockedReason) {
      toast.warn(location.state.lockedReason, { toastId: "role-lock-warning" });
    }
  }, [location.state]);

  const isUserAdmin = isAdmin(user) || isSuperAdmin(user);
  const hasDualRole = hasBothStudentAndAdmin(user);

  // Map route path directly to active student section
  const activeSection = useMemo(() => {
    const raw = location.pathname.replace(/^\/portal\/?/, "").replace(/^\//, "");
    if (!raw) return "home";
    const segment = raw.split("/")[0].toLowerCase();
    const map = {
      "": "home",
      "home": "home",
      "routine": "routine",
      "routines": "routine",
      "class-routine": "routine",
      "subjects": "subjects",
      "exam": "exam",
      "exam-routine": "exam",
      "exams": "exam",
      "reminders": "reminders",
      "cover-page": "cover_page",
      "cover_page": "cover_page",
      "coverpages": "cover_page",
      "notices": "notices",
      "faculty": "faculty",
      "contributors": "contributors",
      "transport": "transport",
      "slides": "slides",
      "blood-donors": "blood_donors",
      "donors": "blood_donors",
      "community": "community",
      "lost-found": "community",
      "tuition-finder": "community",
      "sublets": "community",
      "need-to-talk": "need_to_talk",
      "links": "links_contacts",
      "links-contacts": "links_contacts",
      "about": "about",
      "profile": "profile",
    };
    return map[segment] || "home";
  }, [location.pathname]);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Dedicated real page navigation mapping
  const setActiveSection = (sectionId) => {
    const pathMap = {
      home: "/portal",
      routine: "/portal/routine",
      subjects: "/portal/subjects",
      exam: "/portal/exam-routine",
      reminders: "/portal/reminders",
      cover_page: "/portal/cover-page",
      notices: "/portal/notices",
      faculty: "/portal/faculty",
      contributors: "/portal/contributors",
      transport: "/portal/transport",
      slides: "/portal/slides",
      blood_donors: "/portal/blood-donors",
      community: "/portal/community",
      need_to_talk: "/portal/need-to-talk",
      links_contacts: "/portal/links",
      about: "/portal/about",
      profile: "/portal/profile",
    };
    const target = pathMap[sectionId] || `/portal/${sectionId}`;
    navigate(target);
  };

  // Convert legacy query parameters (?tab=exam) into real page URLs
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const pathMap = {
        home: "/portal",
        routine: "/portal/routine",
        subjects: "/portal/subjects",
        exam: "/portal/exam-routine",
        reminders: "/portal/reminders",
        cover_page: "/portal/cover-page",
        notices: "/portal/notices",
        faculty: "/portal/faculty",
        contributors: "/portal/contributors",
        transport: "/portal/transport",
        slides: "/portal/slides",
        blood_donors: "/portal/blood-donors",
        community: "/portal/community",
        need_to_talk: "/portal/need-to-talk",
        links_contacts: "/portal/links",
        about: "/portal/about",
        profile: "/portal/profile",
      };
      const target = pathMap[tabParam] || "/portal";
      navigate(target, { replace: true });
    }
  }, [searchParams, navigate]);

  // Data states
  const [buses, setBuses] = useState([]);
  const [notices, setNotices] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [slides, setSlides] = useState([]);
  const [examRoutines, setExamRoutines] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [donors, setDonors] = useState([]);
  const [lostFound, setLostFound] = useState([]);
  const [sublets, setSublets] = useState([]);
  const [tuitions, setTuitions] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannedModalOpen, setBannedModalOpen] = useState(false);
  const [maintenanceState, setMaintenanceState] = useState({ isMaintenance: false, message: "" });
  const [userStats, setUserStats] = useState({ totalUsers: 0, onlineUsers: 0 });
  const [activePopupNotice, setActivePopupNotice] = useState(null);

  const resolveUserSubjects = (u) => {
    if (!u) return [];
    const pool =
      u.subjects ??
      u.enrolled_subjects ??
      u.enrolledSubjects ??
      u.enrolledCodes ??
      u.data?.subjects ??
      u.data?.enrolled_subjects ??
      u.data?.enrolledSubjects ??
      [];

    let list = [];
    if (Array.isArray(pool)) {
      list = pool;
    } else if (typeof pool === "string" && pool.trim()) {
      try {
        const parsed = JSON.parse(pool);
        list = Array.isArray(parsed) ? parsed : Object.keys(parsed);
      } catch {
        list = pool.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
      }
    } else if (typeof pool === "object" && pool !== null) {
      list = Object.keys(pool);
    }
    return list.map(normalizeSubjectCode).filter(Boolean);
  };

  // Enrolled subjects state (initialized from user profile or localStorage)
  const storageKey = `subtools_enrolled_subjects_${user?.id || user?.uid || "guest"}`;
  const [enrolledCodes, setEnrolledCodes] = useState(() => {
    const userCodes = resolveUserSubjects(user);
    if (userCodes.length > 0) {
      return userCodes;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync enrolledCodes when user profile loads or changes from Supabase
  useEffect(() => {
    const userCodes = resolveUserSubjects(user);
    if (userCodes.length > 0) {
      setEnrolledCodes((prev) => {
        const prevSet = new Set(prev);
        const hasDiff = userCodes.length !== prev.length || userCodes.some((c) => !prevSet.has(c));
        return hasDiff ? userCodes : prev;
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify(userCodes));
      } catch (_) { }
    }
  }, [user?.id, user?.uid, user?.subjects, user?.enrolled_subjects, user?.enrolledSubjects]);

  const handleToggleEnroll = async (code) => {
    if (!code) return;
    const cleanCode = normalizeSubjectCode(code);
    const isEnrolled = enrolledCodes.some((c) => normalizeSubjectCode(c) === cleanCode);

    let next;
    if (isEnrolled) {
      next = enrolledCodes.filter((c) => normalizeSubjectCode(c) !== cleanCode);
      toast.info(`Removed ${code} from registered courses.`);
    } else {
      next = [...enrolledCodes, cleanCode];
      toast.success(`Enrolled in ${code}!`);
    }

    setEnrolledCodes(next);

    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (_) { }

    // Update Redux user and localStorage session immediately
    const updatedUser = { ...user, subjects: next };
    dispatch(setUser(updatedUser));
    try {
      localStorage.setItem("subtools_user", JSON.stringify(updatedUser));
    } catch (_) { }

    // Synchronize to Supabase Auth metadata using canonical 'subjects' key
    const authToken = localStorage.getItem("subtools_supabase_token") || localStorage.getItem("subtools_token");
    if (authToken && isSupabaseConfigured()) {
      try {
        await updateSupabaseUser(authToken, {
          data: {
            subjects: next,
            enrolled_subjects: null,
            enrolledSubjects: null,
          },
        });
      } catch (err) {
        console.warn("Failed to sync subjects to Supabase Auth:", err);
      }
    }
  };

  // Completed subjects state (initialized from user profile or localStorage)
  const completedStorageKey = `subtools_completed_subjects_${user?.id || "guest"}`;
  const [completedCodes, setCompletedCodes] = useState(() => {
    const list = user?.completed_subjects || user?.completedSubjects;
    if (list && Array.isArray(list) && list.length > 0) {
      return list.map(normalizeSubjectCode).filter(Boolean);
    }
    try {
      const saved = localStorage.getItem(completedStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [completedCredits, setCompletedCredits] = useState(() => {
    return Number(user?.completedCredits || user?.completed_credits || 0);
  });

  // Sync completedCodes when user profile loads or changes from Supabase
  useEffect(() => {
    const list = user?.completed_subjects || user?.completedSubjects;
    if (list && Array.isArray(list)) {
      const clean = list.map(normalizeSubjectCode).filter(Boolean);
      setCompletedCodes(clean);
      try {
        localStorage.setItem(completedStorageKey, JSON.stringify(clean));
      } catch (_) { }
    }
    if (user?.completedCredits !== undefined || user?.completed_credits !== undefined) {
      setCompletedCredits(Number(user?.completedCredits || user?.completed_credits || 0));
    }
  }, [user?.id, user?.completed_subjects, user?.completedSubjects, user?.completedCredits, user?.completed_credits]);

  const handleToggleCompleted = async (code) => {
    if (!code) return;
    const cleanCode = normalizeSubjectCode(code);
    const isCompleted = completedCodes.some((c) => normalizeSubjectCode(c) === cleanCode);

    let nextCompleted;
    if (isCompleted) {
      nextCompleted = completedCodes.filter((c) => normalizeSubjectCode(c) !== cleanCode);
      toast.info(`Unmarked ${code} from completed courses.`);
    } else {
      nextCompleted = [...completedCodes, cleanCode];
      toast.success(`Marked ${code} as completed!`);
    }

    // Calculate completed credits from subjects list
    const subjectObj = subjects.find(
      (s) => isSameSubjectCode(normalizeSubjectCode(s.code || s.subject_code || s.course_code), cleanCode)
    );
    const subCredits = Number(subjectObj?.credits || subjectObj?.credit || 3) || 3;
    const newCreditTotal = Math.max(0, isCompleted ? completedCredits - subCredits : completedCredits + subCredits);

    setCompletedCodes(nextCompleted);
    setCompletedCredits(newCreditTotal);

    try {
      localStorage.setItem(completedStorageKey, JSON.stringify(nextCompleted));
    } catch (_) { }

    const updatedUser = {
      ...user,
      completed_subjects: nextCompleted,
      completedSubjects: nextCompleted,
      completed_credits: newCreditTotal,
      completedCredits: newCreditTotal,
    };
    dispatch(setUser(updatedUser));
    try {
      localStorage.setItem("subtools_user", JSON.stringify(updatedUser));
    } catch (_) { }

    // Synchronize to Supabase Auth metadata using canonical snake_case keys
    const authToken = localStorage.getItem("subtools_supabase_token") || localStorage.getItem("subtools_token");
    if (authToken && isSupabaseConfigured()) {
      try {
        await updateSupabaseUser(authToken, {
          data: {
            completed_subjects: nextCompleted,
            completed_credits: newCreditTotal,
            completedSubjects: null,
            completedCredits: null,
          },
        });
      } catch (err) {
        console.warn("Failed to sync completed subjects to Supabase Auth:", err);
      }
    }
  };

  const handleUpdateCompletedCredits = async (newVal) => {
    const num = Number(newVal);
    if (isNaN(num) || num < 0) {
      toast.error("Please enter a valid credit number.");
      return;
    }
    setCompletedCredits(num);

    const updatedUser = {
      ...user,
      completed_credits: num,
      completedCredits: num,
    };
    dispatch(setUser(updatedUser));
    try {
      localStorage.setItem("subtools_user", JSON.stringify(updatedUser));
    } catch (_) { }

    const authToken = localStorage.getItem("subtools_supabase_token") || localStorage.getItem("subtools_token");
    if (authToken && isSupabaseConfigured()) {
      try {
        await updateSupabaseUser(authToken, {
          data: {
            completed_credits: num,
            completedCredits: num,
          },
        });
        toast.success(`Completed credits updated to ${num.toFixed(1)} CR!`);
      } catch (err) {
        toast.error("Failed to update credits: " + err.message);
      }
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    window.location.href = "/login";
  };

  const handleUpdateProfile = async (patch) => {
    if (!user?.id) return;
    try {
      const pUrl = patch.photo_url || patch.photoURL || user.photo_url || user.photoURL || "";
      const updatedUser = {
        ...user,
        ...patch,
        photo_url: pUrl,
        photoURL: pUrl,
        avatar_url: pUrl,
      };

      const authToken = localStorage.getItem("subtools_supabase_token") || localStorage.getItem("subtools_token");
      if (authToken && isSupabaseConfigured()) {
        await updateSupabaseUser(authToken, {
          data: {
            ...patch,
            photo_url: pUrl,
            photoURL: pUrl,
            avatar_url: pUrl,
          },
        });
      }

      dispatch(setUser(updatedUser));
      try {
        localStorage.setItem("subtools_user", JSON.stringify(updatedUser));
      } catch (_) { }
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("Failed to update profile: " + (err.message || err));
    }
  };

  // Ads state (matching Android SUBMobile App placements)
  const [homeAd, setHomeAd] = useState({ imageUrl: "", targetUrl: "", enabled: false });
  const [navAd, setNavAd] = useState({ imageUrl: "", targetUrl: "", enabled: false });
  const [fullscreenAd, setFullscreenAd] = useState({ imageUrl: "", targetUrl: "", title: "", enabled: false });
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);

  // Filters
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[new Date().getDay()];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [facultySearch, setFacultySearch] = useState("");

  const userDept = (user?.department || "CSE").toUpperCase();

  // Load all academic data + ads
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        busList,
        noticeList,
        routineList,
        subjectList,
        slideList,
        examList,
        facultyList,
        userList,
        lfList,
        subletList,
        tuitionList,
        holidayList,
        routeList,
        adsCfg,
        appUpdateCfg,
      ] = await Promise.all([
        DatabaseService.getCachedCollection("buses").catch(() => []),
        DatabaseService.getCachedCollection("notices").catch(() => []),
        DatabaseService.getCachedCollection("routines").catch(() => []),
        DatabaseService.getCachedCollection("subjects").catch(() => []),
        DatabaseService.getCachedCollection("slides").catch(() => []),
        DatabaseService.getCachedCollection("exam_routines").catch(() => []),
        DatabaseService.getCachedCollection("faculty").catch(() => []),
        DatabaseService.getCachedCollection("users").catch(() => []),
        DatabaseService.getCachedCollection("lostFound").catch(() => []),
        DatabaseService.getCachedCollection("sublets").catch(() => []),
        DatabaseService.getCachedCollection("tuitions").catch(() => []),
        DatabaseService.getCachedCollection("holidays").catch(() => []),
        DatabaseService.getCachedCollection("routes").catch(() => []),
        getSystemSettings("ads").catch(() => null),
        getSystemSettings("app_update").catch(() => null),
      ]);

      setBuses((busList || []).map(parseBusItem));
      setNotices(noticeList || []);
      setRoutines((routineList || []).map(parseRoutineItem));
      setSubjects(subjectList || []);
      setSlides(slideList || []);
      setExamRoutines(examList || []);
      setFaculty(facultyList || []);
      setLostFound(lfList || []);
      setSublets(subletList || []);
      setTuitions(tuitionList || []);
      setHolidays(holidayList || []);
      setRoutes(routeList || []);

      // Extract blood donors from users list
      const donorUsers = (userList || []).filter(
        (u) =>
          u.allowBloodDonation ||
          (u.bloodGroup && u.bloodGroup !== "?" && u.bloodGroup.toUpperCase() !== "N/A")
      );
      setDonors(donorUsers);

      // Cross-reference current user with users collection to ensure latest subjects and profile data
      const currentDbUser = (userList || []).find(
        (u) =>
          (user?.id && (u.id === user.id || u.uid === user.id)) ||
          (user?.uid && (u.id === user.uid || u.uid === user.uid)) ||
          (user?.email && u.email && u.email.toLowerCase() === (user.email || "").toLowerCase()) ||
          (user?.studentId && (u.studentId === user.studentId || u.student_id === user.studentId))
      );
      if (currentDbUser) {
        const dbCodes = resolveUserSubjects(currentDbUser);
        if (dbCodes.length > 0) {
          setEnrolledCodes((prev) => {
            const prevSet = new Set(prev);
            const hasDiff = dbCodes.length !== prev.length || dbCodes.some((c) => !prevSet.has(c));
            return hasDiff ? dbCodes : prev;
          });
          try {
            localStorage.setItem(storageKey, JSON.stringify(dbCodes));
          } catch (_) {}
          if (!user?.subjects || user.subjects.length === 0) {
            const updated = {
              ...user,
              ...currentDbUser,
              subjects: dbCodes,
              enrolled_subjects: dbCodes,
              enrolledSubjects: dbCodes,
            };
            dispatch(setUser(updated));
            try {
              localStorage.setItem("subtools_user", JSON.stringify(updated));
            } catch (_) {}
          }
        }
      }

      // Load Ads
      const combined = adsCfg || appUpdateCfg || {};
      const fallbackCombined = appUpdateCfg || adsCfg || {};

      const nav =
        combined.nav_drawer ||
        combined.nav_drawer_ad ||
        fallbackCombined.nav_drawer ||
        fallbackCombined.nav_drawer_ad;
      const home =
        combined.homepage ||
        combined.homepage_ad ||
        fallbackCombined.homepage ||
        fallbackCombined.homepage_ad;
      const fs =
        combined.fullscreen_ad ||
        combined.fullscreen ||
        fallbackCombined.fullscreen_ad ||
        fallbackCombined.fullscreen;

      if (nav && nav.imageUrl && nav.enabled !== false) {
        setNavAd({ imageUrl: nav.imageUrl, targetUrl: nav.targetUrl || "", enabled: true });
      } else {
        setNavAd({ imageUrl: "", targetUrl: "", enabled: false });
      }

      if (home && home.imageUrl && home.enabled !== false) {
        setHomeAd({
          imageUrl: home.imageUrl,
          targetUrl: home.targetUrl || "",
          enabled: true,
        });
      } else {
        setHomeAd({
          imageUrl: "",
          targetUrl: "",
          enabled: false,
        });
      }
      if (fs && fs.imageUrl && fs.enabled !== false) {
        setFullscreenAd({
          imageUrl: fs.imageUrl,
          targetUrl: fs.targetUrl || "",
          title: fs.title || "",
          enabled: true,
        });

        if (!sessionStorage.getItem("subtools_startup_ad_shown")) {
          setShowFullscreenModal(true);
          sessionStorage.setItem("subtools_startup_ad_shown", "true");
        }
      }
    } catch (err) {
      console.warn("Failed to load student dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Remote Maintenance Mode Guard matching Android checkMaintenanceAndPopups
  const runMaintenanceCheck = async () => {
    try {
      const res = await checkMaintenanceMode();
      setMaintenanceState(res);
      return res;
    } catch (err) {
      console.warn("Maintenance check failed:", err);
      return { isMaintenance: false, message: "" };
    }
  };

  useEffect(() => {
    runMaintenanceCheck();
  }, []);

  // Live real-time student & online counts matching Android MainActivity.setupUserStats
  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        const stats = await getUserStats();
        if (isMounted) {
          setUserStats(stats);
        }
      } catch (err) {
        console.warn("Failed to load user stats:", err);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 60000); // 1-minute live sync
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Student Online Heartbeat Tracker matching Android OnlineTracker.java
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;
    const uid = user.id;

    // Immediately mark online
    updateUserPresence(uid, true);

    // Heartbeat every 3 minutes (matching Android HEARTBEAT_INTERVAL_MS)
    const interval = setInterval(() => {
      updateUserPresence(uid, true);
    }, 3 * 60 * 1000);

    const handleBeforeUnload = () => {
      updateUserPresence(uid, false);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user?.id]);

  // Check remote banned status matching Android MainActivity.checkRemoteBannedStatus
  useEffect(() => {
    let isMounted = true;
    const checkRemoteBannedStatus = async () => {
      if (!user?.id || !isSupabaseConfigured()) return;
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}&select=id,status,data`,
          { headers: supabaseHeaders() }
        );
        if (res.ok) {
          const arr = await res.json();
          if (Array.isArray(arr) && arr.length > 0) {
            const u = arr[0];
            let isBanned = Boolean(u.is_banned);
            let status = u.status || "";
            if (u.data && typeof u.data === "object") {
              if (!isBanned && u.data.is_banned) isBanned = true;
              if (!status && u.data.status) status = u.data.status;
            }
            if (
              isBanned ||
              status?.toLowerCase() === "banned" ||
              status?.toLowerCase() === "disabled"
            ) {
              if (isMounted) {
                setBannedModalOpen(true);
                dispatch(logoutUser());
              }
            }
          }
        }
      } catch (err) {
        console.warn("Banned status check failed:", err);
      }
    };

    checkRemoteBannedStatus();
    return () => {
      isMounted = false;
    };
  }, [user?.id, dispatch]);

  // Check in-app startup popup notices matching Android MainActivity.checkInAppPopupNotices
  useEffect(() => {
    if (!notices || notices.length === 0) return;
    try {
      const seenIds = JSON.parse(localStorage.getItem("subtools_seen_popup_ids") || "[]");
      const currentDept = (userDept || "ALL").trim().toUpperCase();

      for (const n of notices) {
        if (!n || !n.id) continue;
        const type = String(n.type || "").toLowerCase();
        const priority = String(n.priority || "").toLowerCase();
        const isPopup =
          type === "in-app popup" ||
          priority === "in-app popup" ||
          type === "popup" ||
          priority === "popup" ||
          Boolean(n.is_popup) ||
          Boolean(n.isPopup);

        if (isPopup) {
          if (seenIds.includes(n.id)) continue;

          const nDept = String(n.department || "ALL").trim().toUpperCase();
          const deptMatch = nDept === "" || nDept === "ALL" || nDept === currentDept;

          if (deptMatch) {
            setActivePopupNotice(n);
            break; // Show only one at a time to prevent stacking
          }
        }
      }
    } catch (err) {
      console.warn("Failed checking startup popup notice:", err);
    }
  }, [notices, userDept]);

  const handleDismissPopupNotice = () => {
    if (activePopupNotice?.id) {
      try {
        const seenIds = JSON.parse(localStorage.getItem("subtools_seen_popup_ids") || "[]");
        if (!seenIds.includes(activePopupNotice.id)) {
          seenIds.push(activePopupNotice.id);
          localStorage.setItem("subtools_seen_popup_ids", JSON.stringify(seenIds));
        }
      } catch (_) { }
    }
    setActivePopupNotice(null);
  };

  // Ad click handler
  const handleAdClick = (placement, targetUrl) => {
    recordAdClickEvent({
      placement,
      targetUrl,
      userId: user?.id,
    });
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Community creation handlers
  const handleAddLostFound = async (data) => {
    try {
      const pPhoto = data.photo_url || data.imageUrl || data.photoUrl || "";
      const payload = {
        ...data,
        photo_url: pPhoto,
        photoUrl: pPhoto,
        imageUrl: pPhoto,
        approvalStatus: "pending",
        publisherUid: user?.id || user?.uid || "",
        reporterName: user?.name || user?.fullName || "Student",
        reporterPhone: user?.phone || data.contact || "",
        created_at: new Date().toISOString(),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
      if (isSupabaseConfigured()) {
        await DatabaseService.addDocument("lostFound", payload);
      }
      setLostFound((prev) => [payload, ...prev]);
      toast.success("Lost & Found report submitted! Pending admin review.");
    } catch (err) {
      toast.error("Failed to post report: " + err.message);
    }
  };

  const handleAddSublet = async (data) => {
    try {
      const pPhoto = data.photo_url || data.photoUrl || data.imageUrl || "";
      const payload = {
        ...data,
        photo_url: pPhoto,
        photoUrl: pPhoto,
        imageUrl: pPhoto,
        approvalStatus: "pending",
        publisherUid: user?.id || user?.uid || "",
        contactName: user?.name || user?.fullName || "Student",
        created_at: new Date().toISOString(),
      };
      if (isSupabaseConfigured()) {
        await DatabaseService.addDocument("sublets", payload);
      }
      setSublets((prev) => [payload, ...prev]);
      toast.success("Room sublet listing published! Pending admin review.");
    } catch (err) {
      toast.error("Failed to post sublet: " + err.message);
    }
  };

  const handleAddTuition = async (data) => {
    try {
      const payload = {
        ...data,
        approvalStatus: "pending",
        publisherUid: user?.id || user?.uid || "",
        contactName: user?.name || user?.fullName || "Student",
        created_at: new Date().toISOString(),
      };
      if (isSupabaseConfigured()) {
        await DatabaseService.addDocument("tuitions", payload);
      }
      setTuitions((prev) => [payload, ...prev]);
      toast.success("Tuition request posted! Pending admin review.");
    } catch (err) {
      toast.error("Failed to post tuition: " + err.message);
    }
  };

  const handleRegisterDonor = (donorInfo) => {
    setDonors((prev) => [donorInfo, ...prev]);
    toast.success("Thank you! You are now registered as an emergency donor.");
  };

  // Filter personalized routines matching Android RoutineViewModel & AcademicHelper
  const personalizedRoutines = useMemo(() => {
    return filterPersonalizedRoutine(
      routines,
      userDept,
      user?.academicLevel || user?.term || user?.batch || "",
      user?.section || "",
      enrolledCodes,
      completedCodes
    );
  }, [routines, userDept, user?.academicLevel, user?.term, user?.batch, user?.section, enrolledCodes, completedCodes]);

  // Filter routines by personalized subjects & selected day
  const filteredRoutines = useMemo(() => {
    return personalizedRoutines.filter((r) => {
      if (selectedDay === "All Days") return true;
      return String(r.day || "").toLowerCase() === selectedDay.toLowerCase();
    });
  }, [personalizedRoutines, selectedDay]);

  // Filter notices for this department or general broadcast
  const filteredNotices = notices.filter((n) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.body && n.body.toLowerCase().includes(q));
    const matchDept =
      !n.department ||
      String(n.department).toUpperCase() === "ALL" ||
      String(n.department).toUpperCase() === userDept;
    return matchQuery && matchDept;
  });

  // Filter faculty strictly by user's department and search query
  const filteredFaculty = faculty.filter((f) => {
    // 1. Department match: only show faculty from the student's department
    const facDeptNorm = normalizeDept(f.department);
    const userDeptNorm = normalizeDept(userDept);
    if (userDeptNorm && facDeptNorm && facDeptNorm !== userDeptNorm) {
      return false;
    }

    // 2. Search query match
    if (!facultySearch.trim()) return true;
    const q = facultySearch.toLowerCase();
    return (
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.designation && f.designation.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q)) ||
      (f.initial && f.initial.toLowerCase().includes(q)) ||
      (f.department && f.department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 overflow-hidden">
      {/* 1. TOP NAVBAR (Sticky header) */}
      <StudentNavbar
        user={user}
        userDept={userDept}
        isUserAdmin={isUserAdmin}
        userStats={userStats}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      {/* 2. BODY: Categorized Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* SIDEBAR NAVIGATION COMPONENT (Fixed to viewport) */}
        <StudentSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          userStats={userStats}
          isUserAdmin={isUserAdmin}
          hasDualRole={hasDualRole}
          onLogout={handleLogout}
        />

        {/* MAIN SCROLLABLE VIEW (Offset by sidebar width on desktop, full width layout) */}
        <main className="flex-1 md:ml-64 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full min-w-0">

          {activeSection === "home" && (
            <StudentHome
              filteredRoutines={filteredRoutines}
              selectedDay={selectedDay}
              buses={buses}
              filteredNotices={filteredNotices}
              slides={slides}
              examRoutines={examRoutines}
              userDept={userDept}
              enrolledCodes={enrolledCodes}
              completedCodes={completedCodes}
              homeAd={homeAd}
              onAdClick={handleAdClick}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === "routine" && (
            <StudentRoutine
              routines={routines}
              personalizedRoutines={personalizedRoutines}
              filteredRoutines={filteredRoutines}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              userDept={userDept}
              user={user}
              enrolledCodes={enrolledCodes}
              completedCodes={completedCodes}
              holidays={holidays}
            />
          )}

          {activeSection === "subjects" && (
            <StudentSubjects
              subjects={subjects}
              userDept={userDept}
              enrolledCodes={enrolledCodes}
              onToggleEnroll={handleToggleEnroll}
              completedCodes={completedCodes}
              onToggleCompleted={handleToggleCompleted}
              onUpdateCompletedCredits={handleUpdateCompletedCredits}
              completedCreditsOverride={completedCredits}
              user={user}
            />
          )}

          {activeSection === "exam" && (
            <StudentExamRoutine
              examRoutines={examRoutines}
              userDept={userDept}
              user={user}
            />
          )}

          {activeSection === "reminders" && (
            <StudentAcademicReminders user={user} />
          )}

          {activeSection === "cover_page" && (
            <StudentCoverPage
              user={user}
              userDept={userDept}
              enrolledCodes={enrolledCodes}
              enrolledSubjects={subjects.filter((s) => {
                const sCode = normalizeSubjectCode(s.code || s.subject_code || s.course_code);
                return enrolledCodes.some((c) => normalizeSubjectCode(c) === sCode);
              })}
              allSubjects={subjects}
              routines={routines}
              facultyList={faculty}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === "transport" && (
            <StudentTransport
              buses={buses}
              routes={routes}
            />
          )}

          {activeSection === "notices" && (
            <StudentNotices
              notices={notices}
              filteredNotices={filteredNotices}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              user={user}
              userDept={userDept}
            />
          )}

          {activeSection === "slides" && (
            <StudentSlides
              slides={slides}
              userDept={userDept}
            />
          )}

          {activeSection === "faculty" && (
            <StudentFaculty
              filteredFaculty={filteredFaculty}
              facultySearch={facultySearch}
              setFacultySearch={setFacultySearch}
              userDept={userDept}
            />
          )}

          {activeSection === "contributors" && (
            <StudentContributors />
          )}

          {activeSection === "blood_donors" && (
            <StudentBloodDonors
              donors={donors}
              currentUser={user}
              userDept={userDept}
              onRegisterDonor={handleRegisterDonor}
            />
          )}

          {activeSection === "community" && (
            <StudentCommunity
              lostFound={lostFound}
              sublets={sublets}
              tuitions={tuitions}
              currentUser={user}
              onAddLostFound={handleAddLostFound}
              onAddSublet={handleAddSublet}
              onAddTuition={handleAddTuition}
            />
          )}

          {activeSection === "need_to_talk" && (
            <StudentNeedToTalk user={user} />
          )}

          {activeSection === "links_contacts" && (
            <StudentLinksContacts />
          )}

          {activeSection === "about" && (
            <StudentAbout />
          )}

          {activeSection === "profile" && (
            <StudentProfile
              user={user}
              userDept={userDept}
              isUserAdmin={isUserAdmin}
              hasDualRole={hasDualRole}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* 3. STARTUP AD MODAL */}
      <StudentStartupAdModal
        isOpen={showFullscreenModal}
        onClose={() => setShowFullscreenModal(false)}
        fullscreenAd={fullscreenAd}
        onAdClick={handleAdClick}
      />

      {/* 4. BANNED ACCOUNT MODAL */}
      <BannedAccountModal
        isOpen={bannedModalOpen}
        onConfirm={() => {
          dispatch(logoutUser());
          window.location.href = "/login";
        }}
      />

      {/* 5. MAINTENANCE MODE MODAL */}
      <MaintenanceModal
        isOpen={maintenanceState.isMaintenance}
        message={maintenanceState.message}
        onRetry={runMaintenanceCheck}
      />

      {/* 6. IN-APP POPUP NOTICE MODAL */}
      <NoticeDetailModal
        notice={activePopupNotice}
        isOpen={Boolean(activePopupNotice)}
        onClose={handleDismissPopupNotice}
      />
    </div>
  );
};

export default StudentDashboard;
