import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import { Activity, Server, HardDrive, Cpu, AlertTriangle, CheckCircle, Lightbulb, Users, ListFilter } from 'lucide-react';

function CircularProgress({ value, label, size = 120, strokeWidth = 10, color = 'var(--primary-400)' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - ((value || 0) / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--white-10)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--white-90)' }}>
          {value !== null ? `${Math.round(value)}%` : '--'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--white-40)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function AdminServerHealth() {
  const toast = useToast();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const { data } = await adminApi.getServerHealth();
      setHealth(data);
    } catch {
      toast.error('Failed to load server health metrics.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000); // Live updates every 5s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading && !health) {
    return <div className="detail-body"><Skeleton height={400} /></div>;
  }

  const { cpu, ram, disk, app, suggestions } = health || {};

  const getStatusColor = (val) => {
    if (val === null) return 'var(--white-40)';
    if (val > 85) return 'var(--red-400)';
    if (val > 70) return 'var(--saffron-400)';
    return 'var(--green-400)';
  };

  const activeMonitors = app?.active_monitors || 0;
  const reqCpu = Math.max(1, Math.ceil(activeMonitors / 500));
  const reqRam = Math.max(2, Math.ceil(activeMonitors / 500) + 1);
  const isOverloaded = (cpu && cpu > 80) || (ram && ram.used_percentage > 80) || (activeMonitors > 1000);

  return (
    <>
      <div className="detail-header">
        <div className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Server size={24} />
          Server Health & Utilization
        </div>
        <button className="btn btn-secondary" onClick={fetchHealth}>
          Refresh Now
        </button>
      </div>

      <div className="row-3" style={{ marginBottom: 24 }}>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px' }}>
          <CircularProgress 
            value={cpu} 
            label="CPU" 
            color={getStatusColor(cpu)} 
          />
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--white-60)' }}>
            <Cpu size={16} style={{ marginBottom: 6, display: 'block', margin: '0 auto' }} />
            System CPU Load
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px' }}>
          <CircularProgress 
            value={ram?.used_percentage} 
            label="RAM" 
            color={getStatusColor(ram?.used_percentage)} 
          />
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--white-60)' }}>
            <Server size={16} style={{ marginBottom: 6, display: 'block', margin: '0 auto' }} />
            {ram ? `${formatBytes(ram.used)} / ${formatBytes(ram.total)}` : 'Memory Usage'}
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px' }}>
          <CircularProgress 
            value={disk?.used_percentage} 
            label="DISK" 
            color={getStatusColor(disk?.used_percentage)} 
          />
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--white-60)' }}>
            <HardDrive size={16} style={{ marginBottom: 6, display: 'block', margin: '0 auto' }} />
            {disk ? `${formatBytes(disk.free)} Free` : 'Disk Space'}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={18} />
            Capacity & Requirements Estimator
          </div>
        </div>
        <div className="panel-body">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250, padding: 20, background: 'var(--navy-800)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--white-60)', marginBottom: 8 }}>Required Capacity</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--white-90)', marginBottom: 4 }}>
                {reqCpu} CPU Core{reqCpu > 1 && 's'} / {reqRam}GB RAM
              </div>
              <div style={{ fontSize: 13, color: 'var(--white-40)' }}>
                Based on {activeMonitors} active monitors
              </div>
            </div>
            
            <div style={{ flex: 1, minWidth: 250, padding: 20, background: isOverloaded ? 'var(--red-dim)' : 'var(--green-dim)', border: `1px solid ${isOverloaded ? 'var(--red-400)' : 'var(--green-400)'}`, borderRadius: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: isOverloaded ? 'var(--red-400)' : 'var(--green-400)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {isOverloaded ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                {isOverloaded ? 'Capacity Exceeded' : 'Capacity Sufficient'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--white-90)', lineHeight: 1.5 }}>
                {isOverloaded 
                  ? 'Your current server load or monitor count is extremely high. It is highly recommended to deploy a Remote Monitoring Node to distribute the load.' 
                  : 'Your current server has sufficient resources to run the active monitors smoothly. No additional nodes required yet.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row-2">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Application Metrics</div>
          </div>
          <div className="panel-body">
            <div className="kpi-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="kpi-card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--white-40)', marginBottom: 4, textTransform: 'uppercase' }}>Active Monitors</div>
                <div style={{ fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={20} color="var(--green-400)" />
                  {app?.active_monitors} / {app?.total_monitors}
                </div>
              </div>
              
              <div className="kpi-card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--white-40)', marginBottom: 4, textTransform: 'uppercase' }}>Pending Queue Jobs</div>
                <div style={{ fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ListFilter size={20} color={app?.pending_jobs > 1000 ? "var(--saffron-400)" : "var(--primary-400)"} />
                  {app?.pending_jobs}
                </div>
              </div>

              <div className="kpi-card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--white-40)', marginBottom: 4, textTransform: 'uppercase' }}>Failed Jobs</div>
                <div style={{ fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={20} color={app?.failed_jobs > 0 ? "var(--red-400)" : "var(--green-400)"} />
                  {app?.failed_jobs}
                </div>
              </div>

              <div className="kpi-card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--white-40)', marginBottom: 4, textTransform: 'uppercase' }}>Database Size</div>
                <div style={{ fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HardDrive size={20} color="var(--blue-400)" />
                  {formatBytes(app?.database_size_bytes)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={18} color="var(--saffron-400)" />
              Improvement Suggestions
            </div>
          </div>
          <div className="panel-body">
            {suggestions?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {suggestions.map((suggestion, idx) => {
                  const isSuccess = suggestion.includes('perfectly');
                  const isWarning = suggestion.includes('Consider') || suggestion.includes('High');
                  const isDanger = suggestion.includes('Critically') || suggestion.includes('failed');

                  let icon = <CheckCircle size={18} color="var(--green-400)" />;
                  let bg = 'var(--green-dim)';
                  if (isWarning) { icon = <AlertTriangle size={18} color="var(--saffron-400)" />; bg = 'var(--saffron-dim)'; }
                  if (isDanger) { icon = <AlertTriangle size={18} color="var(--red-400)" />; bg = 'var(--red-dim)'; }

                  return (
                    <div key={idx} style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 8, background: 'var(--navy-800)', border: `1px solid ${bg}` }}>
                      <div style={{ marginTop: 2 }}>{icon}</div>
                      <div style={{ fontSize: 14, color: 'var(--white-90)', lineHeight: 1.5 }}>{suggestion}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--white-40)', fontSize: 13 }}>No suggestions available at the moment.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
