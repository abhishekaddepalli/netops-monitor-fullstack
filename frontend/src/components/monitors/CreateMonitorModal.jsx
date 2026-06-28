import { useState } from 'react';
import Modal from '../ui/Modal';
import { monitorsApi } from '../../api/monitors';
import { toolsApi } from '../../api/tools';
import { apiErrorMessage } from '../../api/client';
import { Loader2, Activity, Lock } from 'lucide-react';
import { CHECK_INTERVALS, MONITOR_TYPE_LABELS } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const TYPES = Object.keys(MONITOR_TYPE_LABELS);

const TCP_SERVICES = [
  ['ssh', 22], ['ftp', 21], ['smtp', 25], ['pop3', 110], ['imap', 143],
  ['http', 80], ['https', 443], ['rdp', 3389], ['mysql', 3306],
  ['postgresql', 5432], ['mongodb', 27017], ['mikrotik_api', 8728],
  ['winbox', 8291], ['radius', 1812], ['dns', 53], ['custom', ''],
];

export default function CreateMonitorModal({ onClose, onCreated }) {
  const toast = useToast();
  const { user } = useAuth();
  const allowedTypes = user?.organization?.effective_features?.allowed_monitor_types || ['ping', 'http'];

  const [type, setType] = useState('ping');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [port, setPort] = useState('');
  const [interval, setInterval_] = useState(60);
  const [tcpService, setTcpService] = useState('https');
  const [httpMethod, setHttpMethod] = useState('GET');
  const [httpKeyword, setHttpKeyword] = useState('');
  const [snmpCommunity, setSnmpCommunity] = useState('public');
  const [snmpVersion, setSnmpVersion] = useState('2c');
  const [snmpPort, setSnmpPort] = useState(161);
  const [snmpV3User, setSnmpV3User] = useState('');
  const [snmpV3AuthPass, setSnmpV3AuthPass] = useState('');
  const [snmpV3PrivPass, setSnmpV3PrivPass] = useState('');
  const [testingSnmp, setTestingSnmp] = useState(false);
  const [snmpTestResult, setSnmpTestResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const payload = {
      name,
      type,
      target,
      check_interval_seconds: Number(interval),
    };

    if (type === 'tcp_port') {
      payload.port = port ? Number(port) : TCP_SERVICES.find(([s]) => s === tcpService)?.[1] || undefined;
      payload.config = { service: tcpService };
    }
    if ((type === 'http' || type === 'api') && httpMethod !== 'GET') {
      payload.config = { ...payload.config, method: httpMethod };
    }
    if (type === 'http' && httpKeyword) {
      payload.config = { ...payload.config, keyword: httpKeyword };
    }
    if (type === 'dns') {
      payload.config = { record_type: 'A' };
    }
    if (type === 'heartbeat' || type === 'server_agent') {
      payload.target = type; // server-side target is informational; token is what matters
    }
    if (type === 'snmp') {
      payload.port = snmpPort;
      payload.config = { 
        community: snmpCommunity, 
        version: snmpVersion,
        user: snmpV3User,
        auth_pass: snmpV3AuthPass,
        priv_pass: snmpV3PrivPass
      };
    }

    try {
      const { data } = await monitorsApi.create(payload);
      toast.success(`Monitor "${data.name}" created.`);
      onCreated(data);
    } catch (error) {
      if (error.response?.status === 422 && error.response.data.errors) {
        setErrors(error.response.data.errors);
      } else {
        toast.error(apiErrorMessage(error, 'Could not create monitor.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTestSnmp(e) {
    e.preventDefault();
    if (!target) {
      toast.error('Please enter an IP address to test.');
      return;
    }
    setTestingSnmp(true);
    setSnmpTestResult(null);
    try {
      const payload = { target, version: snmpVersion, port: snmpPort };
      if (snmpVersion === '3') {
        payload.user = snmpV3User;
        payload.auth_pass = snmpV3AuthPass;
        payload.priv_pass = snmpV3PrivPass;
      } else {
        payload.community = snmpCommunity;
      }
      const { data } = await toolsApi.snmpTest(payload);
      setSnmpTestResult(data);
      toast.success('SNMP connected successfully!');
    } catch (err) {
      setSnmpTestResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setTestingSnmp(false);
    }
  }

  return (
    <Modal title="New Monitor" onClose={onClose} maxWidth={560} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Creating…' : 'Create monitor'}
        </button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Monitor type</label>
          <div className="tab-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
            {TYPES.map((t) => {
              const isAllowed = allowedTypes.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  className={`chip${type === t ? ' active' : ''}`}
                  onClick={() => isAllowed ? setType(t) : toast.error(`The ${MONITOR_TYPE_LABELS[t]} monitor is not available on your current plan. Please upgrade.`)}
                  style={!isAllowed ? { opacity: 0.6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '4px' } : { display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {MONITOR_TYPE_LABELS[t]}
                  {!isAllowed && <Lock size={12} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="m-name">Name</label>
          <input id="m-name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. api.example.com" required />
          {errors.name && <div className="form-error">{errors.name[0]}</div>}
        </div>

        {type !== 'heartbeat' && type !== 'server_agent' && (
          <div className="form-group">
            <label className="form-label" htmlFor="m-target">
              {type === 'http' || type === 'api' ? 'URL' : type === 'dns' ? 'Domain' : 'Host / IP address'}
            </label>
            <input
              id="m-target"
              className="form-input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={type === 'http' || type === 'api' ? 'https://example.com' : type === 'dns' ? 'example.com' : '203.0.113.10'}
              required
            />
            {errors.target && <div className="form-error">{errors.target[0]}</div>}
          </div>
        )}

        {type === 'heartbeat' && (
          <div className="form-hint" style={{ marginBottom: 16 }}>
            A unique heartbeat URL will be generated after creation. Point your cron job, backup script, or scheduled task at it — NetOps Monitor will alert you if a ping is missed.
          </div>
        )}

        {type === 'server_agent' && (
          <div className="form-hint" style={{ marginBottom: 16 }}>
            A unique URL will be generated. You'll receive a ready-to-use Bash or PowerShell script to run on your internal server to push CPU, RAM, Disk, and Interface metrics.
          </div>
        )}

        {type === 'tcp_port' && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="m-service">Service</label>
              <select id="m-service" className="form-select" value={tcpService} onChange={(e) => setTcpService(e.target.value)}>
                {TCP_SERVICES.map(([s]) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-port">Port (optional override)</label>
              <input id="m-port" type="number" className="form-input" value={port} onChange={(e) => setPort(e.target.value)} placeholder="Auto from service" />
            </div>
          </div>
        )}

        {(type === 'http' || type === 'api') && (
          <div className="form-group">
            <label className="form-label" htmlFor="m-method">HTTP Method</label>
            <select id="m-method" className="form-select" value={httpMethod} onChange={(e) => setHttpMethod(e.target.value)}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {type === 'http' && (
          <div className="form-group">
            <label className="form-label" htmlFor="m-keyword">Expected keyword (optional)</label>
            <input id="m-keyword" className="form-input" value={httpKeyword} onChange={(e) => setHttpKeyword(e.target.value)} placeholder="e.g. Welcome" />
            <div className="form-hint">If set, the check fails when this text is missing from the response body.</div>
          </div>
        )}

        {type === 'snmp' && (
          <div style={{ marginBottom: 16 }}>
            <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="m-snmp-version">Version</label>
                <select id="m-snmp-version" className="form-select" value={snmpVersion} onChange={(e) => setSnmpVersion(e.target.value)}>
                  <option value="1">v1</option>
                  <option value="2c">v2c</option>
                  <option value="3">v3</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="m-snmp-port">Port</label>
                <input id="m-snmp-port" type="number" className="form-input" value={snmpPort} onChange={(e) => setSnmpPort(e.target.value)} placeholder="161" />
              </div>
              {snmpVersion !== '3' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="m-snmp-community">Community String</label>
                  <input id="m-snmp-community" className="form-input" value={snmpCommunity} onChange={(e) => setSnmpCommunity(e.target.value)} placeholder="public" required={type === 'snmp'} />
                </div>
              )}
            </div>

            {snmpVersion === '3' && (
              <div style={{ background: 'var(--white-5)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Username (securityName)</label>
                    <input className="form-input" value={snmpV3User} onChange={e => setSnmpV3User(e.target.value)} placeholder="admin" required={type === 'snmp' && snmpVersion === '3'} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Auth Password</label>
                    <input type="password" className="form-input" value={snmpV3AuthPass} onChange={e => setSnmpV3AuthPass(e.target.value)} placeholder="AuthPass (SHA/MD5)" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Privacy Password</label>
                    <input type="password" className="form-input" value={snmpV3PrivPass} onChange={e => setSnmpV3PrivPass(e.target.value)} placeholder="PrivPass (AES/DES)" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleTestSnmp} disabled={testingSnmp}>
                {testingSnmp ? <Loader2 className="spinner" size={14} /> : <Activity size={14} />}
                Test Connection
              </button>
            </div>
          </div>
        )}

        {type === 'snmp' && snmpTestResult && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: snmpTestResult.success ? 'rgba(59,214,113,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${snmpTestResult.success ? 'var(--success)' : 'var(--danger)'}` }}>
            {snmpTestResult.success ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div><span style={{ color: 'var(--white-60)' }}>Status:</span> <span style={{ color: 'var(--success)', fontWeight: 600 }}>Connected</span></div>
                <div><span style={{ color: 'var(--white-60)' }}>Uptime:</span> {snmpTestResult.uptime}</div>
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--white-60)' }}>System:</span> {snmpTestResult.description}</div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--danger)' }}>
                <strong>Test Failed:</strong> {snmpTestResult.error}
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="m-interval">Check interval</label>
          <select id="m-interval" className="form-select" value={interval} onChange={(e) => setInterval_(e.target.value)}>
            {CHECK_INTERVALS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {errors.check_interval_seconds && <div className="form-error">{errors.check_interval_seconds[0]}</div>}
        </div>
      </form>
    </Modal>
  );
}
