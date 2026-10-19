import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, Monitor, Network, Activity, Settings, Zap } from 'lucide-react';
import { monitorsApi } from '../../api/monitors';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [monitors, setMonitors] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open && monitors.length === 0) {
      monitorsApi.list({ per_page: 50 }).then(({ data }) => setMonitors(data.data || []));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', paddingTop: '10vh', zIndex: 9999
    }} onClick={() => setOpen(false)}>
      <div style={{
        background: 'var(--navy-800)', border: '1px solid var(--navy-600)',
        borderRadius: '12px', width: '90%', maxWidth: '600px', boxShadow: 'var(--glass-shadow)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        <Command label="Command Palette" style={{ background: 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--navy-700)' }}>
            <Search size={20} color="var(--white-60)" style={{ marginRight: '12px' }} />
            <Command.Input 
              autoFocus 
              placeholder="Search devices, tools, or run commands..." 
              style={{
                background: 'transparent', border: 'none', color: 'var(--white-100)',
                fontSize: '16px', outline: 'none', width: '100%'
              }}
            />
          </div>
          
          <Command.List style={{ padding: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            <Command.Empty style={{ padding: '24px', textAlign: 'center', color: 'var(--white-60)' }}>No results found.</Command.Empty>

            <Command.Group heading="Navigation" style={{ color: 'var(--white-60)', fontSize: '12px', padding: '8px' }}>
              <Command.Item onSelect={() => { setOpen(false); navigate('/dashboard'); }} style={{ padding: '12px', color: 'var(--white-100)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px' }}>
                <Activity size={16} /> Dashboard
              </Command.Item>
              <Command.Item onSelect={() => { setOpen(false); navigate('/network-maps'); }} style={{ padding: '12px', color: 'var(--white-100)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px' }}>
                <Network size={16} /> Network Maps
              </Command.Item>
              <Command.Item onSelect={() => { setOpen(false); navigate('/tools'); }} style={{ padding: '12px', color: 'var(--white-100)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px' }}>
                <Zap size={16} /> Diagnostic Tools
              </Command.Item>
              <Command.Item onSelect={() => { setOpen(false); navigate('/settings/profile'); }} style={{ padding: '12px', color: 'var(--white-100)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px' }}>
                <Settings size={16} /> Settings
              </Command.Item>
            </Command.Group>

            {monitors.length > 0 && (
              <Command.Group heading="Devices" style={{ color: 'var(--white-60)', fontSize: '12px', padding: '8px', marginTop: '8px' }}>
                {monitors.map(mon => (
                  <Command.Item key={mon.id} onSelect={() => { setOpen(false); navigate(`/monitors/${mon.id}`); }} style={{ padding: '12px', color: 'var(--white-100)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px' }}>
                    <Monitor size={16} color="var(--chakra-400)" />
                    <div>
                      <div style={{ fontSize: '14px' }}>{mon.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--white-60)' }}>{mon.ip_address || mon.host}</div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
        
        {/* Style the selected items via global styles later or inline if possible. cmdk sets [data-selected="true"] */}
        <style dangerouslySetInnerHTML={{__html: `
          [cmdk-item][data-selected="true"] { background: var(--navy-700); }
          [cmdk-group-heading] { margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        `}} />
      </div>
    </div>
  );
}
