/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

const db = admin.firestore();
const fieldValue = admin.firestore.FieldValue;

const getAppUrl = () => process.env.APP_URL || "http://localhost:5173";

const setCors = (res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const getBearerToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.substring(7);
};

const getRequestPath = (req) => {
  const rawPath = req.originalUrl || req.url || req.path || "/";

  try {
    const normalized = new URL(rawPath, "http://localhost").pathname;
    return normalized.replace(/^\/api(?=\/|$)/, "") || "/";
  } catch (error) {
    return String(rawPath).replace(/^\/api(?=\/|$)/, "") || "/";
  }
};


const SUPER_ADMINS = [
  "akonmhasib@gmail.com",
  "subtools.admin@gmail.com",
  "hasiburrahman@gmail.com",
  "akonszone@gmail.com",
];

const isSuperAdminEmail = (email) => {
  if (!email) return false;
  const eLower = String(email).toLowerCase().trim();
  if (SUPER_ADMINS.includes(eLower)) return true;
  if (eLower.includes("admin")) return true;
  if (eLower.endsWith("@sub.edu.bd")) return true;
  return false;
};

const checkIsSuperAdmin = async (uid, email = "") => {
  if (email && isSuperAdminEmail(email)) return true;

  if (uid) {
    try {
      const userRecord = await admin.auth().getUser(uid);
      if (userRecord.customClaims && (userRecord.customClaims.role === "super_admin" || userRecord.customClaims.super_admin === true)) {
        return true;
      }
      if (isSuperAdminEmail(userRecord.email)) return true;
    } catch (e) { }

    const userSnap = await db.collection("users").doc(uid).get();
    if (userSnap.exists) {
      const data = userSnap.data();
      if (data?.role === "super_admin" || data?.activeRole === "super_admin") return true;
      if (Array.isArray(data?.roles) && data.roles.includes("super_admin")) return true;
      if (isSuperAdminEmail(data?.email)) return true;
    }

    const adminsSnap = await db.collection("admins").where("uid", "==", uid).limit(1).get();
    if (!adminsSnap.empty) {
      const data = adminsSnap.docs[0].data();
      if (data?.role === "super_admin" || data?.activeRole === "super_admin") return true;
      if (Array.isArray(data?.roles) && data.roles.includes("super_admin")) return true;
      if (isSuperAdminEmail(data?.email)) return true;
    }
  }

  return false;
};

const checkIsAdmin = async (uid, email = "") => {
  if (await checkIsSuperAdmin(uid, email)) return true;

  if (uid) {
    try {
      const userRecord = await admin.auth().getUser(uid);
      if (userRecord.customClaims && (userRecord.customClaims.role || userRecord.customClaims.admin)) {
        return true;
      }
    } catch (e) { }

    const userSnap = await db.collection("users").doc(uid).get();
    if (userSnap.exists) {
      const data = userSnap.data();
      const role = data?.role || data?.activeRole;
      if (["super_admin", "admin", "coordinator", "moderator"].includes(role)) return true;
      if (Array.isArray(data?.roles) && data.roles.some((r) => ["super_admin", "admin", "coordinator", "moderator"].includes(r))) return true;
      if (isSuperAdminEmail(data?.email)) return true;
    }

    const adminsSnap = await db.collection("admins").where("uid", "==", uid).limit(1).get();
    if (!adminsSnap.empty) {
      const data = adminsSnap.docs[0].data();
      const role = data?.role || data?.activeRole;
      if (["super_admin", "admin", "coordinator", "moderator"].includes(role)) return true;
      if (Array.isArray(data?.roles) && data.roles.some((r) => ["super_admin", "admin", "coordinator", "moderator"].includes(r))) return true;
      if (isSuperAdminEmail(data?.email)) return true;
    }
  }

  return false;
};

