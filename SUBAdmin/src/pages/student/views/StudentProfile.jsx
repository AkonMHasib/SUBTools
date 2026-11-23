import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiShield,
  FiArrowRight,
  FiCamera,
  FiSave,
  FiLogOut,
  FiPhone,
  FiCalendar,
  FiMapPin,
  FiHeart,
  FiBook,
  FiCheckCircle,
  FiLoader,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { setActivePortalMode } from "../../../utils/permissionUtils";
import { uploadImageToImgBB } from "../../../utils/imageUpload";
import ProfileImageCropperModal from "../../../components/common/ProfileImageCropperModal";
import { getDepartmentFullName, CITY_AREAS } from "../../../utils/academic";

// Section options matching Android ProfileFragment SECTION_LABELS & SECTION_VALUES
const SECTION_OPTIONS = [
  { value: "N/A", label: "N/A (Not Applicable)" },
  { value: "A", label: "A / 1" },
  { value: "B", label: "B / 2" },
  { value: "C", label: "C / 3" },
  { value: "D", label: "D / 4" },
  { value: "E", label: "E / 5" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const CITIES = Object.keys(CITY_AREAS);

export const StudentProfile = ({
  user,
  userDept,
  isUserAdmin,
  hasDualRole,
  onUpdateProfile,
  onLogout,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Loading states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Architecture Department determination matching Android User.java & AcademicHelper
  const dept = (user?.department || userDept || "").toUpperCase();
  const isArchitecture =
    dept === "ARCH" ||
    dept.includes("ARCH") ||
    (user?.email && user.email.toLowerCase().includes(".arch."));

  // Academic System for Architecture must strictly be Architecture (Studio-1 to Studio-10)
  const resolvedAcademicSystem = isArchitecture
    ? "Architecture"
    : user?.academicSystem || user?.academic_system || "Semester";

  // Academic Form State
  const [section, setSection] = useState(user?.section || "N/A");
  const [academicLevel, setAcademicLevel] = useState(
    user?.academicLevel || user?.academic_level || user?.term || (isArchitecture ? "Studio-1" : "Semester-1")
  );

  // Personal Form State
  const [name, setName] = useState(user?.name || user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [dob, setDob] = useState(user?.dob || user?.birthday || "");
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || user?.blood_group || "O+");
  const [allowBloodDonation, setAllowBloodDonation] = useState(
    user?.allowBloodDonation ?? user?.is_donor ?? true
  );
  const [city, setCity] = useState(user?.city || "Dhaka");
  const [area, setArea] = useState(user?.area || user?.location || "");
  const [cropperImageSrc, setCropperImageSrc] = useState(null);

  // Synchronize state dynamically whenever user prop updates from database
  useEffect(() => {
    if (user) {
      setName(user.name || user.full_name || "");
      setPhone(user.phone || "");
      setDob(user.dob || user.birthday || "");
      setBloodGroup(user.bloodGroup || user.blood_group || "O+");
      setAllowBloodDonation(user.allowBloodDonation ?? user.is_donor ?? true);
      setCity(user.city || "Dhaka");
      setArea(user.area || user.location || "");
      setSection(user.section || "N/A");
      if (user.academicLevel || user.academic_level || user.term) {
        setAcademicLevel(user.academicLevel || user.academic_level || user.term);
      }
    }
  }, [user]);

  // Dynamic Term/Studio Options matching Android getTermOptionsForUser
  const termOptions = useMemo(() => {
    if (isArchitecture) {
      const options = [];
      for (let i = 1; i <= 10; i++) {
        options.push(`Studio-${i}`);
      }
      return options;
    }

    const system = (resolvedAcademicSystem || "").toLowerCase();
    const options = [];
    if (system.includes("arch")) {
      for (let i = 1; i <= 10; i++) {
        options.push(`Studio-${i}`);
      }
    } else if (system.includes("semester")) {
      for (let i = 1; i <= 8; i++) {
        options.push(`Semester-${i}`);
      }
    } else {
      for (let i = 1; i <= 12; i++) {
        options.push(`Term-${i}`);
      }
    }
    return options;
  }, [isArchitecture, resolvedAcademicSystem]);

  // Handle Photo File Select: open 1:1 cropper
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperImageSrc(event.target.result);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Confirm Crop: upload compressed blob (<= 50KB) to ImgBB
  const handleConfirmCrop = async (croppedBlob) => {
    setCropperImageSrc(null);
    setIsUploadingPhoto(true);

    try {
      const downloadUrl = await uploadImageToImgBB(croppedBlob);

      if (downloadUrl && onUpdateProfile) {
        await onUpdateProfile({ photo_url: downloadUrl, photoURL: downloadUrl });
        toast.success("Profile photo cropped (1:1), compressed (≤50KB) and updated!");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err.message || "Failed to upload avatar to ImgBB.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Save Academic Info (Section & Term/Studio)
  const handleSaveAcademic = async (e) => {
    e.preventDefault();
    setIsSavingAcademic(true);
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({
          section: section === "N/A" ? "" : section,
          academicLevel: academicLevel,
          academic_level: academicLevel,
          academicSystem: resolvedAcademicSystem,
          academic_system: resolvedAcademicSystem,
          term: academicLevel,
        });
      }
    } finally {
      setIsSavingAcademic(false);
    }
  };

  // Save Personal Info
  const handleSavePersonal = async (e) => {
    e.preventDefault();
    if (phone && !/^01\d{9}$/.test(phone.trim().replace(/\D/g, ""))) {
      toast.error("Please enter a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX)");
      return;
    }

    setIsSavingPersonal(true);
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({
          name: name.trim(),
          full_name: name.trim(),
          phone: phone.trim(),
          dob: dob.trim(),
          birthday: dob.trim(),
          bloodGroup: bloodGroup,
          blood_group: bloodGroup,
          allowBloodDonation: Boolean(allowBloodDonation),
          is_donor: Boolean(allowBloodDonation),
          city: city.trim(),
          area: area.trim(),
          location: area.trim() ? `${area.trim()}, ${city.trim()}` : city.trim(),
        });
      }
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleSwitchToAdmin = () => {
    setActivePortalMode("admin");
    navigate("/admin/dashboard");
  };

  const initialLetter = user?.name?.trim()?.charAt(0)?.toUpperCase() || "S";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 1. PROFILE HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar with Camera Overlay */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center">
              {user?.photo_url || user?.photoURL ? (
                <img
                  src={user.photo_url || user.photoURL}
                  alt={user.name || "Student"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {initialLetter}
                </span>
              )}

              {/* Uploading Spinner Overlay */}
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center text-white">
                  <FiLoader className="text-2xl animate-spin" />
                </div>
              )}
            </div>

            {/* Camera Upload Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              title="Change Profile Photo"
              className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FiCamera className="text-xs" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* Student Identity Information */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                  <span>{user?.name || "State University Student"}</span>
                </h3>
                {(() => {
                  const sId = user?.studentId || user?.student_id || user?.data?.studentId || user?.data?.student_id;
                  if (sId) {
                    return (
                      <div className="mt-1 flex items-center justify-center sm:justify-start">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs">
                          ID: {sId}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {user?.email}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-center sm:self-start">
                {/* Dual Role Switcher Button */}
                {hasDualRole && (
                  <button
                    type="button"
                    onClick={handleSwitchToAdmin}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title="Switch to Admin Console"
                  >
                    <FiShield />
                    <span>Admin Console</span>
                  </button>
                )}

                {/* Logout Button */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FiLogOut />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                {hasDualRole
                  ? "Student + Admin"
                  : isUserAdmin
                    ? "Administrator"
                    : "Student"}
              </span>

              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {getDepartmentFullName(userDept || user?.department)}
              </span>

              {(academicLevel || user?.academicLevel || user?.term) && (
                <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800/60">
                  {academicLevel || user?.academicLevel || user?.term}
                </span>
              )}

              {user?.batch && (
                <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60">
                  Batch {user.batch}
                </span>
              )}

              {user?.section && (
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60">
                  Section: {user.section}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dual Role Switch Banner */}
        {isUserAdmin && (
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              You have administrator privileges on State University portal.
            </div>
            <button
              onClick={handleSwitchToAdmin}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-md shadow-blue-600/30 flex items-center cursor-pointer"
            >
              <FiShield className="mr-1.5" />
              <span>Switch to Admin Console</span>
              <FiArrowRight className="ml-1.5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. ACADEMIC SETTINGS CARD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <FiBook className="text-blue-500 text-lg" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Academic Registration & Level
            </h4>
          </div>

          <form onSubmit={handleSaveAcademic} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Student ID
                </label>
                <div className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {user?.studentId || user?.student_id || "Not Assigned"}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Department
                </label>
                <div className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={getDepartmentFullName(userDept || user?.department)}>
                  {userDept || user?.department || "N/A"}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Academic System
              </label>
              <div className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                {isArchitecture ? "Architecture System (10 Studios / 5 Years)" : `${resolvedAcademicSystem} System`}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {isArchitecture ? "Current Studio *" : "Current Term / Semester *"}
              </label>
              <select
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
              >
                {termOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {isArchitecture
                  ? "Controls which studio sessions and architecture routines are recommended for you."
                  : "Controls which course routines and academic schedules are recommended for you."}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Assigned Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
              >
                {SECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingAcademic}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingAcademic ? (
                  <FiLoader className="animate-spin text-sm" />
                ) : (
                  <FiSave className="text-sm" />
                )}
                <span>Save Academic Info</span>
              </button>
            </div>
          </form>
        </div>

        {/* 3. PERSONAL & EMERGENCY INFO CARD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <FiHeart className="text-rose-500 text-lg" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Personal & Contact Details
            </h4>
          </div>

          <form onSubmit={handleSavePersonal} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Student Full Name
              </label>
              <input
                type="text"
                disabled
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-75"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  disabled
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-75"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  disabled
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-75"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Blood Group
                </label>
                <select
                  disabled
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-75"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  City
                </label>
                <select
                  disabled
                  value={city}
                  onChange={(e) => {
                    const newCity = e.target.value;
                    setCity(newCity);
                    if (CITY_AREAS[newCity] && CITY_AREAS[newCity].length > 0) {
                      setArea(CITY_AREAS[newCity][0]);
                    }
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-75"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {city && !CITIES.includes(city) && (
                    <option value={city}>{city}</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Area / Campus Location
              </label>
              <input
                type="text"
                list="city-areas-list"
                placeholder="e.g. Kanchan, Dhanmondi, Kendua"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500"
              />
              <datalist id="city-areas-list">
                {(CITY_AREAS[city] || []).map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>

            {/* Blood Donation Toggle */}
            <div className="flex items-center space-x-2 pt-1 bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
              <input
                type="checkbox"
                id="donorToggle"
                checked={allowBloodDonation}
                onChange={(e) => setAllowBloodDonation(e.target.checked)}
                className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <label
                htmlFor="donorToggle"
                className="text-xs font-semibold text-rose-800 dark:text-rose-300 cursor-pointer"
              >
                Register as Emergency Blood Donor in Campus Directory
              </label>
            </div>



            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingPersonal}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-98 transition-all shadow-md shadow-rose-600/30 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingPersonal ? (
                  <FiLoader className="animate-spin text-sm" />
                ) : (
                  <FiSave className="text-sm" />
                )}
                <span>Save Personal Profile</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 1:1 Profile Avatar Cropper and <=50KB Compressor Modal */}
      {cropperImageSrc && (
        <ProfileImageCropperModal
          imageSrc={cropperImageSrc}
          onCancel={() => setCropperImageSrc(null)}
          onConfirm={handleConfirmCrop}
          maxSizeBytes={50 * 1024}
        />
      )}
    </div>
  );
};

export default StudentProfile;
