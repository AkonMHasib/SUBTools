import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FiMail,
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
  FiInfo,
  FiShield,
} from "react-icons/fi";
import emailjs from "@emailjs/browser";
import { getSystemSettings, updateSystemSettings } from "../../supabase/config";

export const EmailjsKeyManager = () => {
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
  const [formData, setFormData] = useState({
    name: "",
    serviceId: "",
    templateId: "",
    publicKey: "",
    notes: ""
  });

  // Load API Key Pool from Firestore on mount
  useEffect(() => {
    fetchKeysFromFirestore();
  }, []);

  const fetchKeysFromFirestore = async () => {
    try {
      setLoading(true);
      const data = await getSystemSettings("email_config");

      if (data) {
        let loadedKeys = data.emailjs_keys || [];
        let loadedStrategy = data.emailjs_strategy || "priority";

        // Automatic Migration: If array is empty but legacy single/backup keys exist
        if (loadedKeys.length === 0) {
          if (data.emailjs_service_id && data.emailjs_template_id && data.emailjs_public_key) {
            loadedKeys.push({
              id: "email_key_primary_" + Date.now(),
              name: "Primary Account",
              serviceId: data.emailjs_service_id.trim(),
              templateId: data.emailjs_template_id.trim(),
              publicKey: data.emailjs_public_key.trim(),
              isActive: true,
              usageCount: 0,
              lastUsedAt: null,
              status: "active",
              notes: "Migrated primary key"
            });
          }
          if (data.emailjs_backup_service_id && data.emailjs_backup_template_id && data.emailjs_backup_public_key) {
            loadedKeys.push({
              id: "email_key_backup_" + Date.now(),
              name: "Backup Account #1",
              serviceId: data.emailjs_backup_service_id.trim(),
              templateId: data.emailjs_backup_template_id.trim(),
              publicKey: data.emailjs_backup_public_key.trim(),
              isActive: true,
              usageCount: 0,
              lastUsedAt: null,
              status: "active",
              notes: "Migrated backup key"
            });
          }
        }

        setKeys(loadedKeys);
        setStrategy(loadedStrategy);
      }
    } catch (err) {
      toast.error("Failed to load EmailJS keys: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveKeysToFirestore = async (newKeys, newStrategy) => {
    try {
      setSaving(true);
      const saved = await updateSystemSettings("email_config", {
        emailjs_keys: newKeys,
        emailjs_strategy: newStrategy,
        // Sync primary legacy fields for backwards compatibility
        emailjs_service_id: newKeys[0]?.serviceId || "",
        emailjs_template_id: newKeys[0]?.templateId || "",
        emailjs_public_key: newKeys[0]?.publicKey || "",
        emailjs_backup_service_id: newKeys[1]?.serviceId || "",
        emailjs_backup_template_id: newKeys[1]?.templateId || "",
        emailjs_backup_public_key: newKeys[1]?.publicKey || "",
      });
      if (!saved) {
        throw new Error("Could not persist EmailJS keys to Supabase database. Please check connection and permissions.");
      }
      toast.success("EmailJS Key Pool saved to Supabase!");
    } catch (err) {
      toast.error("Failed to save pool: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleStrategyChange = (newStrat) => {
    setStrategy(newStrat);
    saveKeysToFirestore(keys, newStrat);
  };

  const toggleKeyActive = (keyId) => {
    const updated = keys.map((k) => (k.id === keyId ? { ...k, isActive: !k.isActive } : k));
    setKeys(updated);
    saveKeysToFirestore(updated, strategy);
  };

  const moveKey = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= keys.length) return;

    const updated = [...keys];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setKeys(updated);
    saveKeysToFirestore(updated, strategy);
  };

  const deleteKey = (keyId) => {
    if (!window.confirm("Are you sure you want to remove this EmailJS account from the pool?")) return;
    const updated = keys.filter((k) => k.id !== keyId);
    setKeys(updated);
    saveKeysToFirestore(updated, strategy);
  };

  const toggleShowKey = (keyId) => {
    setShowKeyMap((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const testSingleKey = async (keyObj) => {
    setTestingKeyId(keyObj.id);
    try {
      await emailjs.send(
        keyObj.serviceId.trim(),
        keyObj.templateId.trim(),
        {
          to_email: "akonmhasib@gmail.com",
          to_name: "Test Admin",
          subject: "[TEST] EmailJS Key Validation",
          message: "Validating API key pool functionality.",
          html_message: "<p>Validating API key pool functionality.</p>"
        },
        keyObj.publicKey.trim()
      );
      toast.success(`Key "${keyObj.name}" is VALID and active!`);
      const updated = keys.map((k) => (k.id === keyObj.id ? { ...k, status: "active" } : k));
      setKeys(updated);
      saveKeysToFirestore(updated, strategy);
    } catch (err) {
      const msg = err?.text || err?.message || "Verification failed";
      toast.warning(`Key "${keyObj.name}": ${msg}`);
      const isQuota = msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("limit");
      const updated = keys.map((k) => (k.id === keyObj.id ? { ...k, status: isQuota ? "quota_exceeded" : "error" } : k));
      setKeys(updated);
      saveKeysToFirestore(updated, strategy);
    } finally {
      setTestingKeyId(null);
    }
  };

  const openAddModal = () => {
    setEditingKeyObj(null);
    setFormData({ name: `Account #${keys.length + 1}`, serviceId: "", templateId: "", publicKey: "", notes: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (keyObj) => {
    setEditingKeyObj(keyObj);
    setFormData({
      name: keyObj.name || "",
      serviceId: keyObj.serviceId || "",
      templateId: keyObj.templateId || "",
      publicKey: keyObj.publicKey || "",
      notes: keyObj.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    if (!formData.name.trim() || !formData.serviceId.trim() || !formData.templateId.trim() || !formData.publicKey.trim()) {
      toast.error("Please fill in Name, Service ID, Template ID, and Public Key.");
      return;
    }

    let updated = [];
    if (editingKeyObj) {
      updated = keys.map((k) =>
        k.id === editingKeyObj.id
          ? {
            ...k,
            name: formData.name.trim(),
            serviceId: formData.serviceId.trim(),
            templateId: formData.templateId.trim(),
            publicKey: formData.publicKey.trim(),
            notes: formData.notes.trim()
          }
          : k
      );
    } else {
      const newKey = {
        id: "email_key_" + Date.now(),
        name: formData.name.trim(),
        serviceId: formData.serviceId.trim(),
        templateId: formData.templateId.trim(),
        publicKey: formData.publicKey.trim(),
        notes: formData.notes.trim(),
        isActive: true,
        usageCount: 0,
        lastUsedAt: null,
        status: "active"
      };
      updated = [...keys, newKey];
    }

    setKeys(updated);
    saveKeysToFirestore(updated, strategy);
    setIsModalOpen(false);
  };

  if (loading) {
    return <div className="p-4 text-xs text-slate-400 animate-pulse">Loading EmailJS Key Pool...</div>;
  }

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <FiMail className="text-lg" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              EmailJS High-Availability Key Pool
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {keys.filter((k) => k.isActive).length} / {keys.length} Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Automated failover pool for sending GPS URL reminders. Prevents delivery failures when free quotas (200/mo) expire.
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold btn-primary-gradient text-white shadow-xs cursor-pointer"
        >
          <FiPlus size={14} /> Add EmailJS Account
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* Strategy Switcher Box */}
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FiLayers size={14} className="text-blue-500" />
                Pool Dispatch Strategy
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Choose how requests are distributed across your EmailJS accounts.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                onClick={() => handleStrategyChange("priority")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${strategy === "priority"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
              >
                Priority Failover (Recommended)
              </button>
              <button
                onClick={() => handleStrategyChange("round_robin")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${strategy === "round_robin"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
              >
                Load Balance / Round Robin
              </button>
            </div>
          </div>

          {/* Strategy Comparison Explanation */}
          <div className="p-3 rounded-lg text-[11px] leading-relaxed border bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <FiInfo size={14} className="shrink-0 mt-0.5 text-blue-600" />
            <div>
              {strategy === "priority" ? (
                <span>
                  <strong>Priority Failover (Sequential Drain):</strong> Uses <strong>Account #1</strong> exclusively until its 200 free monthly email quota is exhausted or an error occurs. Once Key #1 fails, <strong>Account #2</strong> takes over automatically. This keeps your backup accounts untouched and 100% full!
                </span>
              ) : (
                <span>
                  <strong>Round Robin / Load Balancing:</strong> Distributes reminder emails evenly across all active accounts. Note: This drains quotas simultaneously across accounts.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Keys Table / List */}
        {keys.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <FiMail size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No EmailJS Accounts in Pool</p>
            <p className="text-[11px] text-slate-400">Click "Add EmailJS Account" above to add your service credentials.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k, index) => {
              const isMasked = !showKeyMap[k.id];

              return (
                <div
                  key={k.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${!k.isActive
                      ? "bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/60 dark:border-slate-800/60 opacity-60"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-blue-200 dark:hover:border-blue-900/40"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Priority Badge */}
                    <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-extrabold text-xs text-slate-600 dark:text-slate-300 shrink-0">
                      #{index + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{k.name}</h4>

                        {/* Status tag */}
                        {k.status === "active" && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1">
                            <FiCheckCircle size={10} /> Active
                          </span>
                        )}
                        {k.status === "quota_exceeded" && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 flex items-center gap-1">
                            <FiAlertCircle size={10} /> Quota Exceeded
                          </span>
                        )}
                        {k.status === "error" && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 flex items-center gap-1">
                            <FiSlash size={10} /> Error
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 font-mono">
                        <span>Service: {isMasked ? k.serviceId.substring(0, 6) + "••••" : k.serviceId}</span>
                        <span>Template: {isMasked ? k.templateId.substring(0, 6) + "••••" : k.templateId}</span>
                        <span>Public Key: {isMasked ? k.publicKey.substring(0, 5) + "••••" : k.publicKey}</span>
                      </div>

                      {k.notes && <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">{k.notes}</p>}
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Usage count */}
                    <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <FiActivity size={10} /> {k.usageCount || 0} sent
                    </div>

                    {/* Eye toggle */}
                    <button
                      onClick={() => toggleShowKey(k.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title={isMasked ? "Show credentials" : "Hide credentials"}
                    >
                      {isMasked ? <FiEye size={13} /> : <FiEyeOff size={13} />}
                    </button>

                    {/* Reorder Up/Down */}
                    <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => moveKey(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                        title="Move Up Priority"
                      >
                        <FiArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => moveKey(index, 1)}
                        disabled={index === keys.length - 1}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                        title="Move Down Priority"
                      >
                        <FiArrowDown size={12} />
                      </button>
                    </div>

                    {/* Test Key */}
                    <button
                      onClick={() => testSingleKey(k)}
                      disabled={testingKeyId === k.id}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer transition-all"
                    >
                      {testingKeyId === k.id ? "Testing..." : "Test"}
                    </button>

                    {/* Active Toggle */}
                    <button
                      onClick={() => toggleKeyActive(k.id)}
                      className={`p-1.5 rounded-lg cursor-pointer transition-all ${k.isActive
                          ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      title={k.isActive ? "Disable Key" : "Enable Key"}
                    >
                      {k.isActive ? <FiCheck size={14} /> : <FiX size={14} />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(k)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Edit Account"
                    >
                      <FiEdit2 size={13} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteKey(k.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      title="Delete Account"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FiMail className="text-blue-500" />
                {editingKeyObj ? "Edit EmailJS Account" : "Add EmailJS Account"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Account Name / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Gmail Account"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Service ID
                </label>
                <input
                  type="text"
                  placeholder="service_xxxxxxx"
                  value={formData.serviceId}
                  onChange={(e) => setFormData((f) => ({ ...f, serviceId: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Template ID
                </label>
                <input
                  type="text"
                  placeholder="template_xxxxxxx"
                  value={formData.templateId}
                  onChange={(e) => setFormData((f) => ({ ...f, templateId: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Public Key
                </label>
                <input
                  type="text"
                  placeholder="xxxxxxxxxxxxxxxxxxxx"
                  value={formData.publicKey}
                  onChange={(e) => setFormData((f) => ({ ...f, publicKey: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Free Tier 200 emails/mo"
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSave}
                className="px-4 py-2 rounded-xl text-xs font-bold btn-primary-gradient text-white cursor-pointer"
              >
                {editingKeyObj ? "Save Changes" : "Add Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailjsKeyManager;
