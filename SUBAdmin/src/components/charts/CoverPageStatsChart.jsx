// Pure SVG Double Bar Chart - Cover Page Generation Statistics
import { useState } from 'react';

export const CoverPageStatsChart = ({ data = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
        No cover page data available.
      </div>
    );
  }

  // Dimensions
  const width = 500;
  const height = 200;
  const paddingLeft = 38;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value calculation
  const maxVal = Math.max(...data.map(d => Math.max(d.Midterm, d.Final)), 1000);
  const roundedMax = Math.ceil(maxVal / 1000) * 1000;

  // Bar configurations
  const groupWidth = chartWidth / data.length;
  const barGap = 3;
  const barWidth = (groupWidth - 20) / 2;

  // Grid lines
  const gridLines = [0, 1, 2, 3, 4].map(i => {
    const val = (roundedMax / 4) * i;
    const y = paddingTop + chartHeight - (val / roundedMax) * chartHeight;
    return { y, val };
  });

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Cover Page Generations</h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Monthly mid vs final term cover sheets generated</p>
        </div>
        {/* Legends */}
        <div className="flex items-center space-x-3 mt-2 md:mt-0 text-[10px] font-semibold text-slate-500">
          <div className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1"></span>
            <span>Midterm</span>
          </div>
          <div className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 mr-1"></span>
            <span>Final</span>
          </div>
        </div>
      </div>

      <div className="relative h-56 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          {/* Grid lines and Labels */}
          {gridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                className="stroke-slate-100 dark:stroke-slate-800/80"
                strokeWidth={1}
                strokeDasharray={idx === 0 ? "0" : "4"}
              />
              <text
                x={paddingLeft - 8}
                y={line.y + 3}
                textAnchor="end"
                className="fill-slate-400 dark:fill-slate-500 text-[9px] font-medium"
              >
                {line.val >= 1000 ? `${line.val / 1000}k` : line.val}
              </text>
            </g>
          ))}

          {/* Render Bars */}
          {data.map((item, idx) => {
            const xGroupStart = paddingLeft + idx * groupWidth + 10;
            
            // Midterm Bar
            const midHeight = (item.Midterm / roundedMax) * chartHeight;
            const midX = xGroupStart;
            const midY = paddingTop + chartHeight - midHeight;
            
            // Final Bar
            const finalHeight = (item.Final / roundedMax) * chartHeight;
            const finalX = xGroupStart + barWidth + barGap;
            const finalY = paddingTop + chartHeight - finalHeight;

            // X coordinates label center
            const xTextCenter = xGroupStart + barWidth + barGap / 2;

            return (
              <g key={idx}>
                {/* Midterm Bar Graphic */}
                <rect
                  x={midX}
                  y={midY}
                  width={barWidth}
                  height={midHeight}
                  rx={2}
                  fill="#3b82f6"
                  className="transition-all duration-200 cursor-pointer hover:opacity-85"
                  onMouseEnter={() => setHoveredIndex({ idx, type: 'Midterm', val: item.Midterm, x: midX + barWidth/2, y: midY })}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Final Bar Graphic */}
                <rect
                  x={finalX}
                  y={finalY}
                  width={barWidth}
                  height={finalHeight}
                  rx={2}
                  fill="#a855f7"
                  className="transition-all duration-200 cursor-pointer hover:opacity-85"
                  onMouseEnter={() => setHoveredIndex({ idx, type: 'Final', val: item.Final, x: finalX + barWidth/2, y: finalY })}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Month Name under bars */}
                <text
                  x={xTextCenter}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-slate-400 dark:fill-slate-500 text-[9px] font-medium"
                >
                  {item.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* HTML Tooltip Display */}
        {hoveredIndex !== null && (
          <div
            className="absolute z-10 px-2 py-1.5 bg-slate-900 text-slate-100 text-[10px] rounded-lg shadow-md border border-slate-700/50 flex flex-col pointer-events-none -translate-x-1/2 -translate-y-full transition-all duration-75"
            style={{
              left: `${(hoveredIndex.x / width) * 100}%`,
              top: `${(hoveredIndex.y / height) * 100 - 8}%`
            }}
          >
            <span className="font-semibold text-slate-300">
              {data[hoveredIndex.idx].month} ({hoveredIndex.type})
            </span>
            <span className="text-xs font-bold text-white mt-0.5">
              {hoveredIndex.val.toLocaleString()} Pages
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoverPageStatsChart;
