import { useState, useEffect } from 'react';
import { Search, Loader2, Plus, Check, Play, Square, Trash2, Clock } from 'lucide-react';
import Modal from '../ui/Modal';
import { toolsApi } from '../../api/tools';
import { monitorsApi } from '../../api/monitors';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/client';

export default function NetworkDiscoveryModal({ isOpen, onClose, onAdded }) {
  const toast = useToast();
  const [tab, setTab] = useState('manual');
  
  // Manual Scan State
  const [seedIp, setSeedIp] = useState('');
  const [version, setVersion] = useState('2c');
  const [community, setCommunity] = useState('public');
  const [user, setUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [privPass, setPrivPass] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState({});

  // Background Agents State
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobInterval, setJobInterval] = useState(15);

  useEffect(() => {
    if (isOpen && tab === 'agents') {
      fetchJobs();
    }
  }, [isOpen, tab]);

  async function fetchJobs() {
    setLoadingJobs(true);
    try {
      const { data } = await toolsApi.getDiscoveryJobs();
      setJobs(data);
    } catch (err) {
      toast.error('Failed to load agents');
    } finally {
      setLoadingJobs(false);
    }
  }

  async function handleCreateJob(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { seed_ip: seedIp, snmp_version: version, interval_minutes: jobInterval };
      if (version === '3') {
        payload.user = user;
        payload.auth_pass = authPass;
        payload.priv_pass = privPass;
      } else {
        payload.community = community;
      }
      await toolsApi.createDiscoveryJob(payload);
      toast.success('Agent created successfully!');
      setShowCreateJob(false);
      fetchJobs();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create agent'));
    } finally {
      setLoading(false);
    }
  }

  async function toggleJob(id) {
    try {
      await toolsApi.toggleDiscoveryJob(id);
      fetchJobs();
    } catch (e) {
      toast.error('Failed to toggle agent');
    }
  }

  async function deleteJob(id) {
    if (!confirm('Delete this agent?')) return;
    try {
      await toolsApi.deleteDiscoveryJob(id);
      fetchJobs();
    } catch (e) {
      toast.error('Failed to delete agent');
    }
  }

  function renderConfigForm(onSubmit, submitLabel, isJob = false) {
    return (
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Seed Router IP / Subnet</label>
            <input required type="text" className="form-input" value={seedIp} onChange={e => setSeedIp(e.target.value)} placeholder="192.168.1.1" />
          </div>
          <div className="form-group">
            <label className="form-label">SNMP Version</label>
            <select className="form-select" value={version} onChange={e => setVersion(e.target.value)}>
              <option value="1">v1</option>
              <option value="2c">v2c</option>
              <option value="3">v3</option>
            </select>
          </div>
        </div>

        {isJob && (
          <div className="form-group">
            <label className="form-label">Scan Interval (Minutes)</label>
            <input type="number" min="5" className="form-input" value={jobInterval} onChange={e => setJobInterval(parseInt(e.target.value))} />
          </div>
        )}

        {version !== '3' && (
          <div className="form-group">
            <label className="form-label">Community String</label>
            <input required type="text" className="form-input" value={community} onChange={e => setCommunity(e.target.value)} placeholder="public" />
          </div>
        )}

        {version === '3' && (
          <div style={{ background: 'var(--white-5)', padding: 16, borderRadius: 8 }}>
            <div className="form-group">
              <label className="form-label">Username (securityName)</label>
              <input required type="text" className="form-input" value={user} onChange={e => setUser(e.target.value)} placeholder="admin" />
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Auth Password</label>
                <input type="password" className="form-input" value={authPass} onChange={e => setAuthPass(e.target.value)} placeholder="SHA/MD5" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Privacy Password</label>
                <input type="password" className="form-input" value={privPass} onChange={e => setPrivPass(e.target.value)} placeholder="AES/DES" />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-start' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={16} /> : (isJob ? <Play size={16} /> : <Search size={16} />)}
            {loading ? 'Working...' : submitLabel}
          </button>
          {isJob && <button type="button" className="btn btn-ghost" onClick={() => setShowCreateJob(false)}>Cancel</button>}
        </div>
      </form>
    );
  }

  async function handleScan(e) {
    e.preventDefault();
    setLoading(true);
    setResults(null);
    setSelected({});
    try {
      const payload = { seed_ip: seedIp, version };
      if (version === '3') {
        payload.user = user;
        payload.auth_pass = authPass;
        payload.priv_pass = privPass;
      } else {
        payload.community = community;
      }
      const { data } = await toolsApi.networkDiscovery(payload);
      setResults(data.discovered || []);
      const initialSelected = {};
      (data.discovered || []).forEach(h => {
        if (h.snmp_status === 'Configured') initialSelected[h.ip] = true;
      });
      setSelected(initialSelected);
      if ((data.discovered || []).length === 0) toast.info('No devices found.');
      else toast.success(`Discovered ${data.discovered.length} devices!`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Scan failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSelected() {
    const toAdd = results.filter(r => selected[r.ip]);
    if (toAdd.length === 0) return;
    setAdding(true);
    let successCount = 0;
    const createdMonitors = [];
    for (const host of toAdd) {
      try {
        const payload = {
          name: host.description ? host.description.substring(0, 30) : `Auto-${host.ip}`,
          type: host.snmp_status === 'Configured' ? 'snmp' : 'ping',
          target: host.ip,
          check_interval_seconds: 60,
          config: host.snmp_status === 'Configured' ? { 
            version, 
            community: version !== '3' ? community : undefined,
            user: version === '3' ? user : undefined,
            auth_pass: version === '3' ? authPass : undefined,
            priv_pass: version === '3' ? privPass : undefined
          } : {}
        };
        const res = await monitorsApi.create(payload);
        if (res.data) {
           createdMonitors.push(res.data);
        }
        successCount++;
      } catch (e) {
        toast.error(`Failed to add ${host.ip}: ${apiErrorMessage(e)}`);
      }
    }
    setAdding(false);
    if (successCount > 0) {
      toast.success(`Added ${successCount} monitors.`);
      onAdded(createdMonitors);
      onClose();
    }
  }

  function toggleSelect(ip) {
    setSelected(prev => ({ ...prev, [ip]: !prev[ip] }));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Network Discovery" size="lg">
      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        <div style={{ display: 'flex', borderBottom: '1px solid var(--white-10)', gap: 24 }}>
          <button 
            style={{ padding: '0 0 12px', background: 'transparent', border: 'none', color: tab === 'manual' ? 'var(--primary)' : 'var(--white-60)', borderBottom: tab === 'manual' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            onClick={() => setTab('manual')}
          >
            One-Time Scan
          </button>
          <button 
            style={{ padding: '0 0 12px', background: 'transparent', border: 'none', color: tab === 'agents' ? 'var(--primary)' : 'var(--white-60)', borderBottom: tab === 'agents' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            onClick={() => setTab('agents')}
          >
            Background Agents
          </button>
        </div>

        {tab === 'manual' && (
          <>
            {!results ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 16, background: 'rgba(56, 189, 248, 0.1)', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <h4 style={{ color: '#38bdf8', marginBottom: 8, fontWeight: 600 }}>SNMP ARP Discovery</h4>
                  <p style={{ color: 'var(--white-80)', fontSize: 14, lineHeight: 1.5 }}>
                    Provide a Seed Router IP. We will query its ARP table to instantly discover all connected devices.
                  </p>
                </div>
                {renderConfigForm(handleScan, 'Connect & Discover', false)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Discovered Devices ({results.length})</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setResults(null)}>New Scan</button>
                </div>
                
                {results.length > 0 ? (
                  <>
                    <div style={{ maxHeight: 350, overflowY: 'auto', border: '1px solid var(--navy-600)', borderRadius: 8, background: '#0f172a' }}>
                      <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
                          <tr>
                            <th style={{ padding: '10px 16px', width: 40 }}><input type="checkbox" checked={results.length > 0 && Object.values(selected).filter(Boolean).length === results.length} onChange={e => {
                              const val = e.target.checked;
                              const newSel = {};
                              results.forEach(r => newSel[r.ip] = val);
                              setSelected(newSel);
                            }} /></th>
                            <th style={{ padding: '10px 16px', color: 'var(--white-60)' }}>IP Address</th>
                            <th style={{ padding: '10px 16px', color: 'var(--white-60)' }}>MAC Address</th>
                            <th style={{ padding: '10px 16px', color: 'var(--white-60)' }}>Identity (sysDescr)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--navy-700)', background: selected[r.ip] ? 'rgba(56, 189, 248, 0.05)' : 'transparent' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <input type="checkbox" checked={!!selected[r.ip]} onChange={() => toggleSelect(r.ip)} />
                              </td>
                              <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{r.ip}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--white-60)' }}>{r.mac || '-'}</td>
                              <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--white-80)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                                {r.description ? (
                                  <span style={{ color: 'var(--success)' }}>{r.description}</span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-primary" onClick={handleAddSelected} disabled={adding || Object.values(selected).filter(Boolean).length === 0}>
                        {adding ? <Loader2 className="spinner" size={16} /> : <Plus size={16} />}
                        {adding ? 'Adding...' : `Monitor Selected (${Object.values(selected).filter(Boolean).length})`}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--white-40)' }}>
                    No active devices found.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {showCreateJob ? (
              <div style={{ background: 'var(--navy-800)', padding: 20, borderRadius: 8, border: '1px solid var(--navy-700)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Create Background Agent</h4>
                {renderConfigForm(handleCreateJob, 'Start Agent', true)}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: 'var(--white-60)', fontSize: 14 }}>
                    Agents run automatically in the background, scanning for new devices and automatically creating monitors for them.
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCreateJob(true)}>
                    <Plus size={16} /> New Agent
                  </button>
                </div>

                {loadingJobs ? (
                  <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="spinner" size={24} style={{ opacity: 0.5 }} /></div>
                ) : jobs.length > 0 ? (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--navy-600)', borderRadius: 8 }}>
                    <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#1e293b' }}>
                        <tr>
                          <th style={{ padding: '10px 16px' }}>Seed IP</th>
                          <th style={{ padding: '10px 16px' }}>Interval</th>
                          <th style={{ padding: '10px 16px' }}>Last Run</th>
                          <th style={{ padding: '10px 16px' }}>Status</th>
                          <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map(job => (
                          <tr key={job.id} style={{ borderTop: '1px solid var(--navy-700)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{job.seed_ip}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--white-60)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <Clock size={14} /> {job.interval_minutes}m
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--white-60)' }}>
                              {job.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'Never'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ 
                                padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                                background: job.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: job.is_active ? 'var(--success)' : 'var(--danger)'
                              }}>
                                {job.is_active ? 'Running' : 'Stopped'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => toggleJob(job.id)} title={job.is_active ? "Stop Agent" : "Start Agent"}>
                                  {job.is_active ? <Square size={16} color="var(--danger)" /> : <Play size={16} color="var(--success)" />}
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => deleteJob(job.id)} title="Delete Agent">
                                  <Trash2 size={16} color="var(--danger)" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--navy-600)', borderRadius: 8, color: 'var(--white-60)' }}>
                    No discovery agents configured.
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
}
