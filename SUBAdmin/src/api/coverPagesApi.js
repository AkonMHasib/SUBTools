// Cover Page Statistics API Layer with Smart Caching
import FirestoreService from "../services/FirestoreService";
import { normalizeDepartment } from "../utils/academic";

export const coverPagesApi = {
  getStats: async (filters = {}, forceRefresh = false) => {
    try {
      // Fetch from both analytics_cover_pages and coverPages collections
      const [list1, list2] = await Promise.all([
        FirestoreService.getCachedCollection("analytics_cover_pages", { forceRefresh }).catch(
          () => [],
        ),
        FirestoreService.getCachedCollection("coverPages", { forceRefresh }).catch(() => []),
      ]);

      // Combine and deduplicate by doc id
      const docMap = new Map();
      [...(list1 || []), ...(list2 || [])].forEach((doc) => {
        if (doc && doc.id) {
          const nested = doc.data && typeof doc.data === "object" ? doc.data : {};
          docMap.set(doc.id, {
            ...nested,
            ...doc,
            department: doc.department || nested.department || "",
            subject: doc.subject || nested.subject || doc.subjectCode || nested.subjectCode || "",
            term: doc.term || nested.term || "",
            studentId: doc.studentId || nested.studentId || doc.user_id || nested.user_id || "",
          });
        }
      });
      const allDocs = Array.from(docMap.values());

      const filteredDocs = allDocs.filter((doc) => {
        if (!doc) return false;
        if (filters.userId) {
          const filterUid = String(filters.userId).trim().toLowerCase();
          const docUid = String(doc.studentId || doc.idNumber || doc.userId || doc.uid || "")
            .trim()
            .toLowerCase();
          if (!docUid.includes(filterUid)) return false;
        }
        if (filters.department && filters.department !== "All") {
          const filterDept = normalizeDepartment(filters.department);
          const docDept = normalizeDepartment(doc.department);
          if (docDept !== filterDept) return false;
        }
        if (filters.subject) {
          const filterSubj = String(filters.subject).trim().toLowerCase();
          const docSubj = String(doc.subject || doc.subjectCode || "")
            .trim()
            .toLowerCase();
          if (!docSubj.includes(filterSubj)) return false;
        }
        if (filters.term && filters.term !== "All") {
          if (String(doc.term || "").toLowerCase() !== String(filters.term).toLowerCase())
            return false;
        }
        return true;
      });

      const byDepartment = {};
      const bySubject = {};
      const byUser = {};

      filteredDocs.forEach((doc) => {
        const rawDept = doc.department || "Unknown";
        const dept = normalizeDepartment(rawDept) || rawDept;
        const subj = doc.subject || doc.subjectCode || "Unknown";
        const uId = doc.studentId || doc.idNumber || doc.userId || doc.uid || "Unknown";

        byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        bySubject[subj] = (bySubject[subj] || 0) + 1;
        byUser[uId] = (byUser[uId] || 0) + 1;
      });

      return {
        totalCount: filteredDocs.length,
        filters,
        byDepartment,
        bySubject,
        byUser,
        recentLogs: filteredDocs.map((d) => ({
          id: d.id,
          userId: d.studentId || d.idNumber || d.userId || d.uid || "N/A",
          department: normalizeDepartment(d.department) || d.department || "N/A",
          subject: d.subject || d.subjectCode || "Course Sheet",
          term: d.term || "Midterm",
          createdAt: d.createdAt || d.timestamp || d.date || null,
        })),
      };
    } catch (error) {
      console.error("Failed to fetch cover page stats from Firestore:", error);
      return {
        totalCount: 0,
        filters,
        byDepartment: {},
        bySubject: {},
        byUser: {},
        recentLogs: [],
      };
    }
  },
};

export default coverPagesApi;
