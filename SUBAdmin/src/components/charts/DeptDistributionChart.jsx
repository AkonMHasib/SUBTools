import { getDepartmentName } from "../../utils/academic";

// Department Distribution - Horizontal Bars UI
export const DeptDistributionChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
        No department data available.
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Sort data descending to have the largest departments at the top
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="mb-5 flex justify-between items-end">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Department Distribution</h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Student enrollment spread across faculties</p>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-0.5">Total Students</span>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none">{total.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {sortedData.map((item, idx) => {
          const percent = ((item.value / total) * 100).toFixed(1);
          const deptFullName = getDepartmentName(item.name) || item.name;
          return (
            <div key={idx} className="flex flex-col space-y-1.5 group">
              <div className="flex justify-between items-center text-xs gap-2 min-w-0">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={deptFullName}>{deptFullName}</span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.value.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded w-11 text-right">
                    {percent}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-full h-2 overflow-hidden relative group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-colors">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${percent}%`, backgroundColor: item.color }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeptDistributionChart;

