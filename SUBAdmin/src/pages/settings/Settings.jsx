// Settings Page Component
import { isSuperAdmin, isAdmin } from "../../utils/permissionUtils";
import { getDepartmentName, normalizeDepartment } from "../../utils/academic";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import { FiSettings, FiLock, FiDatabase, FiLayers, FiSun, FiMoon, FiEye, FiEyeOff, FiKey, FiSave, FiCheckCircle, FiMail, FiSmartphone, FiTrash2 } from "react-icons/fi";
import { updateAdminProfile } from "../../redux/slices/authSlice";
import { toggleTheme, updateSupabaseSettings, updateAppSettings } from "../../redux/slices/settingsSlice";
import { ImgbbKeyManager } from "../../components/settings/ImgbbKeyManager";
import { EmailjsKeyManager } from "../../components/settings/EmailjsKeyManager";
import { AdminTwoFactorManager } from "../../components/settings/AdminTwoFactorManager";
import {
  isSupabaseConfigured,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  DEFAULT_SITE_URL,
  updateSupabaseUser,
  getSystemSettings,
  updateSystemSettings,
} from "../../supabase/config";

// Schema validation
const profileSchema = yup.object().shape({
  name: yup.string().min(3, "Name must be at least 3 chars").required(),
  email: yup.string().email().required(),
});

const passSchema = yup.object().shape({
  oldPass: yup.string().required("Current password is required"),
  newPass: yup
    .string()
    .min(6, "Must be at least 6 characters")
    .required("New password is required"),
  confirmPass: yup
    .string()
    .oneOf([yup.ref("newPass"), null], "Passwords must match")
    .required("Confirm password is required"),
});

const sbSchema = yup.object().shape({
  url: yup.string().url("Valid URL required").required("Supabase URL is required"),
  anonKey: yup.string().required("Anon Public Key is required"),
});

