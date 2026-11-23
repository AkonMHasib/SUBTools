import {
  FiExternalLink,
  FiPhone,
  FiMail,
  FiMapPin,
  FiGlobe,
  FiCompass,
  FiShield,
  FiBook,
} from "react-icons/fi";

const OFFICIAL_LINKS = [
  {
    label: "Official University Website",
    url: "https://www.sub.edu.bd",
    description: "Main university portal, news, and academic announcements",
    icon: FiGlobe,
    tag: "Official Site",
  },
  {
    label: "Student Portal (ERP)",
    url: "http://119.148.8.225:8071/apps/",
    description: "Course registration, grade sheets, and semester fees billing",
    icon: FiShield,
    tag: "Student ERP",
  },
  {
    label: "SUB Central Library Portal",
    url: "https://library.sub.edu.bd",
    description: "Digital research library, e-books, journals, and thesis repository",
    icon: FiBook,
    tag: "Digital Library",
  },
  {
    label: "Official Facebook Page",
    url: "https://www.facebook.com/subedubd",
    description: "Live student events, departmental activities, and notifications",
    icon: FiCompass,
    tag: "Social",
  },
  {
    label: "Official LinkedIn Network",
    url: "https://www.linkedin.com/school/state-university-of-bangladesh/",
    description: "Career placement network, alumni community, and job fairs",
    icon: FiCompass,
    tag: "Careers",
  },
  {
    label: "Official YouTube Channel",
    url: "https://youtube.com/@sub_edu_bd",
    description: "Campus tour videos, webinars, and convocation broadcasts",
    icon: FiCompass,
    tag: "Media",
  },
];

const EMERGENCY_CONTACTS = [
  {
    label: "Short Code Hotline",
    number: "16665",
    note: "Toll-free quick campus helpline (9 AM - 6 PM)",
    type: "phone",
  },
  {
    label: "Landphone Support (Primary)",
    number: "+880258151782",
    note: "PABX lines +880258151782-4",
    type: "phone",
  },
  {
    label: "Landphone Support (Direct)",
    number: "09606782338",
    note: "Direct university exchange line",
    type: "phone",
  },
  {
    label: "Admission & Student Affairs 1",
    number: "01766663558",
    note: "Student affairs, queries, and admission desk",
    type: "phone",
  },
  {
    label: "Admission & Student Affairs 2",
    number: "01766662982",
    note: "Undergraduate advising and helpline",
    type: "phone",
  },
  {
    label: "Accounts & Financial Aid Helpdesk",
    number: "01766662120",
    note: "Semester fee payments and waivers inquiry",
    type: "phone",
  },
  {
    label: "IT & Systems Support",
    number: "01766663163",
    note: "Portal login, Wi-Fi access, and tech assistance",
    type: "phone",
  },
  {
    label: "Official University Inquiries Email",
    number: "info@sub.edu.bd",
    note: "General academic inquiries & official correspondence",
    type: "email",
  },
  {
    label: "Permanent Campus Location",
    number: "696 Kendua, Kanchan, Rupganj, Narayanganj, Dhaka-1461, Bangladesh",
    note: "Main campus complex and academic buildings",
    type: "location",
  },
];

export const StudentLinksContacts = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
          <FiGlobe className="mr-2 text-blue-600 dark:text-blue-400" />
          <span>University Portals, Links & Emergency Directory</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Verified State University Bangladesh web resources, landphone hotlines, and student emergency numbers.
        </p>
      </div>

      {/* SECTION 1: OFFICIAL WEB PORTALS */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center">
          <FiCompass className="mr-2 text-indigo-600 dark:text-indigo-400" />
          <span>Official University Portals & Digital Systems</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {OFFICIAL_LINKS.map((link, idx) => {
            const Icon = link.icon;
            return (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="text-lg" />
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/60">
                      {link.tag}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                    {link.label}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {link.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 mt-4 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>Open Portal</span>
                  <FiExternalLink />
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: EMERGENCY & CAMPUS HOTLINES */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center">
          <FiPhone className="mr-2 text-emerald-600 dark:text-emerald-400" />
          <span>Campus Helpline & Emergency Hotlines</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {EMERGENCY_CONTACTS.map((item, idx) => {
            const isEmail = item.type === "email";
            const isLoc = item.type === "location";

            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">
                    {item.label}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono mb-1 break-all">
                    {item.number}
                  </h4>
                  {item.note && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {item.note}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 mt-4">
                  {isEmail ? (
                    <a
                      href={`mailto:${item.number}`}
                      className="w-full py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      <FiMail />
                      <span>Send Email</span>
                    </a>
                  ) : isLoc ? (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(item.number)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center space-x-1.5 border border-slate-200 dark:border-slate-700 shadow-xs"
                    >
                      <FiMapPin className="text-emerald-600 dark:text-emerald-400" />
                      <span>Open on Google Maps</span>
                    </a>
                  ) : (
                    <a
                      href={`tel:${item.number.replace(/[^0-9+]/g, "")}`}
                      className="w-full py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-1.5"
                    >
                      <FiPhone />
                      <span>Call Now ({item.number})</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentLinksContacts;
