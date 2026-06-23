import { Globe, Activity, Plug, ShieldCheck, Network, HeartPulse, Code2 } from 'lucide-react';

export const MONITOR_TYPE_ICONS = {
  http: Globe,
  ping: Activity,
  tcp_port: Plug,
  ssl: ShieldCheck,
  dns: Network,
  heartbeat: HeartPulse,
  api: Code2,
  server_agent: Globe, // Will use 'Server' icon if imported, wait let's use Activity or Server.
};

export function MonitorTypeIcon({ type, size = 16 }) {
  const Icon = MONITOR_TYPE_ICONS[type] || Globe;
  return <Icon size={size} />;
}
