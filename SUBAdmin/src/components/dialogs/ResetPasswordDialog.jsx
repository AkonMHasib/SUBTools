import { useState } from "react";
import { toast } from "react-toastify";
import {
  FiKey,
  FiLock,
  FiMail,
  FiEye,
  FiEyeOff,
  FiSend,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiLink,
} from "react-icons/fi";
import Dialog from "../common/Dialog";
import {
  sendSupabasePasswordReset,
  adminResetUserPassword,
  adminGenerateRecoveryLink,
} from "../../supabase/config";

export const ResetPasswordDialog = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState("direct"); // "direct" | "email" | "link"
  const [newPassword, setNewPassword] = useState("SUB123");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  if (!user) return null;

  const userEmail = (user.email || "").trim();
  const targetUid = user.uid || user.id || "";
  const displayName = user.name || user.fullName || "User";
  const displayId = user.studentId || user.student_id || user.id || "N/A";

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleDirectPasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsUpdating(true);
      await adminResetUserPassword({
        targetUid,
        targetEmail: userEmail,
        targetName: displayName,
        newPassword,
      });

      toast.success(`Password for ${displayName} successfully set to: ${newPassword}`, {
        autoClose: 6000,
      });
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to reset password. You can send a reset link instead.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!userEmail) {
      toast.error("This user does not have an email address associated with their account.");
      return;
    }

    try {
      setIsSendingEmail(true);
      await sendSupabasePasswordReset(userEmail);
      toast.success(`Password recovery link successfully sent to ${userEmail}!`);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to send password recovery email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!userEmail) {
      toast.error("This user does not have an email address associated with their account.");
      return;
    }

    try {
      setIsGeneratingLink(true);
      const res = await adminGenerateRecoveryLink({ targetEmail: userEmail });
      const link = res.action_link;
      if (link) {
        setGeneratedLink(link);
        toast.success("Recovery link generated successfully! You can copy and share it.");
      } else {
        toast.error("Could not generate recovery link.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate recovery link.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setHasCopiedLink(true);
    toast.info("Link copied to clipboard!");
    setTimeout(() => setHasCopiedLink(false), 3000);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="User Password Management"
      size="md"
    >
      <div className="space-y-4">
        {/* User Info Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
              {displayName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                ID: {displayId}
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate">
                {userEmail || "No Email"}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base shrink-0 shadow-xs">
            <FiKey />
          </div>
        </div>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("direct")}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "direct"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FiLock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Direct Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "email"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FiMail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Send Email</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "link"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FiLink className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Create Link</span>
          </button>
        </div>

        {/* Tab 1: Direct Password Change */}
        {activeTab === "direct" && (
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FiLock className="text-blue-500" /> Set New Password Immediately
              </label>
              <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-semibold border border-blue-200/40">
                Instant Update
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Instantly overwrites the user's password in authentication. The user can sign in immediately without clicking any email link.
            </p>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setNewPassword("SUB123")}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Preset: SUB123
              </button>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <FiRefreshCw className="w-3 h-3" /> Random
              </button>
            </div>

            <button
              type="button"
              onClick={handleDirectPasswordReset}
              disabled={isUpdating || !newPassword || newPassword.length < 6}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isUpdating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  Updating Password...
                </>
              ) : (
                <>
                  <FiCheckCircle /> Set Password to "{newPassword}"
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Send Recovery Link Email */}
        {activeTab === "email" && (
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FiMail className="text-emerald-500" /> Send Recovery Email
              </label>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md font-semibold border border-emerald-200/40">
                Official SMTP
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dispatches a secure Supabase password recovery link to{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {userEmail || "no email configured"}
              </span>
              . Clicking the link will redirect the user to the web portal's reset page to set a new password.
            </p>

            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={isSendingEmail || !userEmail}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isSendingEmail ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  Sending Recovery Email...
                </>
              ) : (
                <>
                  <FiSend /> Send Password Reset Email Now
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 3: Generate Instant Recovery Link */}
        {activeTab === "link" && (
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FiLink className="text-amber-500" /> Generate & Copy Recovery Link
              </label>
              <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md font-semibold border border-amber-200/40">
                Manual Sharing
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Generates a password recovery URL on demand without relying on email delivery. You can copy the link and share it directly with the user via WhatsApp, Messenger, or SMS.
            </p>

            {!generatedLink ? (
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={isGeneratingLink || !userEmail}
                className="w-full mt-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isGeneratingLink ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    Generating Recovery Link...
                  </>
                ) : (
                  <>
                    <FiKey /> Generate Recovery Link
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2.5 pt-1">
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-amber-300 dark:border-amber-800/80 rounded-xl px-3 py-2 pr-10 text-[11px] font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedLink)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                    title="Copy Link"
                  >
                    {hasCopiedLink ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedLink)}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {hasCopiedLink ? (
                      <>
                        <FiCheck /> Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <FiCopy /> Copy Link
                      </>
                    )}
                  </button>

                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <FiExternalLink /> Open
                  </a>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={isGeneratingLink}
                  className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 pt-1 cursor-pointer"
                >
                  Generate a new link
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default ResetPasswordDialog;
