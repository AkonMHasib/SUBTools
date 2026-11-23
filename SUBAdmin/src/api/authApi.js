// 100% Pure Supabase Authentication API Layer
import DatabaseService from "../services/DatabaseService";
import { isSuperAdminEmail } from "../utils/permissionUtils";
import {
  isSupabaseConfigured,
  resolveEmailViaSupabase,
  signInWithSupabase,
  signUpWithSupabase,
  checkStudentIdExists,
  sendSupabasePasswordReset,
  getSupabaseUser,
  updateSupabaseUser,
  signOutSupabase,
} from "../supabase/config";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resolveLoginEmail = async (identifier) => {
  const value = String(identifier || "").trim();
  if (EMAIL_PATTERN.test(value)) return value;

  // 1. Try Supabase RPC get_email_by_identifier
  try {
    const sbEmail = await resolveEmailViaSupabase(value);
    if (sbEmail) return sbEmail;
  } catch (_) {}

  // 2. Fallback: Search Supabase PostgreSQL users table
  try {
    const users = await DatabaseService.getCachedCollection("users");
    const match = users.find(
      (u) => u.phone === value || u.studentId === value || u.student_id === value || u.uid === value || u.id === value
    );
    if (match?.email) return match.email;
  } catch (e) {
    console.warn("Silent lookup fallback for email login:", e);
  }

  throw new Error("No account found for that Student ID, email, or phone number.");
};

