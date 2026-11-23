import { FiUsers, FiSearch, FiMail, FiPhone } from "react-icons/fi";
import { getTeacherInitials } from "../utils/studentHelpers";
import { getDepartmentFullName } from "../../../utils/academic";

export const StudentFaculty = ({
  filteredFaculty,
  facultySearch,
  setFacultySearch,
  userDept,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <FiUsers className="mr-2 text-indigo-600 dark:text-indigo-400" />
            <span>Departmental Faculty Directory</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Browse professors, advisors, and lecturers with direct contacts.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search faculty by name..."
              value={facultySearch}
              onChange={(e) => setFacultySearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors shadow-xs"
            />
          </div>
        </div>
      </div>

      {filteredFaculty.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          <FiUsers className="mx-auto text-3xl text-indigo-600 dark:text-indigo-400 mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No faculty members found.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try searching by full name or designation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredFaculty.map((f, i) => (
            <div
              key={f.id || i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all shadow-xs flex flex-col justify-between group"
            >
              <div>
                {/* Avatar & Name Row */}
                <div className="flex items-center space-x-3.5 mb-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-purple-500/10 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30 text-sm tracking-wider shrink-0 overflow-hidden shadow-xs">
                    {f.avatarUrl || f.image ? (
                      <img
                        src={f.avatarUrl || f.image}
                        alt={f.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getTeacherInitials(f)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition-colors">
                      {f.name}
                    </h4>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 truncate">
                      {f.designation || "Faculty Member"}
                    </p>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  {f.email && (
                    <p className="flex items-center text-slate-700 dark:text-slate-300 truncate">
                      <FiMail className="mr-2 text-indigo-600 dark:text-indigo-400 text-xs shrink-0" />
                      <a
                        href={`mailto:${f.email}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                      >
                        {f.email}
                      </a>
                    </p>
                  )}
                  {f.phone && (
                    <p className="flex items-center text-slate-700 dark:text-slate-300">
                      <FiPhone className="mr-2 text-indigo-600 dark:text-indigo-400 text-xs shrink-0" />
                      <a
                        href={`tel:${f.phone}`}
                        className="text-slate-700 dark:text-slate-300 hover:underline"
                      >
                        {f.phone}
                      </a>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    Department: <strong className="text-slate-800 dark:text-slate-300">{getDepartmentFullName(f.department || userDept)}</strong>
                  </p>
                </div>
              </div>

              {/* Direct action buttons: Call & Email */}
              {(f.email || f.phone) && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2">
                  {f.email && (
                    <a
                      href={`mailto:${f.email}`}
                      className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/50 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <FiMail className="mr-1.5" />
                      <span>Email</span>
                    </a>
                  )}
                  {f.phone && (
                    <a
                      href={`tel:${f.phone}`}
                      className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <FiPhone className="mr-1.5 text-blue-600 dark:text-blue-400" />
                      <span>Call</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentFaculty;
