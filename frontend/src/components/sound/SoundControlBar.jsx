import { Volume2, VolumeX, Bell, Square, Sliders, AlertOctagon } from 'lucide-react';
import { useSoundContext } from '../../context/SoundContext';

export default function SoundControlBar({ compact = false }) {
  const {
    enabled,
    isPlaying,
    stopAlarm,
    openSettings,
    volume,
    activeAlarmInfo,
  } = useSoundContext();

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* Prominent STOP SOUND / SILENCE ALARM Button (Visible whenever alarm is sounding) */}
      {isPlaying && (
        <button
          onClick={stopAlarm}
          className="btn"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: '#ffffff',
            border: '1px solid #f87171',
            padding: compact ? '5px 12px' : '7px 16px',
            fontSize: compact ? 12 : 13,
            fontWeight: 700,
            letterSpacing: '0.4px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 0 18px rgba(239, 68, 68, 0.7), 0 2px 4px rgba(0,0,0,0.4)',
            animation: 'pulse 1.2s infinite ease-in-out',
            zIndex: 10,
          }}
          title="Click to immediately silence this alarm"
        >
          <Square size={13} fill="#ffffff" stroke="none" />
          <span>STOP SOUND</span>
          <span
            style={{
              display: 'inline-flex',
              gap: 2,
              alignItems: 'center',
              height: 12,
              marginLeft: 2,
            }}
          >
            <span style={{ width: 2.5, height: 10, background: '#fff', borderRadius: 1, animation: 'pulse 0.4s infinite alternate' }} />
            <span style={{ width: 2.5, height: 14, background: '#fff', borderRadius: 1, animation: 'pulse 0.6s infinite alternate' }} />
            <span style={{ width: 2.5, height: 8, background: '#fff', borderRadius: 1, animation: 'pulse 0.5s infinite alternate' }} />
          </span>
        </button>
      )}

      {/* Sound Settings / Alarm Toggle Button */}
      <button
        onClick={openSettings}
        className="btn btn-secondary btn-sm"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: isPlaying
            ? 'rgba(239, 68, 68, 0.15)'
            : enabled
            ? 'rgba(46, 79, 163, 0.18)'
            : 'rgba(255, 255, 255, 0.04)',
          borderColor: isPlaying
            ? 'rgba(239, 68, 68, 0.4)'
            : enabled
            ? 'rgba(59, 130, 246, 0.35)'
            : 'var(--border-color, #22395a)',
          color: enabled ? '#93c5fd' : 'var(--text-secondary, #94a3b8)',
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          transition: 'all 0.2s ease',
        }}
        title="Audio Alarm & Chime Configuration"
      >
        {enabled ? (
          <Volume2 size={15} color="#60a5fa" />
        ) : (
          <VolumeX size={15} color="#94a3b8" />
        )}
        <span>{enabled ? `Sound (${Math.round(volume * 100)}%)` : 'Sound Muted'}</span>
        <Sliders size={12} style={{ opacity: 0.7 }} />
      </button>
    </div>
  );
}
