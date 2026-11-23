import { useState, useMemo } from "react";
import {
  FiHeart,
  FiSearch,
  FiHome,
  FiBookOpen,
  FiPlus,
  FiPhone,
  FiMapPin,
  FiX,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiTag,
  FiUsers,
} from "react-icons/fi";

export const StudentCommunity = ({
  lostFound = [],
  sublets = [],
  tuitions = [],
  currentUser,
  onAddLostFound,
  onAddSublet,
  onAddTuition,
}) => {
  // Active Tab: "lost_found" | "sublets" | "tuitions"
  const [activeTab, setActiveTab] = useState("lost_found");

  // Search query
  const [searchQuery, setSearchQuery] = useState("");

  // Filter for Lost & Found: "all" | "lost" | "found"
  const [lfFilter, setLfFilter] = useState("all");

  // Filter for Sublets
  const [subletGenderFilter, setSubletGenderFilter] = useState("all");
  const [subletTypeFilter, setSubletTypeFilter] = useState("all");

  // Filter for Tuitions
  const [tuitionMediumFilter, setTuitionMediumFilter] = useState("all");

  // Modals state: 'lost_found' | 'sublet' | 'tuition' | null
  const [modalType, setModalType] = useState(null);

  // Current user UID helper
  const currentUid = useMemo(() => {
    return currentUser?.id || currentUser?.uid || "";
  }, [currentUser]);

  // Form states
  // 1. Lost & Found form
  const [lfTitle, setLfTitle] = useState("");
  const [lfType, setLfType] = useState("lost"); // 'lost' | 'found'
  const [lfLocation, setLfLocation] = useState("");
  const [lfDesc, setLfDesc] = useState("");
  const [lfPhotoUrl, setLfPhotoUrl] = useState("");
  const [lfContact, setLfContact] = useState(currentUser?.phone || "");

  // 2. Sublet form
  const [subletTitle, setSubletTitle] = useState("");
  const [subletType, setSubletType] = useState("Seat"); // 'Seat' | 'Room' | 'Sublet' | 'Full Flat'
  const [subletRent, setSubletRent] = useState("");
  const [subletLocation, setSubletLocation] = useState("");
  const [subletAddress, setSubletAddress] = useState("");
  const [subletGender, setSubletGender] = useState("Male"); // 'Male' | 'Female' | 'Any'
  const [subletBillsIncluded, setSubletBillsIncluded] = useState(false);
  const [subletAvailableFrom, setSubletAvailableFrom] = useState("");
  const [subletPhone, setSubletPhone] = useState(currentUser?.phone || "");
  const [subletDesc, setSubletDesc] = useState("");

  // 3. Tuition form
  const [tuitionSubject, setTuitionSubject] = useState("");
  const [tuitionMedium, setTuitionMedium] = useState("Bangla Medium");
  const [tuitionClass, setTuitionClass] = useState("Class 9-10");
  const [tuitionSalary, setTuitionSalary] = useState("");
  const [tuitionDays, setTuitionDays] = useState("3 Days / Week");
  const [tuitionLocation, setTuitionLocation] = useState("");
  const [tuitionPhone, setTuitionPhone] = useState(currentUser?.phone || "");

  // Submission handlers
  const handleLfSubmit = (e) => {
    e.preventDefault();
    if (!lfTitle.trim()) return;
    if (onAddLostFound) {
      onAddLostFound({
        title: lfTitle.trim(),
        type: lfType,
        location: lfLocation.trim() || "State University Main Campus",
        description: lfDesc.trim(),
        photoUrl: lfPhotoUrl.trim(),
        contact: lfContact.trim() || currentUser?.phone || "",
        contactPhone: lfContact.trim() || currentUser?.phone || "",
        contactName: currentUser?.name || currentUser?.fullName || "Student",
        publisherUid: currentUid,
        approvalStatus: "pending",
        createdAt: new Date().toISOString(),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      });
    }
    setModalType(null);
    setLfTitle("");
    setLfLocation("");
    setLfDesc("");
    setLfPhotoUrl("");
  };

  const handleSubletSubmit = (e) => {
    e.preventDefault();
    if (!subletTitle.trim()) return;
    if (onAddSublet) {
      onAddSublet({
        title: subletTitle.trim(),
        type: subletType,
        rent: subletRent.trim(),
        location: subletLocation.trim() || "Near SUB Campus",
        address: subletAddress.trim(),
        genderPreference: subletGender,
        billsIncluded: subletBillsIncluded,
        availableFrom: subletAvailableFrom.trim() || "Immediate",
        phone: subletPhone.trim() || currentUser?.phone || "",
        contactPhone: subletPhone.trim() || currentUser?.phone || "",
        contactName: currentUser?.name || currentUser?.fullName || "Student",
        description: subletDesc.trim(),
        publisherUid: currentUid,
        approvalStatus: "pending",
        createdAt: new Date().toISOString(),
      });
    }
    setModalType(null);
    setSubletTitle("");
    setSubletRent("");
    setSubletLocation("");
    setSubletAddress("");
    setSubletDesc("");
  };

  const handleTuitionSubmit = (e) => {
    e.preventDefault();
    if (!tuitionSubject.trim()) return;
    if (onAddTuition) {
      onAddTuition({
        title: `${tuitionSubject} Tutor Requirement`,
        subject: tuitionSubject.trim(),
        subjects: tuitionSubject.trim(),
        medium: tuitionMedium,
        class: tuitionClass,
        classGrade: tuitionClass,
        salary: tuitionSalary.trim(),
        daysPerWeek: tuitionDays,
        location: tuitionLocation.trim() || "Kanchan / Near Campus",
        phone: tuitionPhone.trim() || currentUser?.phone || "",
        contactPhone: tuitionPhone.trim() || currentUser?.phone || "",
        contactName: currentUser?.name || currentUser?.fullName || "Student",
        publisherUid: currentUid,
        approvalStatus: "pending",
        createdAt: new Date().toISOString(),
      });
    }
    setModalType(null);
    setTuitionSubject("");
    setTuitionSalary("");
    setTuitionLocation("");
  };

  // Helper to test if item belongs to current user
  const isUserOwner = (item) => {
    if (!currentUid) return false;
    const publisher = String(
      item.publisherUid || item.reporterUid || item.user_id || item.userId || ""
    ).trim().toLowerCase();
    const curr = String(currentUid).trim().toLowerCase();
    return Boolean(publisher && curr && publisher === curr);
  };

  // Check if item is visible to user (approved OR user is owner)
  const isItemVisible = (item) => {
    const isApproved =
      !item.approvalStatus ||
      item.approvalStatus === "approved" ||
      String(item.approvalStatus).toLowerCase() === "approved";
    return isApproved || isUserOwner(item);
  };

  // Filtered Lost & Found
  const filteredLf = useMemo(() => {
    return lostFound.filter((item) => {
      if (!isItemVisible(item)) return false;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      const itemType = (item.type || item.status || "lost").toLowerCase();
      const matchesType = lfFilter === "all" || itemType === lfFilter;

      return matchesSearch && matchesType;
    });
  }, [lostFound, searchQuery, lfFilter, currentUid]);

  // Filtered Sublets
  const filteredSublets = useMemo(() => {
    return sublets.filter((item) => {
      if (!isItemVisible(item)) return false;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      const itemGender = (item.genderPreference || "male").toLowerCase();
      const matchesGender =
        subletGenderFilter === "all" ||
        itemGender === subletGenderFilter.toLowerCase() ||
        itemGender === "any";

      const itemType = (item.type || "seat").toLowerCase();
      const matchesType =
        subletTypeFilter === "all" ||
        itemType === subletTypeFilter.toLowerCase();

      return matchesSearch && matchesGender && matchesType;
    });
  }, [sublets, searchQuery, subletGenderFilter, subletTypeFilter, currentUid]);

  // Filtered Tuitions
  const filteredTuitions = useMemo(() => {
    return tuitions.filter((item) => {
      if (!isItemVisible(item)) return false;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.subject && item.subject.toLowerCase().includes(q)) ||
        (item.subjects && item.subjects.toLowerCase().includes(q)) ||
        (item.class && item.class.toLowerCase().includes(q)) ||
        (item.classGrade && item.classGrade.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q));

      const itemMedium = (item.medium || "bangla medium").toLowerCase();
      const matchesMedium =
        tuitionMediumFilter === "all" ||
        itemMedium.includes(tuitionMediumFilter.toLowerCase());

      return matchesSearch && matchesMedium;
    });
  }, [tuitions, searchQuery, tuitionMediumFilter, currentUid]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <FiHeart className="mr-2 text-rose-500" />
            <span>Campus Community & Student Services</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Student-to-student community board for lost & found claims, bachelor room sharing, and tuition requirements.
          </p>
        </div>

        {/* Create Post Button based on active tab */}
        <button
          onClick={() => setModalType(activeTab)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/30 flex items-center space-x-1.5 cursor-pointer"
        >
          <FiPlus className="text-sm" />
          <span>
            {activeTab === "lost_found"
              ? "Report Lost / Found"
              : activeTab === "sublets"
                ? "Post Room Sublet"
                : "Post Tuition Request"}
          </span>
        </button>
      </div>

      {/* Main Category Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              setActiveTab("lost_found");
              setSearchQuery("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === "lost_found"
                ? "bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FiSearch />
            <span>Lost & Found ({filteredLf.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("sublets");
              setSearchQuery("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === "sublets"
                ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FiHome />
            <span>Room Sublets ({filteredSublets.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("tuitions");
              setSearchQuery("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === "tuitions"
                ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FiBookOpen />
            <span>Tuition Finder ({filteredTuitions.length})</span>
          </button>
        </div>

        <div className="w-full sm:w-72">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder={`Search in ${
                activeTab === "lost_found"
                  ? "lost & found items"
                  : activeTab === "sublets"
                    ? "rooms & flats"
                    : "tuitions"
              }...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* 1. LOST & FOUND TAB CONTENT */}
      {activeTab === "lost_found" && (
        <div className="space-y-4">
          {/* Sub-filter pills: All, Lost, Found */}
          <div className="flex gap-2">
            {[
              { id: "all", label: "All Items" },
              { id: "lost", label: "Lost Items" },
              { id: "found", label: "Found Items" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setLfFilter(t.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  lfFilter === t.id
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-600/50"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {filteredLf.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
              <FiSearch className="mx-auto text-3xl text-amber-500 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No lost & found claims recorded.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Found something or lost an item on campus? Click "Report Lost / Found" above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredLf.map((item, i) => {
                const isLost = (item.type || item.status || "lost").toLowerCase() === "lost";
                const isMyPost = isUserOwner(item);
                const isPending =
                  item.approvalStatus === "pending" ||
                  (isMyPost && !item.approvalStatus);

                return (
                  <div
                    key={item.id || i}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/40 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-1.5 mb-2.5">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                            isLost
                              ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
                              : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                          }`}
                        >
                          {isLost ? "Lost Item" : "Found Item"}
                        </span>

                        {/* Approval status badge if user's own post */}
                        {isMyPost && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isPending
                                ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                                : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                            }`}
                          >
                            {isPending ? "⏳ Pending Admin Review" : "✓ Approved"}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {item.date || (item.created_at ? new Date(item.created_at).toLocaleDateString() : "")}
                        </span>
                      </div>

                      {/* Photo if available */}
                      {(item.photoUrl || item.imageUrl) && (
                        <div className="mb-3 rounded-xl overflow-hidden max-h-40 border border-slate-100 dark:border-slate-800">
                          <img
                            src={item.photoUrl || item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{item.title}</h4>
                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                          {item.description}
                        </p>
                      )}

                      <div className="space-y-1 mb-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                          <FiMapPin className="mr-1.5 text-amber-500 shrink-0" />
                          <span>Location: <strong className="text-slate-800 dark:text-slate-200">{item.location || "Main Campus"}</strong></span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                          <FiUsers className="mr-1.5 text-slate-400 shrink-0" />
                          <span>Posted by: <strong className="text-slate-700 dark:text-slate-300">{item.reporterName || item.contactName || "SUB Student"}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-3 flex items-center justify-between text-xs">
                      {item.contact || item.contactPhone || item.reporterPhone ? (
                        <a
                          href={`tel:${item.contact || item.contactPhone || item.reporterPhone}`}
                          className="w-full py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:scale-98 transition-all shadow-md shadow-amber-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <FiPhone />
                          <span>Call: {item.contact || item.contactPhone || item.reporterPhone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 w-full text-center py-1">Inquire at Campus Security</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. ROOM SUBLETS TAB CONTENT */}
      {activeTab === "sublets" && (
        <div className="space-y-4">
          {/* Sublet Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 flex items-center mr-1">Gender:</span>
              {[
                { id: "all", label: "All" },
                { id: "male", label: "👨 Male Only" },
                { id: "female", label: "👩 Female Only" },
                { id: "any", label: "👥 Any" },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSubletGenderFilter(g.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    subletGenderFilter === g.id
                      ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-600/50"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-900"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 flex items-center mr-1">Type:</span>
              {[
                { id: "all", label: "All Types" },
                { id: "seat", label: "Seat" },
                { id: "room", label: "Room" },
                { id: "sublet", label: "Sublet" },
                { id: "full flat", label: "Full Flat" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSubletTypeFilter(t.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    subletTypeFilter === t.id
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSublets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
              <FiHome className="mx-auto text-3xl text-blue-500 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No room sublet postings match your criteria.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Have an available seat or bachelor room? Click "Post Room Sublet" above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredSublets.map((item, i) => {
                const isMyPost = isUserOwner(item);
                const isPending =
                  item.approvalStatus === "pending" ||
                  (isMyPost && !item.approvalStatus);

                return (
                  <div
                    key={item.id || i}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/40 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-1.5 mb-2.5">
                        <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60">
                          {item.rent ? `${item.rent} BDT/mo` : "Rent: Negotiable"}
                        </span>

                        {/* Approval status badge if user's own post */}
                        {isMyPost && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isPending
                                ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                                : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                            }`}
                          >
                            {isPending ? "⏳ Pending Admin Review" : "✓ Approved"}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.type || "Seat"}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          {item.genderPreference === "Female" ? "👩 Female Only" : item.genderPreference === "Any" ? "👥 Any Gender" : "👨 Male Only"}
                        </span>
                        {item.billsIncluded && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            💡 Bills Included
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                        {item.title || item.location}
                      </h4>

                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="space-y-1 mb-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                          <FiMapPin className="mr-1.5 text-blue-500 shrink-0" />
                          <span>{item.location || item.address || "Near SUB Campus, Kanchan"}</span>
                        </p>
                        {item.availableFrom && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                            <FiCalendar className="mr-1.5 text-slate-400 shrink-0" />
                            <span>Available from: <strong className="text-slate-700 dark:text-slate-300">{item.availableFrom}</strong></span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-3">
                      {item.phone || item.contactPhone ? (
                        <a
                          href={`tel:${item.phone || item.contactPhone}`}
                          className="w-full py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <FiPhone />
                          <span>Call Room Owner ({item.phone || item.contactPhone})</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 text-center block">Contact details not provided</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. TUITION FINDER TAB CONTENT */}
      {activeTab === "tuitions" && (
        <div className="space-y-4">
          {/* Tuition Medium Filter */}
          <div className="flex gap-2">
            {[
              { id: "all", label: "All Mediums" },
              { id: "bangla", label: "Bangla Medium" },
              { id: "english", label: "English Medium / Version" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setTuitionMediumFilter(m.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tuitionMediumFilter === m.id
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/50"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-900"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {filteredTuitions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
              <FiBookOpen className="mx-auto text-3xl text-emerald-500 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No student tuition requests currently listed.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Looking for a tutor or offering private tuition? Click "Post Tuition Request" above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredTuitions.map((item, i) => {
                const isMyPost = isUserOwner(item);
                const isPending =
                  item.approvalStatus === "pending" ||
                  (isMyPost && !item.approvalStatus);

                return (
                  <div
                    key={item.id || i}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/40 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-1.5 mb-2.5">
                        <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                          {item.class || item.classGrade || "Student Tuition"}
                        </span>

                        {/* Approval status badge if user's own post */}
                        {isMyPost && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isPending
                                ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                                : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                            }`}
                          >
                            {isPending ? "⏳ Pending Admin Review" : "✓ Approved"}
                          </span>
                        )}

                        {item.salary && (
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {item.salary} BDT/mo
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                        Subjects: {item.subject || item.subjects || "All Subjects"}
                      </h4>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.medium && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.medium}
                          </span>
                        )}
                        {item.daysPerWeek && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                            {item.daysPerWeek}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mb-1">
                        <FiMapPin className="mr-1.5 text-emerald-500 shrink-0" />
                        <span>Location: <strong className="text-slate-800 dark:text-slate-200">{item.location || "Kanchan / Online"}</strong></span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-4">
                      {item.phone || item.contactPhone ? (
                        <a
                          href={`tel:${item.phone || item.contactPhone}`}
                          className="w-full py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <FiPhone />
                          <span>Apply / Contact ({item.phone || item.contactPhone})</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 text-center block">Contact via SUB portal</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. MODALS FOR POSTING ITEMS */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {modalType === "lost_found"
                  ? "Report Lost or Found Item"
                  : modalType === "sublets"
                    ? "Post Room Sublet Listing"
                    : "Post Tuition Requirement"}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Form for Lost & Found */}
            {modalType === "lost_found" && (
              <form onSubmit={handleLfSubmit} className="p-5 space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Item Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLfType("lost")}
                      className={`py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        lfType === "lost"
                          ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                          : "bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Lost Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setLfType("found")}
                      className={`py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        lfType === "found"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                          : "bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Found Item
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Item Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Casio fx-991EX Calculator, SUB ID Card..."
                    value={lfTitle}
                    onChange={(e) => setLfTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Campus Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Building 1, Room 402 or Main Canteen"
                    value={lfLocation}
                    onChange={(e) => setLfLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Description / Identifying Marks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide details to verify owner identity..."
                    value={lfDesc}
                    onChange={(e) => setLfDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Photo URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://i.ibb.co/..."
                    value={lfPhotoUrl}
                    onChange={(e) => setLfPhotoUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={lfContact}
                    onChange={(e) => setLfContact(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}

            {/* Form for Sublets */}
            {modalType === "sublets" && (
              <form onSubmit={handleSubletSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Listing Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 Bed Available in Bachelor Flat"
                    value={subletTitle}
                    onChange={(e) => setSubletTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Listing Type
                    </label>
                    <select
                      value={subletType}
                      onChange={(e) => setSubletType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="Seat">Single Seat</option>
                      <option value="Room">Private Room</option>
                      <option value="Sublet">Sublet Unit</option>
                      <option value="Full Flat">Full Flat</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Gender Preference
                    </label>
                    <select
                      value={subletGender}
                      onChange={(e) => setSubletGender(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="Male">Male / Bachelor</option>
                      <option value="Female">Female</option>
                      <option value="Any">Any Gender</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Monthly Rent (BDT)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4500"
                      value={subletRent}
                      onChange={(e) => setSubletRent(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Available From
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Next Month / Immediate"
                      value={subletAvailableFrom}
                      onChange={(e) => setSubletAvailableFrom(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Location / Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kanchan, 5 min walk from campus"
                    value={subletLocation}
                    onChange={(e) => setSubletLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="billsIncludedCheck"
                    checked={subletBillsIncluded}
                    onChange={(e) => setSubletBillsIncluded(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="billsIncludedCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    Electricity, Gas & WiFi Bills Included in Rent
                  </label>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={subletPhone}
                    onChange={(e) => setSubletPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Room Facilities & Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Meal system, generator backup, attached bath, etc."
                    value={subletDesc}
                    onChange={(e) => setSubletDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Post Sublet
                  </button>
                </div>
              </form>
            )}

            {/* Form for Tuition */}
            {modalType === "tuitions" && (
              <form onSubmit={handleTuitionSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Subjects to Teach *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Higher Math, Physics, ICT"
                    value={tuitionSubject}
                    onChange={(e) => setTuitionSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Medium
                    </label>
                    <select
                      value={tuitionMedium}
                      onChange={(e) => setTuitionMedium(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="Bangla Medium">Bangla Medium</option>
                      <option value="English Medium">English Medium</option>
                      <option value="English Version">English Version</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Class / Grade
                    </label>
                    <select
                      value={tuitionClass}
                      onChange={(e) => setTuitionClass(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="Class 1-5">Class 1-5</option>
                      <option value="Class 6-8">Class 6-8</option>
                      <option value="Class 9-10 (SSC)">Class 9-10 (SSC)</option>
                      <option value="Class 11-12 (HSC)">Class 11-12 (HSC)</option>
                      <option value="O-Level / A-Level">O-Level / A-Level</option>
                      <option value="Admission Test">Admission Test</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Expected Salary (BDT)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5000/mo"
                      value={tuitionSalary}
                      onChange={(e) => setTuitionSalary(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Days Per Week
                    </label>
                    <select
                      value={tuitionDays}
                      onChange={(e) => setTuitionDays(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="3 Days / Week">3 Days / Week</option>
                      <option value="4 Days / Week">4 Days / Week</option>
                      <option value="5 Days / Week">5 Days / Week</option>
                      <option value="2 Days / Week (Weekend)">2 Days / Week (Weekend)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kanchan, Kendua, Mirpur or Online"
                    value={tuitionLocation}
                    onChange={(e) => setTuitionLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={tuitionPhone}
                    onChange={(e) => setTuitionPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Post Tuition
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCommunity;
