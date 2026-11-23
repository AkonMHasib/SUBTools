import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FiHome,
  FiCheckCircle,
  FiXCircle,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiClock,
  FiMapPin,
  FiUser,
  FiShield,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";
import { subletApi } from "../../api/subletApi";

import { isSuperAdmin, isAdmin } from "../../utils/permissionUtils";

export const SubletManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdminUser = isSuperAdmin(user);

  const [sublets, setSublets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending"); // "pending", "approved", "all"
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadSublets = async (force = false) => {
    setLoading(true);
    try {
      const data = await subletApi.getAll(force);
      setSublets(data || []);
    } catch (err) {
      toast.error("Failed to load sublet listings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSublets(true);
  }, []);

  const handleApprove = async (id) => {
    if (!isSuperAdminUser) {
      toast.error("Security Policy: Only Super Admin can approve sublet/room posts.");
      return;
    }
    setActionLoadingId(id);
    try {
      await subletApi.approve(id);
      toast.success("Sublet listing approved successfully!");
      await loadSublets(true);
    } catch (err) {
      toast.error("Approval failed: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    if (!isSuperAdminUser) {
      toast.error("Security Policy: Only Super Admin can reject/delete sublet posts.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete/reject this sublet listing?")) return;
    setActionLoadingId(id);
    try {
      await subletApi.delete(id);
      toast.success("Sublet listing deleted.");
      await loadSublets(true);
    } catch (err) {
      toast.error("Action failed: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredSublets = sublets.filter((item) => {
    const approval = item.approvalStatus ? item.approvalStatus.toLowerCase() : "pending";
    if (statusFilter === "pending" && approval !== "pending") return false;
    if (statusFilter === "approved" && approval !== "approved") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (item.title || "").toLowerCase().includes(q);
      const matchLocation = (item.location || "").toLowerCase().includes(q);
      const matchType = (item.type || "").toLowerCase().includes(q);
      const matchPublisher = (item.publisherName || "").toLowerCase().includes(q);
      return matchTitle || matchLocation || matchType || matchPublisher;
    }
    return true;
  });

  const pendingCount = sublets.filter((s) => {
    const approval = s.approvalStatus ? s.approvalStatus.toLowerCase() : "pending";
    return approval === "pending";
  }).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FiHome className="text-blue-600 dark:text-blue-400" />
            <span>Room Sublets & Accommodation Listings</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage student room sublet postings, bachelor seats, and accommodation requests.
          </p>
        </div>

        <button
          onClick={() => loadSublets(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Security Privilege Banner */}
      {!isSuperAdminUser && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center space-x-2">
            <FiShield className="text-amber-500 text-sm shrink-0" />
            <span>
              <b>Policy Enforcement:</b> You are viewing as <b>{user?.role || "Admin"}</b>. Only <b>Super Admin</b> can approve or reject pending sublet listings.
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              statusFilter === "pending"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <FiClock />
            <span>Pending Approval</span>
            {pendingCount > 0 && (
              <span className="bg-white text-amber-700 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              statusFilter === "approved"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <FiCheckCircle />
            <span>Approved & Active</span>
          </button>

          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              statusFilter === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <span>All Listings</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64 text-slate-400">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, location, type..."
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading sublet listings...</div>
      ) : filteredSublets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSublets.map((item) => {
            const isPending = (item.approvalStatus || "approved") === "pending";
            const isLoadingThis = actionLoadingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                  {(item.photo_url || item.photoUrl) && (
                    <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 mb-2 border border-slate-200 dark:border-slate-800">
                      <img
                        src={item.photo_url || item.photoUrl}
                        alt={item.title || "Room Photo"}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                        🛋️ {item.type || "Seat"}
                      </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        isPending
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      }`}
                    >
                      {isPending ? "⏳ Pending Approval" : "✓ Approved"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {item.title || "Sublet Listing"}
                  </h3>

                  <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    ৳ {item.rent || 0} <span className="text-xs font-normal text-slate-400">/ month</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-2">
                      <FiMapPin className="text-slate-400 text-xs shrink-0" />
                      <span>{item.location || "Dhanmondi"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiUser className="text-slate-400 text-xs shrink-0" />
                      <span>{item.publisherName || "SUB Student"} ({item.contactPhone || "N/A"})</span>
                    </div>
                    {item.availableFrom && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <FiClock className="text-slate-400 text-xs shrink-0" />
                        <span>Available From: <b>{item.availableFrom}</b></span>
                      </div>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {isSuperAdminUser ? (
                    <>
                      {isPending ? (
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={isLoadingThis}
                          className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          <FiCheckCircle size={13} />
                          <span>Approve Listing</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <FiCheckCircle size={12} />
                          <span>Publicly Visible</span>
                        </span>
                      )}

                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={isLoadingThis}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <FiTrash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </>
                  ) : (
                    <div className="w-full text-center py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                      <FiShield size={11} className="text-amber-500" />
                      <span>Only Super Admin Can Approve</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 text-center text-slate-400 font-semibold">
          No sublet listings found matching the current filters.
        </div>
      )}
    </div>
  );
};

export default SubletManagement;
