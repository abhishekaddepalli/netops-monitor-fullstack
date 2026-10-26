import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, Bell, AlertOctagon, CheckCircle2, Play, Square, X, Sliders, Music, Radio } from 'lucide-react';
import { useSoundContext, SOUND_PRESETS } from '../../context/SoundContext';

export default function SoundSettingsModal() {
  const {
    isSettingsOpen,
    closeSettings,
    enabled,
    setEnabled,
    volume,
    setVolume,
    downSound,
    setDownSound,
    upSound,
    setUpSound,
    loopAlarm,
    setLoopAlarm,
    isPlaying,
    stopAlarm,
    testSound,
  } = useSoundContext();

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeSettings();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  const modalContent = (
    <div
      className="sound-modal-backdrop"
      onClick={closeSettings}
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(4, 9, 20, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div
        className="sound-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          background: 'var(--navy-900, #0d1626)',
          border: '1px solid var(--border-color, #22395a)',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Modal Header */}
        <div
          className="sound-modal-head"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color, #22395a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 50, 85, 0.4) 0%, transparent 100%)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.25)',
              }}
            >
              <Volume2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f1f5f9)', letterSpacing: '-0.3px' }}>
                Audio Alarm & Chime Settings
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)', marginTop: 2 }}>
                Real-time incident sirens, naval alarms & recovery chimes
              </div>
            </div>
          </div>
          <button
            onClick={closeSettings}
            className="icon-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Close Settings (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="sound-modal-body"
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            boxSizing: 'border-box',
          }}
        >
          {/* Active Alarm Banner (if currently sounding) */}
          {isPlaying && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.18)',
                border: '1px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
                animation: 'pulse 1.4s infinite ease-in-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f87171' }}>
                <AlertOctagon size={18} />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2px' }}>
                  ALARM IS SOUNDING NOW!
                </span>
              </div>
              <button
                onClick={stopAlarm}
                className="btn btn-sm"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              >
                <Square size={13} fill="#fff" /> STOP SOUND
              </button>
            </div>
          )}

          {/* Master Enable / Disable Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color, #22395a)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {enabled ? (
                <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: 8, borderRadius: 8 }}>
                  <Bell size={18} />
                </div>
              ) : (
                <div style={{ color: '#94a3b8', background: 'rgba(148, 163, 184, 0.15)', padding: 8, borderRadius: 8 }}>
                  <VolumeX size={18} />
                </div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f1f5f9)' }}>
                  Audio Alerts
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)', marginTop: 2 }}>
                  {enabled ? 'Real-time alert audio triggers on incident outages and recoveries' : 'Audio alerts are currently muted'}
                </div>
              </div>
            </div>

            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: enabled ? '#10b981' : '#334155',
                  borderRadius: 24,
                  transition: '0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: 18,
                    width: 18,
                    left: enabled ? 23 : 3,
                    bottom: 3,
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </span>
            </label>
          </div>

          {/* Volume Control Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sliders size={14} color="#38bdf8" /> Master Alert Volume
              </label>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 700 }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <VolumeX size={16} color="var(--text-secondary, #94a3b8)" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                disabled={!enabled}
                style={{
                  flex: 1,
                  accentColor: '#38bdf8',
                  height: 6,
                  borderRadius: 3,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                }}
              />
              <Volume2 size={16} color="var(--text-secondary, #94a3b8)" />
            </div>
          </div>

          {/* DOWN ALARM SOUNDS */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontWeight: 700, fontSize: 13 }}>
                <AlertOctagon size={16} /> MONITOR DOWN INCIDENT ALARM
              </div>
              <button
                type="button"
                onClick={() => testSound('down', downSound)}
                disabled={!enabled}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  color: '#f87171',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.1)',
                }}
                title="Preview selected down alarm"
              >
                <Play size={11} fill="currentColor" /> Test Current Alarm
              </button>
            </div>

            {/* Presets Grid (Down) */}
            <div className="sound-presets-grid-down">
              {SOUND_PRESETS.down.map((item) => {
                const isSelected = downSound === item.id;
                return (
                  <div
                    key={item.id}
                    className="sound-preset-card"
                    onClick={() => {
                      setDownSound(item.id);
                      testSound('down', item.id);
                    }}
                    style={{
                      background: isSelected ? 'rgba(239, 68, 68, 0.22)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1.5px solid #ef4444' : '1px solid var(--border-color, #22395a)',
                      boxShadow: isSelected ? '0 0 12px rgba(239, 68, 68, 0.25)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#fca5a5' : '#cbd5e1' }}>
                        {item.label}
                      </span>
                      {isSelected ? (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                      ) : (
                        <Play size={10} style={{ opacity: 0.4, color: '#94a3b8' }} />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', marginTop: 3, lineHeight: 1.3 }}>
                      {item.description}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Loop Alarm Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid rgba(239, 68, 68, 0.15)',
                fontSize: 12,
              }}
            >
              <span style={{ color: '#cbd5e1' }}>Repeat alarm continuously until stopped manually</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={loopAlarm}
                  onChange={(e) => setLoopAlarm(e.target.checked)}
                  style={{ accentColor: '#ef4444' }}
                />
                <span style={{ color: loopAlarm ? '#f87171' : 'var(--text-secondary, #94a3b8)', fontWeight: loopAlarm ? 700 : 400 }}>
                  {loopAlarm ? 'Loop On' : 'Play Once'}
                </span>
              </label>
            </div>
          </div>

          {/* UP / RECOVERY CHIME SOUNDS */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontWeight: 700, fontSize: 13 }}>
                <CheckCircle2 size={16} /> MONITOR RECOVERY (UP) CHIME
              </div>
              <button
                type="button"
                onClick={() => testSound('up', upSound)}
                disabled={!enabled}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  color: '#34d399',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                  background: 'rgba(16, 185, 129, 0.1)',
                }}
                title="Preview selected recovery chime"
              >
                <Play size={11} fill="currentColor" /> Test Current Chime
              </button>
            </div>

            {/* Presets Grid (Up) */}
            <div className="sound-presets-grid-up">
              {SOUND_PRESETS.up.map((item) => {
                const isSelected = upSound === item.id;
                return (
                  <div
                    key={item.id}
                    className="sound-preset-card"
                    onClick={() => {
                      setUpSound(item.id);
                      testSound('up', item.id);
                    }}
                    style={{
                      background: isSelected ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1.5px solid #10b981' : '1px solid var(--border-color, #22395a)',
                      boxShadow: isSelected ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#a7f3d0' : '#cbd5e1' }}>
                        {item.label}
                      </span>
                      {isSelected ? (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                      ) : (
                        <Play size={10} style={{ opacity: 0.4, color: '#94a3b8' }} />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', marginTop: 3, lineHeight: 1.3 }}>
                      {item.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="sound-modal-footer"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color, #22395a)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.25)',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)' }}>
            Changes are saved automatically to browser storage.
          </div>
          <button
            onClick={closeSettings}
            className="btn btn-primary btn-sm"
            style={{ minWidth: 90, fontWeight: 600 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
