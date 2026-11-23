import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FiShield, FiCheckCircle, FiCopy, FiLock, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { generateTotpSecret, generateOtpAuthUri, verifyTotpCode } from "../../utils/mfaTotp";
import { updateSupabaseUser } from "../../supabase/config";
import DatabaseService from "../../services/DatabaseService";

export const AdminTwoFactorManager = ({ user }) => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [setupStep, setSetupStep] = useState("idle"); // 'idle' | 'configuring' | 'verifying'
  const [loading, setLoading] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  const userEmail = user?.email || "admin@sub.edu.bd";
  const userUid = user?.uid || user?.id;

  useEffect(() => {
    // Check if user has 2FA already enabled in their profile
    const checkStatus = async () => {
      try {
        if (!userUid) return;
        const profile = await DatabaseService.getDocument("users", userUid);
        const has2fa = Boolean(profile?.two_factor_enabled || profile?.data?.two_factor_enabled);
        setMfaEnabled(has2fa);
        if (has2fa) {
          const savedSecret = profile?.two_factor_secret || profile?.data?.two_factor_secret;
          if (savedSecret) setSecret(savedSecret);
        }
      } catch (_) {}
    };
    checkStatus();
  }, [userUid]);

  const handleStartSetup = () => {
    const newSecret = generateTotpSecret();
    setSecret(newSecret);
    setSetupStep("configuring");
    setVerificationCode("");
  };

  const handleCancelSetup = () => {
    setSetupStep("idle");
    setVerificationCode("");
    if (!mfaEnabled) setSecret("");
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret key copied to clipboard!");
  };

  const handleConfirmEnable = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length !== 6) {
      toast.error("Please enter the 6-digit code from your authenticator app.");
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyTotpCode(secret, verificationCode.trim());
      if (!isValid) {
        toast.error("Invalid verification code. Check your authenticator app's current 6-digit code.");
        setLoading(false);
        return;
      }

      // 1. Save 2FA to Supabase PostgreSQL users table
      await DatabaseService.updateDocument("users", userUid, {
        two_factor_enabled: true,
        two_factor_secret: secret,
        two_factor_enabled_at: new Date().toISOString(),
      });

      // 2. Also record in Supabase Auth user_metadata
      const token = localStorage.getItem("subtools_supabase_token");
      if (token) {
        await updateSupabaseUser(token, {
          two_factor_enabled: true,
          two_factor_secret: secret,
        });
      }

      setMfaEnabled(true);
      setSetupStep("idle");
      setVerificationCode("");
      toast.success("Two-Factor Authentication (2FA) successfully activated for your admin account!");
    } catch (err) {
      toast.error("Failed to enable 2FA: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!disableCode || disableCode.trim().length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app to disable 2FA.");
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyTotpCode(secret, disableCode.trim());
      if (!isValid) {
        toast.error("Invalid verification code. Could not disable 2FA.");
        setLoading(false);
        return;
      }

      await DatabaseService.updateDocument("users", userUid, {
        two_factor_enabled: false,
        two_factor_secret: null,
      });

      const token = localStorage.getItem("subtools_supabase_token");
      if (token) {
        await updateSupabaseUser(token, {
          two_factor_enabled: false,
          two_factor_secret: null,
        });
      }

      setMfaEnabled(false);
      setSecret("");
      setDisableCode("");
      toast.success("Two-Factor Authentication has been disabled.");
    } catch (err) {
      toast.error("Failed to disable 2FA: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const otpAuthUri = secret ? generateOtpAuthUri(userEmail, secret) : "";
  const qrCodeUrl = otpAuthUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpAuthUri)}`
    : "";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            mfaEnabled 
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" 
              : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          }`}>
            <FiShield className="text-xl" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Two-Factor Authentication (2FA TOTP)
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Secure admin sign-in with Google Authenticator, Microsoft Authenticator, or 1Password.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {mfaEnabled ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              <FiCheckCircle className="mr-1 text-xs" />
              Active & Protected
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Disabled
            </span>
          )}
        </div>
      </div>

      {!mfaEnabled && setupStep === "idle" && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Why enable 2FA for Administrator access?</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <li>Protects the entire university database against unauthorized logins</li>
              <li>Requires a 6-digit dynamic passcode generated on your personal mobile device</li>
              <li>Standard RFC 6238 TOTP compatible with all free authenticator apps</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={handleStartSetup}
            className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient"
          >
            Setup Two-Factor Authentication
          </button>
        </div>
      )}

      {setupStep === "configuring" && (
        <div className="space-y-5 fade-in">
          <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="2FA QR Code" className="w-36 h-36 rounded-lg" />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">Generating...</div>
              )}
            </div>
            <div className="space-y-3 text-xs flex-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Step 1: Scan QR Code or Enter Key Manually
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Open your Authenticator app (e.g. Google Authenticator, Microsoft Authenticator) and scan the QR code, or copy the setup key below into your app:
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400 select-all">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                  title="Copy Key"
                >
                  <FiCopy className="text-sm" />
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleConfirmEnable} className="space-y-3">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
              Step 2: Enter 6-Digit Code from Authenticator
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-48 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-center"
              />
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Activate 2FA"}
              </button>
              <button
                type="button"
                onClick={handleCancelSetup}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {mfaEnabled && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40">
            <FiCheckCircle className="text-base shrink-0" />
            <span>2FA protection is currently active for administrator logins on this account.</span>
          </div>

          <form onSubmit={handleDisable2FA} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Disable Two-Factor Authentication</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              To turn off 2FA, enter the current 6-digit code from your authenticator app:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-40 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono tracking-widest text-center"
              />
              <button
                type="submit"
                disabled={loading || disableCode.length !== 6}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-50"
              >
                {loading ? "Checking..." : "Disable 2FA"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminTwoFactorManager;
