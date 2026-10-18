import { AlertTriangle, Bell, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────

const typeConfig = {
  PHISHING: {
    icon: ShieldAlert,
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 border-red-200',
    row: 'hover:bg-red-50',
  },
  SUSPICIOUS: {
    icon: AlertTriangle,
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    row: 'hover:bg-amber-50',
  },
  SAFE: {
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    row: 'hover:bg-emerald-50',
  },
  INFO: {
    icon: Info,
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    row: 'hover:bg-blue-50',
  },
};

function getRelativeTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── NotificationPanel ────────────────────────────────────────────────────────

export default function NotificationPanel({
  notifications = [],
  onClearAll,
  onDismiss,
  onMarkAllRead,
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const panelRef = useRef(null);

  const unread = notifications.filter((n) => !n.read).length;

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications]);

  const filtered =
    filter === 'ALL'
      ? sortedNotifications
      : sortedNotifications.filter((n) => n.type === filter);

  useEffect(() => {
    if (open && unread > 0) {
      onMarkAllRead?.();
    }
  }, [open, unread, onMarkAllRead]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-slate-600 shadow-soft transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(calc(100vw-2rem),24rem)] animate-fade-up rounded-2xl border border-line bg-white shadow-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-ink">Notifications</h3>
              {unread > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs font-semibold text-slate-400 transition hover:text-slate-700"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 border-b border-line px-3 py-2">
            {['ALL', 'PHISHING', 'SUSPICIOUS', 'SAFE'].map((f) => {
              const count =
                f === 'ALL'
                  ? notifications.length
                  : notifications.filter((n) => n.type === f).length;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    filter === f
                      ? 'bg-ink text-white'
                      : 'text-muted hover:bg-slate-100'
                  }`}
                >
                  {f === 'ALL' ? `All (${count})` : `${f} (${count})`}
                </button>
              );
            })}
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Bell size={24} className="text-slate-200" />
                <p className="text-sm font-medium text-muted">No notifications</p>
                <p className="text-xs text-slate-400">
                  New email scan results will appear here
                </p>
              </div>
            ) : (
              <ul>
                {filtered.map((n) => {
                  const cfg = typeConfig[n.type] || typeConfig.INFO;
                  const Icon = cfg.icon;
                  return (
                    <li
                      key={n.id}
                      className={`group relative border-b border-line px-4 py-3 transition ${cfg.row} ${
                        !n.read ? 'bg-slate-50/60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Unread dot */}
                        <div className="mt-1 shrink-0">
                          {!n.read ? (
                            <span className={`block h-2 w-2 rounded-full ${cfg.dot}`} />
                          ) : (
                            <span className="block h-2 w-2" />
                          )}
                        </div>

                        {/* Icon */}
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${cfg.badge}`}>
                          <Icon size={15} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-ink leading-tight">
                              {n.subject || 'No subject'}
                            </p>
                            <button
                              type="button"
                              onClick={() => onDismiss(n.id)}
                              className="invisible shrink-0 rounded p-0.5 text-slate-300 transition hover:text-slate-500 group-hover:visible"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            From: {n.sender}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                              {n.type}
                            </span>
                            {n.confidence != null && (
                              <span className="text-[10px] text-slate-400">
                                {Math.round(n.confidence * 100)}% confidence
                              </span>
                            )}
                            <span className="ml-auto text-[10px] text-slate-400">
                              {getRelativeTime(n.createdAt)}
                            </span>
                          </div>
                          {n.summary && (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                              {n.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="border-t border-line px-4 py-2.5 text-center">
              <p className="text-xs text-slate-400">
                Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
