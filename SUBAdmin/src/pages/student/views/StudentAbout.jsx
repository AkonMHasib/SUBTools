import {
  FiHeart,
  FiMessageCircle,
  FiCode,
  FiExternalLink,
  FiMail,
  FiGlobe,
  FiPhone,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { FaFacebook, FaLinkedin, FaWhatsapp } from "react-icons/fa";

const DEV_INFO = {
  name: "Akon M Hasib",
  dept: "Department of Architecture",
  institution: "State University of Bangladesh (SUB)",
  avatar: "/Profile.jpg",
  bio: "An architecture student passionate about software design, full-stack systems, and user-centric optimization workflows. Built SUBTools from scratch to make academic life simpler, transparent, and seamlessly automated for all State University of Bangladesh students.",
  facebookProfile: "https://www.facebook.com/profile.php?id=61592042795382",
  facebookAlt: "https://www.facebook.com/Hasib.Arch",
  facebookGroup: "https://www.facebook.com/groups/app.subtools",
  linkedIn: "https://linkedin.com/in/akonmhasib",
  whatsApp: "https://wa.me/8801754752096",
  email: "akonmhasib@gmail.com",
};

export const StudentAbout = () => {
  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto">
      {/* 1. DEVELOPER PROFILE CARD matching Android fragment_about_developer.xml */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs text-center relative overflow-hidden">
        {/* Decorative backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          {/* Avatar with Ring */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 shadow-xl mb-4">
            <img
              src={DEV_INFO.avatar}
              alt={DEV_INFO.name}
              className="w-full h-full object-cover rounded-full bg-white dark:bg-slate-800"
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";
              }}
            />
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" title="Creator & Active Maintainer" />
          </div>

          {/* Name & Titles */}
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {DEV_INFO.name}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
            {DEV_INFO.dept}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {DEV_INFO.institution}
          </p>

          <div className="w-16 h-0.5 bg-slate-200 dark:bg-slate-800 my-4" />

          {/* Bio */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
            {DEV_INFO.bio}
          </p>

          {/* Social & Contact Actions matching Android btn_dev_* */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={DEV_INFO.facebookProfile}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <FaFacebook className="text-base" />
              <span>Facebook</span>
              <FiExternalLink className="text-[11px] opacity-70" />
            </a>

            <a
              href={DEV_INFO.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#0A66C2] hover:bg-[#095196] shadow-md shadow-blue-600/20 active:scale-95 transition-all"
            >
              <FaLinkedin className="text-base" />
              <span>LinkedIn</span>
              <FiExternalLink className="text-[11px] opacity-70" />
            </a>

            <a
              href={DEV_INFO.whatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba5a] shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <FaWhatsapp className="text-base" />
              <span>WhatsApp</span>
              <FiExternalLink className="text-[11px] opacity-70" />
            </a>

            <a
              href={`mailto:${DEV_INFO.email}?subject=SUBTools%20Feedback`}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
            >
              <FiMail className="text-base text-rose-500" />
              <span>Email</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. OFFICIAL FACEBOOK GROUP & COMMUNITY */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold">
            <FiUsers />
            <span>Official Student Community</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black">
            Join the SUBTools Facebook Group
          </h3>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
            Need help? Found a bug in web portal? Have feature requests or suggestions? Share your feedback with other students and the development team directly in our community!
          </p>
        </div>

        <a
          href={DEV_INFO.facebookGroup}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3.5 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs sm:text-sm shrink-0 shadow-lg active:scale-95 transition-all flex items-center space-x-2 cursor-pointer"
        >
          <FaFacebook className="text-lg text-[#1877F2]" />
          <span>Join Facebook Group</span>
          <FiExternalLink className="text-xs text-slate-500" />
        </a>
      </div>

      {/* 3. NEED TO TALK? STUDENT WELLNESS SECTION */}
      <div className="bg-gradient-to-br from-rose-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/20 border border-rose-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-500/20">
            <FiHeart className="text-2xl" />
          </div>

          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-[10px] font-bold mb-1">
              <span>STUDENT WELLBEING & SUPPORT</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Need to Talk? We're Here For You</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
              University life can be overwhelming at times. Whether you are dealing with academic stress, exam anxiety, career confusion, or personal hardships, you don't have to carry it all alone. Reach out for compassionate, non-judgmental support.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={DEV_INFO.facebookAlt}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/30 flex items-center space-x-2"
              >
                <FiMessageCircle />
                <span>Connect via Messenger</span>
                <FiExternalLink className="text-[11px]" />
              </a>

              <a
                href="tel:16665"
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 flex items-center space-x-2"
              >
                <FiPhone className="text-rose-600 dark:text-rose-400" />
                <span>Call Campus Helpline (16665)</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PLATFORM ARCHITECTURE SPECS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
            <FiCode className="mr-2 text-indigo-600 dark:text-indigo-400" />
            <span>About SUBTools Platform</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            SUBTools is an integrated academic companion and campus utility platform engineered specifically for students, faculty, and administration of State University Bangladesh.
          </p>
        </div>

        {/* Core Specs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Version</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">v3.0.0 (Unified)</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Cross-platform Web & Android</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Backend Architecture</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">Supabase + Edge</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Realtime PostgreSQL & REST</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Frontend Engine</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">React 18 + Vite</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">TailwindCSS & Redux Toolkit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAbout;
