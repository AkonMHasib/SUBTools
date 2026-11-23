// Department API Layer - Static/Cached mapped based on academic.js with 30-day CacheManager TTL
import { DEPARTMENTS } from "../utils/academic";
import CacheManager from "../services/CacheManager";

const normalizeDepartment = (department) => ({
  id: department.code,
  code: String(department.code || "").toUpperCase(),
  name: department.name || "",
  structureType: "Semester",
  structureLevel: "1",
  structure: "Semester 1",
  head: "TBA",
});

const sortDepartments = (departments) =>
  [...departments].sort((a, b) => a.code.localeCompare(b.code));

export const departmentApi = {
  getAll: async () => {
    const { data } = CacheManager.get("departments");
    if (data) return data;

    const sortedDepts = sortDepartments(DEPARTMENTS.map(normalizeDepartment));
    CacheManager.set("departments", sortedDepts, 30 * 24 * 60 * 60 * 1000); // 30 days TTL
    return sortedDepts;
  },

  saveAll: async (departments) => {
    const sortedDepts = sortDepartments(departments.map(normalizeDepartment));
    CacheManager.set("departments", sortedDepts, 30 * 24 * 60 * 60 * 1000);
    return sortedDepts;
  },
};

export default departmentApi;