const buildUserData = (supabaseUser, extraData = {}) => {
  const email = (supabaseUser.email || extraData.email || "").toLowerCase().trim();
  const userMeta = supabaseUser.user_metadata || {};
  const appMeta = supabaseUser.app_metadata || {};

  const resolvedRoles = Array.isArray(appMeta.roles) && appMeta.roles.length > 0
    ? appMeta.roles.map((r) => String(r).toLowerCase().trim())
    : (Array.isArray(userMeta.roles) && userMeta.roles.length > 0
      ? userMeta.roles.map((r) => String(r).toLowerCase().trim())
      : (Array.isArray(extraData.roles) && extraData.roles.length > 0
        ? extraData.roles.map((r) => String(r).toLowerCase().trim())
        : [String(appMeta.role || userMeta.role || extraData.role || "student").toLowerCase().trim()]));

  const isSuper = isSuperAdminEmail(email) ||
    resolvedRoles.includes("super_admin") ||
    appMeta.isSuperAdmin === true ||
    userMeta.isSuperAdmin === true ||
    extraData.isSuperAdmin === true;

  if (isSuper && !resolvedRoles.includes("super_admin")) {
    resolvedRoles.unshift("super_admin");
  }
  if (isSuper && !resolvedRoles.includes("admin")) {
    resolvedRoles.push("admin");
  }

  const primaryRole = isSuper ? "super_admin" : (resolvedRoles[0] || "student");

  const nestedData = (extraData.data && typeof extraData.data === "object") ? extraData.data : {};
  const userMetaData = (userMeta.data && typeof userMeta.data === "object") ? userMeta.data : {};

  // Parse enrolled subjects list from all potential profile / auth metadata sources
  const rawSubjectsData =
    extraData.subjects ??
    extraData.enrolled_subjects ??
    extraData.enrolledSubjects ??
    extraData.enrolledCodes ??
    nestedData.subjects ??
    nestedData.enrolled_subjects ??
    nestedData.enrolledSubjects ??
    userMeta.subjects ??
    userMeta.enrolled_subjects ??
    userMeta.enrolledSubjects ??
    userMetaData.subjects ??
    userMetaData.enrolled_subjects ??
    userMetaData.enrolledSubjects ??
    appMeta.subjects ??
    appMeta.enrolled_subjects ??
    [];

  let parsedSubjects = [];
  if (Array.isArray(rawSubjectsData)) {
    parsedSubjects = rawSubjectsData;
  } else if (typeof rawSubjectsData === "string" && rawSubjectsData.trim().length > 0) {
    const trimmed = rawSubjectsData.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const decoded = JSON.parse(trimmed);
        if (Array.isArray(decoded)) {
          parsedSubjects = decoded;
        } else if (typeof decoded === "object" && decoded !== null) {
          parsedSubjects = Object.keys(decoded);
        }
      } catch {
        parsedSubjects = trimmed.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
      }
    } else {
      parsedSubjects = trimmed.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
    }
  } else if (typeof rawSubjectsData === "object" && rawSubjectsData !== null) {
    parsedSubjects = Object.keys(rawSubjectsData);
  }

  const subjects = parsedSubjects
    .map((item) => {
      if (!item) return "";
      if (typeof item === "object") {
        return item.code || item.subject_code || item.course_code || item.subjectCode || item.id || item.name || "";
      }
      return String(item).trim();
    })
    .filter(Boolean);
  const emailLower = (email || "").toLowerCase();

  let studentId =
    extraData.studentId ||
    extraData.student_id ||
    nestedData.studentId ||
    nestedData.student_id ||
    userMeta.studentId ||
    userMeta.student_id ||
    "";
  if (!studentId && emailLower) {
    const match = emailLower.match(/(\d{4,9})/);
    if (match) studentId = match[1];
  }

  let department =
    extraData.department ||
    nestedData.department ||
    appMeta.department ||
    userMeta.department ||
    "";
  if (!department || department === "CSE" || department === "N/A") {
    if (emailLower.includes(".arch.") || emailLower.includes("arch")) {
      department = "ARCH";
    } else if (emailLower.includes(".cse.") || emailLower.includes("cse")) {
      department = "CSE";
    } else if (emailLower.includes(".bba.") || emailLower.includes("bba")) {
      department = "BBA";
    } else if (emailLower.includes(".eng.") || emailLower.includes("eng")) {
      department = "ENG";
    } else if (emailLower.includes(".pharm") || emailLower.includes("b.pharm")) {
      department = "B.PHARM";
    } else if (emailLower.includes(".law.") || emailLower.includes("llb")) {
      department = "LLB";
    } else if (!department) {
      department = "CSE";
    }
  }

  let batch = extraData.batch || nestedData.batch || userMeta.batch || "";
  if (!batch && emailLower) {
    const match = emailLower.match(/\.(\d{2,3})\d{3}@/);
    if (match) batch = match[1];
  }

  let section =
    extraData.section ||
    nestedData.section ||
    userMeta.section ||
    "";

  const isArchDept = String(department).toUpperCase().includes("ARCH") || emailLower.includes(".arch.");
  const academicSystem = isArchDept
    ? "Architecture"
    : (extraData.academic_system ||
       extraData.academicSystem ||
       nestedData.academic_system ||
       nestedData.academicSystem ||
       userMeta.academic_system ||
       userMeta.academicSystem ||
       "Semester");

  let academicLevel =
    extraData.academic_level ||
    extraData.academicLevel ||
    nestedData.academic_level ||
    nestedData.academicLevel ||
    extraData.term ||
    nestedData.term ||
    userMeta.academic_level ||
    userMeta.academicLevel ||
    userMeta.term ||
    "";
  if (!academicLevel && isArchDept) {
    academicLevel = "Studio-1";
  }

  const bloodGroup =
    extraData.blood_group ||
    extraData.bloodGroup ||
    nestedData.blood_group ||
    nestedData.bloodGroup ||
    userMeta.blood_group ||
    userMeta.bloodGroup ||
    "";

  const isDonor = Boolean(
    extraData.is_donor ||
    extraData.allowBloodDonation ||
    nestedData.is_donor ||
    nestedData.allowBloodDonation ||
    userMeta.is_donor ||
    userMeta.allowBloodDonation
  );

  const dob =
    extraData.birthday ||
    extraData.dob ||
    nestedData.birthday ||
    nestedData.dob ||
    userMeta.birthday ||
    userMeta.dob ||
    "";

  const city = extraData.city || nestedData.city || userMeta.city || "";
  const area = extraData.area || nestedData.area || userMeta.area || "";
  const location =
    extraData.location ||
    extraData.address ||
    nestedData.location ||
    nestedData.address ||
    userMeta.location ||
    userMeta.address ||
    (area && city ? `${area}, ${city}` : (city || area || ""));

  const bio = extraData.bio || nestedData.bio || userMeta.bio || "";
  const completedSubjects =
    extraData.completed_subjects ||
    extraData.completedSubjects ||
    nestedData.completed_subjects ||
    nestedData.completedSubjects ||
    userMeta.completed_subjects ||
    userMeta.completedSubjects ||
    [];

  const completedCredits = Number(
    extraData.completed_credits ||
    extraData.completedCredits ||
    nestedData.completed_credits ||
    nestedData.completedCredits ||
    userMeta.completedCredits ||
    userMeta.completed_credits ||
    0
  );

  const photoUrl =
    extraData.photo_url ||
    extraData.photoURL ||
    extraData.avatar_url ||
    nestedData.photo_url ||
    nestedData.photoURL ||
    nestedData.avatar_url ||
    userMeta.photo_url ||
    userMeta.photoURL ||
    userMeta.avatar_url ||
    userMeta.avatarUrl ||
    "";

  return {
    uid: supabaseUser.id || supabaseUser.uid || extraData.id || extraData.uid,
    id: supabaseUser.id || supabaseUser.uid || extraData.id || extraData.uid,
    name: extraData.name || extraData.full_name || nestedData.name || nestedData.full_name || userMeta.name || userMeta.full_name || email.split("@")[0] || "User",
    fullName: extraData.name || extraData.full_name || nestedData.name || nestedData.full_name || userMeta.name || userMeta.full_name || email.split("@")[0] || "User",
    email: email,
    studentId: studentId,
    phone: extraData.phone || nestedData.phone || userMeta.phone || "",
    department: department,
    batch: batch,
    section: section || "",
    term: academicLevel || (isArchDept ? "Studio-1" : "Undergraduate"),
    academicLevel: academicLevel,
    academicSystem: academicSystem,
    bloodGroup: bloodGroup,
    allowBloodDonation: isDonor,
    isDonor: isDonor,
    dob: dob,
    city: city,
    area: area,
    location: location,
    bio: bio,
    subjects: subjects,
    enrolled_subjects: subjects,
    enrolledSubjects: subjects,
    completed_subjects: completedSubjects,
    completedSubjects: completedSubjects,
    completedCredits: completedCredits,
    role: primaryRole,
    roles: resolvedRoles,
    activeRole: primaryRole,
    isAdmin: isSuper || resolvedRoles.includes("admin") || appMeta.isAdmin === true || userMeta.isAdmin === true,
    isSuperAdmin: isSuper,
    photo_url: photoUrl,
    photoURL: photoUrl,
    token: extraData.accessToken || localStorage.getItem("subtools_supabase_token") || "",
    supabaseToken: extraData.accessToken || localStorage.getItem("subtools_supabase_token") || "",
  };
};

