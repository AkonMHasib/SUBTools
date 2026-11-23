// Pure SVG Area Chart - Registration Trend
import { useState } from 'react';

export const RegistrationTrendChart = ({ data = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
        No trend data available.
      </div>
    );
  }

  // Dimensions
  const width = 500;
  const height = 200;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value calculation
  const maxVal = Math.max(...data.map(d => d.count), 10);
  const roundedMax = Math.ceil(maxVal / 5) * 5;

  // Generate points
  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.count / roundedMax) * chartHeight;
    return { x, y, data: d, index };
  });

  // SVG Paths
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  // Grid line levels
  const gridLines = [0, 1, 2, 3, 4].map(i => {
    const val = (roundedMax / 4) * i;
    const y = paddingTop + chartHeight - (val / roundedMax) * chartHeight;
    return { y, val };
  });

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">User Registrations</h3>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">New registration trend over the last 7 days</p>
      </div>

      <div className="relative h-56 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid Lines & Y Axis Labels */}
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
                {Math.round(line.val)}
              </text>
            </g>
          ))}

          {/* Area Path */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#areaGrad)"
            />
          )}

          {/* Line Path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )}

          {/* X Axis Labels */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 text-[9px] font-medium"
            >
              {p.data.date}
            </text>
          ))}

          {/* Interaction Vertical Guide Line */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <line
              x1={points[hoveredIndex].x}
              y1={paddingTop}
              x2={points[hoveredIndex].x}
              y2={paddingTop + chartHeight}
              className="stroke-blue-400/50 dark:stroke-blue-500/50"
              strokeWidth={1.5}
              strokeDasharray="3"
            />
          )}

          {/* Interactive Trigger Circles */}
          {points.map((p, idx) => (
            <g key={idx}>
              {/* Invisible large circle for easy hover targeting */}
              <circle
                cx={p.x}
                cy={p.y}
                r={12}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {/* Visual circle node */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === idx ? 5.5 : 3.5}
                fill={hoveredIndex === idx ? "#3b82f6" : "#ffffff"}
                stroke="#3b82f6"
                strokeWidth={hoveredIndex === idx ? 2 : 1.5}
                className="pointer-events-none transition-all duration-150"
              />
            </g>
          ))}
        </svg>

        {/* HTML Tooltip Display */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute z-10 px-2.5 py-1.5 bg-slate-900 text-slate-100 text-[10px] rounded-lg shadow-md border border-slate-700/50 flex flex-col pointer-events-none -translate-x-1/2 -translate-y-full transition-all duration-75"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100 - 8}%`
            }}
          >
            <span className="font-semibold text-slate-300">{points[hoveredIndex].data.date}</span>
            <span className="text-xs font-bold text-white mt-0.5">{points[hoveredIndex].data.count} Users</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationTrendChart;
