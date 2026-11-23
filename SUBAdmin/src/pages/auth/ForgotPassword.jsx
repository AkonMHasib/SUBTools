// Forgot Password Page Component
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { FiMail, FiArrowLeft } from "react-icons/fi";
import { resetPassword, clearAuthStatus } from "../../redux/slices/authSlice";

const schema = yup.object().shape({
  email: yup.string().email("Enter a valid email address").required("Email is required"),
});

export const ForgotPassword = () => {
  const dispatch = useDispatch();
  const { loading, error, success } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthStatus());
    }
    if (success) {
      toast.success("Password reset instructions sent to your email.");
      dispatch(clearAuthStatus());
    }
  }, [error, success, dispatch]);

  const onSubmit = (data) => {
    dispatch(resetPassword(data.email));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative fade-in">
        <div className="mb-6 flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-2xl flex items-center justify-center text-xl mb-4">
            <FiMail />
          </div>
          <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Reset Password
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center font-medium">
            Enter your registered email address. We'll send you a password recovery link to configure a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
              Account Email
            </label>
            <div className="relative text-slate-400 focus-within:text-blue-500">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" />
              <input
                type="email"
                placeholder="student@sub.edu.bd or admin@example.com"
                {...register("email")}
                className={`w-full bg-slate-50 dark:bg-slate-950/50 border ${
                  errors.email
                    ? "border-red-500 focus:border-red-500"
                    : "border-slate-200 dark:border-slate-800 focus:border-blue-500/40"
                } rounded-xl pl-10 pr-4 py-2.5 text-xs transition-colors`}
              />
            </div>
            {errors.email && (
              <span className="text-[10px] text-red-500 mt-1 font-semibold">
                {errors.email.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-2.5 rounded-xl text-xs font-bold transition-all mt-6 cursor-pointer"
          >
            {loading ? "Sending Recovery Link..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800 pt-4">
          <Link
            to="/login"
            className="inline-flex items-center justify-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors font-semibold"
          >
            <FiArrowLeft className="mr-1.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