export const authApi = {
  fetchUserProfile: async (supabaseUser) => {
    if (!supabaseUser) {
      const token = localStorage.getItem("subtools_supabase_token") || localStorage.getItem("subtools_token");
      if (!token) {
        const cachedUser = localStorage.getItem("subtools_user");
        if (cachedUser) {
          try {
            return JSON.parse(cachedUser);
          } catch (_) {}
        }
        return null;
      }
      supabaseUser = await getSupabaseUser(token);
      if (!supabaseUser) {
        const cachedUser = localStorage.getItem("subtools_user");
        if (cachedUser) {
          try {
            return JSON.parse(cachedUser);
          } catch (_) {}
        }
        return null;
      }
    }

    let userDbRecord = null;
    const userId = supabaseUser.id || supabaseUser.uid;
    const email = (supabaseUser.email || "").toLowerCase().trim();

    try {
      userDbRecord = await DatabaseService.getDocument("users", userId);
    } catch (_) {}

    if (!userDbRecord && email) {
      try {
        const users = await DatabaseService.getCachedCollection("users");
        userDbRecord = users.find(
          (u) =>
            u.id === userId ||
            u.uid === userId ||
            (u.email && u.email.toLowerCase() === email)
        );
      } catch (_) {}
    }

    const userData = buildUserData(supabaseUser, userDbRecord || {});
    localStorage.setItem("subtools_user", JSON.stringify(userData));
    localStorage.setItem("subtools_token", userData.token);
    return userData;
  },

  login: async (identifier, password, options = {}) => {
    // 1. Resolve login identifier to email
    const email = await resolveLoginEmail(identifier);

    // 2. Direct Supabase GoTrue Auth
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
    }

    const session = await signInWithSupabase(email, password);
    const supabaseUser = session.user;
    const accessToken = session.access_token;
    const uid = supabaseUser.id || supabaseUser.uid;

    // 3. Query Supabase PostgreSQL 'users' table to fetch comprehensive student data
    let userDbRecord = null;
    try {
      userDbRecord = await DatabaseService.getDocument("users", uid);
    } catch (_) {}

    if (!userDbRecord && email) {
      try {
        const users = await DatabaseService.getCachedCollection("users");
        userDbRecord = users.find(
          (u) =>
            u.id === uid ||
            u.uid === uid ||
            (u.email && u.email.toLowerCase() === email)
        );
      } catch (_) {}
    }

    // 4. Build authenticated user profile merging Supabase Auth + Database user record
    const userData = buildUserData(supabaseUser, { ...(userDbRecord || {}), accessToken });

    // Check if user has Two-Factor Authentication (2FA) enabled
    const twoFactorEnabled = Boolean(
      userDbRecord?.two_factor_enabled ||
      userDbRecord?.data?.two_factor_enabled ||
      supabaseUser?.user_metadata?.two_factor_enabled
    );

    if (twoFactorEnabled) {
      const secret =
        userDbRecord?.two_factor_secret ||
        userDbRecord?.data?.two_factor_secret ||
        supabaseUser?.user_metadata?.two_factor_secret;

      // Return interim object prompting 2FA step if not already verified
      if (!options?.totpVerified) {
        return {
          requires2FA: true,
          tempUserData: userData,
          secret: secret,
          refreshToken: session.refresh_token,
          accessToken: accessToken,
        };
      }
    }

    // 5. Persist tokens and session
    localStorage.setItem("subtools_user", JSON.stringify(userData));
    localStorage.setItem("subtools_token", accessToken);
    localStorage.setItem("subtools_supabase_token", accessToken);
    if (session.refresh_token) {
      localStorage.setItem("subtools_refresh_token", session.refresh_token);
    }

    return userData;
  },

  checkStudentId: async (studentId) => {
    return await checkStudentIdExists(studentId);
  },

  signup: async (signupData) => {
    const {
      name,
      studentId,
      email,
      password,
      phone,
      department,
      batch,
      academicSystem,
      academicLevel,
      section,
      gender,
      bloodGroup,
      allowBloodDonation,
      city,
      area,
      dob,
    } = signupData;

    // 1. Verify Student ID Uniqueness
    const exists = await checkStudentIdExists(studentId);
    if (exists) {
      throw new Error("This Student ID is already registered. Please login or reset your password.");
    }

    // 2. Prepare user metadata
    const cleanPhone = String(phone || "").replaceAll(/[\s-]/g, "");
    const normalizedPhone = cleanPhone.startsWith("+88")
      ? cleanPhone.substring(3)
      : cleanPhone.startsWith("88") && cleanPhone.length === 13
      ? cleanPhone.substring(2)
      : cleanPhone;

    const metadata = {
      name: name.trim(),
      full_name: name.trim(),
      student_id: studentId.trim().toUpperCase(),
      studentId: studentId.trim().toUpperCase(),
      phone: normalizedPhone,
      department: department.trim().toUpperCase(),
      batch: batch || "N/A",
      academic_system: academicSystem || "Semester",
      academicSystem: academicSystem || "Semester",
      academic_level: academicLevel || "Semester 1",
      academicLevel: academicLevel || "Semester 1",
      term: academicLevel || "Semester 1",
      section: section || "A",
      gender: gender || "Male",
      blood_group: bloodGroup || "O+",
      bloodGroup: bloodGroup || "O+",
      allowBloodDonation: Boolean(allowBloodDonation),
      is_donor: Boolean(allowBloodDonation),
      city: city || "Dhaka",
      area: area || "",
      location: area ? `${area}, ${city}` : city,
      dob: dob || "",
      birthday: dob || "",
      role: "student",
      roles: ["student"],
    };

    // 3. Supabase GoTrue Auth Signup
    const authResult = await signUpWithSupabase(email, password, metadata);
    const userObj = authResult.user || authResult;
    const uid = userObj.id || userObj.uid;

    if (!uid) {
      throw new Error("Signup did not return a valid user ID.");
    }

    // 4. Insert student profile into Supabase PostgreSQL 'users' table
    const dbRecord = {
      id: uid,
      uid: uid,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      full_name: name.trim(),
      student_id: studentId.trim().toUpperCase(),
      studentId: studentId.trim().toUpperCase(),
      phone: normalizedPhone,
      department: department.trim().toUpperCase(),
      batch: batch || "N/A",
      academic_system: academicSystem || "Semester",
      academicSystem: academicSystem || "Semester",
      academic_level: academicLevel || "Semester 1",
      academicLevel: academicLevel || "Semester 1",
      term: academicLevel || "Semester 1",
      section: section || "A",
      gender: gender || "Male",
      blood_group: bloodGroup || "O+",
      bloodGroup: bloodGroup || "O+",
      allowBloodDonation: Boolean(allowBloodDonation),
      is_donor: Boolean(allowBloodDonation),
      city: city || "Dhaka",
      area: area || "",
      location: area ? `${area}, ${city}` : city,
      dob: dob || "",
      birthday: dob || "",
      role: "student",
      roles: ["student"],
      status: "Active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await DatabaseService.setDocument("users", uid, dbRecord);
    } catch (dbErr) {
      console.warn("Could not immediately insert users record during signup:", dbErr);
    }

    return { success: true, user: authResult.user, session: authResult.session };
  },


  logout: async () => {
    const token = localStorage.getItem("subtools_supabase_token");
    if (token) {
      await signOutSupabase(token);
    }
    localStorage.removeItem("subtools_token");
    localStorage.removeItem("subtools_user");
    localStorage.removeItem("subtools_supabase_token");
    return { success: true };
  },

  forgotPassword: async (email) => {
    const sent = await sendSupabasePasswordReset(email);
    if (!sent) {
      throw new Error("Failed to send password reset email via Supabase.");
    }
    return { message: "Password reset link sent to " + email };
  },

  updateProfile: async (profileData) => {
    const token = localStorage.getItem("subtools_supabase_token");
    const storedUser = localStorage.getItem("subtools_user");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;

    if (!currentUser || !token) {
      throw new Error("No authenticated session found.");
    }

    const uid = currentUser.uid || currentUser.id;

    // 1. Update Supabase Auth user_metadata
    await updateSupabaseUser(token, {
      user_metadata: {
        name: profileData.name !== undefined ? profileData.name : currentUser.name,
        full_name: profileData.name !== undefined ? profileData.name : currentUser.name,
        student_id: profileData.studentId !== undefined ? profileData.studentId : currentUser.studentId,
        studentId: profileData.studentId !== undefined ? profileData.studentId : currentUser.studentId,
        phone: profileData.phone !== undefined ? profileData.phone : currentUser.phone,
        department: profileData.department !== undefined ? profileData.department : currentUser.department,
        batch: profileData.batch !== undefined ? profileData.batch : currentUser.batch,
        section: profileData.section !== undefined ? profileData.section : currentUser.section,
        academic_level: profileData.academicLevel !== undefined ? profileData.academicLevel : currentUser.academicLevel,
        academicLevel: profileData.academicLevel !== undefined ? profileData.academicLevel : currentUser.academicLevel,
        blood_group: profileData.bloodGroup !== undefined ? profileData.bloodGroup : currentUser.bloodGroup,
        is_donor: profileData.allowBloodDonation !== undefined ? profileData.allowBloodDonation : currentUser.allowBloodDonation,
        birthday: profileData.dob !== undefined ? profileData.dob : currentUser.dob,
        location: profileData.location !== undefined ? profileData.location : currentUser.location,
        avatar_url: profileData.photo_url !== undefined ? profileData.photo_url : (profileData.photoURL !== undefined ? profileData.photoURL : (currentUser.photo_url || currentUser.photoURL || "")),
        photo_url: profileData.photo_url !== undefined ? profileData.photo_url : (profileData.photoURL !== undefined ? profileData.photoURL : (currentUser.photo_url || currentUser.photoURL || "")),
        photoURL: profileData.photo_url !== undefined ? profileData.photo_url : (profileData.photoURL !== undefined ? profileData.photoURL : (currentUser.photo_url || currentUser.photoURL || "")),
        subjects: profileData.subjects !== undefined ? profileData.subjects : currentUser.subjects,
        enrolled_subjects: profileData.subjects !== undefined ? profileData.subjects : currentUser.subjects,
        completed_subjects: profileData.completed_subjects !== undefined ? profileData.completed_subjects : (profileData.completedSubjects !== undefined ? profileData.completedSubjects : currentUser.completed_subjects),
        completedSubjects: profileData.completed_subjects !== undefined ? profileData.completed_subjects : (profileData.completedSubjects !== undefined ? profileData.completedSubjects : currentUser.completed_subjects),
        completed_credits: profileData.completed_credits !== undefined ? profileData.completed_credits : (profileData.completedCredits !== undefined ? profileData.completedCredits : currentUser.completed_credits),
        completedCredits: profileData.completed_credits !== undefined ? profileData.completed_credits : (profileData.completedCredits !== undefined ? profileData.completedCredits : currentUser.completed_credits),
      },
    });

    // 2. Update Supabase PostgreSQL users table
    const dbPatch = {};
    if (profileData.name !== undefined) {
      dbPatch.name = profileData.name;
      dbPatch.full_name = profileData.name;
    }
    if (profileData.studentId !== undefined) {
      dbPatch.student_id = profileData.studentId;
      dbPatch.studentId = profileData.studentId;
    }
    if (profileData.phone !== undefined) dbPatch.phone = profileData.phone;
    if (profileData.department !== undefined) dbPatch.department = profileData.department;
    if (profileData.batch !== undefined) dbPatch.batch = profileData.batch;
    if (profileData.section !== undefined) dbPatch.section = profileData.section;
    if (profileData.academicLevel !== undefined) {
      dbPatch.academic_level = profileData.academicLevel;
      dbPatch.academicLevel = profileData.academicLevel;
    }
    if (profileData.bloodGroup !== undefined) {
      dbPatch.blood_group = profileData.bloodGroup;
      dbPatch.bloodGroup = profileData.bloodGroup;
    }
    if (profileData.allowBloodDonation !== undefined) {
      dbPatch.is_donor = profileData.allowBloodDonation;
      dbPatch.allowBloodDonation = profileData.allowBloodDonation;
    }
    if (profileData.dob !== undefined) {
      dbPatch.birthday = profileData.dob;
      dbPatch.dob = profileData.dob;
    }
    if (profileData.location !== undefined) {
      dbPatch.location = profileData.location;
      dbPatch.address = profileData.location;
    }
    if (profileData.bio !== undefined) dbPatch.bio = profileData.bio;
    if (profileData.photo_url !== undefined || profileData.photoURL !== undefined) {
      const pUrl = profileData.photo_url !== undefined ? profileData.photo_url : profileData.photoURL;
      dbPatch.photo_url = pUrl;
      dbPatch.avatar_url = pUrl;
      dbPatch.photoURL = pUrl;
    }
    if (profileData.subjects !== undefined) dbPatch.subjects = profileData.subjects;

    try {
      await DatabaseService.updateDocument("users", uid, dbPatch);
    } catch (e) {
      console.warn("Could not patch users table record:", e);
    }

    const updatedUser = {
      ...currentUser,
      ...profileData,
    };

    localStorage.setItem("subtools_user", JSON.stringify(updatedUser));
    return { success: true, user: updatedUser };
  },

  logout: async () => {
    try {
      await signOutSupabase();
    } catch (e) {
      console.warn("Supabase signOut error:", e);
    }
    localStorage.removeItem("subtools_user");
    localStorage.removeItem("subtools_token");
    localStorage.removeItem("subtools_supabase_token");
    localStorage.removeItem("subtools_refresh_token");
    localStorage.removeItem("subtools_active_portal_mode");
    return true;
  },
};

export default authApi;
