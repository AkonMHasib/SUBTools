import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FiKey,
  FiPlus,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiTrash2,
  FiEdit2,
  FiArrowUp,
  FiArrowDown,
  FiCheckCircle,
  FiAlertCircle,
  FiLock,
  FiSlash,
  FiCheck,
  FiX,
  FiActivity,
  FiLayers,
} from "react-icons/fi";
import { getSystemSettings, updateSystemSettings } from "../../supabase/config";

/**
 * Verify individual ImgBB API key validity via lightweight fetch request.
 * ImgBB returns HTTP 400 with "No image provided" (or error code 302) if key is VALID.
 * If key is invalid/expired, it returns "Invalid API key" or HTTP 403.
 */
export const testImgbbKeyValidity = async (apiKey) => {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, reason: "Empty key string" };
  }

  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey.trim()}`, {
      method: "POST"
    });
    const result = await res.json().catch(() => ({}));

    // ImgBB returns error message if no image is attached
    const errMessage = result.error?.message?.toLowerCase() || "";

    if (
      errMessage.includes("invalid api key") ||
      errMessage.includes("expired") ||
      errMessage.includes("revoked") ||
      res.status === 403
    ) {
      return { valid: false, reason: result.error?.message || "Invalid or revoked API key" };
    }

    if (res.status === 429 || errMessage.includes("rate limit") || errMessage.includes("quota")) {
      return { valid: "warning", reason: result.error?.message || "Rate limit or quota exceeded" };
    }

    // Key is valid if error is "No image provided" or similar HTTP status
    return { valid: true, reason: "Key verified active" };
  } catch (err) {
    return { valid: "warning", reason: err.message || "Network timeout or connection error" };
  }
};

export const ImgbbKeyManager = () => {
  const [keys, setKeys] = useState([]);
  const [strategy, setStrategy] = useState("priority"); // "priority" | "round_robin"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState(null);

  // Eye toggle state per key ID
  const [showKeyMap, setShowKeyMap] = useState({});

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKeyObj, setEditingKeyObj] = useState(null);
  const [formData, setFormData] = useState({ name: "", key: "", notes: "" });

  // Load API Key Pool on mount
  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      let data = null;

      // 1. Primary: Load from Supabase system_settings (id='api_config')
      try {
        data = await getSystemSettings("api_config");
      } catch (e) {
        console.warn("Could not read api_config from Supabase:", e);
      }

      if (data) {
        let loadedKeys = data.imgbb_keys || [];
        let loadedStrategy = data.imgbb_strategy || "priority";

        // Automatic Migration: If imgbb_keys array is missing but single imgbb_key exists
        if (loadedKeys.length === 0 && data.imgbb_key) {
          const migratedKey = {
            id: "key_" + Date.now(),
            name: "Primary Key",
            key: data.imgbb_key.trim(),
            status: "active",
            priority: 1,
            usageCount: 0,
            successCount: 0,
            failureCount: 0,
            lastVerified: new Date().toISOString(),
            lastUsed: null,
            lastError: null,
            notes: "Migrated from legacy single key"
          };
          loadedKeys = [migratedKey];
          const migratedPayload = { imgbb_keys: loadedKeys, imgbb_strategy: loadedStrategy, imgbb_key: data.imgbb_key };
          await updateSystemSettings("api_config", migratedPayload).catch(() => null);
        }

        // Sort keys by priority
        loadedKeys.sort((a, b) => (a.priority || 1) - (b.priority || 1));

        setKeys(loadedKeys);
        setStrategy(loadedStrategy);
      }
    } catch (err) {
      console.error("Failed to load ImgBB key pool:", err);
      toast.error("Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  };

  const savePoolToFirestore = async (updatedKeys, updatedStrategy = strategy) => {
    setSaving(true);
    try {
      // Re-index priority numbers (1, 2, 3...)
      const sortedKeys = [...updatedKeys].map((k, idx) => ({
        ...k,
        priority: idx + 1
      }));

      // Top healthy key for backwards compatibility
      const topHealthy = sortedKeys.find((k) => k.status === "active") || sortedKeys[0];
      const primaryKeyString = topHealthy ? topHealthy.key : "";

      const payload = {
        imgbb_keys: sortedKeys,
        imgbb_strategy: updatedStrategy,
        imgbb_key: primaryKeyString,
        updatedAt: new Date().toISOString()
      };

      // 1. Primary: Save to Supabase system_settings
      const savedToSupabase = await updateSystemSettings("api_config", payload);
      if (!savedToSupabase) {
        throw new Error("Could not persist API keys to Supabase database. Please check connection and permissions.");
      }

      setKeys(sortedKeys);
      setStrategy(updatedStrategy);
      toast.success("ImgBB API Key Pool updated successfully in Supabase!");
    } catch (err) {
      console.error("Failed to save ImgBB key pool:", err);
      toast.error(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Key Visibility
  const toggleKeyMask = (id) => {
    setShowKeyMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Enable / Disable Key
  const handleToggleEnable = async (id) => {
    const updated = keys.map((k) => {
      if (k.id === id) {
        const nextStatus = k.status === "disabled" ? "active" : "disabled";
        return { ...k, status: nextStatus };
      }
      return k;
    });
    await savePoolToFirestore(updated);
  };

  // Move Priority Up / Down
  const handleMovePriority = async (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= keys.length) return;

    const reordered = [...keys];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    await savePoolToFirestore(reordered);
  };

  // Delete Key
  const handleDeleteKey = async (id) => {
    if (!window.confirm("Are you sure you want to delete this API Key?")) return;
    const filtered = keys.filter((k) => k.id !== id);
    await savePoolToFirestore(filtered);
  };

  // Individual Key Verification
  const handleVerifySingleKey = async (keyObj) => {
    setTestingKeyId(keyObj.id);
    const { valid, reason } = await testImgbbKeyValidity(keyObj.key);

    let nextStatus = "active";
    if (valid === false) nextStatus = "invalid";
    else if (valid === "warning") nextStatus = "warning";

    const updated = keys.map((k) => {
      if (k.id === keyObj.id) {
        return {
          ...k,
          status: nextStatus,
          lastVerified: new Date().toISOString(),
          lastError: valid === true ? null : reason
        };
      }
      return k;
    });

    if (valid === true) {
      toast.success(`Key "${keyObj.name}" is verified Active!`);
    } else if (valid === "warning") {
      toast.warning(`Key "${keyObj.name}" warning: ${reason}`);
    } else {
      toast.error(`Key "${keyObj.name}" is Invalid: ${reason}`);
    }

    await savePoolToFirestore(updated);
    setTestingKeyId(null);
  };

  // "Verify All Keys" Action
  const handleVerifyAllKeys = async () => {
    setVerifyingAll(true);
    toast.info("Verifying all API keys in parallel...");

    const updated = await Promise.all(
      keys.map(async (k) => {
        if (k.status === "disabled") return k; // Skip disabled
        const { valid, reason } = await testImgbbKeyValidity(k.key);
        let nextStatus = "active";
        if (valid === false) nextStatus = "invalid";
        else if (valid === "warning") nextStatus = "warning";

        return {
          ...k,
          status: nextStatus,
          lastVerified: new Date().toISOString(),
          lastError: valid === true ? null : reason
        };
      })
    );

    await savePoolToFirestore(updated);
    setVerifyingAll(false);
    toast.success("Completed verification for all API keys!");
  };

  // Open Modal to Add or Edit
  const openModal = (keyObj = null) => {
    if (keyObj) {
      setEditingKeyObj(keyObj);
      setFormData({ name: keyObj.name, key: keyObj.key, notes: keyObj.notes || "" });
    } else {
      setEditingKeyObj(null);
      setFormData({ name: `Backup-${keys.length + 1}`, key: "", notes: "" });
    }
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModalForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.key.trim()) {
      toast.error("Please enter a Key Name and API Key.");
      return;
    }

    const trimmedKey = formData.key.trim();

    // Verify key validity first before adding
    const { valid, reason } = await testImgbbKeyValidity(trimmedKey);
    let initialStatus = "active";
    if (valid === false) initialStatus = "invalid";
    else if (valid === "warning") initialStatus = "warning";

    let updatedList = [];
    if (editingKeyObj) {
      // Edit existing key
      updatedList = keys.map((k) => {
        if (k.id === editingKeyObj.id) {
          return {
            ...k,
            name: formData.name.trim(),
            key: trimmedKey,
            notes: formData.notes.trim(),
            status: initialStatus,
            lastVerified: new Date().toISOString(),
            lastError: valid === true ? null : reason
          };
        }
        return k;
      });
    } else {
      // Add new key
      const newKeyObj = {
        id: "key_" + Date.now(),
        name: formData.name.trim(),
        key: trimmedKey,
        notes: formData.notes.trim(),
        status: initialStatus,
        priority: keys.length + 1,
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastVerified: new Date().toISOString(),
        lastUsed: null,
        lastError: valid === true ? null : reason
      };
      updatedList = [...keys, newKeyObj];
    }

    await savePoolToFirestore(updatedList);
    setIsModalOpen(false);
  };

  // Change Strategy Mode
  const handleStrategyChange = async (newStrategy) => {
    await savePoolToFirestore(keys, newStrategy);
  };

  // Stats Counters
  const healthyCount = keys.filter((k) => k.status === "active").length;
  const warningCount = keys.filter((k) => k.status === "warning").length;
  const invalidCount = keys.filter((k) => k.status === "invalid").length;
  const disabledCount = keys.filter((k) => k.status === "disabled").length;

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse flex items-center justify-center py-12">
        <FiRefreshCw className="animate-spin text-xl text-violet-500 mr-2" />
        <span className="text-xs text-slate-500">Loading ImgBB API Key Pool...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Pool Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <FiKey className="text-lg" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ImgBB API Key Pool (High Availability)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-mono font-semibold">
                  {healthyCount} Active / {keys.length} Total
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Manage multiple ImgBB API credentials with automatic failover, priority distribution, and real-time health verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleVerifyAllKeys}
              disabled={verifyingAll || keys.length === 0}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={verifyingAll ? "animate-spin" : ""} size={13} />
              <span>{verifyingAll ? "Verifying..." : "Verify All Keys"}</span>
            </button>

            <button
              type="button"
              onClick={() => openModal()}
              className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <FiPlus size={14} />
              <span>Add Key</span>
            </button>
          </div>
        </div>

        {/* Load Balancing Strategy Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <FiLayers className="text-violet-500" />
            <span>Upload Strategy:</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="imgbb_strategy"
                value="priority"
                checked={strategy === "priority"}
                onChange={() => handleStrategyChange("priority")}
                className="text-violet-600 focus:ring-violet-500"
              />
              <span className="font-semibold">Priority Mode</span>
              <span className="text-[10px] text-slate-400 font-normal">(Try Highest Priority First)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="imgbb_strategy"
                value="round_robin"
                checked={strategy === "round_robin"}
                onChange={() => handleStrategyChange("round_robin")}
                className="text-violet-600 focus:ring-violet-500"
              />
              <span className="font-semibold">Round Robin</span>
              <span className="text-[10px] text-slate-400 font-normal">(Even Load Balancing)</span>
            </label>
          </div>
        </div>

        {/* Health Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 🟢 Active
            </span>
            <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300">{healthyCount}</span>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> 🟡 Warning
            </span>
            <span className="font-bold font-mono text-amber-700 dark:text-amber-300">{warningCount}</span>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" /> 🔴 Invalid
            </span>
            <span className="font-bold font-mono text-red-700 dark:text-red-300">{invalidCount}</span>
          </div>

          <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> ⚫ Disabled
            </span>
            <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{disabledCount}</span>
          </div>
        </div>
      </div>

      {/* Keys List */}
      <div className="space-y-3">
        {keys.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <FiKey className="mx-auto text-2xl text-slate-400" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No ImgBB API keys configured in pool.
            </p>
            <button
              type="button"
              onClick={() => openModal()}
              className="px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-xl"
            >
              Add First API Key
            </button>
          </div>
        ) : (
          keys.map((k, index) => {
            const isMasked = !showKeyMap[k.id];
            const maskedKey = k.key ? `${k.key.slice(0, 4)}••••••••••••••••${k.key.slice(-4)}` : "";
            const totalUploads = k.usageCount || 0;
            const successRate = totalUploads > 0 ? Math.round(((k.successCount || 0) / totalUploads) * 100) : 100;

            return (
              <div
                key={k.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    {/* Priority Badge */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                      <span>#{k.priority || index + 1}</span>
                      {index === 0 && (
                        <span className="ml-1 text-[9px] font-sans px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-600 dark:text-violet-400">
                          Primary
                        </span>
                      )}
                    </div>

                    {/* Name & Status */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{k.name}</span>
                        {k.status === "active" && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-semibold">
                            Active
                          </span>
                        )}
                        {k.status === "warning" && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full font-semibold">
                            Warning
                          </span>
                        )}
                        {k.status === "invalid" && (
                          <span className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full font-semibold">
                            Invalid
                          </span>
                        )}
                        {k.status === "disabled" && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-semibold">
                            Disabled
                          </span>
                        )}
                      </h3>
                      {k.notes && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {k.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Priority Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Priority Up / Down */}
                    <button
                      type="button"
                      onClick={() => handleMovePriority(index, "up")}
                      disabled={index === 0}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                      title="Increase Priority"
                    >
                      <FiArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMovePriority(index, "down")}
                      disabled={index === keys.length - 1}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                      title="Decrease Priority"
                    >
                      <FiArrowDown size={14} />
                    </button>

                    {/* Enable / Disable Switch */}
                    <label className="relative inline-flex items-center cursor-pointer ml-1">
                      <input
                        type="checkbox"
                        checked={k.status !== "disabled"}
                        onChange={() => handleToggleEnable(k.id)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>

                    {/* Test Key Button */}
                    <button
                      type="button"
                      onClick={() => handleVerifySingleKey(k)}
                      disabled={testingKeyId === k.id}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {testingKeyId === k.id ? "Testing..." : "Test"}
                    </button>

                    {/* Edit & Delete */}
                    <button
                      type="button"
                      onClick={() => openModal(k)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 cursor-pointer"
                      title="Edit Key"
                    >
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(k.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                      title="Delete Key"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Key Field & Mask Toggle */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    <span>API Credentials</span>
                    <span>
                      Last Verified: {k.lastVerified ? new Date(k.lastVerified).toLocaleString() : "Never"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={isMasked ? maskedKey : k.key}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyMask(k.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {isMasked ? <FiEye size={13} /> : <FiEyeOff size={13} />}
                    </button>
                  </div>
                </div>

                {/* Last Error Message Banner if any */}
                {k.lastError && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-2.5 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-2 font-medium">
                    <FiAlertCircle className="shrink-0 text-red-500" />
                    <span>Last Error: {k.lastError}</span>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-400 text-[10px]">Total Uploads</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 font-mono">{k.usageCount || 0}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-400 text-[10px]">Successful</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{k.successCount || 0}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-400 text-[10px]">Success Rate</span>
                    <p className="font-bold text-blue-600 dark:text-blue-400 font-mono">{successRate}%</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-400 text-[10px]">Last Used</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-[10px]">
                      {k.lastUsed ? new Date(k.lastUsed).toLocaleTimeString() : "Never"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Add / Edit Key */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingKeyObj ? "Edit ImgBB API Key" : "Add ImgBB API Key"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveModalForm} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Key Label / Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Primary Key, Backup-1"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  ImgBB API Key String
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="Paste 32-character key from api.imgbb.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes or account details"
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save API Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImgbbKeyManager;
