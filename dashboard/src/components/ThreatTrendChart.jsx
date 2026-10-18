import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function computeTrend(logs) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const dateStr = day.toISOString().split('T')[0];
    const label   = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayLogs = (logs || []).filter((log) => {
      const logDate = new Date(log.created_at).toISOString().split('T')[0];
      return logDate === dateStr;
    });
    return {
      day,
      safe:       dayLogs.filter((l) => l.classification?.toUpperCase() === 'SAFE').length,
      suspicious: dayLogs.filter((l) => l.classification?.toUpperCase() === 'SUSPICIOUS').length,
      phishing:   dayLogs.filter((l) => l.classification?.toUpperCase() === 'PHISHING').length,
    };
  });
}

const tooltipStyle = {
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  fontSize: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};

export default function ThreatTrendChart({ logs }) {
  const data = computeTrend(logs);
  const isEmpty = data.every((d) => d.safe + d.suspicious + d.phishing === 0);

  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-medium text-muted">
        No data for the last 7 days
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        <Line type="monotone" dataKey="safe"       stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} name="Safe"       activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="suspicious"  stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} name="Suspicious"  activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="phishing"    stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444' }} name="Phishing"    activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
