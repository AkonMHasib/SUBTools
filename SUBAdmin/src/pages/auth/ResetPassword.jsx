// Password Reset Page Component for Supabase Recovery Flow
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import { updateSupabaseUser, verifySupabaseOtp } from "../../supabase/config";

const schema = yup.object().shape({
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("New password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords do not match")
    .required("Please confirm your new password"),
});

export const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(null);
  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    const resolveToken = async () => {
      setVerifying(true);
      setTokenError("");

      // 1. Check Hash Fragment (#access_token=...&type=recovery)
      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);
      const hashAccessToken = hashParams.get("access_token");
      const hashType = hashParams.get("type");

      if (hashAccessToken) {
        setToken(hashAccessToken);
        setVerifying(false);
        return;
      }

      // 2. Check Query Parameters (?token=... or ?token_hash=... or ?code=...)
      const searchParams = new URLSearchParams(window.location.search);
      const rawToken = searchParams.get("token") || searchParams.get("token_hash") || searchParams.get("code");
      const type = searchParams.get("type") || "recovery";

      if (rawToken) {
        try {
          const verifyResult = await verifySupabaseOtp({ token: rawToken, type });
          if (verifyResult?.access_token) {
            setToken(verifyResult.access_token);
            setVerifying(false);
            return;
          }
        } catch (err) {
          console.warn("Direct OTP verification failed:", err);
          setTokenError(err.message || "The password reset link is invalid or has expired.");
          setVerifying(false);
          return;
        }
      }

      // If no valid tokens found
      setTokenError("No active recovery session found. The link may have expired or is invalid.");
      setVerifying(false);
    };

    resolveToken();
  }, [location]);

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("Missing recovery token. Please request a new link.");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateSupabaseUser(token, { password: data.password });
      setIsComplete(true);
      toast.success("Password successfully updated! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      toast.error(err.message || "Failed to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative fade-in">
        {verifying ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Verifying recovery link...
            </p>
          </div>
        ) : isComplete ? (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-4">
              <FiCheckCircle />
            </div>
            <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Password Updated!
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 mb-6">
              Your password has been changed securely in Supabase Auth. Redirecting you to the sign-in page...
            </p>
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              Sign In Now
            </Link>
          </div>
        ) : tokenError ? (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mb-4">
              <FiAlertTriangle />
            </div>
            <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Invalid or Expired Link
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 mb-6 max-w-xs">
              {tokenError}
            </p>
            <Link
              to="/forgot-password"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all mb-4"
            >
              Request New Reset Link
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors font-semibold"
            >
              <FiArrowLeft className="mr-1.5" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                <FiLock />
              </div>
              <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Set New Password
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center font-medium">
                Enter your new password below to regain access to your SUBTools account.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* New Password */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative text-slate-400 focus-within:text-blue-500">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    className={`w-full bg-slate-50 dark:bg-slate-950/50 border ${
                      errors.password
                        ? "border-red-500 focus:border-red-500"
                        : "border-slate-200 dark:border-slate-800 focus:border-blue-500/40"
                    } rounded-xl pl-10 pr-10 py-2.5 text-xs transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-[10px] text-red-500 mt-1 font-semibold">
                    {errors.password.message}
                  </span>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative text-slate-400 focus-within:text-blue-500">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                    className={`w-full bg-slate-50 dark:bg-slate-950/50 border ${
                      errors.confirmPassword
                        ? "border-red-500 focus:border-red-500"
                        : "border-slate-200 dark:border-slate-800 focus:border-blue-500/40"
                    } rounded-xl pl-10 pr-10 py-2.5 text-xs transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="text-[10px] text-red-500 mt-1 font-semibold">
                    {errors.confirmPassword.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-2.5 rounded-xl text-xs font-bold transition-all mt-6 cursor-pointer"
              >
                {isSubmitting ? "Updating Password..." : "Set New Password"}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800 pt-4">
              <Link
                to="/login"
                className="inline-flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors font-semibold"
              >
                <FiArrowLeft className="mr-1.5" /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
