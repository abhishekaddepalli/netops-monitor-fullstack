import { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Bell, Search, Sun, Moon, AlertTriangle, Info, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import HealthStrip from './HealthStrip';
import { dashboardApi } from '../../api/dashboard';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CommandPalette from '../ui/CommandPalette';
import SoundControlBar from '../sound/SoundControlBar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export default function AppLayout({ title }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notifRef = useRef();

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await dashboardApi.summary();
      setSummary(data);
    } catch {
      // Health strip falls back
    }
  }, []);

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 30000);
    return () => clearInterval(interval);
  }, [loadSummary]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifRef]);

  return (
    <>
      <HealthStrip summary={summary} />
      <div className="app-shell">
        {isSidebarOpen && <div className="mobile-backdrop" onClick={() => setIsSidebarOpen(false)} />}
        <Sidebar activeIncidentCount={summary?.active_incidents_count || 0} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="main-col">
          <div className="topbar">
            <button className="icon-btn mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu />
            </button>
            <div className="page-title">{title}</div>
            <div className="search-box">
              <Search />
              <input
                placeholder="Search monitors, incidents..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    navigate(`/monitors?search=${encodeURIComponent(e.currentTarget.value.trim())}`);
                  }
                }}
              />
            </div>
            <div className="topbar-actions">
              <SoundControlBar compact />
              <div className="dropdown-container" ref={notifRef}>
                <button 
                  className={`icon-btn ${showNotifications ? 'active' : ''}`} 
                  title="Notifications"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell />
                  {summary?.active_incidents_count > 0 && <span className="icon-dot" />}
                </button>
                {showNotifications && (
                  <div className="dropdown-menu notif-dropdown">
                    <div className="notif-header">Live Updates</div>
                    <div className="notif-body">
                      {summary?.recent_active_incidents?.length > 0 ? (
                        summary.recent_active_incidents.map(inc => (
                          <div key={inc.id} className="notif-item" onClick={() => navigate('/incidents')}>
                            {inc.severity === 'critical' ? <AlertTriangle size={16} color="var(--red-400)" /> : <Info size={16} color="var(--saffron-500)" />}
                            <div>
                              <div className="notif-title">{inc.monitor_name} is {inc.state}</div>
                              <div className="notif-time">{dayjs(inc.started_at).fromNow()}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="notif-empty">No active incidents right now.</div>
                      )}
                    </div>
                    {summary?.active_incidents_count > 0 && (
                      <div className="notif-footer" onClick={() => navigate('/incidents')}>
                        View all {summary.active_incidents_count} incidents
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button className="icon-btn" onClick={toggleTheme} title="Toggle Light/Dark Mode">
                {theme === 'dark' ? <Sun /> : <Moon />}
              </button>
            </div>
          </div>
          <div className="content">
            <Outlet context={{ summary, reloadSummary: loadSummary, user }} />
          </div>
          
          {/* Whitelabel Footer */}
          <div style={{
            padding: '20px 40px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--white-40)',
            borderTop: '1px solid var(--white-10)',
            marginTop: 'auto'
          }}>
            <div id="whitelabel-footer" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <span>Made with <span style={{ color: 'var(--red-400)' }}>♥</span> by Infiniforge Technologies</span>
              <span style={{ 
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent', 
                fontWeight: 600, 
                letterSpacing: '0.5px' 
              }}>
                ✨ Developed by Abhishek Addepalli ✨
              </span>
            </div>
          </div>
        </div>
      </div>
      <CommandPalette />
    </>
  );
}
