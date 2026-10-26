import { Volume2, VolumeX, Bell, AlertOctagon, CheckCircle2, Play, Square, X, Sliders } from 'lucide-react';
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

  if (!isSettingsOpen) return null;

  return (
    <div className="modal-backdrop" onClick={closeSettings} style={{ zIndex: 1050 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: '92%',
          background: 'var(--panel-bg, #0d1626)',
          border: '1px solid var(--border-color, #22395a)',
          borderRadius: 14,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(46, 79, 163, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color, #22395a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 50, 85, 0.4) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(46, 79, 163, 0.25)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Volume2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f1f5f9)' }}>
                Audio Alarm & Chime Settings
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)' }}>
                Configure real-time audio alerts for monitor incidents & recoveries
              </div>
            </div>
          </div>
          <button
            onClick={closeSettings}
            className="icon-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Alarm Banner (if sounding) */}
          {isPlaying && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'pulse 1.5s infinite',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f87171' }}>
                <AlertOctagon size={18} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Alarm is currently sounding!</span>
              </div>
              <button
                onClick={stopAlarm}
                className="btn btn-sm"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Square size={13} fill="#fff" /> Stop Sound
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
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)' }}>
                  {enabled ? 'Alarm will play when monitors fail or recover' : 'Audio alerts are currently muted'}
                </div>
              </div>
            </div>

            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
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
                  }}
                />
              </span>
            </label>
          </div>

          {/* Volume Control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sliders size={14} /> Master Volume
              </label>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#60a5fa', fontWeight: 600 }}>
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
                  accentColor: '#3b82f6',
                  height: 6,
                  borderRadius: 3,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                }}
              />
              <Volume2 size={16} color="var(--text-secondary, #94a3b8)" />
            </div>
          </div>

          {/* Down Alarm Configuration */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontWeight: 700, fontSize: 13 }}>
                <AlertOctagon size={16} /> MONITOR DOWN ALARM
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
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
                title="Preview selected down alarm"
              >
                <Play size={11} fill="currentColor" /> Test Alarm
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {SOUND_PRESETS.down.map((item) => {
                const isSelected = downSound === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setDownSound(item.id);
                      testSound('down', item.id);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: isSelected ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid #ef4444' : '1px solid var(--border-color, #22395a)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#fca5a5' : '#cbd5e1' }}>
                        {item.label}
                      </span>
                      {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', marginTop: 2 }}>
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
                <span style={{ color: loopAlarm ? '#f87171' : 'var(--text-secondary, #94a3b8)', fontWeight: loopAlarm ? 600 : 400 }}>
                  {loopAlarm ? 'Loop On' : 'Play Once'}
                </span>
              </label>
            </div>
          </div>

          {/* Up Chime Configuration */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                }}
                title="Preview selected recovery chime"
              >
                <Play size={11} fill="currentColor" /> Test Chime
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {SOUND_PRESETS.up.map((item) => {
                const isSelected = upSound === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setUpSound(item.id);
                      testSound('up', item.id);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: isSelected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid #10b981' : '1px solid var(--border-color, #22395a)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#a7f3d0' : '#cbd5e1' }}>
                        {item.label}
                      </span>
                      {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', marginTop: 2 }}>
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
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color, #22395a)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)' }}>
            Changes are saved automatically to your browser.
          </div>
          <button
            onClick={closeSettings}
            className="btn btn-primary btn-sm"
            style={{ minWidth: 90 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
