import React from 'react';

export function StatCard({ label, value, subtext, icon: Icon, badgeText, badgeColor = 'slate' }) {
  const badgeStyles = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    indigo: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-slate-800 tracking-tight">{value}</span>
        {badgeText && (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${badgeStyles[badgeColor] || badgeStyles.slate}`}
          >
            {badgeText}
          </span>
        )}
      </div>
      {subtext && <p className="text-[11px] text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
}
