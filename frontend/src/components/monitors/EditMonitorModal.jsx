import { useState } from 'react';
import Modal from '../ui/Modal';
import { monitorsApi } from '../../api/monitors';
import { apiErrorMessage } from '../../api/client';
import { CHECK_INTERVALS, MONITOR_TYPE_LABELS } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

const TCP_SERVICES = [
  ['ssh', 22], ['ftp', 21], ['smtp', 25], ['pop3', 110], ['imap', 143],
  ['http', 80], ['https', 443], ['rdp', 3389], ['mysql', 3306],
  ['postgresql', 5432], ['mongodb', 27017], ['mikrotik_api', 8728],
  ['winbox', 8291], ['radius', 1812], ['dns', 53], ['custom', ''],
];

export default function EditMonitorModal({ monitor, onClose, onUpdated }) {
  const toast = useToast();
  const [name, setName] = useState(monitor.name);
  const [target, setTarget] = useState(monitor.target);
  const [port, setPort] = useState(monitor.port || '');
  const [interval, setInterval_] = useState(monitor.check_interval_seconds);
  const [tcpService, setTcpService] = useState(monitor.config?.service || 'https');
  const [httpMethod, setHttpMethod] = useState(monitor.config?.method || 'GET');
  const [httpKeyword, setHttpKeyword] = useState(monitor.config?.keyword || '');
  
  const [snmpVersion, setSnmpVersion] = useState(monitor.config?.version || '2c');
  const [snmpCommunity, setSnmpCommunity] = useState(monitor.config?.community || 'public');
  const [snmpUser, setSnmpUser] = useState(monitor.config?.user || '');
  const [snmpAuth, setSnmpAuth] = useState(monitor.config?.auth_pass || '');
  const [snmpPriv, setSnmpPriv] = useState(monitor.config?.priv_pass || '');
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const payload = {
      name,
      target,
      check_interval_seconds: Number(interval),
    };

    if (monitor.type === 'tcp_port') {
      payload.port = port ? Number(port) : TCP_SERVICES.find(([s]) => s === tcpService)?.[1] || undefined;
      payload.config = { service: tcpService };
    }
    
    if (monitor.type === 'http' || monitor.type === 'api') {
      payload.config = { ...(payload.config || {}), method: httpMethod };
    }

    if (monitor.type === 'http' && httpKeyword) {
      payload.config = { ...(payload.config || {}), keyword: httpKeyword };
    }

    if (monitor.type === 'snmp') {
      payload.port = port ? Number(port) : 161;
      payload.config = {
        version: snmpVersion,
        community: snmpVersion !== '3' ? snmpCommunity : undefined,
        user: snmpVersion === '3' ? snmpUser : undefined,
        auth_pass: snmpVersion === '3' ? snmpAuth : undefined,
        priv_pass: snmpVersion === '3' ? snmpPriv : undefined
      };
    }

    try {
      const { data } = await monitorsApi.update(monitor.id, payload);
      toast.success(`Monitor "${data.name}" updated.`);
      onUpdated(data);
    } catch (error) {
      if (error.response?.status === 422 && error.response.data.errors) {
        setErrors(error.response.data.errors);
      } else {
        toast.error(apiErrorMessage(error, 'Could not update monitor.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Monitor" onClose={onClose} maxWidth={560} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="m-name">Name</label>
          <input id="m-name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
          {errors.name && <div className="form-error">{errors.name[0]}</div>}
        </div>

        {monitor.type !== 'heartbeat' && (
          <div className="form-group">
            <label className="form-label" htmlFor="m-target">
              {monitor.type === 'http' || monitor.type === 'api' ? 'URL' : monitor.type === 'dns' ? 'Domain' : 'Host / IP address'}
            </label>
            <input
              id="m-target"
              className="form-input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
            {errors.target && <div className="form-error">{errors.target[0]}</div>}
          </div>
        )}

        {monitor.type === 'tcp_port' && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="m-service">Service</label>
              <select id="m-service" className="form-select" value={tcpService} onChange={(e) => setTcpService(e.target.value)}>
                {TCP_SERVICES.map(([s]) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-port">Port (optional override)</label>
              <input id="m-port" type="number" className="form-input" value={port} onChange={(e) => setPort(e.target.value)} />
            </div>
          </div>
        )}

        {(monitor.type === 'http' || monitor.type === 'api') && (
          <div className="form-group">
            <label className="form-label" htmlFor="m-method">HTTP Method</label>
            <select id="m-method" className="form-select" value={httpMethod} onChange={(e) => setHttpMethod(e.target.value)}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {monitor.type === 'http' && (
          <div className="form-group">
            <label className="form-label" htmlFor="m-keyword">Expected keyword (optional)</label>
            <input id="m-keyword" className="form-input" value={httpKeyword} onChange={(e) => setHttpKeyword(e.target.value)} />
          </div>
        )}

        {monitor.type === 'snmp' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SNMP Version</label>
                <select className="form-select" value={snmpVersion} onChange={(e) => setSnmpVersion(e.target.value)}>
                  <option value="1">v1</option>
                  <option value="2c">v2c</option>
                  <option value="3">v3</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Port</label>
                <input type="number" className="form-input" placeholder="161" value={port} onChange={(e) => setPort(e.target.value)} />
              </div>
            </div>

            {snmpVersion !== '3' ? (
              <div className="form-group">
                <label className="form-label">Community String</label>
                <input className="form-input" value={snmpCommunity} onChange={(e) => setSnmpCommunity(e.target.value)} required />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Security Name (User)</label>
                  <input className="form-input" value={snmpUser} onChange={(e) => setSnmpUser(e.target.value)} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Auth Password</label>
                    <input className="form-input" type="password" value={snmpAuth} onChange={(e) => setSnmpAuth(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priv Password</label>
                    <input className="form-input" type="password" value={snmpPriv} onChange={(e) => setSnmpPriv(e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </>
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
