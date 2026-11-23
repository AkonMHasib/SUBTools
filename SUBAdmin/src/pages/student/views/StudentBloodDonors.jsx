import { useState } from "react";
import {
  FiHeart,
  FiSearch,
  FiPhone,
  FiUserPlus,
  FiCheckCircle,
  FiMapPin,
  FiX,
} from "react-icons/fi";
import { getDepartmentFullName } from "../../../utils/academic";

const BLOOD_GROUPS = ["All", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export const StudentBloodDonors = ({
  donors = [],
  currentUser,
  userDept,
}) => {
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Registration Form State
  const [donorName, setDonorName] = useState(currentUser?.name || "");
  const [donorPhone, setDonorPhone] = useState(currentUser?.phone || "");
  const [donorBloodGroup, setDonorBloodGroup] = useState(currentUser?.bloodGroup || "A+");
  const [donorDepartment, setDonorDepartment] = useState(userDept || "CSE");
  const [donorLocation, setDonorLocation] = useState("Kendua Campus, Chittagong");

  // Filtered Donors
  const filteredDonors = donors.filter((d) => {
    const bg = (d.bloodGroup || d.blood_group || "").trim().toUpperCase();
    const matchesGroup = selectedGroup === "All" || bg === selectedGroup;

    const q = searchQuery.toLowerCase();
    const name = (d.name || "").toLowerCase();
    const dept = (d.department || "").toLowerCase();
    const loc = (d.location || "").toLowerCase();
    const matchesSearch = !q || name.includes(q) || dept.includes(q) || loc.includes(q);

    return matchesGroup && matchesSearch;
  });



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <FiHeart className="mr-2 text-rose-500" />
            <span>State University Bangladesh Blood Donors Directory</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Emergency student & staff blood donation registry. Connect with voluntary donors directly.
          </p>
        </div>
      </div>

      {/* Blood Group Filter Pills & Search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          {BLOOD_GROUPS.map((bg) => (
            <button
              key={bg}
              onClick={() => setSelectedGroup(bg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedGroup === bg
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
            >
              {bg}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search donor name or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-rose-500 transition-colors shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Donors Grid */}
      {filteredDonors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          <FiHeart className="mx-auto text-3xl text-rose-500 mb-2 opacity-50" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No blood donors found for group {selectedGroup}.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Be the first voluntary donor from your department by clicking "Register as Donor".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredDonors.map((d, i) => {
            const bg = (d.bloodGroup || d.blood_group || "O+").toUpperCase();
            return (
              <div
                key={d.id || i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500/40 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {d.name || "Student Donor"}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Dept: <strong className="text-slate-700 dark:text-slate-300">{getDepartmentFullName(d.department || userDept)}</strong>
                      </p>
                    </div>

                    <span className="text-xs font-black bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-800/60 shadow-xs">
                      {bg}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {d.location && (
                      <p className="flex items-center text-slate-700 dark:text-slate-300 truncate">
                        <FiMapPin className="mr-1.5 text-rose-500 shrink-0" />
                        <span className="truncate">{d.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  {d.phone ? (
                    <a
                      href={`tel:${d.phone}`}
                      className="w-full py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-98 transition-all shadow-md shadow-rose-600/30 flex items-center justify-center cursor-pointer space-x-1.5"
                    >
                      <FiPhone className="text-xs" />
                      <span>Call Donor ({d.phone})</span>
                    </a>
                  ) : (
                    <span className="block text-center text-xs text-slate-400 dark:text-slate-500 py-1.5">
                      Phone hidden by donor
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
};

export default StudentBloodDonors;
