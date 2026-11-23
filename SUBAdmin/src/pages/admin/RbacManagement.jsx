import { isSuperAdmin as checkIsSuperAdmin } from "../../utils/permissionUtils";
import { DEPARTMENTS } from "../../utils/academic";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  FiShield,
  FiUsers,
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiCheckCircle,
  FiLock,
  FiActivity,
  FiGrid,
  FiUserCheck,
  FiUserPlus,
  FiEye,
  FiX,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiUserX,
  FiAlertTriangle,
} from "react-icons/fi";

import roleApi from "../../api/roleApi";
import Dialog from "../../components/common/Dialog";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";
import CacheManager from "../../services/CacheManager";
import DatabaseService from "../../services/DatabaseService";
import { isSupabaseConfigured, provisionAdminViaSupabase } from "../../supabase/config";

// Administrator Creation Schema
const adminSchema = yup.object().shape({
  name: yup.string().required("Full Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
  department: yup.string().required("Department is required"),
  role: yup.string().required("Primary Role is required"),
});

export const RbacManagement = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab State (Persisted via URL query & localStorage)
  const initialTab = searchParams.get("tab") || localStorage.getItem("subtools_rbac_tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Core Data States
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [permissionMatrix, setPermissionMatrix] = useState({});
  const [loading, setLoading] = useState(true);

  // Pagination & Filter States
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  // Drawer & Modal States
  const [selectedUserForDrawer, setSelectedUserForDrawer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Delete Administrator Dialog State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  const [savingMatrix, setSavingMatrix] = useState(false);

  const isSuperAdmin = checkIsSuperAdmin(currentUser);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(adminSchema),
  });

  useEffect(() => {
    loadAllRbacData();
  }, []);

  const loadAllRbacData = async () => {
    setLoading(true);
    try {
      const [allUsersData, allAdminsData, matrixData, logsData] = await Promise.all([
        roleApi.getAllUsers(),
        roleApi.getAllAdmins(),
        roleApi.loadPermissionMatrix(),
        roleApi.getActivityLogs(50),
      ]);

      setUsers(allUsersData || []);
      setAdmins(allAdminsData || []);
      setPermissionMatrix(matrixData || roleApi.ROLE_PERMISSION_MATRIX);
      setActivityLogs(logsData || []);
    } catch (err) {
      toast.error("Failed to load RBAC data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    localStorage.setItem("subtools_rbac_tab", tabId);
    setCurrentPage(1);
  };

  // ─── Privileged Accounts Filter ─────────────────────────────────────────────
  const privilegedRoles = ["super_admin", "admin"];
  
  const privilegedAccounts = users.filter((u) => {
    const userRoles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [];
    const isPrivileged = userRoles.some((r) => privilegedRoles.includes(r.toLowerCase()));
    if (!isPrivileged) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.studentId && u.studentId.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }
    if (roleFilter !== "all") {
      if (!userRoles.includes(roleFilter.toLowerCase())) return false;
    }
    if (deptFilter !== "all" && u.department !== deptFilter) return false;

    return true;
  });

  // ─── Multi-Role Users Filter ────────────────────────────────────────────────
  const multiRoleUsers = users.filter((u) => {
    const userRoles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [];
    if (userRoles.length < 2) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // ─── All Users Paginated Filter ─────────────────────────────────────────────
  const filteredAllUsers = users.filter((u) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.studentId && u.studentId.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }
    if (roleFilter !== "all") {
      const userRoles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [];
      if (!userRoles.includes(roleFilter.toLowerCase())) return false;
    }
    if (deptFilter !== "all" && u.department !== deptFilter) return false;
    return true;
  });

  // Pagination Helper
  const paginatedData = (dataList) => {
    const totalPages = Math.ceil(dataList.length / pageSize) || 1;
    const validPage = Math.min(currentPage, totalPages);
    const start = (validPage - 1) * pageSize;
    return {
      items: dataList.slice(start, start + pageSize),
      totalPages,
      totalCount: dataList.length,
      currentPage: validPage,
    };
  };

  // ─── Assign Roles Action ──────────────────────────────────────────────────
  const openAssignModal = (userObj) => {
    setSelectedUserForRoles(userObj);
    const existing = Array.isArray(userObj.roles)
      ? userObj.roles
      : userObj.role
      ? [userObj.role]
      : ["student"];
    setSelectedRoles(existing);
    setRoleModalOpen(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUserForRoles || selectedRoles.length === 0) {
      toast.error("Please select at least one role.");
      return;
    }

    setSavingRoles(true);
    try {
      await roleApi.updateUserRoles(selectedUserForRoles.uid || selectedUserForRoles.id, selectedRoles, selectedRoles[0]);
      toast.success(`Roles updated for ${selectedUserForRoles.name || selectedUserForRoles.email}`);
      setRoleModalOpen(false);
      loadAllRbacData();
    } catch (err) {
      toast.error("Failed to save roles: " + err.message);
    } finally {
      setSavingRoles(false);
    }
  };

  // ─── Create Administrator Account Action ─────────────────────────────────
  const handleCreateAdmin = async (formData) => {
    if (!isSuperAdmin) {
      toast.error("Only Super Admins can create administrator accounts.");
      return;
    }

    setSavingAdmin(true);
    try {
      const email = formData.email.trim().toLowerCase();
      let newUid = null;

      // 1. Try provisioning in Supabase Auth if configured
      if (isSupabaseConfigured()) {
        try {
          const res = await provisionAdminViaSupabase({
            email,
            password: formData.password,
            name: formData.name.trim(),
            role: formData.role.trim().toLowerCase(),
            department: formData.department.trim().toUpperCase(),
          });
          if (res?.uid) {
            newUid = res.uid;
          }
        } catch (sbErr) {
          throw new Error("Failed to provision administrator: " + (sbErr?.message || "Unknown error"));
        }
      }

      if (!newUid) {
        throw new Error("Failed to obtain valid Authentication UID for user.");
      }

      const roleLower = formData.role.trim().toLowerCase();
      const adminPayload = {
        uid: newUid,
        id: newUid,
        name: formData.name.trim(),
        displayName: formData.name.trim(),
        email: email,
        department: formData.department.trim().toUpperCase(),
        role: roleLower,
        roles: [roleLower],
        activeRole: roleLower,
        isAdmin: true,
        isSuperAdmin: roleLower === "super_admin",
        status: "active",
        createdBy: currentUser?.name || currentUser?.email || "Super Admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await DatabaseService.upsertDocument("users", adminPayload, newUid);

      CacheManager.invalidate("admins");
      CacheManager.invalidate("users");

      toast.success(`Administrator ${formData.name} created / assigned successfully!`);
      reset();
      setAdminModalOpen(false);
      loadAllRbacData();
    } catch (err) {
      toast.error("Failed to create administrator: " + err.message);
    } finally {
      setSavingAdmin(false);
    }
  };

  // ─── Delete Administrator Action ─────────────────────────────────────────
  const handleDeleteAdminClick = (adminObj) => {
    const targetId = adminObj?.uid || adminObj?.id;
    if (currentUser && (currentUser.uid === targetId || currentUser.email?.toLowerCase() === adminObj?.email?.toLowerCase())) {
      toast.error("Security Protection: You cannot remove your own active administrator account.");
      return;
    }
    setAdminToDelete(adminObj);
    setDeleteModalOpen(true);
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    const targetId = adminToDelete.uid || adminToDelete.id;
    const targetEmail = (adminToDelete.email || "").toLowerCase().trim();

    setDeletingAdmin(true);
    try {
      await roleApi.deleteAdmin(targetId, targetEmail);
      toast.success(`Administrator ${adminToDelete.name || adminToDelete.email} removed successfully.`);
      
      // Immediately filter out from local state so UI updates instantly
      setUsers((prev) =>
        prev.filter((u) => {
          const uId = u.uid || u.id;
          const uEmail = (u.email || "").toLowerCase().trim();
          if (targetId && uId === targetId) return false;
          if (targetEmail && uEmail === targetEmail) return false;
          return true;
        })
      );
      setAdmins((prev) =>
        prev.filter((a) => {
          const aId = a.uid || a.id;
          const aEmail = (a.email || "").toLowerCase().trim();
          if (targetId && aId === targetId) return false;
          if (targetEmail && aEmail === targetEmail) return false;
          return true;
        })
      );

      setDeleteModalOpen(false);
      setAdminToDelete(null);
      loadAllRbacData();
    } catch (err) {
      toast.error("Failed to remove administrator: " + err.message);
    } finally {
      setDeletingAdmin(false);
    }
  };

  // ─── Permission Matrix Toggles ────────────────────────────────────────────
  const togglePermissionMatrix = (roleId, permKey) => {
    if (!isSuperAdmin) {
      toast.error("Only Super Admins can edit the permission matrix.");
      return;
    }
    setPermissionMatrix((prev) => {
      const currentRolePerms = prev[roleId] || [];
      const updatedPerms = currentRolePerms.includes(permKey)
        ? currentRolePerms.filter((p) => p !== permKey)
        : [...currentRolePerms, permKey];
      return {
        ...prev,
        [roleId]: updatedPerms,
      };
    });
  };

  const handleSavePermissionMatrix = async () => {
    if (!isSuperAdmin) return;
    setSavingMatrix(true);
    try {
      await roleApi.savePermissionMatrix(permissionMatrix);
      toast.success("Permission matrix saved to Firestore!");
    } catch (err) {
      toast.error("Failed to save matrix: " + err.message);
    } finally {
      setSavingMatrix(false);
    }
  };

  // Calculate Metrics
  const totalRoles = roleApi.SYSTEM_ROLES.length;
  const totalAdminsCount = privilegedAccounts.length;
  const coordinatorsCount = users.filter((u) => (u.roles || [u.role]).includes("coordinator")).length;
  const moderatorsCount = users.filter((u) => (u.roles || [u.role]).includes("moderator")).length;
  const multiRoleCount = multiRoleUsers.length;

  return (
    <div className="space-y-6 fade-in p-2 sm:p-4 md:p-6">
      {/* Module Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-display flex items-center">
              <FiShield className="mr-2.5 text-blue-600 dark:text-blue-400" />
              Role &amp; Access Control (RBAC)
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Centralized management for system roles, fine-grained permissions, administrator accounts, and auditing.
          </p>
        </div>
      </div>

      {/* 7-Tab Navigation Bar */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-2">
        {[
          { id: "dashboard", label: "Dashboard", icon: FiGrid },
          { id: "admins", label: "Administrator Accounts", icon: FiShield, count: totalAdminsCount },
          { id: "roles", label: "Roles", icon: FiLock, count: totalRoles },
          { id: "assignments", label: "User Role Assignment", icon: FiUsers },
          { id: "multi-role", label: "Multiple Role Users", icon: FiUserCheck, count: multiRoleCount },
          { id: "matrix", label: "Permission Matrix", icon: FiUserPlus },
          { id: "logs", label: "Activity Logs", icon: FiActivity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-3 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-2 border-x border-slate-200 dark:border-slate-800 border-t-blue-600 dark:border-t-blue-500 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
              }`}
            >
              <Icon className="text-sm shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: DASHBOARD OVERVIEW */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 fade-in">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Roles</div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{totalRoles}</div>
              <div className="text-[10px] text-blue-500 mt-1">System &amp; Custom</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admins</div>
              <div className="text-2xl font-black text-emerald-500 mt-1">{totalAdminsCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Privileged Accounts</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Coordinators</div>
              <div className="text-2xl font-black text-blue-500 mt-1">{coordinatorsCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Academic Managers</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Moderators</div>
              <div className="text-2xl font-black text-amber-500 mt-1">{moderatorsCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Content Reviewers</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Multi-Role</div>
              <div className="text-2xl font-black text-purple-500 mt-1">{multiRoleCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Dual-Workspace Users</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Permissions</div>
              <div className="text-2xl font-black text-indigo-500 mt-1">{roleApi.PERMISSIONS_LIST.length}</div>
              <div className="text-[10px] text-slate-400 mt-1">Action Definitions</div>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
              <FiUserPlus className="mr-2 text-blue-500" />
              Quick Action Shortcuts
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  handleTabChange("admins");
                  setAdminModalOpen(true);
                }}
                className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center space-x-2 hover:bg-blue-500/20 transition-all cursor-pointer"
              >
                <FiPlus /> <span>+ Create Administrator</span>
              </button>

              <button
                onClick={() => handleTabChange("roles")}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center space-x-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <FiLock /> <span>View System Roles</span>
              </button>

              <button
                onClick={() => handleTabChange("assignments")}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center space-x-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <FiUsers /> <span>Assign User Roles</span>
              </button>

              <button
                onClick={() => handleTabChange("matrix")}
                className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center space-x-2 hover:bg-purple-500/20 transition-all cursor-pointer"
              >
                <FiGrid /> <span>Permission Matrix</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: ADMINISTRATOR ACCOUNTS (Privileged Users Only) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "admins" && (
        <div className="space-y-4 fade-in">
          {/* Header Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center">
                  <FiShield className="mr-2 text-blue-500" />
                  Privileged Administrator Accounts ({privilegedAccounts.length})
                </h2>
                <p className="text-[11px] text-slate-400">Displaying Super Admins and Admins ONLY.</p>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setAdminModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <FiPlus /> <span>New Administrator</span>
                </button>
              )}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search admin name, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Privileged Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 ml-auto"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={30}>30 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>

          {/* Accounts Table */}
          {(() => {
            const pageData = paginatedData(privilegedAccounts);
            return (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="py-3 px-3">Administrator</th>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3">Assigned Roles</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {pageData.items.map((adminObj) => {
                        const adminRoles = Array.isArray(adminObj.roles)
                          ? adminObj.roles
                          : adminObj.role
                          ? [adminObj.role]
                          : [];
                        return (
                          <tr key={adminObj.uid || adminObj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{adminObj.name || "N/A"}</div>
                              <div className="text-[10px] text-slate-400">{adminObj.email}</div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">
                              {adminObj.department || "N/A"}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1">
                                {adminRoles.map((r, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  adminObj.status === "suspended"
                                    ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                }`}
                              >
                                {adminObj.status || "Active"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-1">
                              <button
                                onClick={() => openAssignModal(adminObj)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                title="Manage Roles"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleDeleteAdminClick(adminObj)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                  title="Delete Administrator"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {pageData.items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                            No privileged administrator accounts found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500">
                  <div>
                    Showing {pageData.totalCount > 0 ? (pageData.currentPage - 1) * pageSize + 1 : 0} to{" "}
                    {Math.min(pageData.currentPage * pageSize, pageData.totalCount)} of {pageData.totalCount} accounts
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={pageData.currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <FiChevronLeft />
                    </button>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {pageData.currentPage} / {pageData.totalPages}
                    </span>
                    <button
                      disabled={pageData.currentPage >= pageData.totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: SYSTEM ROLES */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "roles" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fade-in">
          {roleApi.SYSTEM_ROLES.map((r) => {
            const assignedCount = users.filter((u) => {
              const uRoles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [];
              return uRoles.includes(r.id);
            }).length;

            const permCount = (permissionMatrix[r.id] || roleApi.ROLE_PERMISSION_MATRIX[r.id] || []).length;

            return (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 capitalize flex items-center">
                      <FiLock className="mr-2 text-blue-500" />
                      {r.label}
                    </h3>
                    {r.isSystem && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{r.description}</p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs font-semibold">
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="text-blue-500 font-bold">{assignedCount}</span> users
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="text-purple-500 font-bold">{permCount}</span> permissions
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: USER ROLE ASSIGNMENT (Paginated) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "assignments" && (
        <div className="space-y-4 fade-in">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search all users by name, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Roles</option>
              {roleApi.SYSTEM_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 ml-auto"
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={30}>30 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>

          {/* User Assignment Table */}
          {(() => {
            const pageData = paginatedData(filteredAllUsers);
            return (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="py-3 px-3">User</th>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3">Assigned Roles</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {pageData.items.map((u) => {
                        const userRoles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : ["student"];
                        return (
                          <tr key={u.uid || u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{u.name || "N/A"}</div>
                              <div className="text-[10px] text-slate-400">{u.email} • {u.studentId || "No ID"}</div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">
                              {u.department || "N/A"}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1">
                                {userRoles.map((r, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedUserForDrawer(u);
                                  setDrawerOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => openAssignModal(u)}
                                className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-lg cursor-pointer"
                              >
                                Edit Roles
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500">
                  <div>
                    Showing {pageData.totalCount > 0 ? (pageData.currentPage - 1) * pageSize + 1 : 0} to{" "}
                    {Math.min(pageData.currentPage * pageSize, pageData.totalCount)} of {pageData.totalCount} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={pageData.currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <FiChevronLeft />
                    </button>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {pageData.currentPage} / {pageData.totalPages}
                    </span>
                    <button
                      disabled={pageData.currentPage >= pageData.totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: MULTIPLE ROLE USERS (Auditing View) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "multi-role" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 fade-in">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center">
              <FiUserCheck className="mr-2 text-purple-500" />
              Multi-Role User Auditing Queue ({multiRoleUsers.length})
            </h2>
            <p className="text-[11px] text-slate-400">Users with 2 or more assigned roles able to switch active workspaces.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Assigned Roles</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {multiRoleUsers.map((u) => {
                  const uRoles = u.roles || [u.role];
                  return (
                    <tr key={u.uid || u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{u.name || "N/A"}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">{u.department || "N/A"}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {uRoles.map((r, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 capitalize"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => openAssignModal(u)}
                          className="px-2.5 py-1 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 rounded-lg cursor-pointer"
                        >
                          Modify Roles
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {multiRoleUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                      No multi-role users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 6: PERMISSION MATRIX EDITOR */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "matrix" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center">
                <FiGrid className="mr-2 text-indigo-500" />
                Action Permission vs Role Matrix Editor
              </h2>
              <p className="text-[11px] text-slate-400">Permissions are inherited exclusively through assigned roles.</p>
            </div>

            {isSuperAdmin && (
              <button
                onClick={handleSavePermissionMatrix}
                disabled={savingMatrix}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {savingMatrix ? "Saving Matrix..." : "Save Matrix to Firestore"}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3 bg-slate-50 dark:bg-slate-950/60 sticky left-0 z-10 min-w-[180px]">Permission</th>
                  {roleApi.SYSTEM_ROLES.map((r) => (
                    <th key={r.id} className="py-3 px-3 text-center min-w-[100px] capitalize">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {roleApi.PERMISSIONS_LIST.map((perm) => (
                  <tr key={perm.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 sticky left-0 z-10 border-r border-slate-100 dark:border-slate-800">
                      <div>{perm.label}</div>
                      <div className="text-[9px] font-mono text-slate-400">{perm.key}</div>
                    </td>
                    {roleApi.SYSTEM_ROLES.map((r) => {
                      const rolePerms = permissionMatrix[r.id] || roleApi.ROLE_PERMISSION_MATRIX[r.id] || [];
                      const isChecked = rolePerms.includes(perm.key);
                      return (
                        <td key={r.id} className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!isSuperAdmin}
                            onChange={() => togglePermissionMatrix(r.id, perm.key)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 7: ACTIVITY LOGS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "logs" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 fade-in">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center">
              <FiActivity className="mr-2 text-emerald-500" />
              Permission &amp; System Activity Audit Trail ({activityLogs.length})
            </h2>
            <p className="text-[11px] text-slate-400">Chronological log of permission edits, role switches, and administrative actions.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Active Role</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A"}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {log.userName || log.email || "System"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">
                        {log.activeRole || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {typeof log.action === "string" ? log.action : (log.action?.action || "N/A")}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {typeof log.details === "string"
                        ? log.details
                        : log.details && typeof log.details === "object"
                        ? log.details.targetCollection
                          ? `${log.details.targetCollection}: ${log.details.targetId || "record"}`
                          : JSON.stringify(log.details)
                        : log.device || "—"}
                    </td>
                  </tr>
                ))}
                {activityLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No activity logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* SIDE DRAWER: User Details & Inherited Permissions */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {drawerOpen && selectedUserForDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto space-y-5 border-l border-slate-200 dark:border-slate-800 z-50">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">User Audit &amp; Permissions</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{selectedUserForDrawer.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedUserForDrawer.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedUserForDrawer.department || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Assigned Roles</span>
                <div className="flex flex-wrap gap-1">
                  {(selectedUserForDrawer.roles || [selectedUserForDrawer.role || "student"]).map((r, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize border border-blue-500/20">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-2">Inherited Permissions</span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(() => {
                    const rolesList = selectedUserForDrawer.roles || [selectedUserForDrawer.role || "student"];
                    const inherited = new Set();
                    rolesList.forEach((r) => {
                      const perms = permissionMatrix[r] || roleApi.ROLE_PERMISSION_MATRIX[r] || [];
                      perms.forEach((p) => inherited.add(p));
                    });
                    return Array.from(inherited).map((permKey) => (
                      <div key={permKey} className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center">
                        <FiCheck className="mr-1.5 text-xs" /> {permKey}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: Edit User Roles */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} title={`Assign Roles: ${selectedUserForRoles?.name || selectedUserForRoles?.email}`}>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Select roles for this user. Permissions will be inherited automatically.</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {roleApi.SYSTEM_ROLES.map((r) => {
              const isChecked = selectedRoles.includes(r.id);
              return (
                <div
                  key={r.id}
                  onClick={() =>
                    setSelectedRoles((prev) => (prev.includes(r.id) ? prev.filter((item) => item !== r.id) : [...prev, r.id]))
                  }
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isChecked
                      ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400"
                      : "bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs capitalize">{r.label}</div>
                    <div className="text-[10px] opacity-75">{r.description}</div>
                  </div>
                  {isChecked && <FiCheck className="text-base shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end space-x-2 border-t border-slate-200 dark:border-slate-800 pt-3">
            <button onClick={() => setRoleModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button onClick={handleSaveRoles} disabled={savingRoles} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              {savingRoles ? "Saving..." : "Save Role Assignment"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: New Administrator Account Creation */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog isOpen={adminModalOpen} onClose={() => setAdminModalOpen(false)} title="Create New Privileged Administrator">
        <form onSubmit={handleSubmit(handleCreateAdmin)} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
            <input
              type="text"
              {...register("name")}
              placeholder="e.g. Dr. Akon Hasib"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
            />
            {errors.name && <span className="text-[10px] text-red-500">{errors.name.message}</span>}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
            <input
              type="email"
              {...register("email")}
              placeholder="admin@sub.edu.bd"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
            />
            {errors.email && <span className="text-[10px] text-red-500">{errors.email.message}</span>}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Password</label>
            <input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
            />
            {errors.password && <span className="text-[10px] text-red-500">{errors.password.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Department</label>
              <select {...register("department")} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200">
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Primary Role</label>
              <select {...register("role")} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200">
                <option value="admin">Admin</option>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 border-t border-slate-200 dark:border-slate-800 pt-3">
            <button type="button" onClick={() => setAdminModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={savingAdmin} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              {savingAdmin ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: Delete Administrator Account Confirmation */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <DeleteConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setAdminToDelete(null);
        }}
        onConfirm={confirmDeleteAdmin}
        itemName={adminToDelete?.name || adminToDelete?.email || "Administrator"}
        loading={deletingAdmin}
      />
    </div>
  );
};

export default RbacManagement;
