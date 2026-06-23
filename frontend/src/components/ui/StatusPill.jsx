const LABELS = {
  up: 'UP',
  down: 'DOWN',
  degraded: 'DEGRADED',
  paused: 'PAUSED',
  pending: 'PENDING',
};

/** The single source of truth for status -> color mapping across the whole app. */
export default function StatusPill({ status, label }) {
  const cls = `pill pill-${status || 'pending'}`;
  return <span className={cls}>{label || LABELS[status] || status?.toUpperCase() || 'UNKNOWN'}</span>;
}
