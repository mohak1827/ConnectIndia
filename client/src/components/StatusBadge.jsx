import React from 'react';

export function StatusBadge({ status, className = '' }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  const configs = {
    verified: {
      label: 'VERIFIED',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      dot: 'bg-emerald-500',
    },
    mismatch: {
      label: 'MISMATCH',
      bg: 'bg-amber-50 text-amber-700 border-amber-300',
      dot: 'bg-amber-500',
    },
    not_found: {
      label: 'NOT_FOUND',
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      dot: 'bg-slate-500',
    },
    unavailable: {
      label: 'UNAVAILABLE',
      bg: 'bg-orange-50 text-orange-700 border-orange-300',
      dot: 'bg-orange-500',
    },
    denied: {
      label: 'REJECTED',
      bg: 'bg-rose-50 text-rose-700 border-rose-300',
      dot: 'bg-rose-500',
    },
    rejected: {
      label: 'REJECTED',
      bg: 'bg-rose-50 text-rose-700 border-rose-300',
      dot: 'bg-rose-500',
    },
    expired: {
      label: 'EXPIRED',
      bg: 'bg-purple-50 text-purple-700 border-purple-300',
      dot: 'bg-purple-500',
    },
    invalid_input: {
      label: 'INVALID_INPUT',
      bg: 'bg-slate-100 text-slate-600 border-slate-300',
      dot: 'bg-slate-400',
    },
    active: {
      label: 'ACTIVE',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      dot: 'bg-emerald-500',
    },
    revoked: {
      label: 'REVOKED',
      bg: 'bg-rose-50 text-rose-700 border-rose-300',
      dot: 'bg-rose-500',
    },
    online: {
      label: 'ONLINE',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      dot: 'bg-emerald-500',
    },
    degraded: {
      label: 'DEGRADED',
      bg: 'bg-amber-50 text-amber-700 border-amber-300',
      dot: 'bg-amber-500',
    },
    offline: {
      label: 'Offline',
      bg: 'bg-rose-50/80 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-400',
    },
    pass: {
      label: 'PASS',
      bg: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    fail: {
      label: 'FAIL',
      bg: 'bg-rose-50/80 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-400',
    },
  };

  const config = configs[normalized] || {
    label: status,
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
