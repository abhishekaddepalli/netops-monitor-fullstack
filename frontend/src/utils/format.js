import { formatDistanceToNow, format } from 'date-fns';

export function timeAgo(dateString) {
  if (!dateString) return '—';
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const tz = window.APP_TIMEZONE || 'UTC';
    const format12h = window.APP_TIME_FORMAT === '12h';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: format12h,
    }).format(new Date(dateString));
  } catch {
    return '—';
  }
}

export function formatMs(ms) {
  if (ms === null || ms === undefined) return '—';
  return `${ms}ms`;
}

export function formatUptime(pct) {
  if (pct === null || pct === undefined) return '—';
  return `${Number(pct).toFixed(2)}%`;
}

/** Formats a duration in seconds as "Hh Mm" (e.g. incident downtime, MTTR). */
export function formatDurationSeconds(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export const MONITOR_TYPE_LABELS = {
  http: 'HTTP/S',
  ping: 'Ping',
  tcp_port: 'TCP Port',
  ssl: 'SSL',
  dns: 'DNS',
  heartbeat: 'Heartbeat',
  api: 'API',
  server_agent: 'Server Agent',
};

export const CHECK_INTERVALS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 180, label: '3 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 900, label: '15 minutes' },
];
