import DatabaseService from "../services/DatabaseService";
import { logAdminActivity } from "../utils/activityLogger";

export const examApi = {
  getAll: async (department = null) => {
    try {
      let list = await DatabaseService.getCachedCollection("exam_routines", { forceRefresh: true });
      if (!list || list.length === 0) {
        // Fallback to routines collection if tagged with type: "exam"
        const allRoutines = await DatabaseService.getCachedCollection("routines", { forceRefresh: false });
        list = allRoutines.filter((r) => r.isExam || r.type === "exam" || r.examDate);
      }
      if (department && department !== "all") {
        list = list.filter((e) => (e.department || "").toLowerCase() === department.toLowerCase());
      }
      return list.sort((a, b) => new Date(a.examDate || a.date || 0) - new Date(b.examDate || b.date || 0));
    } catch (err) {
      console.error("Failed to load exam routines:", err);
      return [];
    }
  },

  create: async (examData, notifyStudents = false) => {
    const id = examData.id || `exam-${Date.now()}`;
    const payload = {
      ...examData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await DatabaseService.setDocument("exam_routines", id, payload);
    logAdminActivity("create", "exam_routines", id, null, payload);

    if (notifyStudents) {
      await examApi.broadcastExamNotice(payload);
    }

    return payload;
  },

  update: async (id, examData) => {
    const payload = {
      ...examData,
      updatedAt: Date.now(),
    };
    await DatabaseService.setDocument("exam_routines", id, payload);
    logAdminActivity("update", "exam_routines", id, null, payload);
    return payload;
  },

  delete: async (id) => {
    await DatabaseService.deleteDocument("exam_routines", id);
    logAdminActivity("delete", "exam_routines", id, null, null);
    return { success: true, id };
  },

  // FCM broadcast: Publishes notice with type: "exam_routine" to trigger mobile notifications
  broadcastExamNotice: async (exam) => {
    try {
      const noticeId = `exam-notice-${Date.now()}`;
      const noticePayload = {
        id: noticeId,
        title: `📅 Exam Routine: ${exam.courseCode || "Course"} (${exam.examType || "Exam"})`,
        description: `Exam for ${exam.courseTitle || exam.courseCode} is scheduled on ${exam.examDate || "TBA"} at ${exam.examTime || "TBA"}. Room: ${exam.room || "TBA"}.`,
        content: `Official exam schedule released for ${exam.department || "All Departments"}. Please check your Exam Routine page for detailed seat plan and instructions.`,
        department: exam.department || "ALL",
        type: "exam_routine",
        priority: "urgent",
        pinned: true,
        createdAt: Date.now(),
        sender: "Exam Controller Office",
        authorName: "Exam Controller Office",
      };

      await DatabaseService.setDocument("notices", noticeId, noticePayload);
      logAdminActivity("create", "notices", noticeId, null, noticePayload);
      return noticePayload;
    } catch (err) {
      console.error("Failed to broadcast exam notice:", err);
      throw err;
    }
  },
};

export default examApi;
