export default function StatCard({ icon: Icon, label, value, gradientClass, iconColor }) {
  return (
    <article
      className={`rounded-xl border p-5 shadow-soft animate-fade-up transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-card ${gradientClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-3 text-4xl font-bold text-ink tabular-nums">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
          <Icon size={22} strokeWidth={2} />
        </div>
      </div>
    </article>
  );
}