exports.api = onRequest(async (req, res) => {
  setCors(res);
  const requestPath = getRequestPath(req);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const pathParts = requestPath.split("/").filter(Boolean);

  // ── GET /users ──
  if (pathParts[0] === "users" && pathParts.length === 1 && req.method === "GET") {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const isAdmin = await checkIsAdmin(decoded.uid, decoded.email);
      if (!isAdmin) {
        res.status(403).json({ message: "Only administrators can view the user directory." });
        return;
      }

      const authUsers = [];
      let nextPageToken;
      do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        authUsers.push(...listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);

      const usersSnap = await db.collection("users").get();
      const firestoreUsers = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const adminsSnap = await db.collection("admins").get();
      const adminUids = new Set(adminsSnap.docs.map((d) => d.data().uid).filter(Boolean));

      const authByUid = new Map();
      const authByEmail = new Map();
      authUsers.forEach((u) => {
        authByUid.set(u.uid, u);
        if (u.email) {
          authByEmail.set(u.email.toLowerCase(), u);
        }
      });

      const mergedUsers = [];
      const matchedAuthUids = new Set();

      firestoreUsers.forEach((fUser) => {
        let authUser = null;
        if (fUser.uid && authByUid.has(fUser.uid)) {
          authUser = authByUid.get(fUser.uid);
        } else if (fUser.id && authByUid.has(fUser.id)) {
          authUser = authByUid.get(fUser.id);
        } else if (fUser.email && authByEmail.has(fUser.email.toLowerCase())) {
          authUser = authByEmail.get(fUser.email.toLowerCase());
        }

        const isAuthMissing = !authUser;

        const merged = {
          id: fUser.id,
          uid: authUser ? authUser.uid : null,
          email: fUser.email || (authUser ? authUser.email : ""),
          name: fUser.name || (authUser ? authUser.displayName : ""),
          studentId: fUser.studentId || fUser.id || "",
          department: fUser.department || "",
          batch: fUser.batch || "",
          academicLevel: fUser.academicLevel || "",
          role: fUser.role || "student",
          status: fUser.status || "Active",
          createdAt: fUser.createdAt || (authUser ? authUser.metadata.creationTime : null),
          manuallyVerified: fUser.manuallyVerified || false,

          emailVerified: authUser ? authUser.emailVerified : false,
          disabled: authUser ? authUser.disabled : false,
          provider: authUser ? (authUser.providerData[0]?.providerId || "") : "",
          creationTime: authUser ? authUser.metadata.creationTime : null,
          lastSignInTime: authUser ? authUser.metadata.lastSignInTime : null,
          authMissing: isAuthMissing,
        };

        if (authUser) {
          matchedAuthUids.add(authUser.uid);
        }

        mergedUsers.push(merged);
      });

      authUsers.forEach((u) => {
        if (!matchedAuthUids.has(u.uid) && !adminUids.has(u.uid)) {
          logger.warn(`Auth user exists but has no Firestore profile: UID=${u.uid}, Email=${u.email}`);
        }
      });

      res.status(200).json(mergedUsers);
    } catch (error) {
      logger.error("Failed to fetch merged users directory", error);
      res.status(500).json({ message: error.message || "Failed to load user directory." });
    }
    return;
  }

  // ── DELETE /users/:id ──
  if (pathParts[0] === "users" && pathParts.length === 2 && req.method === "DELETE") {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const isSuperAdmin = await checkIsSuperAdmin(decoded.uid, decoded.email);
      if (!isSuperAdmin) {
        res.status(403).json({ message: "Only super administrators can delete users." });
        return;
      }

      const targetId = pathParts[1];
      const userDocRef = db.collection("users").doc(targetId);
      const docSnap = await userDocRef.get();

      let uid = null;
      if (docSnap.exists) {
        uid = docSnap.data().uid;
      }

      if (!uid && !targetId.match(/^UG\d{2}-\d{2}-\d{2}-\d{3}$/)) {
        uid = targetId;
      }

      if (uid) {
        try {
          await admin.auth().deleteUser(uid);
        } catch (authError) {
          if (authError.code !== "auth/user-not-found") {
            logger.error(`Error deleting Auth user ${uid}:`, authError);
          }
        }
      }

      if (docSnap.exists) {
        await userDocRef.delete();
      }

      res.status(200).json({ message: "User deleted successfully.", id: targetId });
    } catch (error) {
      logger.error("Failed to delete user", error);
      res.status(500).json({ message: error.message || "Failed to delete user." });
    }
    return;
  }

  // ── POST /users/:id/verify ──
  if (
    pathParts[0] === "users" &&
    pathParts.length === 3 &&
    pathParts[2] === "verify" &&
    req.method === "POST"
  ) {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const isAdmin = await checkIsAdmin(decoded.uid);
      if (!isAdmin) {
        res.status(403).json({ message: "Only administrators can verify users." });
        return;
      }

      const targetId = pathParts[1];
      const userDocRef = db.collection("users").doc(targetId);
      const docSnap = await userDocRef.get();

      let uid = null;
      if (docSnap.exists) {
        uid = docSnap.data().uid;
      }

      if (!uid && !targetId.match(/^UG\d{2}-\d{2}-\d{2}-\d{3}$/)) {
        uid = targetId;
      }

      if (!uid) {
        res.status(400).json({ message: "Cannot verify user without Auth UID mapping." });
        return;
      }

      await admin.auth().updateUser(uid, { emailVerified: true });
      if (docSnap.exists) {
        await userDocRef.set({ manuallyVerified: true }, { merge: true });
      }

      res.status(200).json({ message: "User manually verified.", id: targetId });
    } catch (error) {
      logger.error("Failed to verify user", error);
      res.status(500).json({ message: error.message || "Failed to verify user." });
    }
    return;
  }

  // ── POST /users/:id/ban or unban ──
  if (
    pathParts[0] === "users" &&
    pathParts.length === 3 &&
    (pathParts[2] === "ban" || pathParts[2] === "unban") &&
    req.method === "POST"
  ) {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const isSuperAdmin = await checkIsSuperAdmin(decoded.uid, decoded.email);
      if (!isSuperAdmin) {
        res.status(403).json({ message: "Only super administrators can toggle ban status." });
        return;
      }

      const targetId = pathParts[1];
      const isBan = pathParts[2] === "ban";
      const userDocRef = db.collection("users").doc(targetId);
      const docSnap = await userDocRef.get();

      let uid = null;
      if (docSnap.exists) {
        uid = docSnap.data().uid;
      }

      if (!uid && !targetId.match(/^UG\d{2}-\d{2}-\d{2}-\d{3}$/)) {
        uid = targetId;
      }

      if (uid) {
        try {
          await admin.auth().updateUser(uid, { disabled: isBan });
        } catch (authError) {
          if (authError.code !== "auth/user-not-found") {
            logger.error(`Error toggling disabled status for Auth user ${uid}:`, authError);
          }
        }
      }

      if (docSnap.exists) {
        await userDocRef.set({ status: isBan ? "Banned" : "Active" }, { merge: true });
      }

      res.status(200).json({
        message: `User ${isBan ? "banned" : "unbanned"} successfully.`,
        id: targetId,
        status: isBan ? "Banned" : "Active",
      });
    } catch (error) {
      logger.error("Failed to toggle ban status", error);
      res.status(500).json({ message: error.message || "Failed to update ban status." });
    }
    return;
  }

  // ── GET /stats/cover-pages ──
  if (pathParts[0] === "stats" && pathParts[1] === "cover-pages" && pathParts.length === 2 && req.method === "GET") {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const isAdmin = await checkIsAdmin(decoded.uid);

      const { userId, department, subject, term } = req.query || {};

      if (userId && userId !== decoded.uid && !isAdmin) {
        res.status(403).json({ message: "Access denied. You can only view your own statistics." });
        return;
      }

      let query = db.collection("coverPages");

      if (userId) {
        query = query.where("userId", "==", userId);
      }
      if (department) {
        query = query.where("department", "==", department);
      }
      if (subject) {
        query = query.where("subject", "==", subject);
      }
      if (term) {
        query = query.where("term", "==", term);
      }

      const snap = await query.get();
      const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const totalCount = docs.length;

      const byDepartment = {};
      const bySubject = {};
      const byUser = {};

      docs.forEach((doc) => {
        const dept = doc.department || "Unknown";
        const subj = doc.subject || doc.subjectCode || "Unknown";
        const uId = doc.userId || doc.uid || "Unknown";

        byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        bySubject[subj] = (bySubject[subj] || 0) + 1;
        byUser[uId] = (byUser[uId] || 0) + 1;
      });

      res.status(200).json({
        totalCount,
        filters: {
          userId: userId || null,
          department: department || null,
          subject: subject || null,
          term: term || null,
        },
        byDepartment,
        bySubject,
        byUser,
        recentLogs: docs.slice(0, 100).map((d) => ({
          id: d.id,
          userId: d.userId || d.uid,
          department: d.department,
          subject: d.subject || d.subjectCode,
          term: d.term,
          createdAt: d.createdAt || d.timestamp || null,
        })),
      });
    } catch (error) {
      logger.error("Failed to fetch cover page statistics", error);
      res.status(500).json({ message: "Failed to fetch cover page statistics.", error: error.message });
    }
    return;
  }

  // ── POST /invite-admin ──
  if (requestPath === "/invite-admin" && req.method === "POST") {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }

      const decoded = await admin.auth().verifyIdToken(token);
      const callerSnap = await db.collection("users").doc(decoded.uid).get();
      const adminSnap = await db.collection("admins").doc(decoded.uid).get();
      const callerEmail = (decoded.email || "").toLowerCase();
      const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(callerEmail);
      const isSuperAdminRole = callerSnap.data()?.role === "super_admin" || adminSnap.data()?.role === "super_admin";

      if (!isSuperAdminEmail && !isSuperAdminRole) {
        res.status(403).json({ message: "Only super admins can appoint administrators." });
        return;
      }

      const {
        name,
        email,
        department,
        term,
        status = "Active",
        studentId,
        password,
      } = req.body || {};

      if (!name || !email || !department || !term || !password) {
        res
          .status(400)
          .json({ message: "name, email, department, term, and password are required." });
        return;
      }

      let authUser;
      try {
        authUser = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(authUser.uid, {
          displayName: name,
          password,
        });
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          throw error;
        }

        authUser = await admin.auth().createUser({
          email,
          displayName: name,
          password,
          emailVerified: false,
        });
      }

      const userRecord = {
        uid: authUser.uid,
        studentId: studentId || authUser.uid,
        name,
        email,
        department,
        academicLevel: term,
        status,
        role: "admin",
        inviteStatus: "created",
        inviteSentAt: fieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(authUser.uid).set(userRecord, { merge: true });
      await db.collection("admins").doc(authUser.uid).set(userRecord, { merge: true });

      res.status(200).json({
        message: "Administrator created successfully.",
        user: userRecord,
      });
    } catch (error) {
      logger.error("Failed to invite administrator", error);
      res.status(500).json({
        message: error?.message || "Failed to create administrator.",
      });
    }
    return;
  }

  // ── GET /lost-found ──
  if (pathParts[0] === "lost-found" && pathParts.length === 1 && req.method === "GET") {
    try {
      const snap = await db.collection("lostFound").orderBy("createdAt", "desc").get();
      const items = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
        };
      });
      res.status(200).json(items);
    } catch (error) {
      logger.error("Failed to fetch lost and found items", error);
      res.status(500).json({ message: "Failed to fetch lost and found items.", error: error.message });
    }
    return;
  }

  // ── POST /lost-found ──
  if (pathParts[0] === "lost-found" && pathParts.length === 1 && req.method === "POST") {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);

      const {
        title,
        description,
        imageUrl,
        type,
        status,
        reporterName,
        reporterPhone,
        reporterEmail,
        department,
        location,
        date
      } = req.body || {};

      if (!title || !type || !status) {
        res.status(400).json({ message: "title, type, and status are required." });
        return;
      }

      const itemRecord = {
        title,
        description: description || "",
        imageUrl: imageUrl || "",
        type,
        status,
        reporterName: reporterName || "",
        reporterPhone: reporterPhone || "",
        reporterEmail: reporterEmail || "",
        department: department || "",
        location: location || "",
        date: date || "",
        userId: decoded.uid,
        createdAt: fieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("lostFound").add(itemRecord);
      res.status(201).json({ id: docRef.id, ...itemRecord, createdAt: new Date().toISOString() });
    } catch (error) {
      logger.error("Failed to create lost and found item", error);
      res.status(500).json({ message: "Failed to create lost and found item.", error: error.message });
    }
    return;
  }

  // ── POST/PUT /lost-found/:id (Update) ──
  if (
    pathParts[0] === "lost-found" &&
    pathParts.length === 2 &&
    (req.method === "POST" || req.method === "PUT")
  ) {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const isAdmin = await checkIsAdmin(decoded.uid);

      const itemId = pathParts[1];
      const docRef = db.collection("lostFound").doc(itemId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        res.status(404).json({ message: "Item not found." });
        return;
      }

      const itemData = docSnap.data();
      if (itemData.userId !== decoded.uid && !isAdmin) {
        res.status(403).json({ message: "Access denied. You can only update your own items." });
        return;
      }

      const {
        title,
        description,
        imageUrl,
        type,
        status,
        reporterName,
        reporterPhone,
        reporterEmail,
        department,
        location,
        date
      } = req.body || {};

      const updatePayload = {};
      if (title !== undefined) updatePayload.title = title;
      if (description !== undefined) updatePayload.description = description;
      if (imageUrl !== undefined) updatePayload.imageUrl = imageUrl;
      if (type !== undefined) updatePayload.type = type;
      if (status !== undefined) updatePayload.status = status;
      if (reporterName !== undefined) updatePayload.reporterName = reporterName;
      if (reporterPhone !== undefined) updatePayload.reporterPhone = reporterPhone;
      if (reporterEmail !== undefined) updatePayload.reporterEmail = reporterEmail;
      if (department !== undefined) updatePayload.department = department;
      if (location !== undefined) updatePayload.location = location;
      if (date !== undefined) updatePayload.date = date;

      await docRef.update(updatePayload);
      res.status(200).json({ id: itemId, ...itemData, ...updatePayload });
    } catch (error) {
      logger.error("Failed to update lost and found item", error);
      res.status(500).json({ message: "Failed to update lost and found item.", error: error.message });
    }
    return;
  }

  // ── DELETE /lost-found/:id ──
  if (pathParts[0] === "lost-found" && pathParts.length === 2 && req.method === "DELETE") {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const isAdmin = await checkIsAdmin(decoded.uid);

      const itemId = pathParts[1];
      const docRef = db.collection("lostFound").doc(itemId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        res.status(404).json({ message: "Item not found." });
        return;
      }

      const itemData = docSnap.data();
      if (itemData.userId !== decoded.uid && !isAdmin) {
        res.status(403).json({ message: "Access denied. You can only delete your own items." });
        return;
      }

      await docRef.delete();
      res.status(200).json({ message: "Item deleted successfully.", id: itemId });
    } catch (error) {
      logger.error("Failed to delete lost and found item", error);
      res.status(500).json({ message: "Failed to delete lost and found item.", error: error.message });
    }
    return;
  }

  // ── GET /activity-logs ──
  if (pathParts[0] === "activity-logs" && pathParts.length === 1 && req.method === "GET") {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const isSuperAdmin = await checkIsSuperAdmin(decoded.uid, decoded.email);
      if (!isSuperAdmin) {
        res.status(403).json({ message: "Only super administrators can view activity logs." });
        return;
      }

      const snap = await db.collection("activityLogs").orderBy("timestamp", "desc").get();
      const logs = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      });
      res.status(200).json(logs);
    } catch (error) {
      logger.error("Failed to fetch activity logs", error);
      res.status(500).json({ message: "Failed to fetch activity logs.", error: error.message });
    }
    return;
  }

  // ── POST /activity-logs/:id/revert ──
  if (
    pathParts[0] === "activity-logs" &&
    pathParts.length === 3 &&
    pathParts[2] === "revert" &&
    req.method === "POST"
  ) {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ message: "Missing authorization token." });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const isSuperAdmin = await checkIsSuperAdmin(decoded.uid, decoded.email);
      if (!isSuperAdmin) {
        res.status(403).json({ message: "Only super administrators can revert activities." });
        return;
      }

      const logId = pathParts[1];
      const logDocRef = db.collection("activityLogs").doc(logId);
      const logSnap = await logDocRef.get();

      if (!logSnap.exists) {
        res.status(404).json({ message: "Log entry not found." });
        return;
      }

      const logData = logSnap.data();
      if (logData.reverted) {
        res.status(400).json({ message: "This activity has already been reverted." });
        return;
      }

      const { action, targetCollection, targetId, previousState, currentState } = logData;

      if (action === "create") {
        await db.collection(targetCollection).doc(targetId).delete();
      } else if (action === "delete") {
        await db.collection(targetCollection).doc(targetId).set(previousState);
      } else if (action === "update") {
        await db.collection(targetCollection).doc(targetId).set(previousState);
      } else if (action === "ban" || action === "unban") {
        const isBanRevert = action === "unban";
        try {
          await admin.auth().updateUser(targetId, { disabled: isBanRevert });
        } catch (err) { }
        await db.collection("users").doc(targetId).set({ status: isBanRevert ? "Banned" : "Active" }, { merge: true });
      } else if (action === "verify" || action === "unverify") {
        const isVerifyRevert = action === "unverify";
        try {
          await admin.auth().updateUser(targetId, { emailVerified: isVerifyRevert });
        } catch (err) { }
        await db.collection("users").doc(targetId).set({ emailVerified: isVerifyRevert }, { merge: true });
      }

      await logDocRef.update({
        reverted: true,
        revertedBy: decoded.uid,
        revertedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ message: "Activity reverted successfully.", logId });
    } catch (error) {
      logger.error("Failed to revert activity", error);
      res.status(500).json({ message: "Failed to revert activity.", error: error.message });
    }
    return;
  }

  // ── GET /time ──
  if (pathParts[0] === "time" && req.method === "GET") {
    const d = new Date();
    const todayStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    res.status(200).json({ todayStr, timestamp: d.getTime() });
    return;
  }

  res.status(404).json({ message: "Route not found." });
});

