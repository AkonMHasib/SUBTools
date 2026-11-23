// Login Page Component
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiUser,
  FiLock,
  FiSun,
  FiMoon,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiKey,
  FiShield,
} from 'react-icons/fi';
import { loginUser, clearAuthStatus, setUser } from '../../redux/slices/authSlice';
import { verifyTotpCode } from '../../utils/mfaTotp';
import {
  isAdmin,
  isSuperAdmin,
  isPureAdmin,
  hasBothStudentAndAdmin,
  setActivePortalMode,
} from '../../utils/permissionUtils';
import useTheme from '../../hooks/useTheme';

// Login Validation Schema
const schema = yup.object().shape({
  identifier: yup.string().required('Student ID, email, or phone is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required')
});

export const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, error, success } = useSelector((state) => state.auth);
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  // 2FA Challenge States
  const [mfaChallenge, setMfaChallenge] = useState(null); // { secret, tempUserData }
  const [totpCode, setTotpCode] = useState('');
  const [verifyingMfa, setVerifyingMfa] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema)
  });

  // Redirect strictly based on user role requirements
  useEffect(() => {
    if (user) {
      if (isSuperAdmin(user)) {
        // 1. Super admin redirects to admin dashboard (cannot access student portal)
        setActivePortalMode("admin");
        navigate('/admin/dashboard', { replace: true });
      } else if (hasBothStudentAndAdmin(user)) {
        // 2. Multi-role Admin + Student redirects to student portal (can switch via button)
        setActivePortalMode("student");
        navigate('/portal', { replace: true });
      } else if (isPureAdmin(user) || isAdmin(user)) {
        // 3. Pure Admin directs to admin dashboard
        setActivePortalMode("admin");
        navigate('/admin/dashboard', { replace: true });
      } else {
        // 4. Pure Student directs to student portal
        setActivePortalMode("student");
        navigate('/portal', { replace: true });
      }
    }
  }, [user, navigate]);

  // Handle toast warnings
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthStatus());
    }
    if (success) {
      toast.success('Successfully logged in!');
      dispatch(clearAuthStatus());
    }
  }, [error, success, dispatch]);

  const onSubmit = async (data) => {
    try {
      const res = await dispatch(loginUser({ identifier: data.identifier, password: data.password })).unwrap();
      if (res && res.requires2FA) {
        setMfaChallenge(res);
        setTotpCode('');
        toast.info('Two-Factor Authentication required. Enter code from your authenticator app.');
      }
    } catch (_) {
      // Error handled by useEffect toast
    }
  };

  const handleVerify2FACode = async (e) => {
    e.preventDefault();
    if (!totpCode || totpCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setVerifyingMfa(true);
    try {
      const isValid = await verifyTotpCode(mfaChallenge.secret, totpCode.trim());
      if (!isValid) {
        toast.error('Invalid 2FA code. Please check your authenticator app.');
        setVerifyingMfa(false);
        return;
      }

      // 2FA code confirmed: complete sign-in and save session
      const userData = mfaChallenge.tempUserData;
      const token = userData.token || mfaChallenge.accessToken;
      localStorage.setItem('subtools_user', JSON.stringify(userData));
      if (token) {
        localStorage.setItem('subtools_token', token);
        localStorage.setItem('subtools_supabase_token', token);
      }
      if (mfaChallenge.refreshToken) {
        localStorage.setItem('subtools_refresh_token', mfaChallenge.refreshToken);
      }

      dispatch(setUser(userData));

      toast.success('Two-factor authentication verified successfully!');
      setMfaChallenge(null);

      // Trigger navigation
      if (isSuperAdmin(userData)) {
        setActivePortalMode("admin");
        navigate('/admin/dashboard', { replace: true });
      } else if (hasBothStudentAndAdmin(userData)) {
        setActivePortalMode("student");
        navigate('/portal', { replace: true });
      } else if (isPureAdmin(userData) || isAdmin(userData)) {
        setActivePortalMode("admin");
        navigate('/admin/dashboard', { replace: true });
      } else {
        setActivePortalMode("student");
        navigate('/portal', { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to verify 2FA code');
    } finally {
      setVerifyingMfa(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 transition-colors duration-200">
      {/* Theme Toggle in top-right */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/40 dark:border-slate-800 transition-colors cursor-pointer"
      >
        {theme === 'light' ? <FiMoon className="text-lg" /> : <FiSun className="text-lg text-yellow-400" />}
      </button>

      {/* Main card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col justify-between relative fade-in">
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="SUBTools Logo"
            className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-blue-500/20 mb-4 ring-2 ring-blue-500/20"
          />
          <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {mfaChallenge ? 'Two-Factor Verification' : 'Welcome to SUBTools'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium text-center">
            {mfaChallenge 
              ? 'Enter the 6-digit passcode generated by your Google or Microsoft Authenticator app.'
              : 'Sign in with your Student ID, Email, or Phone to access class routines, exams, and campus utilities.'}
          </p>
        </div>

        {mfaChallenge ? (
          <form onSubmit={handleVerify2FACode} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
                Authenticator 6-Digit Code
              </label>
              <div className="relative">
                <FiKey className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm" />
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-blue-500/50 rounded-xl pl-10 pr-4 py-2.5 text-base font-mono tracking-widest text-center text-slate-800 dark:text-slate-200 focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyingMfa || totpCode.length !== 6}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {verifyingMfa ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiShield size={14} />
                  <span>Verify Passcode & Enter</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setMfaChallenge(null); setTotpCode(''); }}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 pt-1 cursor-pointer"
            >
              Cancel and Return to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Login identifier field */}
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
                Student ID, Email, or Phone
              </label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm" />
                <input
                  type="text"
                  placeholder="Enter Student ID, Email, or Phone"
                  {...register('identifier')}
                  className={`w-full bg-slate-50 dark:bg-slate-950/40 border ${errors.identifier
                    ? 'border-red-500/80 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-blue-500/50'
                    } rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden transition-colors`}
                />
              </div>
              {errors.identifier && (
                <span className="text-[10px] font-medium text-red-500 mt-1">{errors.identifier.message}</span>
              )}
            </div>

            {/* Password field */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full bg-slate-50 dark:bg-slate-950/40 border ${errors.password
                    ? 'border-red-500/80 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-blue-500/50'
                    } rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-hidden"
                >
                  {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
              {errors.password && (
                <span className="text-[10px] font-medium text-red-500 mt-1">{errors.password.message}</span>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Create Student Account Link */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Don't have a student account?{' '}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
              Create Student Account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            SUBTools University System &copy; {new Date().getFullYear()} State University of Bangladesh
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
