import { useState } from 'react';
import Modal from '../ui/Modal';
import { monitorsApi } from '../../api/monitors';
import { apiErrorMessage } from '../../api/client';
import { CHECK_INTERVALS, MONITOR_TYPE_LABELS } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

const TYPES = Object.keys(MONITOR_TYPE_LABELS);

const TCP_SERVICES = [
  ['ssh', 22], ['ftp', 21], ['smtp', 25], ['pop3', 110], ['imap', 143],
  ['http', 80], ['https', 443], ['rdp', 3389], ['mysql', 3306],
  ['postgresql', 5432], ['mongodb', 27017], ['mikrotik_api', 8728],
  ['winbox', 8291], ['radius', 1812], ['dns', 53], ['custom', ''],
];

export default function CreateMonitorModal({ onClose, onCreated }) {
  const toast = useToast();
  const [type, setType] = useState('http');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [port, setPort] = useState('');
  const [interval, setInterval_] = useState(60);
  const [tcpService, setTcpService] = useState('https');
  const [httpMethod, setHttpMethod] = useState('GET');
  const [httpKeyword, setHttpKeyword] = useState('');
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
          <div className="tab-row">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t}
                className={`chip${type === t ? ' active' : ''}`}
                onClick={() => setType(t)}
              >
                {MONITOR_TYPE_LABELS[t]}
              </button>
            ))}
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
