import {
  FiHeart,
  FiPhone,
  FiExternalLink,
  FiMessageCircle,
} from "react-icons/fi";

const FB_PROFILE_URL = "https://www.facebook.com/Hasib.Arch";

export const StudentNeedToTalk = ({ user }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* 1. HERO SUPPORT CARD matching Android fragment_need_to_talk.xml */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xs text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-2xl shadow-sm">
            <FiHeart />
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            Feeling lonely, overwhelmed or need to talk with someone?
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            You are never alone. Whether you're feeling stressed by coursework, struggling with exam anxiety, feeling isolated, an introvert who needs a quiet listening ear, or simply looking for friendly advice — we are always here for you.
          </p>

          {/* Connect Button matching Android btn_facebook_connect */}
          <div className="pt-2">
            <a
              href={FB_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-lg shadow-blue-600/30 space-x-2 cursor-pointer"
            >
              <FiMessageCircle className="text-lg" />
              <span>Talk to Me on Messenger / Facebook</span>
              <FiExternalLink className="text-xs opacity-70" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. CAMPUS HELPLINES & CRISIS HOTLINES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* SUB Student Helpline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              Campus Support
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-3">
              SUB Hotline
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              General student affairs, counseling & emergency assistance.
            </p>
          </div>
          <div className="pt-4">
            <a
              href="tel:16665"
              className="w-full py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <FiPhone />
              <span>Call 16665</span>
            </a>
          </div>
        </div>

        {/* Mental Health Helpline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
              Emotional Support
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-3">
              Kaan Pete Roi / 109
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Confidential, non-judgmental helpline for emotional crisis.
            </p>
          </div>
          <div className="pt-4">
            <a
              href="tel:109"
              className="w-full py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <FiPhone />
              <span>Call 109</span>
            </a>
          </div>
        </div>

        {/* National Emergency */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
              National Emergency
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-3">
              National Help 999
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Police, ambulance, and urgent civil protection 24/7.
            </p>
          </div>
          <div className="pt-4">
            <a
              href="tel:999"
              className="w-full py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <FiPhone />
              <span>Call 999</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentNeedToTalk;
