// Loading Skeleton Components with Rich Dark Mode & Pulse Animation Support
import React from 'react';

export const NoticeCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs animate-pulse space-y-4">
    <div className="flex items-center gap-2">
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-16"></div>
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-24"></div>
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-14"></div>
    </div>
    <div className="space-y-2">
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div>
      <div className="h-3.5 bg-slate-100 dark:bg-slate-800/60 rounded-md w-full"></div>
      <div className="h-3.5 bg-slate-100 dark:bg-slate-800/60 rounded-md w-5/6"></div>
    </div>
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-sm w-28"></div>
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-sm w-24"></div>
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-24"></div>
      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
    </div>
    <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-md w-20 mb-2"></div>
    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-32"></div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden animate-pulse">
    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-40"></div>
      <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-28"></div>
    </div>
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-5 gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 font-semibold">
        {Array(cols).fill(0).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-20"></div>
        ))}
      </div>
      {Array(rows).fill(0).map((_, idx) => (
        <div key={idx} className="grid grid-cols-5 gap-4 items-center">
          {Array(cols).fill(0).map((_, i) => (
            <div key={i} className="h-3 bg-slate-100 dark:bg-slate-800/80 rounded-md w-24"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs animate-pulse h-80 flex flex-col justify-between">
    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-32 mb-6"></div>
    <div className="flex-1 flex items-end space-x-4 px-2">
      {Array(10).fill(0).map((_, i) => {
        const height = [40, 75, 55, 90, 65, 80, 45, 95, 70, 60][i % 10];
        return (
          <div
            key={i}
            style={{ height: `${height}%` }}
            className="flex-1 bg-slate-200 dark:bg-slate-800/60 rounded-t-sm"
          ></div>
        );
      })}
    </div>
    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-full mt-4"></div>
  </div>
);

export const LoadingSkeleton = ({ type = 'card', count = 1, rows = 5, cols = 5 }) => {
  return (
    <div className="space-y-4">
      {Array(count).fill(0).map((_, index) => {
        if (type === 'table') return <TableSkeleton key={index} rows={rows} cols={cols} />;
        if (type === 'chart') return <ChartSkeleton key={index} />;
        if (type === 'notice') return <NoticeCardSkeleton key={index} />;
        return <CardSkeleton key={index} />;
      })}
    </div>
  );
};

export default LoadingSkeleton;
