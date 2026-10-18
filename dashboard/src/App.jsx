import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCheck,
  CheckCircle2,
  Download,
  Edit2,
  Flag,
  Inbox,
  List,
  Mail,
  RefreshCw,
  SearchCheck,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { classifyEmail, fetchHealth, fetchLogs, fetchStats, updateLogAction } from './api/client';
import NotificationPanel from './components/NotificationPanel';
import StatCard from './components/StatCard';
import StatusBadge from './components/StatusBadge';
import ThreatTrendChart from './components/ThreatTrendChart';
import { ToastContainer } from './components/Toast';
import {
  exportToCsv,
  formatDate,
  formatPercent,
  getRelativeTime,
  splitLines,
} from './utils/format';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const emptyStats = { total: 0, safe: 0, suspicious: 0, phishing: 0 };

const chartColors = { safe: '#10b981', suspicious: '#f59e0b', phishing: '#ef4444' };

const initialForm = {
  from_email: '',
  subject: '',
  body_text: '',
  spam_score: '0',
  links: '',
  attachments: '',
};

const CLASSIFICATIONS = ['SAFE', 'SUSPICIOUS', 'PHISHING'];

// Map log classification â†’ notification type
function classToNotifType(cls) {
  const c = (cls || '').toUpperCase();
  if (c === 'PHISHING')   return 'PHISHING';
  if (c === 'SUSPICIOUS') return 'SUSPICIOUS';
  if (c === 'SAFE')       return 'SAFE';
  return 'INFO';
}

function getLogNotificationKey(log) {
  if (log.id != null) return String(log.id);
  return [
    log.sender || '',
    log.subject || '',
    log.classification || '',
    log.created_at || '',
  ].join('|');
}

