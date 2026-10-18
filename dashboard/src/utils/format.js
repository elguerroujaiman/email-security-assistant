export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatPercent(value) {
  if (value == null || isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

export function splitLines(text) {
  return String(text || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getRelativeTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export function exportToCsv(data, filename = 'email-logs.csv') {
  if (!data || !data.length) return;
  const headers = ['ID', 'Date', 'Sender', 'Subject', 'Classification', 'Confidence', 'Risk Level', 'Summary'];
  const rows = data.map((log) => [
    log.id,
    log.created_at ? new Date(log.created_at).toISOString() : '',
    log.sender || '',
    log.subject || '',
    log.classification || '',
    log.confidence != null ? `${(log.confidence * 100).toFixed(1)}%` : '',
    log.risk_level || '',
    (log.summary || '').replace(/"/g, '""'),
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