export const Settings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { theme, supabaseSettings, appSettings } = useSelector((state) => state.settings);
  const isSuperAdminUser = isSuperAdmin(user);
  const isAdminOrSuperAdmin = isAdmin(user);

  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // API Sub-Tab state ("imgbb" | "emailjs")
  const [apiSubTab, setApiSubTab] = useState("imgbb");

  // SUBTools Student App Updates State
  const [subtoolsCode, setSubtoolsCode] = useState("");
  const [subtoolsName, setSubtoolsName] = useState("");
  const [subtoolsApkUrl, setSubtoolsApkUrl] = useState("");
  const [subtoolsNotes, setSubtoolsNotes] = useState("");
  const [subtoolsForce, setSubtoolsForce] = useState(false);
  const [subtoolsSaving, setSubtoolsSaving] = useState(false);
  const [subtoolsSaved, setSubtoolsSaved] = useState(false);

  // STC Coordinator App Updates State
  const [stcCode, setStcCode] = useState("");
  const [stcName, setStcName] = useState("");
  const [stcApkUrl, setStcApkUrl] = useState("");
  const [stcNotes, setStcNotes] = useState("");
  const [stcForce, setStcForce] = useState(false);
  const [stcSaving, setStcSaving] = useState(false);
  const [stcSaved, setStcSaved] = useState(false);

  const [activeReleaseTab, setActiveReleaseTab] = useState("subtools"); // "subtools" | "stc"

  // Department Credits State (Canonical official departments only)
  const [deptCredits, setDeptCredits] = useState({
    ARCH: 190,
    BBA: 130,
    "B.PHARM": 164,
    CSE: 140,
    DSE: 140,
    ENG: 130,
    ES: 140,
    FENS: 145,
    JCMS: 140,
    LLB: 140,
    MIB: 140,
    GENERAL: 140,
  });
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptCreditVal, setNewDeptCreditVal] = useState("");
  const [savingCredits, setSavingCredits] = useState(false);

  const handleDeleteDeptCredit = (deptCode) => {
    setDeptCredits((prev) => {
      const copy = { ...prev };
      delete copy[deptCode];
      return copy;
    });
    toast.info(`Removed ${deptCode} credit requirement. Click Save to persist.`);
  };

  // Load SUBTools app_update, STC stc_app_update, and department_credits from Supabase on mount
  useEffect(() => {
    // Department Credits Config: normalize and merge duplicates
    getSystemSettings("department_credits").then((data) => {
      if (data && typeof data === "object") {
        setDeptCredits(() => {
          const canonical = {
            ARCH: 190,
            BBA: 130,
            "B.PHARM": 164,
            CSE: 140,
            DSE: 140,
            ENG: 130,
            ES: 140,
            FENS: 145,
            JCMS: 140,
            LLB: 140,
            MIB: 140,
            GENERAL: 140,
          };
          Object.entries(data).forEach(([key, val]) => {
            const rawKey = String(key || "").trim().toUpperCase();
            if (!rawKey) return;
            const normalizedKey = rawKey === "GENERAL" ? "GENERAL" : (normalizeDepartment(rawKey) || rawKey);
            const numVal = Number(val);
            if (numVal > 0) {
              canonical[normalizedKey] = numVal;
            }
          });
          // Purge any legacy duplicate alias keys
          delete canonical["LAW"];
          delete canonical["PHARMACY"];
          delete canonical["MICROBIOLOGY"];
          delete canonical["ENGLISH"];
          delete canonical["EEE"];
          delete canonical["BPHARM"];
          delete canonical["BPHARMA"];
          return canonical;
        });
      }
    }).catch(() => {});

    // SUBTools Student App Update Config
    getSystemSettings("app_update").then((data) => {
      if (data) {
        setSubtoolsCode(data.latestVersionCode || data.versionCode || "");
        setSubtoolsName(data.latestVersionName || data.versionName || "");
        setSubtoolsApkUrl(data.apkUrl || data.downloadUrl || "");
        setSubtoolsNotes(data.updateNotes || data.notes || "");
        setSubtoolsForce(Boolean(data.forceUpdate));
      }
    }).catch(() => {});

    // STC Coordinator App Update Config
    getSystemSettings("stc_app_update").then((data) => {
      if (data) {
        setStcCode(data.latestVersionCode || data.versionCode || "");
        setStcName(data.latestVersionName || data.versionName || "");
        setStcApkUrl(data.apkUrl || data.downloadUrl || "");
        setStcNotes(data.updateNotes || data.notes || "");
        setStcForce(Boolean(data.forceUpdate));
      }
    }).catch(() => {});
  }, []);

  const handleSaveCredits = async () => {
    setSavingCredits(true);
    try {
      await updateSystemSettings("department_credits", deptCredits);
      toast.success("Department credit requirements saved and updated for SUBTools!");
    } catch (err) {
      toast.error("Failed to save department credits: " + (err.message || "Unknown error"));
    } finally {
      setSavingCredits(false);
    }
  };

  const handleAddCustomDeptCredit = () => {
    if (!newDeptCode.trim() || !newDeptCreditVal.trim()) {
      toast.error("Please enter both department code and credit amount.");
      return;
    }
    const cleanCode = newDeptCode.trim().toUpperCase();
    const val = Number(newDeptCreditVal);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid positive number for credits.");
      return;
    }
    setDeptCredits((prev) => ({ ...prev, [cleanCode]: val }));
    setNewDeptCode("");
    setNewDeptCreditVal("");
    toast.info(`Added ${cleanCode} with ${val} credits. Click Save to persist.`);
  };

  const handlePublishSubtoolsUpdate = async () => {
    if (!subtoolsCode || !subtoolsApkUrl.trim()) {
      toast.error("Please enter Version Code and APK Download URL for SUBTools.");
      return;
    }
    setSubtoolsSaving(true);
    try {
      const payload = {
        latestVersionCode: Number(subtoolsCode),
        latestVersionName: subtoolsName.trim() || `v${subtoolsCode}`,
        apkUrl: subtoolsApkUrl.trim(),
        updateNotes: subtoolsNotes.trim(),
        forceUpdate: Boolean(subtoolsForce),
        updatedAt: new Date().toISOString()
      };

      await updateSystemSettings("app_update", payload);

      setSubtoolsSaved(true);
      toast.success("SUBTools Student App update published to mobile users!");
      setTimeout(() => setSubtoolsSaved(false), 3000);
    } catch (err) {
      toast.error("Failed to publish SUBTools update: " + (err.message || "Unknown error"));
    } finally {
      setSubtoolsSaving(false);
    }
  };

  const handlePublishStcUpdate = async () => {
    if (!stcCode || !stcApkUrl.trim()) {
      toast.error("Please enter Version Code and APK Download URL for STC.");
      return;
    }
    setStcSaving(true);
    try {
      const payload = {
        latestVersionCode: Number(stcCode),
        latestVersionName: stcName.trim() || `v${stcCode}`,
        apkUrl: stcApkUrl.trim(),
        updateNotes: stcNotes.trim(),
        forceUpdate: Boolean(stcForce),
        updatedAt: new Date().toISOString()
      };

      await updateSystemSettings("stc_app_update", payload);

      setStcSaved(true);
      toast.success("STC Coordinator App update published to mobile users!");
      setTimeout(() => setStcSaved(false), 3000);
    } catch (err) {
      toast.error("Failed to publish STC update: " + (err.message || "Unknown error"));
    } finally {
      setStcSaving(false);
    }
  };

  if (!isAdminOrSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <FiLock className="text-2xl" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
          System settings are only accessible by Authorized Administrators. Please contact system
          support for environment configurations.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("profile");

  // React Hook Forms setup
  const pForm = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: user?.name || "Super Admin",
      email: user?.email || "akonmhasib@gmail.com",
    },
  });
  const pwdForm = useForm({ resolver: yupResolver(passSchema) });
  const sbForm = useForm({ resolver: yupResolver(sbSchema), defaultValues: supabaseSettings });

  const onProfileSubmit = (data) => {
    dispatch(updateAdminProfile(data));
    toast.success("Admin profile details updated!");
  };

  const onPasswordSubmit = async (data) => {
    const token = localStorage.getItem("subtools_supabase_token");
    if (!token) {
      toast.error("No active Supabase session found.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await updateSupabaseUser(token, { password: data.newPass });
      toast.success("Administrator password updated successfully in Supabase Auth!");
      pwdForm.reset({ oldPass: "", newPass: "", confirmPass: "" });
    } catch (error) {
      console.error("Password update error:", error);
      toast.error(error.message || "Failed to update password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const onSupabaseSubmit = (data) => {
    dispatch(updateSupabaseSettings(data));
    toast.success("Supabase project credentials updated locally!");
  };

  const handleAppSettingChange = (key, value) => {
    dispatch(updateAppSettings({ [key]: value }));
    toast.info(`Updated: ${key} parameter set to ${value}.`);
  };

  // Restrict tabs if standard admin
  const tabs = [
    { id: "profile", label: "Admin Profile", icon: FiSettings },
    { id: "credits", label: "Department Credits", icon: FiLayers },
    { id: "app_update", label: "App Release & Updates", icon: FiSmartphone },
    { id: "api", label: "API Keys", icon: FiKey },
    { id: "password", label: "Security & Password", icon: FiLock },
    { id: "theme", label: "Theme & Style", icon: FiSun },
    ...(isSuperAdminUser
      ? [
          { id: "supabase", label: "Supabase Backend", icon: FiDatabase },
          { id: "application", label: "App Settings", icon: FiLayers },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          System Settings
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
          Configure security details, SDK endpoints, app themes, and default application toggles.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side Tab Navigation Column */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                    activeTab === tab.id
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/50"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <Icon className="text-sm mr-3 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {!isSuperAdminUser && (
            <div className="bg-amber-50/15 dark:bg-slate-900/40 border border-amber-500/10 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                  <FiLock size={14} />
                </div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    Developer Console Locked
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium leading-relaxed">
                    Firebase configuration keys and application ecosystem parameters are restricted
                    to Super Administrator accounts.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Content Panel */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative">
          {/* Admin Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Admin Profile Details
              </h3>
              <form onSubmit={pForm.handleSubmit(onProfileSubmit)} className="space-y-4 max-w-md">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    {...pForm.register("name")}
                    className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...pForm.register("email")}
                    className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient"
                >
                  Save Changes
                </button>
              </form>
            </div>
          )}

          {/* Department Credits Tab */}
          {activeTab === "credits" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Department Degree Credit Requirements
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Set total degree credit limits for each department. SUBTools mobile app uses these
                  values to calculate and display total completed credits and remaining credits for students.
                </p>
              </div>

              {/* Department Credit Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(deptCredits)
                  .sort(([a], [b]) => {
                    const nameA = a === "GENERAL" ? "General Degree Minimum" : (getDepartmentName(a) || a);
                    const nameB = b === "GENERAL" ? "General Degree Minimum" : (getDepartmentName(b) || b);
                    return nameA.localeCompare(nameB);
                  })
                  .map(([deptCode, creditVal]) => {
                    const fullName = deptCode === "GENERAL" ? "General Degree Minimum" : (getDepartmentName(deptCode) || deptCode);
                    return (
                      <div
                        key={deptCode}
                        className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
                      >
                        <div className="pr-2 min-w-0 flex-1">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 tracking-wide block truncate" title={fullName}>
                            {fullName}
                          </span>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono">
                            {deptCode} • Required Credits
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 w-24">
                            <input
                              type="number"
                              min="1"
                              max="300"
                              value={creditVal}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setDeptCredits((prev) => ({ ...prev, [deptCode]: val }));
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-right text-blue-600 dark:text-blue-400 focus:outline-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-400">CR</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeptCredit(deptCode)}
                            title={`Remove ${deptCode}`}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Add Custom Department Row */}
              <div className="p-4 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-900/30 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Add New Department Code
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    placeholder="e.g. TEXTILE, ME"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold w-40 uppercase"
                  />
                  <input
                    type="number"
                    placeholder="Total Credits (e.g. 150)"
                    value={newDeptCreditVal}
                    onChange={(e) => setNewDeptCreditVal(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold w-44"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomDeptCredit}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    + Add Department
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveCredits}
                  disabled={savingCredits}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl cursor-pointer btn-primary-gradient disabled:opacity-60 flex items-center gap-2"
                >
                  <FiSave size={14} />
                  <span>{savingCredits ? "Saving Department Credits..." : "Save Department Credits"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Security & Password Tab */}
          {activeTab === "password" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Change Administrator Password
              </h3>
              <form
                onSubmit={pwdForm.handleSubmit(onPasswordSubmit)}
                className="space-y-4 max-w-md"
              >
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPass ? "text" : "password"}
                      placeholder="••••••••"
                      {...pwdForm.register("oldPass")}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-9 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer"
                    >
                      {showOldPass ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                    </button>
                  </div>
                  {pwdForm.formState.errors.oldPass && (
                    <span className="text-[9px] text-red-500 mt-1 font-semibold">
                      {pwdForm.formState.errors.oldPass.message}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      placeholder="••••••••"
                      {...pwdForm.register("newPass")}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-9 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer"
                    >
                      {showNewPass ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                    </button>
                  </div>
                  {pwdForm.formState.errors.newPass && (
                    <span className="text-[9px] text-red-500 mt-1 font-semibold">
                      {pwdForm.formState.errors.newPass.message}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      placeholder="••••••••"
                      {...pwdForm.register("confirmPass")}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-9 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer"
                    >
                      {showConfirmPass ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                    </button>
                  </div>
                  {pwdForm.formState.errors.confirmPass && (
                    <span className="text-[9px] text-red-500 mt-1 font-semibold">
                      {pwdForm.formState.errors.confirmPass.message}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient disabled:opacity-60"
                >
                  {updatingPassword ? "Updating Password..." : "Update Password"}
                </button>
              </form>

              {/* Two-Factor Authentication (2FA) */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <AdminTwoFactorManager user={user} />
              </div>
            </div>
          )}

          {/* Theme & Style Tab */}
          {activeTab === "theme" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Theme Preferences
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Configure visual themes for administration portal
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <button
                  onClick={() => theme === "dark" && dispatch(toggleTheme())}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all ${
                    theme === "light"
                      ? "border-blue-500 bg-blue-50/20 text-blue-600 dark:text-blue-400 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500"
                  }`}
                >
                  <FiSun size={20} className="text-yellow-500" />
                  <span className="text-xs">Light Mode</span>
                </button>

                <button
                  onClick={() => theme === "light" && dispatch(toggleTheme())}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all ${
                    theme === "dark"
                      ? "border-blue-500 bg-blue-950/20 text-blue-450 dark:text-blue-400 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-900/50 text-slate-500"
                  }`}
                >
                  <FiMoon size={20} className="text-indigo-400" />
                  <span className="text-xs">Dark Mode</span>
                </button>
              </div>
            </div>
          )}

          {/* Supabase Backend Settings Tab */}
          {activeTab === "supabase" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Supabase Backend Configurations
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                These configuration keys map directly to Supabase Authentication (GoTrue), PostgreSQL Database (REST),
                and Cloud Storage for the SUBTools ecosystem.
              </p>

              <form onSubmit={sbForm.handleSubmit(onSupabaseSubmit)} className="space-y-4 max-w-lg">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    {...sbForm.register("url")}
                    className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <textarea
                    rows={3}
                    {...sbForm.register("anonKey")}
                    className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono resize-none"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Site URL &amp; Redirect Target
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={DEFAULT_SITE_URL}
                    className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-500 dark:text-slate-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-1">Configured for Supabase Auth redirect URLs &amp; password resets.</span>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient"
                >
                  Save Supabase Settings
                </button>
              </form>
            </div>
          )}

          {/* App Configurations Settings */}
          {activeTab === "application" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Application Properties
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Configure global metadata rules for SUBTools ecosystem
                </p>

                <div className="space-y-4 max-w-md mt-4">
                  {/* Maintenance Mode */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/40 rounded-xl">
                    <div className="flex flex-col text-[11px] leading-tight">
                      <span className="font-bold text-slate-700 dark:text-slate-350">
                        Maintenance Mode
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 mt-1">
                        Temporarily block all mobile application sync operations.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={appSettings.maintenanceMode}
                      onChange={(e) => handleAppSettingChange("maintenanceMode", e.target.checked)}
                      className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Restrict Banned Users */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/40 rounded-xl">
                    <div className="flex flex-col text-[11px] leading-tight">
                      <span className="font-bold text-slate-700 dark:text-slate-350">
                        Restrict Banned Logins
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 mt-1">
                        Instantly sever JWT sessions of banned student accounts.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={appSettings.restrictBannedUsers}
                      onChange={(e) =>
                        handleAppSettingChange("restrictBannedUsers", e.target.checked)
                      }
                      className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Information Metadata */}
                  <div className="p-3.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] text-slate-400 font-semibold space-y-1">
                    <div>
                      App Name:{" "}
                      <strong className="font-bold text-slate-650 dark:text-slate-400">
                        {appSettings.appName}
                      </strong>
                    </div>
                    <div>
                      System Core Version:{" "}
                      <strong className="font-bold text-slate-650 dark:text-slate-400">
                        v{appSettings.appVersion}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* App Release & Updates Tab */}
          {activeTab === "app_update" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Mobile App Releases & In-App Updates
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Publish new APK updates directly to SUBTools &amp; STC Android app users via Firebase.
                </p>
              </div>

              {/* Target App Switcher Tabs */}
              <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveReleaseTab("subtools")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeReleaseTab === "subtools"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  📱 SUBTools (Student App)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReleaseTab("stc")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeReleaseTab === "stc"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  🧑‍🏫 STC (Coordinator App)
                </button>
              </div>

              {/* SUBTools Form */}
              {activeReleaseTab === "subtools" && (
                <div className="max-w-lg border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <FiSmartphone className="text-base" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">SUBTools Student App Release</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Updates document `/admin/app_update` in Firestore.
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-5 bg-white dark:bg-slate-950 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          Version Code
                        </label>
                        <input
                          type="number"
                          value={subtoolsCode}
                          onChange={(e) => setSubtoolsCode(e.target.value)}
                          placeholder="e.g. 17"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          Version Name
                        </label>
                        <input
                          type="text"
                          value={subtoolsName}
                          onChange={(e) => setSubtoolsName(e.target.value)}
                          placeholder="e.g. 1.7.0"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        APK Direct Download URL
                      </label>
                      <input
                        type="url"
                        value={subtoolsApkUrl}
                        onChange={(e) => setSubtoolsApkUrl(e.target.value)}
                        placeholder="https://github.com/Username/Repo/releases/download/v1.7.0/subtools.apk"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        Release Notes / What's New
                      </label>
                      <textarea
                        rows={3}
                        value={subtoolsNotes}
                        onChange={(e) => setSubtoolsNotes(e.target.value)}
                        placeholder="• Notice image support added&#10;• Bus route sequence truncation updated"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="subtoolsForce"
                        checked={subtoolsForce}
                        onChange={(e) => setSubtoolsForce(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="subtoolsForce" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        Force Update (Require update before continuing)
                      </label>
                    </div>

                    <button
                      onClick={handlePublishSubtoolsUpdate}
                      disabled={subtoolsSaving || !subtoolsCode || !subtoolsApkUrl.trim()}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {subtoolsSaved ? (
                        <><FiCheckCircle className="text-sm" /><span>Published SUBTools Update!</span></>
                      ) : subtoolsSaving ? (
                        <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /><span>Publishing...</span></>
                      ) : (
                        <><FiSave className="text-sm" /><span>Publish SUBTools Release</span></>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STC Form */}
              {activeReleaseTab === "stc" && (
                <div className="max-w-lg border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <FiSmartphone className="text-base" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">STC Coordinator App Release</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Updates document `/admin/stc_app_update` in Firestore.
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-5 bg-white dark:bg-slate-950 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          Version Code
                        </label>
                        <input
                          type="number"
                          value={stcCode}
                          onChange={(e) => setStcCode(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          Version Name
                        </label>
                        <input
                          type="text"
                          value={stcName}
                          onChange={(e) => setStcName(e.target.value)}
                          placeholder="e.g. 1.2.0"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        APK Direct Download URL
                      </label>
                      <input
                        type="url"
                        value={stcApkUrl}
                        onChange={(e) => setStcApkUrl(e.target.value)}
                        placeholder="https://github.com/Username/Repo/releases/download/v1.2.0/stc.apk"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        Release Notes / What's New
                      </label>
                      <textarea
                        rows={3}
                        value={stcNotes}
                        onChange={(e) => setStcNotes(e.target.value)}
                        placeholder="• Added multi-role workspace switching&#10;• Routine section filtering enabled"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="stcForce"
                        checked={stcForce}
                        onChange={(e) => setStcForce(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <label htmlFor="stcForce" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        Force Update (Require update before continuing)
                      </label>
                    </div>

                    <button
                      onClick={handlePublishStcUpdate}
                      disabled={stcSaving || !stcCode || !stcApkUrl.trim()}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {stcSaved ? (
                        <><FiCheckCircle className="text-sm" /><span>Published STC Update!</span></>
                      ) : stcSaving ? (
                        <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /><span>Publishing...</span></>
                      ) : (
                        <><FiSave className="text-sm" /><span>Publish STC Release</span></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API Keys / Integrations Tab */}
          {activeTab === "api" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  API Integrations
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Manage third-party high-availability API key pools and credentials.
                </p>
              </div>

              {/* Sub-Tabs for API Integration Categories */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                  onClick={() => setApiSubTab("imgbb")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    apiSubTab === "imgbb"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <FiKey size={14} />
                  <span>ImgBB Image Host Pool</span>
                </button>

                <button
                  onClick={() => setApiSubTab("emailjs")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    apiSubTab === "emailjs"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <FiMail size={14} />
                  <span>EmailJS Fleet Reminders Pool</span>
                </button>
              </div>

              {/* Sub-Tab Content */}
              {apiSubTab === "imgbb" && <ImgbbKeyManager />}
              {apiSubTab === "emailjs" && <EmailjsKeyManager />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