// â”€â”€â”€ App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function App() {
  const [activeView, setActiveView]   = useState('dashboard');
  const [stats, setStats]             = useState(emptyStats);
  const [logs, setLogs]               = useState([]);
  const [health, setHealth]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Analyzer form
  const [form, setForm]               = useState(initialForm);
  const [analysis, setAnalysis]       = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Toasts
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  // Notifications
  const savedNotifs = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('notifications') || '[]');
    } catch (e) {
      return [];
    }
  }, []);

  const [notifications, setNotifications] = useState(savedNotifs);
  const notifId = useRef(savedNotifs.reduce((max, n) => Math.max(max, n.id || 0), 0));
  // Track which log IDs we've already notified about so we don't re-notify on refresh
  const notifiedLogIds = useRef(new Set(savedNotifs.map((n) => n.logKey).filter(Boolean)));

  // Analyst actions
  const [logActions, setLogActions] = useState({});

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Alert: detect new phishing on refresh
  const prevPhishingRef = useRef(0);

  // â”€â”€ Toast helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // â”€â”€ Notification helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const addNotification = useCallback((log) => {
    const id = ++notifId.current;
    setNotifications((prev) => [
      {
        id,
        type:       classToNotifType(log.classification),
        subject:    log.subject,
        sender:     log.sender,
        confidence: log.confidence,
        summary:    log.summary,
        createdAt:  log.created_at || new Date().toISOString(),
        read:       false,
        logKey:     getLogNotificationKey(log),
      },
      ...prev,
    ]);
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleDismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleMarkNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (
      n.read ? n : { ...n, read: true }
    )));
  }, []);

  // â”€â”€ Data loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [healthData, statsData, logsData] = await Promise.all([
        fetchHealth(),
        fetchStats(),
        fetchLogs(),
      ]);
      setHealth(healthData);
      setStats({ ...emptyStats, ...statsData });

      const newLogs = Array.isArray(logsData) ? logsData : [];
      setLogs(newLogs);
      setLastUpdated(new Date());

      // Build initial logActions from fetched logs to persist state from backend DB
      const initialActions = {};
      newLogs.forEach((log) => {
        if (log.action) {
          if (log.action === 'OVERRIDDEN') {
            initialActions[log.id] = { type: 'OVERRIDDEN', cls: log.override_classification };
          } else {
            initialActions[log.id] = log.action;
          }
        }
      });
      setLogActions(initialActions);

      // Create a notification for each log we haven't seen before
      // Loop in reverse order to ensure newest notifications end up at the top
      [...newLogs].reverse().forEach((log) => {
        const notificationKey = getLogNotificationKey(log);
        if (!notifiedLogIds.current.has(notificationKey)) {
          notifiedLogIds.current.add(notificationKey);
          addNotification(log);
        }
      });

      // Toast alert for new phishing specifically
      if (statsData.phishing > prevPhishingRef.current && prevPhishingRef.current > 0) {
        const count = statsData.phishing - prevPhishingRef.current;
        addToast(`${count} new phishing email${count > 1 ? 's' : ''} detected.`, 'danger');
      }
      prevPhishingRef.current = statsData.phishing;
    } catch (err) {
      setError(err?.message || 'Unable to reach the backend API.');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [addToast, addNotification]);

  useEffect(() => {
    loadDashboard();
    const timer = window.setInterval(loadDashboard, 30000);
    return () => window.clearInterval(timer);
  }, [loadDashboard]);

  // â”€â”€ Form handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAnalyze(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setAnalysis(null);
    try {
      const payload = {
        subject:     form.subject.trim(),
        from_email:  form.from_email.trim(),
        body_text:   form.body_text.trim(),
        links:       splitLines(form.links),
        attachments: splitLines(form.attachments),
        spam_score:  Number(form.spam_score || 0),
        spam_rules:  [],
      };
      const result = await classifyEmail(payload);
      setAnalysis(result);

      await loadDashboard();
      addToast('Email analyzed successfully.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Analysis failed.';
      setSubmitError(msg);
      addToast(msg, 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  // â”€â”€ Analyst actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleConfirm(log) {
    try {
      await updateLogAction(log.id, 'CONFIRMED');
      setLogActions((prev) => ({ ...prev, [log.id]: 'CONFIRMED' }));
      addToast(`Classification confirmed for email from ${log.sender}.`, 'success');
      await loadDashboard();
    } catch (err) {
      addToast('Failed to confirm classification.', 'danger');
    }
  }

  async function handleOverride(log, newCls) {
    try {
      await updateLogAction(log.id, 'OVERRIDDEN', newCls);
      setLogActions((prev) => ({ ...prev, [log.id]: { type: 'OVERRIDDEN', cls: newCls } }));
      addToast(`Classification overridden to ${newCls} for email from ${log.sender}.`, 'warning');
      await loadDashboard();
    } catch (err) {
      addToast('Failed to override classification.', 'danger');
    }
  }

  async function handleWhitelist(log) {
    try {
      await updateLogAction(log.id, 'WHITELISTED');
      setLogActions((prev) => ({ ...prev, [log.id]: 'WHITELISTED' }));
      addToast(`Sender ${log.sender} has been whitelisted.`, 'info');
      await loadDashboard();
    } catch (err) {
      addToast('Failed to whitelist sender.', 'danger');
    }
  }

  async function handleEscalate(log) {
    try {
      await updateLogAction(log.id, 'ESCALATED');
      setLogActions((prev) => ({ ...prev, [log.id]: 'ESCALATED' }));
      addToast(`Email from ${log.sender} escalated for review.`, 'warning');
      await loadDashboard();
    } catch (err) {
      addToast('Failed to escalate email.', 'danger');
    }
  }

  // â”€â”€ Chart data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const chartData = useMemo(
    () => [
      { name: 'Safe',       value: stats.safe,        color: chartColors.safe       },
      { name: 'Suspicious', value: stats.suspicious,   color: chartColors.suspicious  },
      { name: 'Phishing',   value: stats.phishing,     color: chartColors.phishing    },
    ],
    [stats],
  );
  const hasStats = chartData.some((d) => d.value > 0);

  // â”€â”€ Sidebar nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const navItems = [
    { id: 'dashboard', icon: BarChart3,  label: 'Dashboard'       },
    { id: 'logs',      icon: List,        label: 'Email Logs'      },
    { id: 'analyzer',  icon: SearchCheck, label: 'Manual Analyzer' },
  ];

  const isConnected = health?.status === 'healthy';

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-ink">
      <div className="flex min-h-screen flex-col lg:flex-row">

        {/* â”€â”€ Sidebar â”€â”€ */}
        <aside className="sidebar-bg flex flex-col px-4 py-6 text-white lg:w-72 lg:min-h-screen">
          {/* Brand */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-glow">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">AI Powered</p>
              <h1 className="text-base font-bold leading-tight">Email Security</h1>
            </div>
          </div>

          {/* Nav */}
          <nav className="mt-8 flex flex-col gap-1">
            {navItems.map(({ id, icon: Icon, label }) => {
              const active = activeView === id;
              return (
                <button
                  key={id}
                  type="button"
                  id={`nav-${id}`}
                  onClick={() => setActiveView(id)}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-emerald-500 text-white shadow-glow'
                      : 'text-slate-400 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Connection status */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isConnected
                  ? <Wifi size={16} className="text-emerald-400" />
                  : <WifiOff size={16} className="text-red-400" />}
                <p className="text-sm font-semibold">
                  {isConnected ? 'API Connected' : 'API Offline'}
                </p>
              </div>
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            </div>
            {lastUpdated && (
              <p className="mt-2 text-xs text-slate-500">
                Updated {getRelativeTime(lastUpdated)}
              </p>
            )}
          </div>
        </aside>

        {/* â”€â”€ Main â”€â”€ */}
        <main className="flex flex-1 flex-col overflow-hidden">

          {/* â”€â”€ Header â”€â”€ */}
          <header className="flex flex-col gap-4 border-b border-line bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                {activeView === 'dashboard' ? 'Overview' : activeView === 'logs' ? 'Records' : 'Analysis'}
              </p>
              <h2 className="mt-0.5 text-2xl font-bold text-ink">
                {activeView === 'dashboard' ? 'Threat Dashboard' : activeView === 'logs' ? 'Email Logs' : 'Manual Analyzer'}
              </h2>
            </div>

            {/* Right side: Notifications bell + Refresh */}
            <div className="flex items-center gap-2">
              <NotificationPanel
                notifications={notifications}
                onClearAll={handleClearAllNotifications}
                onDismiss={handleDismissNotification}
                onMarkAllRead={handleMarkNotificationsRead}
              />
              <button
                id="btn-refresh"
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-slate-600 shadow-soft transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </header>

          {/* Error banner */}
          {error && (
            <div className="mx-5 mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-fade-up">
              <WifiOff size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Views */}
          <div className="flex-1 overflow-auto">
            {activeView === 'dashboard' && (
              <DashboardView
                stats={stats}
                logs={logs}
                chartData={chartData}
                hasStats={hasStats}
              />
            )}
            {activeView === 'logs' && (
              <LogsView
                logs={logs}
                logActions={logActions}
                onConfirm={handleConfirm}
                onOverride={handleOverride}
                onWhitelist={handleWhitelist}
                onEscalate={handleEscalate}
                onExport={() => exportToCsv(logs)}
              />
            )}
            {activeView === 'analyzer' && (
              <AnalyzerView
                form={form}
                analysis={analysis}
                submitting={submitting}
                submitError={submitError}
                onChange={updateField}
                onSubmit={handleAnalyze}
              />
            )}
          </div>
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// â”€â”€â”€ Dashboard View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DashboardView({ stats, logs, chartData, hasStats }) {
  return (
    <div className="space-y-6 p-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Inbox}         label="Total Emails"  value={stats.total}      gradientClass="stat-total"       iconColor="bg-indigo-100 text-indigo-600" />
        <StatCard icon={CheckCircle2}  label="Safe"          value={stats.safe}        gradientClass="stat-safe"        iconColor="bg-emerald-100 text-emerald-600" />
        <StatCard icon={AlertTriangle} label="Suspicious"    value={stats.suspicious}  gradientClass="stat-suspicious"  iconColor="bg-amber-100 text-amber-600" />
        <StatCard icon={ShieldAlert}   label="Phishing"      value={stats.phishing}    gradientClass="stat-phishing"    iconColor="bg-red-100 text-red-600" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-ink">Classification Mix</h3>
            <Activity size={17} className="text-muted" />
          </div>
          <div className="h-64">
            {hasStats ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={3}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No analyzed emails yet" />
            )}
          </div>
          {hasStats && (
            <div className="mt-3 flex items-center justify-center gap-5 text-xs font-medium text-muted">
              {chartData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-ink">7-Day Threat Trend</h3>
            <TrendingUp size={17} className="text-muted" />
          </div>
          <div className="h-64">
            <ThreatTrendChart logs={logs} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-ink">Threat Counts</h3>
          <BarChart3 size={17} className="text-muted" />
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

// â”€â”€â”€ Logs View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ACTION_LABELS = {
  CONFIRMED:   { label: 'Confirmed',   cls: 'bg-emerald-100 text-emerald-700' },
  WHITELISTED: { label: 'Whitelisted', cls: 'bg-blue-100 text-blue-700'       },
  ESCALATED:   { label: 'Escalated',   cls: 'bg-amber-100 text-amber-700'     },
};

function LogsView({ logs, logActions, onConfirm, onOverride, onWhitelist, onEscalate, onExport }) {
  const [filter, setFilter]           = useState('ALL');
  const [overrideOpenId, setOverrideOpenId] = useState(null);

  const filtered = filter === 'ALL' ? logs : logs.filter((l) => l.classification?.toUpperCase() === filter);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['ALL', ...CLASSIFICATIONS].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-white border border-line text-muted hover:border-slate-300'
              }`}
            >
              {f === 'ALL' ? `All (${logs.length})` : f}
            </button>
          ))}
        </div>
        <button
          id="btn-export-csv"
          type="button"
          onClick={onExport}
          disabled={!logs.length}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-4 text-xs font-semibold text-slate-600 shadow-soft transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-white shadow-soft overflow-hidden">
        <div className="table-scroll overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b border-line bg-field text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Sender</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length ? (
                filtered.map((log) => {
                  const action = logActions[log.id];
                  const isOverrideOpen = overrideOpenId === log.id;
                  const displayCls = action?.type === 'OVERRIDDEN' ? action.cls : log.classification;

                  return (
                    <tr key={log.id} className="align-middle hover:bg-field transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                        {getRelativeTime(log.created_at)}
                        <span className="block text-[10px] text-slate-400">{formatDate(log.created_at)}</span>
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 font-medium text-ink">{log.sender}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">{log.subject}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge value={displayCls} />
                          {action && typeof action === 'string' && (
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${ACTION_LABELS[action]?.cls}`}>
                              {ACTION_LABELS[action]?.label}
                            </span>
                          )}
                          {action?.type === 'OVERRIDDEN' && (
                            <span className="inline-block rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                              Overridden
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-ink">
                        {formatPercent(log.confidence)}
                      </td>
                      <td className="max-w-[260px] px-4 py-3 text-xs text-slate-600 leading-relaxed">{log.summary}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 relative">
                          <ActionBtn icon={CheckCheck} title="Confirm classification"  color="text-emerald-600 hover:bg-emerald-50" onClick={() => onConfirm(log)}  disabled={!!action} />
                          <div className="relative">
                            <ActionBtn icon={Edit2} title="Override classification" color="text-violet-600 hover:bg-violet-50"  onClick={() => setOverrideOpenId(isOverrideOpen ? null : log.id)} disabled={!!action} />
                            {isOverrideOpen && (
                              <div className="absolute right-0 top-9 z-20 rounded-xl border border-line bg-white p-2 shadow-card animate-scale-in w-36">
                                {CLASSIFICATIONS.map((cls) => (
                                  <button
                                    key={cls}
                                    type="button"
                                    onClick={() => { onOverride(log, cls); setOverrideOpenId(null); }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-field transition"
                                  >
                                    <StatusBadge value={cls} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <ActionBtn icon={ShieldOff} title="Whitelist sender"        color="text-blue-600 hover:bg-blue-50"    onClick={() => onWhitelist(log)} disabled={!!action} />
                          <ActionBtn icon={Flag}      title="Escalate for review"     color="text-amber-600 hover:bg-amber-50"  onClick={() => onEscalate(log)}  disabled={!!action} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-muted" colSpan="7">
                    <Mail className="mx-auto mb-2 text-slate-300" size={28} />
                    No email logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, title, color, onClick, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${color} disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      <Icon size={15} />
    </button>
  );
}

// â”€â”€â”€ Analyzer View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AnalyzerView({ form, analysis, submitting, submitError, onChange, onSubmit }) {
  return (
    <div className="grid gap-5 p-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(340px,1.05fr)]">
      <form className="rounded-2xl border border-line bg-white p-6 shadow-soft" onSubmit={onSubmit}>
        <h3 className="mb-5 font-semibold text-ink">Email Details</h3>
        <div className="grid gap-4">
          <Field label="Sender Email">
            <input className="input-base" name="from_email" type="email" value={form.from_email} onChange={onChange} placeholder="sender@example.com" required />
          </Field>
          <Field label="Subject">
            <input className="input-base" name="subject" value={form.subject} onChange={onChange} placeholder="e.g. Urgent: Verify your account" required />
          </Field>
          <Field label="Email Body">
            <textarea className="input-base min-h-40 resize-y py-3" name="body_text" value={form.body_text} onChange={onChange} placeholder="Paste the email body here..." required />
          </Field>
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Field label="Spam Score">
              <input className="input-base" min="0" name="spam_score" step="0.1" type="number" value={form.spam_score} onChange={onChange} required />
            </Field>
            <Field label="Links (comma-separated)">
              <input className="input-base" name="links" value={form.links} onChange={onChange} placeholder="https://suspicious-site.com" />
            </Field>
          </div>
          <Field label="Attachments (comma-separated)">
            <input className="input-base" name="attachments" value={form.attachments} onChange={onChange} placeholder="invoice.zip, report.pdf" />
          </Field>
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError}
            </div>
          )}
          <button
            id="btn-analyze"
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <RefreshCw className="animate-spin" size={17} /> : <Send size={17} />}
            {submitting ? 'Analyzing...' : 'Analyze Email'}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        {analysis ? (
          <div className="space-y-5 animate-fade-up">
            <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Result</p>
                <h3 className="mt-1 text-3xl font-bold text-ink">{analysis.classification}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={analysis.classification} />
                <StatusBadge value={analysis.risk_level} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Metric label="Confidence" value={formatPercent(analysis.confidence)} icon={Activity} />
              <Metric label="Risk Level"  value={analysis.risk_level}               icon={ShieldAlert} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Summary</p>
              <p className="mt-2 rounded-xl border border-line bg-field p-3 text-sm leading-relaxed text-slate-700">
                {analysis.summary}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Reasoning</p>
              <ul className="mt-2 grid gap-2">
                {(analysis.reasoning || []).map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-slate-700">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
            {(analysis.iocs || []).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">IOC List</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.iocs.map((ioc) => (
                    <span key={ioc} className="max-w-full truncate rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      {ioc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState label="Analysis result will appear here" />
        )}
      </section>
    </div>
  );
}

// â”€â”€â”€ Shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-line bg-field p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <Icon size={16} className="text-muted" />
      </div>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex h-full min-h-52 items-center justify-center rounded-xl border border-dashed border-line bg-field px-4 text-center">
      <div>
        <Mail className="mx-auto mb-3 text-slate-300" size={28} />
        <p className="text-sm font-medium text-muted">{label}</p>
      </div>
    </div>
  );
}

export default App;
