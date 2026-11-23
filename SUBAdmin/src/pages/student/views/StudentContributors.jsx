import { useState, useEffect, useMemo } from "react";
import {
  FiUsers,
  FiSearch,
  FiPhone,
  FiMail,
  FiShield,
  FiMapPin,
  FiLoader,
  FiUserCheck,
} from "react-icons/fi";
import DatabaseService from "../../../services/DatabaseService";
import { getDepartmentFullName } from "../../../utils/academic";

export const StudentContributors = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        // Query users collection
        const allUsers = await DatabaseService.getCachedCollection("users").catch(() => []);

        // Filter users who are admins, coordinators, or have admin roles matching Android ContributorsFragment.java
        const filtered = allUsers.filter((u) => {
          if (!u) return false;
          const role = (u.role || "").toLowerCase();
          const roles = Array.isArray(u.roles) ? u.roles.map((r) => String(r).toLowerCase()) : [];

          const isAdmin =
            u.isAdmin === true ||
            role.includes("admin") ||
            roles.some((r) => r.includes("admin"));

          const isCoordinator =
            role.includes("coordinator") ||
            roles.some((r) => r.includes("coordinator"));

          return isAdmin || isCoordinator;
        });

        // Map into standardized AdminItem objects
        const items = filtered.map((u) => {
          const roles = Array.isArray(u.roles) ? u.roles.map((r) => String(r).toLowerCase()) : [];
          let roleLabel = "Administrator";
          if (roles.includes("super_admin") || (u.role && u.role.toLowerCase() === "super_admin")) {
            roleLabel = "Super Admin";
          } else if (roles.includes("admin") || (u.role && u.role.toLowerCase() === "admin")) {
            roleLabel = "Department Admin";
          } else if (roles.some((r) => r.includes("coordinator")) || (u.role && u.role.toLowerCase().includes("coordinator"))) {
            roleLabel = "Academic Coordinator";
          }

          return {
            id: u.id || u.uid || `admin_${Math.random()}`,
            name: u.name || u.fullName || "University Administrator",
            roleLabel,
            department: u.department || "Administration",
            phone: u.phone || "",
            email: u.email || "",
            photoUrl: u.photo_url || u.photoURL || u.photoUrl || u.avatar_url || "",
          };
        });

        if (isMounted) {
          setAdmins(items);
        }
      } catch (err) {
        console.warn("Failed to fetch admin directory:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAdmins();
    return () => {
      isMounted = false;
    };
  }, []);

  // Department list
  const departments = useMemo(() => {
    const set = new Set();
    admins.forEach((a) => {
      if (a.department && a.department !== "Administration") {
        set.add(a.department);
      }
    });
    return Array.from(set).sort();
  }, [admins]);

  // Filtered admins
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        a.roleLabel.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q);

      const matchesDept =
        deptFilter === "all" ||
        a.department.toLowerCase() === deptFilter.toLowerCase();

      return matchesSearch && matchesDept;
    });
  }, [admins, searchQuery, deptFilter]);

  return (
    <div className="space-y-6">
      {/* Header matching Android textHeader & textSubheader */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <FiShield className="mr-2 text-blue-600" />
            <span>Admins & Coordinators Directory</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official contact directory of university administrators, department coordinators, and portal staff.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search by name, role or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Department Filter Pills */}
      {departments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDeptFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              deptFilter === "all"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800"
            }`}
          >
            All Departments ({admins.length})
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                deptFilter === dept
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      )}

      {/* Directory Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <FiLoader className="mx-auto text-2xl animate-spin text-blue-500 mb-2" />
          <p className="text-xs">Loading directory...</p>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          <FiUsers className="mx-auto text-3xl text-slate-400 mb-2 opacity-60" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No administrators or coordinators match your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4.5">
          {filteredAdmins.map((admin) => (
            <div
              key={admin.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/60 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-3.5 mb-3.5">
                  {/* Photo or Initial */}
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                    {admin.photoUrl ? (
                      <img
                        src={admin.photoUrl}
                        alt={admin.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {admin.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {admin.name}
                    </h4>
                    <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 mt-0.5">
                      {admin.roleLabel}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4">
                  <p className="flex items-center text-slate-500">
                    <FiMapPin className="mr-1.5 text-blue-500 shrink-0" />
                    <span className="truncate">{getDepartmentFullName(admin.department)} Department</span>
                  </p>
                  {admin.email && (
                    <p className="flex items-center text-slate-500 truncate">
                      <FiMail className="mr-1.5 text-slate-400 shrink-0" />
                      <span className="truncate">{admin.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                {admin.phone ? (
                  <a
                    href={`tel:${admin.phone}`}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <FiPhone className="text-xs" />
                    <span>Call</span>
                  </a>
                ) : null}

                {admin.email ? (
                  <a
                    href={`mailto:${admin.email}`}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <FiMail className="text-xs" />
                    <span>Email</span>
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentContributors;
