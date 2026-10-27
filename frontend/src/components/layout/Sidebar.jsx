import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Activity, AlertTriangle, Globe2,
  Network, Users, Plug, Settings, LogOut, Code, Terminal,
  Building2, ListPlus, Server, CreditCard, Receipt, FileClock, Wallet, FileText, X, Sun, Moon, ServerCog, LayoutTemplate
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PwaInstallButton from '../pwa/PwaInstallButton';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/monitors', icon: Activity, label: 'Monitors' },
  { to: '/network-maps', icon: Network, label: 'Network Maps' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/status-pages', icon: Globe2, label: 'Status Pages' },
  { to: '/tools', icon: Terminal, label: 'Diagnostic Tools' },
];

const ORG_ITEMS = [
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/alert-channels', icon: Plug, label: 'Alert Channels' },
  { to: '/billing', icon: Wallet, label: 'Billing & Plans' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ activeIncidentCount = 0, isOpen, setIsOpen }) {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminView = role === 'super_admin' && location.pathname.startsWith('/admin');

  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {window.APP_LOGO ? (
            <img src={window.APP_LOGO} alt="Logo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
          ) : (
            <div className="brand-mark" />
          )}
          <div>
            <div className="brand-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
              {window.APP_NAME || 'NetOps Monitor'}
            </div>
            <div className="brand-sub">{user?.organization?.name || 'Platform'}</div>
          </div>
        </div>
        <button className="icon-btn mobile-close-btn" onClick={() => setIsOpen?.(false)}>
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-scrollarea">
        {!isAdminView ? (
          <>
            <div className="nav-section">
              {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                <NavLink onClick={() => setIsOpen?.(false)}
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <Icon />
                  {label}
                  {label === 'Incidents' && activeIncidentCount > 0 && (
                    <span className="nav-badge">{activeIncidentCount}</span>
                  )}
                </NavLink>
              ))}
            </div>

            <div className="nav-section">
              <div className="nav-label">Organization</div>
              {ORG_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink onClick={() => setIsOpen?.(false)} key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                  <Icon />
                  {label}
                </NavLink>
              ))}
            </div>
          </>
        ) : (
          <div className="nav-section">
            <div className="nav-label" style={{ marginBottom: 12 }}>Platform Super Admin</div>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end>
              <LayoutDashboard /> Dashboard
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/server-health" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <ServerCog size={20} /> Server Health
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/organizations" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Building2 size={20} /> Organizations
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/plans" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <ListPlus /> Plans
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/nodes" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Server /> Monitoring Nodes
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/payment-gateways" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <CreditCard /> Payment Gateways
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/alert-integrations" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Plug /> Alert Integrations
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/notification-templates" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <FileText /> Notification Templates
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/alert-channels" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <AlertTriangle /> Global Alert Channels
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/cms" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <LayoutTemplate /> Site CMS & Pages
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/invoices" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Receipt /> Invoices
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <FileClock /> Global Logs
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/api-docs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Code /> Radius Integration
            </NavLink>
            <NavLink onClick={() => setIsOpen?.(false)} to="/admin/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Settings /> Whitelabel Settings
            </NavLink>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <PwaInstallButton variant="sidebar" />
      </div>

      {role === 'super_admin' && (
        <div style={{ padding: '0 16px 16px' }}>
          <button 
            className="btn btn-ghost" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px' }}
            onClick={() => {
              navigate(isAdminView ? '/dashboard' : '/admin');
              setIsOpen?.(false);
            }}
          >
            {isAdminView ? <><Building2 size={16} /> Switch to Org View</> : <><LayoutDashboard size={16} /> Switch to Admin View</>}
          </button>
        </div>
      )}

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="avatar">{initials}</div>
            <div className="user-meta">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{(role || 'member').replace('_', ' ')}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Log out" style={{ marginLeft: 'auto' }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