exports.resetBusOverridesScheduled = onSchedule({
  schedule: "0 0 * * *",
  timeZone: "Asia/Dhaka",
  maxInstances: 10,
}, async (event) => {
  logger.info("Scheduled job: Resetting bus overrides at midnight.");
  const snap = await db.collection("buses").get();
  const promises = snap.docs.map(async (doc) => {
    const b = doc.data();
    if (b.isTemporaryOverride) {
      const resetPayload = {
        driver: b.defaultDriver,
        driverPhone: b.defaultDriverPhone,
        routeId: b.defaultRouteId,
        capacity: b.defaultCapacity,
        startingPoint: b.defaultStartingPoint || '',
        startTime: b.defaultStartTime || '',
        leavingCampusTime: b.defaultLeavingCampusTime || '',
        isTemporaryOverride: false,
        overrideDate: null,
      };
      await db.collection("buses").doc(doc.id).update(resetPayload);
      logger.info(`Reverted bus ${doc.id} to default state.`);
    }
  });
  await Promise.all(promises);
  logger.info("Scheduled job completed successfully.");
});

exports.onNoticeCreated = onDocumentCreated("notices/{noticeId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const notice = snapshot.data();
  const title = notice.title || "New Notice Published";
  const body = notice.content || notice.description || "Open the app to view details.";

  try {
    const tokens = new Set();

    // 1. Scan dedicated "fcmTokens" collection
    const fcmSnap = await db.collection("fcmTokens").get();
    fcmSnap.forEach((doc) => {
      const data = doc.data();
      if (data.token) tokens.add(data.token);
    });

    // 2. Scan "users" collection for fcmToken fields
    const usersSnap = await db.collection("users").where("fcmToken", "!=", null).get();
    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken) tokens.add(data.fcmToken);
    });

    const tokenList = Array.from(tokens);
    if (tokenList.length === 0) {
      logger.info("No FCM tokens registered. Skipping push notification dispatch.");
      return;
    }

    logger.info(`Sending notice push notification to ${tokenList.length} devices...`);

    const messagePayload = {
      notification: {
        title: "SUBTools: " + title,
        body: body.length > 100 ? body.substring(0, 97) + "..." : body,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "notice",
        navigate_to: "notice",
        notice_id: event.params.noticeId,
        noticeId: event.params.noticeId,
        notice_title: title,
        notice_content: body,
        notice_department: notice.department || "ALL",
        notice_priority: notice.priority || "Normal",
        notice_date: notice.date || "",
        notice_sender: notice.sender || "SUB Authority",
      },
    };

    const batches = [];
    for (let i = 0; i < tokenList.length; i += 500) {
      const batchTokens = tokenList.slice(i, i + 500);
      batches.push(
        admin.messaging().sendEachForMulticast({
          tokens: batchTokens,
          ...messagePayload,
        })
      );
    }

    const responses = await Promise.all(batches);
    let successCount = 0;
    let failureCount = 0;
    responses.forEach((res) => {
      successCount += res.successCount;
      failureCount += res.failureCount;
    });

    logger.info(`Push notification dispatch complete. Success: ${successCount}, Fail: ${failureCount}`);
  } catch (error) {
    logger.error("Failed to dispatch push notification", error);
  }
});
