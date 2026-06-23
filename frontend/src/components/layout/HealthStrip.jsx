/**
 * The signature element from the original design: a tri-color (saffron /
 * white / green) bar at the very top of the screen whose segment widths
 * reflect the live proportion of monitors that are up / degraded / down.
 * When there are active incidents, the white segment is replaced by red
 * so a critical outage is never visually confused with the flag's white.
 */
export default function HealthStrip({ summary }) {
  const monitors = summary?.monitors;
  const total = monitors?.total || 0;

  if (!total) {
    return (
      <div className="health-strip">
        <span className="hs-up" style={{ width: '100%' }} />
      </div>
    );
  }

  const up = monitors.up || 0;
  const degraded = monitors.degraded || 0;
  const down = monitors.down || 0;
  const other = total - up - degraded - down;

  const upPct = (up / total) * 100;
  const degradedPct = (degraded / total) * 100;
  const downPct = ((down + other) / total) * 100;

  return (
    <div className="health-strip">
      <span className="hs-up" style={{ width: `${upPct}%` }} />
      <span className="hs-degraded" style={{ width: `${degradedPct}%` }} />
      <span className="hs-down" style={{ width: `${downPct}%` }} />
    </div>
  );
}
