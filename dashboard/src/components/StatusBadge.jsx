const config = {
  SAFE:       { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  SUSPICIOUS: { cls: 'border-amber-200  bg-amber-50  text-amber-800',   dot: 'bg-amber-500'   },
  PHISHING:   { cls: 'border-red-200    bg-red-50    text-red-700',     dot: 'bg-red-500'     },
  LOW:        { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  MEDIUM:     { cls: 'border-amber-200  bg-amber-50  text-amber-800',   dot: 'bg-amber-500'   },
  HIGH:       { cls: 'border-red-200    bg-red-50    text-red-700',     dot: 'bg-red-500'     },
  CRITICAL:   { cls: 'border-red-300    bg-red-100   text-red-800',     dot: 'bg-red-600'     },
  default:    { cls: 'border-slate-200  bg-slate-50  text-slate-600',   dot: 'bg-slate-400'   },
};

export default function StatusBadge({ value }) {
  const normalized = String(value || 'UNKNOWN').toUpperCase();
  const { cls, dot } = config[normalized] || config.default;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {normalized}
    </span>
  );
}
