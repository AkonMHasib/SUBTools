import { FiBookOpen, FiExternalLink } from "react-icons/fi";
import { getDepartmentFullName } from "../../../utils/academic";

export const StudentSlides = ({ slides, userDept }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <FiBookOpen className="mr-2 text-cyan-600 dark:text-cyan-400" />
            <span>Lecture Slides & Question Banks</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Course materials, presentations, and past exam question papers.
          </p>
        </div>
      </div>

      {slides.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          <FiBookOpen className="mx-auto text-3xl text-cyan-600 dark:text-cyan-400 mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No slides uploaded for this semester yet.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Course materials will be available once uploaded by instructors.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {slides.map((s, i) => (
            <div
              key={s.id || i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800/60 mb-2 inline-block">
                  {getDepartmentFullName(s.department || userDept)}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {s.title || s.subject_name || "Lecture Resource"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-2">
                  {s.subject_code}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                {s.download_url || s.url || s.link ? (
                  <a
                    href={s.download_url || s.url || s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    <span>Download Resource</span>
                    <FiExternalLink className="ml-1.5" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 text-center block">
                    No file link attached
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentSlides;
